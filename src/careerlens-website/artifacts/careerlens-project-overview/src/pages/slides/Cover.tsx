export default function Cover() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg text-text">
      <div className="absolute inset-y-0 left-0 w-[61vw] bg-primary" />
      <div className="absolute inset-y-0 left-[61vw] w-[0.8vw] bg-accent" />
      <div className="absolute left-[6vw] top-[8vh] z-10 w-[50vw]">
        <h1 className="font-display text-[7.6vw] font-bold leading-[0.98] text-bg">CareerLens</h1>
        <p className="mt-[3.2vh] max-w-[48vw] text-[2.6vw] font-medium leading-[1.22] text-bg">
          A clearer route to your next role.
        </p>
        <div className="mt-[8vh] flex flex-col gap-[2.6vh] text-[2.05vw] font-medium leading-[1.22] text-bg">
          <p className="flex items-center gap-[1.2vw]">
            <span className="h-[0.8vw] w-[0.8vw] shrink-0 bg-accent" />
            Review the skills in your experience
          </p>
          <p className="flex items-center gap-[1.2vw]">
            <span className="h-[0.8vw] w-[0.8vw] shrink-0 bg-accent" />
            Explore explainable career directions
          </p>
          <p className="flex items-center gap-[1.2vw]">
            <span className="h-[0.8vw] w-[0.8vw] shrink-0 bg-accent" />
            Turn a target role into a learning plan
          </p>
        </div>
      </div>
      <div className="absolute right-[5vw] top-[17vh] h-[68vh] w-[31vw]" aria-hidden="true">
        <svg viewBox="0 0 620 700" className="h-full w-full" fill="none">
          <path d="M100 560C120 430 220 430 258 320C300 200 390 220 420 130C440 72 492 60 540 70" stroke="var(--slide-primary)" strokeWidth="12" strokeLinecap="round" />
          <path d="M100 560C120 430 220 430 258 320C300 200 390 220 420 130C440 72 492 60 540 70" stroke="var(--slide-accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 24" />
          <circle cx="100" cy="560" r="34" fill="var(--slide-accent)" />
          <circle cx="258" cy="320" r="28" fill="var(--slide-bg)" stroke="var(--slide-primary)" strokeWidth="10" />
          <circle cx="420" cy="130" r="28" fill="var(--slide-bg)" stroke="var(--slide-primary)" strokeWidth="10" />
          <circle cx="540" cy="70" r="38" fill="var(--slide-primary)" />
          <path d="M540 42L548 65L571 70L548 77L540 100L532 77L509 70L532 65L540 42Z" fill="var(--slide-accent)" />
          <path d="M76 601L100 578L124 601" stroke="var(--slide-primary)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M508 165L540 133L572 165" stroke="var(--slide-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M125 620H235M290 354H390M452 174H535" stroke="var(--slide-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.28" />
        </svg>
      </div>
      <div className="absolute bottom-[7vh] right-[6vw] h-[0.8vw] w-[18vw] bg-accent" aria-hidden="true" />
    </div>
  );
}
