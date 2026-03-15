import type { StateId } from '../lib/silent-resonance';
import { VISUAL_STATES } from '../lib/universe-visuals';

type StateSelectionProps = {
  title: string;
  options: typeof VISUAL_STATES;
  selected: StateId | '';
  onSelect: (value: StateId) => void;
};

export default function StateSelection({
  title,
  options,
  selected,
  onSelect,
}: StateSelectionProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-[11px] tracking-[0.38em] text-steel/[0.62]">第三步 / 状态</p>
        <h2 className="font-display text-[1.35rem] font-light leading-[1.8] tracking-[0.12em] text-mist/[0.92] sm:text-[1.45rem]">
          {title}
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = selected === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`relative overflow-hidden rounded-[1.45rem] border px-4 py-4 text-left backdrop-blur-xl transition duration-500 ${
                isActive
                  ? 'border-white/[0.16] bg-white/[0.07] shadow-[0_0_48px_rgba(128,156,192,0.08)]'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]'
              }`}
            >
              <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="block font-display text-[1rem] tracking-[0.14em] text-mist/[0.92] sm:text-[1.05rem]">
                {option.label}
              </span>
              <span className="mt-3 block text-[11px] tracking-[0.28em] text-steel/[0.58]">
                {isActive ? '此刻更靠近它' : '轻轻停留在这里'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
