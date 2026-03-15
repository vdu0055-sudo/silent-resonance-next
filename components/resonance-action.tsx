import { getFrequencyById, type VisualStar } from '../lib/universe-visuals';

type ResonanceActionProps = {
  star: VisualStar | null;
  position: {
    x: number;
    y: number;
  };
  onResonate: () => void;
};

export default function ResonanceAction({
  star,
  position,
  onResonate,
}: ResonanceActionProps) {
  if (!star) {
    return null;
  }

  const primary = getFrequencyById(star.primary);

  return (
    <div
      className="fixed z-50 overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,13,24,0.94),rgba(6,10,20,0.82))] px-4 py-4 shadow-[0_16px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -140%)',
      }}
    >
      <span
        className="absolute inset-x-5 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${primary?.color ?? '#89a2c3'}66, transparent)`,
        }}
      />
      <div className="mb-3 flex items-center gap-3">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: primary?.color ?? '#89a2c3',
            boxShadow: `0 0 16px ${primary?.color ?? '#89a2c3'}aa`,
          }}
        />
        <span className="text-[10px] tracking-[0.42em] text-steel/[0.56]">轻微连接</span>
      </div>
      <button
        type="button"
        onClick={onResonate}
        className="rounded-full border border-white/[0.12] bg-[radial-gradient(circle_at_50%_0%,rgba(126,148,188,0.16),rgba(255,255,255,0.05)_68%)] px-5 py-3 text-[11px] tracking-[0.36em] text-mist/[0.92] transition duration-500 hover:border-white/[0.18] hover:bg-[radial-gradient(circle_at_50%_0%,rgba(126,148,188,0.2),rgba(255,255,255,0.08)_68%)]"
      >
        共振
      </button>
    </div>
  );
}
