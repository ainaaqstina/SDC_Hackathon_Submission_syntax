import { useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Compass, FileUp, ListChecks, ScanSearch, Sprout } from 'lucide-react';
import './landing.css';

const steps = [
  { icon: FileUp, title: 'Share a CV, or look around first', body: 'Upload a PDF, or open a demonstration profile to see how everything works before sharing anything.' },
  { icon: ScanSearch, title: 'Review what was read', body: 'You check and correct the profile before it is used. Nothing is built on details you have not confirmed.' },
  { icon: Compass, title: 'See directions, with reasons', body: 'Each career direction shows which of your skills fit and which are missing, so you can judge it yourself.' },
  { icon: ListChecks, title: 'Take one learning step', body: 'Choose a direction and get a short roadmap of learning steps you can tick off at your own pace.' },
];

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.title = 'CareerLens | A gentle start to your next career step';
    if (localStorage.getItem('careerlens-theme') === 'dark') document.documentElement.classList.add('dark');
    const els = root.current?.querySelectorAll('.ll-reveal') ?? [];
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => entries.forEach((entry) => {
        entry.target.classList.toggle('in', entry.isIntersecting);
      }), { threshold: 0.15 });
      els.forEach((element) => io?.observe(element));
    } else {
      els.forEach((element) => element.classList.add('in'));
    }

    let frame = 0;
    const updateScrollMotion = () => {
      frame = 0;
      const page = root.current;
      if (!page) return;
      const shift = Math.max(-24, Math.min(0, window.scrollY * -0.045));
      page.style.setProperty('--ll-art-shift', `${shift.toFixed(1)}px`);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollMotion);
    };

    updateScrollMotion();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="ll" ref={root} data-testid="page-landing">
      <header className="ll-nav">
        <span className="ll-brand" data-testid="text-landing-brand">
          <span className="ll-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" focusable="false">
              <path d="M9.5 25.5c3.1-4.1 5.7-10.3 10.4-10.1 4.2.1 5.3 6.5 10.6 4.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="9.5" cy="25.5" r="4.4" fill="#164b3b" stroke="currentColor" strokeWidth="1.9" />
              <circle cx="20" cy="15.5" r="4.2" fill="#164b3b" stroke="#f2f3e8" strokeWidth="1.9" />
              <circle cx="30.5" cy="19.5" r="4.4" fill="currentColor" stroke="currentColor" strokeWidth="1.9" />
              <circle cx="30.5" cy="19.5" r="1.25" fill="#164b3b" />
            </svg>
          </span>
          careerlens
        </span>
        <Link href="/dashboard" className="ll-btn ll-btn-main ll-workspace-button" data-testid="link-landing-dashboard">Go to my workspace <ArrowRight size={16} aria-hidden="true" /></Link>
      </header>

      <main>
        <section className="ll-hero">
          <div className="ll-hero-copy">
            <p className="ll-eyebrow ll-rise" style={{ ['--d' as string]: '0ms' }}>Not sure what comes next? That is a fine place to start.</p>
            <h1 className="ll-rise" style={{ ['--d' as string]: '100ms' }} data-testid="text-landing-title">One calm step at a time toward your next role.</h1>
            <p className="ll-lede ll-rise" style={{ ['--d' as string]: '200ms' }} data-testid="text-landing-lede">
              CareerLens reads a CV profile that you review, then shows career directions with the reasons behind them, plus learning steps to try. It suggests. It does not predict whether anyone will hire you.
            </p>
            <div className="ll-actions ll-rise" style={{ ['--d' as string]: '300ms' }}>
              <Link href="/dashboard?entry=upload" className="ll-btn ll-btn-main" data-testid="link-landing-upload"><FileUp size={18} aria-hidden="true" /> Upload your CV</Link>
              <Link href="/dashboard?entry=demo" className="ll-btn ll-btn-soft" data-testid="link-landing-demo">Explore demo <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
            <p className="ll-note ll-rise" style={{ ['--d' as string]: '400ms' }} data-testid="text-landing-note">No rush. The demo uses sample profiles, so you can look around without sharing anything.</p>
          </div>
          <div className="ll-art" aria-hidden="true">
            <svg viewBox="0 0 420 420" fill="none">
              <circle className="ll-ring ll-ring-a" cx="210" cy="210" r="170" />
              <circle className="ll-ring ll-ring-b" cx="210" cy="210" r="115" />
              <circle className="ll-ring ll-ring-c" cx="210" cy="210" r="62" />
              <path className="ll-path" d="M60 330C130 300 150 230 215 215S330 190 372 110" />
              <circle cx="60" cy="330" r="13" className="ll-n1" />
              <circle cx="215" cy="215" r="17" className="ll-n2" />
              <circle cx="372" cy="110" r="22" className="ll-n3" />
              <circle cx="372" cy="110" r="7" className="ll-n4" />
            </svg>
            <span className="ll-tag ll-tag-1">Where you are</span>
            <span className="ll-tag ll-tag-2">A first step</span>
            <span className="ll-tag ll-tag-3">A direction</span>
          </div>
        </section>

        <section className="ll-section ll-reveal" aria-labelledby="ll-how">
          <p className="ll-eyebrow">How it goes</p>
          <h2 id="ll-how">Four small steps, and you decide the pace.</h2>
          <ol className="ll-steps">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="ll-step" data-testid={`card-landing-step-${i + 1}`}>
                <span className="ll-step-n">{i + 1}</span>
                <Icon size={22} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="ll-section ll-split ll-reveal" aria-labelledby="ll-honest">
          <div>
            <p className="ll-eyebrow">What to expect</p>
            <h2 id="ll-honest">Explanations you can question.</h2>
          </div>
          <div className="ll-honest-list">
            <p data-testid="text-landing-point-explain"><Sprout size={18} aria-hidden="true" /> Directions come with the matching and missing skills, not just a score.</p>
            <p data-testid="text-landing-point-review"><Sprout size={18} aria-hidden="true" /> You review your profile before it is saved, and can edit it later.</p>
            <p data-testid="text-landing-point-demo"><Sprout size={18} aria-hidden="true" /> Demonstration profiles are labelled as samples, separate from a CV you upload yourself.</p>
          </div>
        </section>

        <section className="ll-final ll-reveal" aria-labelledby="ll-final">
          <h2 id="ll-final">Ready when you are.</h2>
          <p>Pick whichever feels lighter today.</p>
          <div className="ll-actions ll-center">
            <Link href="/dashboard?entry=upload" className="ll-btn ll-btn-lime" data-testid="link-landing-upload-footer"><FileUp size={18} aria-hidden="true" /> Upload your CV</Link>
            <Link href="/dashboard?entry=demo" className="ll-btn ll-btn-ghost" data-testid="link-landing-demo-footer">Explore demo</Link>
          </div>
          <Link href="/dashboard" className="ll-resume" data-testid="link-landing-resume">Already started? Continue to your workspace</Link>
        </section>
      </main>
    </div>
  );
}
