import type { FrequencyId } from '../lib/silent-resonance';
import { VISUAL_FREQUENCIES } from '../lib/universe-visuals';

type FrequencySelectionProps = {
  title: string;
  mode: 'primary' | 'secondary';
  options: typeof VISUAL_FREQUENCIES;
  primary: FrequencyId | '';
  secondary: FrequencyId[];
  onPrimarySelect: (value: FrequencyId) => void;
  onSecondaryToggle: (value: FrequencyId) => void;
};

export default function FrequencySelection({
  title,
  mode,
  options,
  primary,
  secondary,
  onPrimarySelect,
  onSecondaryToggle,
}: FrequencySelectionProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-[11px] tracking-[0.38em] text-steel/[0.62]">
          {mode === 'primary' ? '第一步 / 主频' : '第二步 / 副频'}
        </p>
        <h2 className="font-display text-[1.35rem] font-light leading-[1.8] tracking-[0.12em] text-mist/[0.92] sm:text-[1.45rem]">
          {title}
        </h2>
        {mode === 'secondary' ? (
          <p className="text-[13px] leading-7 tracking-[0.16em] text-steel/[0.74]">最多选择 3 个，像遥远边缘的一点余光</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((option) => {
          const isPrimary = primary === option.id;
          const isSecondary = secondary.includes(option.id as FrequencyId);
          const isDisabled = mode === 'secondary' && secondary.length >= 3 && !isSecondary;

          return (
            <button
              key={option.id}
              type="button"
              disabled={isDisabled}
              onClick={() =>
                mode === 'primary'
                  ? onPrimarySelect(option.id as FrequencyId)
                  : onSecondaryToggle(option.id as FrequencyId)
              }
              style={{
                borderColor: isPrimary || isSecondary ? `${option.color}66` : 'rgba(255,255,255,0.08)',
                background:
                  isPrimary || isSecondary
                    ? `radial-gradient(circle at 50% 22%, ${option.color}20, rgba(255,255,255,0.03) 70%)`
                    : 'rgba(255,255,255,0.03)',
                boxShadow: isPrimary || isSecondary ? `0 0 40px ${option.color}12` : 'none',
              }}
              className={`group relative overflow-hidden rounded-[1.5rem] border px-4 py-4 text-left backdrop-blur-xl transition duration-500 ${
                isDisabled ? 'cursor-not-allowed opacity-[0.35]' : 'hover:border-white/[0.16] hover:bg-white/[0.06]'
              }`}
            >
              <span
                className="absolute inset-x-5 top-0 h-px opacity-70"
                style={{
                  background: `linear-gradient(90deg, transparent, ${option.color}88, transparent)`,
                }}
              />
              <span
                className={`mb-4 block h-2.5 w-2.5 rounded-full transition duration-500 ${
                  isPrimary || isSecondary ? 'scale-110' : 'scale-100'
                }`}
                style={{
                  backgroundColor: option.color,
                  boxShadow: `0 0 18px ${option.color}99`,
                }}
              />
              <span className="block font-display text-[1rem] tracking-[0.16em] text-mist/[0.92] sm:text-[1.05rem]">
                {option.label}
              </span>
              <span className="mt-3 block text-[11px] tracking-[0.28em] text-steel/[0.55]">
                {mode === 'primary'
                  ? isPrimary
                    ? '正在成为主频'
                    : '可设为主频'
                  : isSecondary
                    ? '已环绕'
                    : '轻微环绕'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
