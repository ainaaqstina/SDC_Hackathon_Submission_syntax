export default function EditableProfile() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text">
      <div className="absolute left-[6vw] top-[8vh] w-[88vw]">
        <h1 className="font-display text-[4.3vw] font-semibold leading-[1.08]">Start with an editable profile</h1>
      </div>
      <div className="absolute left-[6vw] top-[23vh] h-[67vh] w-[34vw] overflow-hidden bg-primary">
        <div className="absolute left-[4vw] top-[7vh] h-[53vh] w-[25vw] border-[0.2vw] border-bg/50 bg-bg p-[2.5vw]">
          <svg viewBox="0 0 420 520" className="h-full w-full" fill="none" aria-hidden="true">
            <rect x="20" y="18" width="118" height="118" rx="59" fill="var(--slide-accent)" />
            <path d="M55 82L78 104L108 52" stroke="var(--slide-primary)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M172 42H382M172 83H326M20 192H382M20 238H334M20 284H362" stroke="var(--slide-primary)" strokeWidth="13" strokeLinecap="round" opacity="0.78" />
            <path d="M20 354H124M152 354H256M284 354H382" stroke="var(--slide-accent)" strokeWidth="22" strokeLinecap="round" />
            <rect x="20" y="405" width="362" height="76" rx="12" fill="var(--slide-primary)" />
            <path d="M48 444H194M48 463H128" stroke="var(--slide-bg)" strokeWidth="9" strokeLinecap="round" opacity="0.82" />
            <circle cx="340" cy="443" r="21" fill="var(--slide-accent)" />
            <path d="M331 443L338 450L351 435" stroke="var(--slide-primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute bottom-[4vh] right-[3vw] h-[0.9vw] w-[14vw] bg-accent" />
      </div>
      <div className="absolute right-[6vw] top-[23vh] flex h-[67vh] w-[49vw] flex-col justify-between py-[2vh]">
        <p className="border-b border-primary/20 pb-[3vh] text-[2vw] font-medium leading-[1.35]">
          Qwen3-8B extracts skills and qualifications from an uploaded CV
        </p>
        <p className="border-b border-primary/20 pb-[3vh] text-[2vw] font-medium leading-[1.35]">
          Review and confirm profile details before using them
        </p>
        <p className="pb-[1vh] text-[2vw] font-medium leading-[1.35]">
          Confirm total experience directly instead of adding overlapping role durations
        </p>
      </div>
      <div className="absolute right-[6vw] top-[18vh] h-[0.7vw] w-[8vw] bg-accent" aria-hidden="true" />
    </div>
  );
}
