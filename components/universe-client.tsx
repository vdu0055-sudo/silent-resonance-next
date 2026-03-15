'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FREQUENCIES,
  STATES,
  fetchUniverse,
  leavePresence,
  readStoredIdentity,
  sendResonance,
  subscribeUniverse,
  touchPresence,
  type FrequencyId,
  type StateId,
  type StoredIdentity,
  type UniverseStar,
  upsertMyStar,
} from '../lib/silent-resonance';

function frequencyLabel(id: FrequencyId) {
  return FREQUENCIES.find((item) => item.id === id)?.label || id;
}

function stateLabel(id: StateId) {
  return STATES.find((item) => item.id === id)?.label || id;
}

export default function UniverseClient() {
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);
  const [stars, setStars] = useState<UniverseStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [primary, setPrimary] = useState<FrequencyId>('cosmos');
  const [secondary, setSecondary] = useState<FrequencyId[]>([]);
  const [currentState, setCurrentState] = useState<StateId>('present');

  const myStar = useMemo(
    () => stars.find((star) => star.id === identity?.starId) || null,
    [identity?.starId, stars],
  );

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
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load().catch(() => {
      setMessage('宇宙快照暂时没有加载出来。先检查 Supabase 环境变量和数据库脚本。');
    });

    try {
      channel = subscribeUniverse(() => {
        load().catch(() => {});
      });
    } catch {
      setLoading(false);
      setMessage('Realtime 还没有连上。先把 .env.local 和 Supabase 项目配好。');
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
      setFormOpen(true);
      return undefined;
    }

    let heartbeatId: number | null = null;

    touchPresence(identity).catch(() => {
      setFormOpen(true);
      setMessage('你的在线状态还没有写回宇宙。');
    });

    heartbeatId = window.setInterval(() => {
      touchPresence(identity).catch(() => {});
    }, 25_000);

    const handleLeave = () => {
      leavePresence(identity).catch(() => {});
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
    if (!myStar) {
      return;
    }

    setPrimary(myStar.primary_frequency);
    setSecondary(myStar.secondary_frequencies);
    setCurrentState(myStar.current_state);
  }, [myStar]);

  const handleSecondaryToggle = (id: FrequencyId) => {
    setSecondary((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, id];
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    setMessage('');

    try {
      const nextIdentity = await upsertMyStar({
        primaryFrequency: primary,
        secondaryFrequencies: secondary,
        currentState,
      });

      setIdentity(nextIdentity);
      await touchPresence(nextIdentity);
      setStars(await fetchUniverse());
      setFormOpen(false);
      setMessage('你的星已经进入宇宙。');
    } catch {
      setMessage('这次校准没有写入成功。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResonance = async (targetStarId: string) => {
    if (!identity) {
      setFormOpen(true);
      return;
    }

    try {
      await sendResonance(targetStarId, identity);
      setMessage('你向这颗星发送了一次微弱共振。');
    } catch {
      setMessage('这次共振没有送达。');
    }
  };

  return (
    <main className="min-h-screen bg-[#040813] px-6 py-8 text-[#dde6f4]">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm tracking-[0.45em] text-[#93a7c5]/60">沉默宇宙</p>
            <h1 className="mt-6 text-4xl font-light tracking-[0.12em]">真实在线版本</h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 tracking-[0.18em] text-[#a6b7d0]/76">
              现在宇宙里的星，不再来自前端假数据。谁真正进入这个站点，谁就会成为一颗正在场的星。
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-4 text-right backdrop-blur-xl">
            <p className="text-xs tracking-[0.38em] text-[#93a7c5]/55">此刻</p>
            <p className="mt-3 text-2xl tracking-[0.16em]">
              {loading ? '...' : stars.length} 人正在安静存在
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm tracking-[0.28em] text-[#dde6f4]/88">我的星</p>
              <button
                type="button"
                onClick={() => setFormOpen((current) => !current)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs tracking-[0.26em] text-[#a6b7d0]/82"
              >
                {formOpen ? '收起' : myStar ? '重新校准' : '创建'}
              </button>
            </div>

            {myStar ? (
              <div className="mt-6 space-y-3 text-sm tracking-[0.14em] text-[#cdd8ea]/84">
                <p>主频：{frequencyLabel(myStar.primary_frequency)}</p>
                <p>
                  副频：
                  {myStar.secondary_frequencies.length
                    ? myStar.secondary_frequencies.map(frequencyLabel).join(' · ')
                    : '只保留主频'}
                </p>
                <p>状态：{stateLabel(myStar.current_state)}</p>
              </div>
            ) : (
              <p className="mt-6 text-sm leading-7 tracking-[0.18em] text-[#a6b7d0]/74">
                还没有属于你的星。先完成一次最小校准，再让它进入宇宙。
              </p>
            )}

            {formOpen ? (
              <div className="mt-8 space-y-6 border-t border-white/8 pt-6">
                <div>
                  <p className="text-xs tracking-[0.36em] text-[#93a7c5]/56">主频</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FREQUENCIES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPrimary(item.id);
                          setSecondary((current) => current.filter((value) => value !== item.id));
                        }}
                        className={`rounded-full border px-3 py-2 text-xs tracking-[0.18em] ${
                          primary === item.id
                            ? 'border-white/24 bg-white/10 text-white'
                            : 'border-white/10 text-[#a6b7d0]/82'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs tracking-[0.36em] text-[#93a7c5]/56">副频</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FREQUENCIES.filter((item) => item.id !== primary).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSecondaryToggle(item.id)}
                        className={`rounded-full border px-3 py-2 text-xs tracking-[0.18em] ${
                          secondary.includes(item.id)
                            ? 'border-white/18 bg-white/8 text-white'
                            : 'border-white/10 text-[#a6b7d0]/82'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs tracking-[0.36em] text-[#93a7c5]/56">状态</p>
                  <div className="mt-3 grid gap-2">
                    {STATES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentState(item.id)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm tracking-[0.14em] ${
                          currentState === item.id
                            ? 'border-white/18 bg-white/8 text-white'
                            : 'border-white/10 text-[#a6b7d0]/82'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={submitting}
                  className="w-full rounded-full border border-white/14 bg-white/[0.08] px-6 py-3 text-sm tracking-[0.3em] text-white disabled:opacity-50"
                >
                  {submitting ? '正在写入宇宙' : '生成我的星'}
                </button>
              </div>
            ) : null}

            {message ? (
              <p className="mt-6 text-sm tracking-[0.18em] text-[#b6c6dc]/78">{message}</p>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stars.map((star) => {
                const isMine = star.id === identity?.starId;

                return (
                  <article
                    key={star.id}
                    className="rounded-[1.75rem] border border-white/8 bg-white/[0.025] p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: star.color,
                          boxShadow: `0 0 18px ${star.color}`,
                        }}
                      />
                      <div>
                        <p className="text-sm tracking-[0.16em] text-white/92">
                          {frequencyLabel(star.primary_frequency)}
                          {isMine ? ' · 你的星' : ''}
                        </p>
                        <p className="mt-1 text-xs tracking-[0.2em] text-[#9eb1cd]/72">
                          {stateLabel(star.current_state)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-7 tracking-[0.16em] text-[#a6b7d0]/76">
                      副频：
                      {star.secondary_frequencies.length
                        ? star.secondary_frequencies.map(frequencyLabel).join(' · ')
                        : '只保留主频'}
                    </p>

                    {!isMine ? (
                      <button
                        type="button"
                        onClick={() => handleResonance(star.id)}
                        className="mt-5 rounded-full border border-white/12 px-4 py-2 text-xs tracking-[0.28em] text-white/88"
                      >
                        共振
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
