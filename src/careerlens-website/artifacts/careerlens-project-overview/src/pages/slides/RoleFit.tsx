export default function RoleFit() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text">
      <div className="absolute left-[6vw] top-[8vh] w-[88vw]">
        <h1 className="font-display text-[4.3vw] font-semibold leading-[1.08]">See why a role may fit</h1>
        <p className="mt-[2vh] max-w-[75vw] text-[2vw] leading-[1.35]">
          Match score: 60% skills, 25% stated interests, 15% directional trend alignment
        </p>
      </div>
      <div className="absolute left-[6vw] top-[36vh] flex h-[47vh] w-[38vw] items-center justify-center bg-primary">
        <svg viewBox="0 0 620 500" className="h-[40vh] w-[35vw]" fill="none" aria-hidden="true">
          <circle cx="310" cy="250" r="170" stroke="var(--slide-bg)" strokeWidth="34" opacity="0.22" />
          <circle cx="310" cy="250" r="170" stroke="var(--slide-accent)" strokeWidth="34" strokeDasharray="640 1068" strokeLinecap="butt" transform="rotate(-90 310 250)" />
          <circle cx="310" cy="250" r="170" stroke="#a8c7b5" strokeWidth="34" strokeDasharray="267 1068" strokeDashoffset="-650" transform="rotate(-90 310 250)" />
          <circle cx="310" cy="250" r="170" stroke="#e5ead9" strokeWidth="34" strokeDasharray="160 1068" strokeDashoffset="-926" transform="rotate(-90 310 250)" />
          <path d="M310 68V130M492 250H432M310 432V370M128 250H188" stroke="var(--slide-bg)" strokeWidth="5" opacity="0.6" />
          <circle cx="310" cy="250" r="94" fill="var(--slide-bg)" />
          <path d="M274 259L300 285L352 215" stroke="var(--slide-primary)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="absolute right-[6vw] top-[37vh] flex h-[47vh] w-[43vw] flex-col justify-between py-[3vh]">
        <p className="border-b border-primary/20 pb-[3vh] text-[2vw] font-medium leading-[1.35]">
          Education and experience inform the explanation without blocking cross-domain roles
        </p>
        <p className="text-[2vw] font-medium leading-[1.35]">
          Scores are alignment signals, not hiring predictions
        </p>
      </div>
      <div className="absolute bottom-[7vh] left-[6vw] flex w-[88vw] items-center gap-[1.4vw]" aria-hidden="true">
        <div className="h-[0.7vw] w-[60%] bg-accent" />
        <div className="h-[0.7vw] w-[25%] bg-primary" />
        <div className="h-[0.7vw] w-[15%] bg-primary/25" />
      </div>
    </div>
  );
}
