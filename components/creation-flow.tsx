import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import type { FrequencyId, StateId } from '../lib/silent-resonance';
import {
  VISUAL_FREQUENCIES,
  VISUAL_STATES,
  buildStarAppearance,
  formatSecondary,
  getFrequencyById,
  getStateLabel,
  type VisualStar,
  withAlpha,
} from '../lib/universe-visuals';
import FrequencySelection from './frequency-selection';
import StateSelection from './state-selection';

type CreationPayload = {
  primary: FrequencyId;
  secondary: FrequencyId[];
  state: StateId;
};

type CreationFlowProps = {
  existingStar: VisualStar | null;
  submitting: boolean;
  onClose: () => void;
  onComplete: (payload: CreationPayload) => void | Promise<void>;
};

type CSSVariables = CSSProperties & Record<string, string | number>;

const FALLBACK_FREQUENCY_ID: FrequencyId = 'cosmos';
const SELECTABLE_FREQUENCIES = VISUAL_FREQUENCIES.filter((item) => item.selectable !== false);

export default function CreationFlow({
  existingStar,
  submitting,
  onClose,
  onComplete,
}: CreationFlowProps) {
  const [step, setStep] = useState(0);
  const [primary, setPrimary] = useState<FrequencyId | ''>(
    existingStar?.primary && existingStar.primary !== 'dormant' ? existingStar.primary : '',
  );
  const [secondary, setSecondary] = useState<FrequencyId[]>(existingStar?.secondary ?? []);
  const [state, setState] = useState<StateId | ''>(existingStar?.state ?? '');

  const currentFrequency =
    getFrequencyById(primary || FALLBACK_FREQUENCY_ID) ??
    SELECTABLE_FREQUENCIES.find((item) => item.id === FALLBACK_FREQUENCY_ID) ??
    SELECTABLE_FREQUENCIES[0];

  const availableSecondary = SELECTABLE_FREQUENCIES.filter((item) => item.id !== primary);

  const previewAppearance = useMemo(
    () =>
      buildStarAppearance({
        primary: currentFrequency.id,
        secondary,
        isUser: true,
      }),
    [currentFrequency.id, secondary],
  );
  const isStepUnlocked = (index: number) => {
    if (index === 0) {
      return true;
    }

    if (index === 1 || index === 2) {
      return Boolean(primary);
    }

    return Boolean(primary && state);
  };

  const steps = [
    {
      id: 'primary',
      indexLabel: '01',
      railLabel: '主频',
      whisper: '先确认一个长期稳定的中心。',
      canNext: Boolean(primary),
      content: (
        <FrequencySelection
          title="哪一种频率，最接近你长期发出的波？"
          mode="primary"
          options={SELECTABLE_FREQUENCIES}
          primary={primary}
          secondary={secondary}
          onPrimarySelect={(value) => {
            setPrimary(value);
            setSecondary((current) => current.filter((item) => item !== value));
          }}
          onSecondaryToggle={() => {}}
        />
      ),
    },
    {
      id: 'secondary',
      indexLabel: '02',
      railLabel: '副频',
      whisper: '边缘会留下轻微混合，但不会喧宾夺主。',
      canNext: true,
      content: (
        <FrequencySelection
          title="还有哪些微弱频率，常常环绕着你？"
          mode="secondary"
          options={availableSecondary}
          primary={primary}
          secondary={secondary}
          onPrimarySelect={() => {}}
          onSecondaryToggle={(value) => {
            setSecondary((current) => {
              if (current.includes(value)) {
                return current.filter((item) => item !== value);
              }

              if (current.length >= 3) {
                return current;
              }

              return [...current, value];
            });
          }}
        />
      ),
    },
    {
      id: 'state',
      indexLabel: '03',
      railLabel: '状态',
      whisper: '此刻的安静，会改变这颗星向外发散的方式。',
      canNext: Boolean(state),
      content: (
        <StateSelection
          title="此刻，你更接近哪一种安静？"
          options={VISUAL_STATES}
          selected={state}
          onSelect={setState}
        />
      ),
    },
    {
      id: 'preview',
      indexLabel: '04',
      railLabel: '生成',
      whisper: '确认之后，它会回到宇宙，在边界上缓慢发光。',
      canNext: Boolean(primary && state),
      content: (
        <section className="space-y-8">
          <div className="space-y-3">
            <p className="text-[11px] tracking-[0.38em] text-steel/[0.62]">第四步 / 生成</p>
            <h2 className="font-display text-2xl font-light leading-[1.8] tracking-[0.12em] text-mist/[0.92]">
              让这颗星，缓慢成形
            </h2>
            <p className="max-w-[33rem] text-sm leading-8 tracking-[0.18em] text-steel/[0.72]">
              它不会展示更多资料，也不会发出过大的声音。它只会以自己的主频、边缘色和当下状态，在宇宙里持续存在。
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.9rem] border border-white/[0.08] bg-white/[0.03] px-5 py-5 backdrop-blur-2xl">
              <p className="text-[10px] tracking-[0.34em] text-steel/[0.52]">主频</p>
              <p className="mt-4 font-display text-[1.35rem] tracking-[0.16em] text-mist/[0.94]">
                {primary ? getFrequencyById(primary)?.label : '尚未校准'}
              </p>
            </div>
            <div className="rounded-[1.9rem] border border-white/[0.08] bg-white/[0.03] px-5 py-5 backdrop-blur-2xl">
              <p className="text-[10px] tracking-[0.34em] text-steel/[0.52]">副频</p>
              <p className="mt-4 text-sm leading-7 tracking-[0.18em] text-mist/[0.8]">{formatSecondary(secondary)}</p>
            </div>
            <div className="rounded-[1.9rem] border border-white/[0.08] bg-white/[0.03] px-5 py-5 backdrop-blur-2xl">
              <p className="text-[10px] tracking-[0.34em] text-steel/[0.52]">状态</p>
              <p className="mt-4 text-sm tracking-[0.18em] text-mist/[0.8]">{state ? getStateLabel(state) : '尚未停留'}</p>
            </div>
          </div>

          <div className="rounded-[2.1rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] px-6 py-6 backdrop-blur-2xl">
            <p className="text-[10px] tracking-[0.38em] text-steel/[0.5]">生成之后</p>
            <p className="mt-4 max-w-[34rem] text-sm leading-8 tracking-[0.18em] text-steel/[0.72]">
              你会回到宇宙之中。别人只会在靠近时，短暂看见你的主频、副频与当下状态。连接仍然保持轻微。
            </p>
          </div>
        </section>
      ),
    },
  ];

  const activeStep = steps[step];
  const panelStyle = {
    '--creation-glow': withAlpha(currentFrequency.color, primary ? 0.18 : 0.08),
    '--creation-line': withAlpha(currentFrequency.color, primary ? 0.26 : 0.12),
    '--creation-accent': withAlpha(previewAppearance.edgeColor, secondary.length ? 0.16 : 0.08),
  } as CSSVariables;

  const previewStarStyle = {
    '--star-color': previewAppearance.primary.color,
    '--star-core-glow': previewAppearance.coreGlow,
    '--star-halo-glow': previewAppearance.haloGlow,
    '--ring-color': previewAppearance.ringColor,
    '--ring-glow': previewAppearance.ringGlow,
    '--ripple-duration': `${previewAppearance.primary.ripple}s`,
    '--pulse-duration': `${previewAppearance.pulseDuration}s`,
    '--halo-duration': `${previewAppearance.haloDuration}s`,
    '--pulse-scale': previewAppearance.pulseScale,
    '--halo-scale': previewAppearance.haloScale,
    '--aura-opacity': previewAppearance.auraOpacity,
    '--shell-opacity': previewAppearance.shellOpacity,
    '--ripple-scale': previewAppearance.rippleScale,
    '--ripple-opacity': previewAppearance.rippleOpacity,
    '--sheen-duration': `${previewAppearance.sheenDuration}s`,
  } as CSSVariables;

  const summaryRows = [
    {
      label: '主频',
      value: primary ? getFrequencyById(primary)?.label : '尚未校准',
      active: Boolean(primary),
    },
    {
      label: '副频',
      value: formatSecondary(secondary),
      active: Boolean(secondary.length),
    },
    {
      label: '状态',
      value: state ? getStateLabel(state) : '尚未停留',
      active: Boolean(state),
    },
  ];

  return (
    <div className="fixed inset-0 z-40 px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,17,0.44),rgba(3,7,17,0.86))] backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-full items-center justify-center">
        <div
          className="creation-shell relative flex h-full max-h-[calc(100vh-1.5rem)] w-full max-w-[74rem] flex-col overflow-hidden rounded-[2.2rem] border border-white/[0.08] shadow-ether lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]"
          style={panelStyle}
        >
          <div className="creation-shell-glow absolute inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

          <aside className="relative flex min-h-0 flex-col overflow-y-auto border-b border-white/[0.08] px-4 py-4 sm:px-5 sm:py-5 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-2">
                <p className="text-[10px] tracking-[0.46em] text-steel/[0.52]">成为一颗星</p>
                <p className="max-w-[15rem] text-[13px] leading-6 tracking-[0.16em] text-mist/[0.74]">不需要解释，只需要校准你的频率</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/[0.1] px-4 py-2 text-[10px] tracking-[0.34em] text-steel/[0.66] transition duration-500 hover:border-white/[0.16] hover:text-mist/[0.82]"
              >
                回到宇宙
              </button>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 lg:grid-cols-1">
              {steps.map((item, index) => {
                const active = index === step;
                const completed = index < step;
                const unlocked = isStepUnlocked(index);

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setStep(index)}
                    className={`group rounded-[1.25rem] border px-3 py-2.5 text-left transition duration-500 ${
                      active
                        ? 'border-white/[0.14] bg-white/[0.07]'
                        : completed
                          ? 'border-white/[0.08] bg-white/[0.03]'
                          : 'border-white/[0.05] bg-white/[0.015]'
                    } ${unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-[0.38]'}`}
                  >
                    <p className="text-[10px] tracking-[0.34em] text-steel/[0.48]">{item.indexLabel}</p>
                    <p
                      className={`mt-2 font-display text-[0.95rem] tracking-[0.14em] transition duration-500 ${
                        active ? 'text-mist/[0.92]' : completed ? 'text-mist/[0.72]' : 'text-steel/[0.48]'
                      }`}
                    >
                      {item.railLabel}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="creation-preview-field mt-4 flex items-center justify-center rounded-[1.7rem] border border-white/[0.07] px-3 py-3">
              <div className="creation-preview-core relative flex h-[14.75rem] w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-[1.6rem]">
                <div className="creation-preview-stage relative flex h-[13.25rem] w-[13.25rem] items-center justify-center">
                  <div
                    className="absolute h-[16rem] w-[16rem] rounded-full blur-3xl"
                    style={{
                      background: `radial-gradient(circle, ${withAlpha(previewAppearance.primary.color, primary ? 0.2 : 0.08)}, transparent 66%)`,
                    }}
                  />
                  <div className="creation-preview-ring absolute inset-[4%] rounded-full border border-white/[0.05]" />
                  <div className="creation-preview-ring creation-preview-ring-slow absolute inset-[15%] rounded-full border border-white/[0.045]" />
                  <div className="creation-preview-ring creation-preview-ring-delayed absolute inset-[26%] rounded-full border border-white/[0.04]" />
                  <div className="creation-preview-ring creation-preview-ring-soft absolute inset-[37%] rounded-full border border-white/[0.035]" />

                  <div className="relative h-[7rem] w-[7rem]" style={previewStarStyle}>
                    <span className="star-aura absolute inset-1/2 h-[8.4rem] w-[8.4rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
                    <span className="star-halo absolute inset-1/2 h-[5.6rem] w-[5.6rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
                    <span className="star-shell absolute inset-1/2 h-[3.1rem] w-[3.1rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
                    <span className="star-sheen absolute inset-1/2 h-[4.4rem] w-[4.4rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
                    <span className="star-core absolute inset-1/2 h-[0.85rem] w-[0.85rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
                    {[0, 1, 2, 3].map((ring) => (
                      <span
                        key={ring}
                        className="ripple-ring absolute inset-1/2 h-[3rem] w-[3rem] -translate-x-1/2 -translate-y-1/2 rounded-full border"
                        style={{
                          animationDelay: `${ring * (previewAppearance.primary.ripple / 4.2)}s`,
                        }}
                      />
                    ))}
                    <span className="user-star-shell absolute inset-1/2 h-[5rem] w-[5rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
                  </div>
                </div>

                <div className="absolute bottom-4 left-1/2 w-[84%] -translate-x-1/2 text-center">
                  <p className="text-[10px] tracking-[0.42em] text-steel/[0.46]">{activeStep.indexLabel}</p>
                  <p className="mt-2 text-[12px] leading-6 tracking-[0.14em] text-steel/[0.68]">{activeStep.whisper}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-white/[0.06] bg-white/[0.02] p-3 backdrop-blur-xl">
              {summaryRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`flex items-start justify-between gap-4 py-2.5 ${
                    index < summaryRows.length - 1 ? 'border-b border-white/[0.06]' : ''
                  }`}
                >
                  <p className="shrink-0 pt-0.5 text-[10px] tracking-[0.34em] text-steel/[0.48]">{row.label}</p>
                  <p
                    className={`text-right text-[12px] leading-6 tracking-[0.14em] ${
                      row.active ? 'text-mist/[0.8]' : 'text-steel/[0.52]'
                    }`}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </aside>

          <section className="relative flex min-h-0 flex-col px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-end justify-between gap-6 border-b border-white/[0.08] pb-4">
              <div className="space-y-2">
                <p className="text-[10px] tracking-[0.46em] text-steel/[0.5]">静默校准中</p>
                <p className="text-[13px] leading-6 tracking-[0.16em] text-mist/[0.74]">每一次选择，都只轻微改变这颗星发光的方式</p>
              </div>
              <p className="text-[11px] tracking-[0.34em] text-steel/[0.46]">{activeStep.indexLabel} / 04</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-6">
              <div key={activeStep.id} className="creation-step-scene">
                {activeStep.content}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className={`rounded-full px-4 py-3 text-[11px] tracking-[0.3em] transition duration-500 ${
                  step === 0 ? 'cursor-not-allowed text-steel/[0.28]' : 'text-steel/[0.72] hover:text-mist/[0.82]'
                }`}
                disabled={step === 0}
              >
                向前回看
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  disabled={!activeStep.canNext}
                  onClick={() => setStep((current) => current + 1)}
                  className={`rounded-full border px-6 py-3 text-[11px] tracking-[0.36em] backdrop-blur-xl transition duration-500 ${
                    activeStep.canNext
                      ? 'border-white/[0.12] bg-white/[0.07] text-mist/[0.9] hover:border-white/[0.18] hover:bg-white/[0.1]'
                      : 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-steel/[0.34]'
                  }`}
                >
                  继续靠近
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!primary || !state) {
                      return;
                    }

                    void onComplete({ primary, secondary, state });
                  }}
                  disabled={submitting || !primary || !state}
                  className="rounded-full border px-6 py-3 text-[11px] tracking-[0.36em] text-mist/[0.92] backdrop-blur-xl transition duration-500 hover:border-white/[0.18] hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-55"
                  style={{
                    borderColor: withAlpha(previewAppearance.primary.color, 0.32),
                    background: `radial-gradient(circle at 50% 0%, ${withAlpha(previewAppearance.primary.color, 0.16)}, rgba(255,255,255,0.05) 68%)`,
                    boxShadow: `0 0 50px ${withAlpha(previewAppearance.primary.color, 0.1)}`,
                  }}
                >
                  {submitting ? '正在写入宇宙' : '生成我的星'}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
