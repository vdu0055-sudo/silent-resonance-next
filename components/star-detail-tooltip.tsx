import { formatSecondary, getFrequencyById, getStateLabel, type VisualStar } from '../lib/universe-visuals';

type StarDetailTooltipProps = {
  star: VisualStar | null;
  position: {
    x: number;
    y: number;
  };
};

export default function StarDetailTooltip({ star, position }: StarDetailTooltipProps) {
  if (!star) {
    return null;
  }

  const primary = getFrequencyById(star.primary);
  const primaryLabel = star.isCalibrated ? primary?.label : '尚未显露';
  const secondaryLabel = star.isCalibrated ? formatSecondary(star.secondary) : '仍未显露';
  const stateLabel = star.isCalibrated ? getStateLabel(star.state) : '只是安静存在';

  return (
    <div
      className="pointer-events-none fixed z-40 hidden min-w-[16rem] overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,13,24,0.92),rgba(6,10,20,0.78))] px-4 py-4 text-sm shadow-[0_16px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:block"
      style={{
        left: `${position.x + 18}px`,
        top: `${position.y + 18}px`,
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
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: primary?.color ?? '#89a2c3',
            boxShadow: `0 0 18px ${primary?.color ?? '#89a2c3'}bb`,
          }}
        />
        <span className="font-display text-base tracking-[0.14em] text-mist/[0.92]">{primaryLabel}</span>
      </div>
      <div className="space-y-2 text-[11px] leading-6 tracking-[0.22em] text-steel/[0.68]">
        <p>副频：{secondaryLabel}</p>
        <p>状态：{stateLabel}</p>
      </div>
    </div>
  );
}
