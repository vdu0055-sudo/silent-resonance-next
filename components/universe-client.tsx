'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchUniverse,
  leavePresence,
  readStoredIdentity,
  type ResonanceEvent,
  sendResonance,
  subscribeUniverse,
  touchPresence,
  type FrequencyId,
  type StateId,
  type StoredIdentity,
  type UniverseStar,
  type WorldPosition,
  upsertMyStar,
} from '../lib/silent-resonance';
import {
  mapUniverseStarsToScene,
  selectVisibleSceneStars,
  type VisualStar,
} from '../lib/universe-visuals';
import CreationFlow from './creation-flow';
import Hero from './hero';
import UniverseCanvas from './universe-canvas';

type Whisper = {
  id: number;
  message: string;
  variant: 'default' | 'soft';
  duration: number;
};

export default function UniverseClient() {
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);
  const [stars, setStars] = useState<UniverseStar[]>([]);
  const [encounterStep, setEncounterStep] = useState(0);
  const [explorationPosition, setExplorationPosition] = useState<WorldPosition>({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [flowOpen, setFlowOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [whisper, setWhisper] = useState<Whisper | null>(null);
  const [incomingResonance, setIncomingResonance] = useState<{
    id: string;
    fromStarId: string;
    toStarId: string;
  } | null>(null);
  const flowLaunchTimeoutRef = useRef<number | null>(null);
  const identityRef = useRef<StoredIdentity | null>(null);
  const explorationPositionRef = useRef<WorldPosition>({ x: 0, y: 0 });
  const hydratedWorldStarIdRef = useRef<string | null>(null);
  const positionSyncTimeoutRef = useRef<number | null>(null);
  const lastPositionSyncRef = useRef({ x: Number.NaN, y: Number.NaN, at: 0 });
  const encounterSeedRef = useRef(
    `encounter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const encounterSeed = encounterSeedRef.current;
  const sceneStars = useMemo(
    () => mapUniverseStarsToScene(stars, identity?.starId ?? null),
    [identity?.starId, stars],
  );
  const visibleStars = useMemo(
    () =>
      selectVisibleSceneStars(
        sceneStars,
        identity?.starId ?? null,
        encounterSeed,
        encounterStep,
        explorationPosition,
      ),
    [encounterSeed, encounterStep, explorationPosition, identity?.starId, sceneStars],
  );
  const myStar = sceneStars.find((star) => star.isUser) ?? null;

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    explorationPositionRef.current = explorationPosition;
  }, [explorationPosition]);

  useEffect(() => {
    if (!whisper) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setWhisper(null);
    }, whisper.duration);

    return () => window.clearTimeout(timeoutId);
  }, [whisper]);

  useEffect(() => {
    return () => {
      if (flowLaunchTimeoutRef.current) {
        window.clearTimeout(flowLaunchTimeoutRef.current);
      }

      if (positionSyncTimeoutRef.current) {
        window.clearTimeout(positionSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!identity || !myStar) {
      hydratedWorldStarIdRef.current = null;
      return;
    }

    if (hydratedWorldStarIdRef.current === identity.starId) {
      return;
    }

    hydratedWorldStarIdRef.current = identity.starId;
    setExplorationPosition(myStar.world);
  }, [identity, myStar]);

  useEffect(() => {
    const saved = readStoredIdentity();
    setIdentity(saved);

    let cancelled = false;
    let channel: ReturnType<typeof subscribeUniverse> | null = null;

    const load = async () => {
      try {
        const nextStars = await fetchUniverse();

        if (!cancelled) {
          setStars(nextStars);
        }
      } catch {
        if (!cancelled) {
          setWhisper({
            id: Date.now(),
            message: '宇宙快照暂时没有被接住',
            variant: 'soft',
            duration: 1200,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    try {
      channel = subscribeUniverse(
        () => {
          void load();
        },
        (event: ResonanceEvent) => {
          const currentIdentity = identityRef.current;

          if (!currentIdentity || event.to_star_id !== currentIdentity.starId) {
            return;
          }

          setIncomingResonance({
            id: event.id,
            fromStarId: event.from_star_id,
            toStarId: event.to_star_id,
          });
        },
      );
    } catch {
      if (!cancelled) {
        setLoading(false);
        setWhisper({
          id: Date.now(),
          message: '实时宇宙还没有连上',
          variant: 'soft',
          duration: 1200,
        });
      }
    }

    return () => {
      cancelled = true;

      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!identity) {
      return;
    }

    let heartbeatId: number | null = null;

    void touchPresence(identity, explorationPositionRef.current).catch(() => {});
    heartbeatId = window.setInterval(() => {
      void touchPresence(identity, explorationPositionRef.current).catch(() => {});
    }, 25_000);

    const handleLeave = () => {
      void leavePresence(identity).catch(() => {});
    };

    window.addEventListener('pagehide', handleLeave);
    window.addEventListener('beforeunload', handleLeave);

    return () => {
      if (heartbeatId) {
        window.clearInterval(heartbeatId);
      }

      window.removeEventListener('pagehide', handleLeave);
      window.removeEventListener('beforeunload', handleLeave);
    };
  }, [identity]);

  useEffect(() => {
    if (!identity) {
      return;
    }

    const last = lastPositionSyncRef.current;
    const deltaX = Math.abs(explorationPosition.x - last.x);
    const deltaY = Math.abs(explorationPosition.y - last.y);
    const now = Date.now();

    if (
      Number.isFinite(last.x) &&
      deltaX < 12 &&
      deltaY < 12 &&
      now - last.at < 220
    ) {
      return;
    }

    if (positionSyncTimeoutRef.current) {
      window.clearTimeout(positionSyncTimeoutRef.current);
    }

    positionSyncTimeoutRef.current = window.setTimeout(() => {
      lastPositionSyncRef.current = {
        x: explorationPosition.x,
        y: explorationPosition.y,
        at: Date.now(),
      };

      void touchPresence(identity, explorationPosition).catch(() => {});
    }, 120);

    return () => {
      if (positionSyncTimeoutRef.current) {
        window.clearTimeout(positionSyncTimeoutRef.current);
      }
    };
  }, [explorationPosition, identity]);

  const triggerWhisper = (message: string, options: Partial<Whisper> = {}) => {
    setWhisper({
      id: Date.now(),
      message,
      variant: options.variant ?? 'default',
      duration: options.duration ?? 2200,
    });
  };

  const handleCreateStar = async ({
    primary,
    secondary,
    state,
  }: {
    primary: FrequencyId;
    secondary: FrequencyId[];
    state: StateId;
  }) => {
    setSubmitting(true);

    try {
      const nextIdentity = await upsertMyStar({
        primaryFrequency: primary,
        secondaryFrequencies: secondary,
        currentState: state,
      });

      setIdentity(nextIdentity);
      await touchPresence(nextIdentity, explorationPositionRef.current);
      setStars(await fetchUniverse());
      setFlowOpen(false);
      triggerWhisper('你的星已经在这里缓慢发光');
    } catch {
      triggerWhisper('这一轮校准没有被宇宙接住', {
        variant: 'soft',
        duration: 1200,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserStarEdit = (star: VisualStar = myStar as VisualStar) => {
    if (flowLaunchTimeoutRef.current) {
      window.clearTimeout(flowLaunchTimeoutRef.current);
    }

    if (!star) {
      setFlowOpen(true);
      return;
    }

    triggerWhisper('再次校准', {
      variant: 'soft',
      duration: 900,
    });

    flowLaunchTimeoutRef.current = window.setTimeout(() => {
      setFlowOpen(true);
    }, 360);
  };

  const handleResonanceSent = (star: VisualStar) => {
    if (!identity) {
      setFlowOpen(true);
      return;
    }

    if (star.synthetic) {
      triggerWhisper('你遇到了一颗漂流星，它暂时不会给出真实回响', {
        variant: 'soft',
        duration: 1400,
      });
      return;
    }

    void sendResonance(star.id, identity).catch(() => {
      triggerWhisper('这次共振没有送达', {
        variant: 'soft',
        duration: 1100,
      });
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-mist">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(86,118,171,0.18),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(126,95,148,0.16),transparent_22%),radial-gradient(circle_at_50%_78%,rgba(36,70,109,0.28),transparent_34%),linear-gradient(180deg,#02050c_0%,#040813_38%,#050913_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(104,132,177,0.16),transparent_56%)] opacity-60 [mask-image:radial-gradient(circle_at_center,black_55%,transparent_100%)]" />
      <div className="cosmic-vignette absolute inset-0" />
      <div className="cosmic-grain absolute inset-0 opacity-[0.2]" />
      <div className="animate-deep-breathe absolute left-1/2 top-[11%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(121,146,184,0.1),rgba(54,78,116,0.04)_36%,transparent_72%)] blur-3xl" />
      <div className="absolute left-1/2 top-[18%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/[0.03] opacity-70" />
      <div className="absolute left-1/2 top-[18%] h-[45rem] w-[45rem] -translate-x-1/2 rounded-full border border-white/[0.02] opacity-50" />
      <div className="absolute bottom-[-20%] left-1/2 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(51,78,116,0.22),rgba(3,7,17,0)_66%)] blur-3xl" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <UniverseCanvas
        stars={visibleStars}
        explorationPosition={explorationPosition}
        onExplorationChange={setExplorationPosition}
        onResonanceSent={handleResonanceSent}
        onUserStarClick={handleUserStarEdit}
        onEncounterShift={setEncounterStep}
        externalResonance={incomingResonance}
        onExternalResonancePlayed={(id) => {
          setIncomingResonance((current) => (current?.id === id ? null : current));
        }}
      />

      <Hero
        population={loading ? 0 : sceneStars.length}
        onJoin={() => setFlowOpen(true)}
        flowOpen={flowOpen}
        hasUserStar={Boolean(myStar) || Boolean(identity && loading)}
      />

      {flowOpen ? (
        <CreationFlow
          key={myStar ? `${myStar.id}-${myStar.primary}-${myStar.state}` : 'new-star'}
          existingStar={myStar}
          submitting={submitting}
          onClose={() => setFlowOpen(false)}
          onComplete={handleCreateStar}
        />
      ) : null}

      {whisper ? (
        <div key={whisper.id} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div
            className={`universe-whisper relative flex items-center justify-center rounded-full ${
              whisper.variant === 'soft' ? 'h-[8rem] w-[8rem]' : 'h-[13rem] w-[13rem]'
            }`}
          >
            <span
              className={`universe-whisper-flash absolute inset-0 rounded-full ${
                whisper.variant === 'soft' ? 'opacity-[0.55]' : ''
              }`}
            />
            {whisper.variant === 'soft' ? (
              <span className="universe-whisper-pulse absolute left-1/2 top-1/2 h-10 w-10 rounded-full" />
            ) : (
              <>
                <span className="universe-whisper-ring absolute left-1/2 top-1/2 h-16 w-16 rounded-full" />
                <span className="universe-whisper-ring universe-whisper-ring-soft absolute left-1/2 top-1/2 h-16 w-16 rounded-full" />
              </>
            )}
            <p
              className={`relative text-center text-mist/[0.8] ${
                whisper.variant === 'soft'
                  ? 'px-4 text-[11px] tracking-[0.34em]'
                  : 'max-w-[18rem] px-6 text-[12px] leading-7 tracking-[0.24em]'
              }`}
            >
              {whisper.message}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
