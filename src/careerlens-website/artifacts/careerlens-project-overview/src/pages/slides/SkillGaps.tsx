export default function SkillGaps() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text">
      <div className="absolute left-[6vw] top-[8vh] w-[88vw]">
        <h1 className="font-display text-[4.3vw] font-semibold leading-[1.08]">Make skill gaps actionable</h1>
      </div>
      <div className="absolute left-[6vw] top-[24vh] flex h-[63vh] w-[88vw] items-center bg-accent px-[4vw]">
        <div className="flex h-[47vh] w-[48vw] flex-col justify-between border-r-[0.2vw] border-primary/25 py-[1vh] pr-[4vw]">
          <p className="text-[2vw] font-medium leading-[1.35]">
            Choose a target career to identify skills missing from your profile
          </p>
          <p className="text-[2vw] font-medium leading-[1.35]">
            Build a saved roadmap at moderate or accelerated pace
          </p>
          <p className="text-[2vw] font-medium leading-[1.35]">
            Mark milestones complete and track learning progress
          </p>
        </div>
        <div className="relative ml-[4vw] h-[47vh] w-[31vw]" aria-hidden="true">
          <svg viewBox="0 0 620 500" className="h-full w-full" fill="none">
            <path d="M72 360C158 360 158 142 248 142C342 142 332 360 420 360C483 360 508 232 554 232" stroke="var(--slide-primary)" strokeWidth="12" strokeLinecap="round" />
            <path d="M72 360C158 360 158 142 248 142C342 142 332 360 420 360C483 360 508 232 554 232" stroke="var(--slide-bg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 20" />
            <circle cx="72" cy="360" r="38" fill="var(--slide-primary)" />
            <circle cx="248" cy="142" r="38" fill="var(--slide-bg)" stroke="var(--slide-primary)" strokeWidth="10" />
            <circle cx="420" cy="360" r="38" fill="var(--slide-bg)" stroke="var(--slide-primary)" strokeWidth="10" />
            <circle cx="554" cy="232" r="38" fill="var(--slide-primary)" />
            <path d="M56 361L68 373L90 347M232 143L244 155L266 129M404 361L416 373L438 347M538 233L550 245L572 219" stroke="var(--slide-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M62 416H130M218 198H286M390 416H458M524 288H592" stroke="var(--slide-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
          </svg>
        </div>
      </div>
      <div className="absolute left-[6vw] top-[19vh] h-[0.8vw] w-[11vw] bg-primary" aria-hidden="true" />
    </div>
  );
}
