type HeroProps = {
  population: number;
  flowOpen: boolean;
  hasUserStar: boolean;
  onJoin: () => void;
};

export default function Hero({ population, flowOpen, hasUserStar, onJoin }: HeroProps) {
  const centerVisible = !hasUserStar;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      <div className="flex items-start justify-between gap-4 px-6 pb-6 pt-7 sm:px-10 sm:pt-10">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[10px] tracking-[0.52em] text-mist/[0.54] backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#9eb8da]/60 shadow-[0_0_18px_rgba(158,184,218,0.7)]" />
          <span>沉默宇宙</span>
        </div>

        <div className="hidden rounded-[1.25rem] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-right backdrop-blur-md sm:block">
          <p className="text-[10px] tracking-[0.42em] text-steel/[0.46]">此刻</p>
          <p className="mt-2 text-[12px] tracking-[0.22em] text-mist/[0.8]">{population} 人正在安静存在</p>
        </div>
      </div>

      <div
        className={`flex flex-1 items-start justify-center px-6 pt-[18vh] transition-all duration-1000 sm:px-8 ${
          centerVisible ? (flowOpen ? 'translate-y-2 opacity-[0.28]' : 'translate-y-0 opacity-100') : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="hero-reveal relative max-w-[36rem] text-center">
          <div className="mx-auto flex max-w-[24rem] items-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
            <p className="text-[10px] tracking-[0.5em] text-steel/[0.55]">不是匹配，是共振</p>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
          </div>

          <p className="mt-10 font-display text-[clamp(1.7rem,3.3vw,3.3rem)] font-light leading-[1.78] tracking-[0.18em] text-mist/[0.92]">
            <span className="block">在安静里</span>
            <span className="block">彼此感知</span>
          </p>

          <p className="mx-auto mt-7 max-w-[24rem] text-[12px] leading-7 tracking-[0.3em] text-steel/[0.7] sm:text-[14px]">
            让你的星，在这里缓慢发光
          </p>

          <div className="mt-9">
            <button
              type="button"
              onClick={onJoin}
              className={`rounded-full border border-white/[0.12] bg-[radial-gradient(circle_at_50%_0%,rgba(132,156,196,0.16),rgba(255,255,255,0.05)_62%)] px-8 py-3.5 text-[13px] tracking-[0.34em] text-mist/90 shadow-[0_0_45px_rgba(104,132,177,0.09)] backdrop-blur-xl transition duration-700 hover:border-white/[0.18] hover:bg-[radial-gradient(circle_at_50%_0%,rgba(132,156,196,0.2),rgba(255,255,255,0.08)_62%)] hover:text-white ${
                centerVisible ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              我也在这里
            </button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-4 text-[10px] tracking-[0.38em] text-steel/[0.48]">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-white/[0.08]" />
            <span>你的频率，只会轻微留下</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-white/[0.08]" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-7 left-6 hidden items-end gap-5 text-[10px] tracking-[0.38em] text-steel/[0.42] lg:flex">
        <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        <div className="space-y-2">
          <p>不是为了被看见</p>
          <p>只是为了被感知</p>
        </div>
      </div>
    </div>
  );
}
