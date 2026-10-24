export default function WhatCouldChange() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text">
      <div className="absolute left-[6vw] top-[8vh] w-[88vw]">
        <h1 className="font-display text-[4.3vw] font-semibold leading-[1.08]">Explore what could change next</h1>
      </div>
      <div className="absolute left-[6vw] top-[23vh] flex h-[66vh] w-[50vw] flex-col justify-between py-[2vh]">
        <p className="border-b border-primary/20 pb-[2.5vh] text-[2vw] font-medium leading-[1.35]">
          Compare moderate and fast AI-disruption scenarios for a selected job
        </p>
        <p className="border-b border-primary/20 pb-[2.5vh] text-[2vw] font-medium leading-[1.35]">
          Use dated Future Skills Radar signals as directional context, not live job counts
        </p>
        <p className="text-[2vw] font-medium leading-[1.35]">
          See how careers connect with relevant UN Sustainable Development Goals
        </p>
      </div>
      <div className="absolute right-[6vw] top-[23vh] h-[66vh] w-[34vw] overflow-hidden bg-primary">
        <div className="absolute inset-x-0 top-[9vh] flex justify-center">
          <svg viewBox="0 0 520 420" className="h-[43vh] w-[26vw]" fill="none" aria-hidden="true">
            <circle cx="260" cy="210" r="157" stroke="var(--slide-bg)" strokeWidth="2" opacity="0.35" />
            <circle cx="260" cy="210" r="105" stroke="var(--slide-bg)" strokeWidth="2" opacity="0.35" />
            <path d="M260 34V386M84 210H436M136 86L384 334M384 86L136 334" stroke="var(--slide-bg)" strokeWidth="2" opacity="0.3" />
            <path d="M260 77L300 165L404 178L328 247L349 350L260 298L171 350L192 247L116 178L220 165L260 77Z" fill="var(--slide-accent)" fillOpacity="0.28" stroke="var(--slide-accent)" strokeWidth="7" strokeLinejoin="round" />
            <circle cx="260" cy="77" r="13" fill="var(--slide-accent)" />
            <circle cx="404" cy="178" r="13" fill="var(--slide-bg)" />
            <circle cx="349" cy="350" r="13" fill="var(--slide-accent)" />
            <circle cx="171" cy="350" r="13" fill="var(--slide-bg)" />
            <circle cx="116" cy="178" r="13" fill="var(--slide-accent)" />
            <circle cx="260" cy="210" r="21" fill="var(--slide-primary)" stroke="var(--slide-bg)" strokeWidth="5" />
          </svg>
        </div>
        <div className="absolute bottom-[7vh] left-[4vw] h-[0.8vw] w-[24vw] bg-accent" />
      </div>
    </div>
  );
}
