import { useState, type CSSProperties } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown,
  CircleHelp, Clock3, Compass, FileText, Gauge, Leaf, ListChecks, Menu,
  PanelTop, Radar, Search, Settings, ShieldCheck, Sparkles, Target, TrendingUp, X,
} from "lucide-react";
import "./careerlensweeklyjourney.css";

const navigation = [
  { label: "Dashboard", icon: PanelTop },
  { label: "My Skills", icon: Gauge },
  { label: "Future Skills Radar", icon: Radar },
  { label: "Career Explorer", icon: Compass },
  { label: "My Learning Roadmap", icon: BookOpen, active: true },
  { label: "Future Scenarios", icon: TrendingUp },
  { label: "SDG Impact", icon: Leaf },
  { label: "My Progress", icon: ListChecks },
];

const initialMilestones = [
  { day: "MON", date: "17", title: "Map a research question", detail: "Turn a broad product challenge into a focused, testable question.", skill: "Research foundations", duration: "18 min", done: true },
  { day: "TUE", date: "18", title: "Choose the right method", detail: "Match interviews, surveys, and usability tests to the question you’re asking.", skill: "Method selection", duration: "24 min", done: true },
  { day: "WED", date: "19", title: "Write a discussion guide", detail: "Build neutral prompts that invite useful stories—not yes-or-no answers.", skill: "Interview craft", duration: "20 min", done: false, current: true },
  { day: "THU", date: "20", title: "Practice a five-minute interview", detail: "Try your guide out loud and notice where the conversation can open up.", skill: "Applied practice", duration: "15 min", done: false },
  { day: "FRI", date: "21", title: "Capture one clear insight", detail: "Synthesize a small observation into a useful next step for your team.", skill: "Insight synthesis", duration: "22 min", done: false },
];

export function CareerLensWeeklyJourney() {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [week, setWeek] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const completeCount = milestones.filter((item) => item.done).length;
  const weekLabel = week === 0 ? "17—21 February" : week < 0 ? "10—14 February" : "24—28 February";

  function toggleMilestone(index: number) {
    setMilestones((items) => items.map((item, i) => i === index ? { ...item, done: !item.done } : item));
  }

  return (
    <div className="clw-app">
      <aside className={`clw-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="clw-brand"><span className="clw-mark">c</span><span>careerlens</span></div>
        <button className="clw-workspace" onClick={() => setToast("Career workspace · Personal plan")}>
          <span className="clw-avatar">AM</span><span className="clw-workcopy"><b>Career workspace</b><small>Product &amp; research</small></span><ChevronDown size={15} />
        </button>
        <div className="clw-nav-label">WORKSPACE</div>
        <nav className="clw-nav">{navigation.map(({ label, icon: Icon, active }) => (
          <button key={label} className={`clw-navitem ${active ? "active" : ""}`} onClick={() => { if (!active) setToast(`${label} is ready to explore.`); setMenuOpen(false); }}>
            <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Future Skills Radar" && <i className="clw-nav-dot" />}
          </button>
        ))}</nav>
        <div className="clw-nav-label clw-support">SUPPORT</div>
        <nav className="clw-nav">
          <button className="clw-navitem" onClick={() => setToast("Settings are ready to explore.")}><Settings size={17} /><span>Settings</span></button>
          <button className="clw-navitem" onClick={() => setToast("CareerLens · career intelligence for your next move.")}><CircleHelp size={17} /><span>About CareerLens</span></button>
          <button className="clw-navitem" onClick={() => setToast("Your roadmap is built from practical, self-paced learning steps.")}><ShieldCheck size={17} /><span>Data sources</span></button>
        </nav>
        <div className="clw-sidebar-foot">
          <div className="clw-side-progress"><span>Your momentum</span><b>{Math.round((completeCount / milestones.length) * 100)}%</b></div>
          <div className="clw-side-bar"><i style={{ width: `${(completeCount / milestones.length) * 100}%` }} /></div>
          <div className="clw-user"><span className="clw-avatar">AM</span><span><b>Alex Morgan</b><small>Career workspace</small></span><ChevronDown size={14} /></div>
        </div>
      </aside>
      {menuOpen && <button className="clw-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="clw-main">
        <header className="clw-topbar">
          <button className="clw-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="clw-crumb"><span>CareerLens</span><b>/</b>My Learning Roadmap</div>
          <div className="clw-top-actions"><div className="clw-signal"><i /> Signal layer active</div>
            <button className="clw-icon-button" aria-label="Search" onClick={() => setToast("Search your skills, roles, and learning plan.")}><Search size={17} /></button>
            <button className="clw-upload" onClick={() => setToast("CV upload is ready for your profile.")}><FileText size={15} /><span>Upload CV</span></button>
          </div>
        </header>
        {toast && <div className="clw-toast" role="status">{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={14} /></button></div>}
        <div className="clw-content">
          <div className="clw-eyebrow"><span>YOUR LEARNING ROADMAP</span><i /> WEEKLY JOURNEY</div>
          <div className="clw-title-row">
            <div><h1>Small steps.<br className="clw-mobile-break" /> <em>Real momentum.</em></h1><p className="clw-intro">A thoughtful week of practice to grow your user research skills—one focused milestone at a time.</p></div>
            <div className="clw-week-switch">
              <button aria-label="Previous week" onClick={() => setWeek((value) => Math.max(-1, value - 1))}><ArrowLeft size={16} /></button>
              <span><CalendarDays size={15} /> {weekLabel}</span>
              <button aria-label="Next week" onClick={() => setWeek((value) => Math.min(1, value + 1))}><ArrowRight size={16} /></button>
            </div>
          </div>

          <section className="clw-week-card">
            <div className="clw-week-copy">
              <span className="clw-overline"><Sparkles size={14} /> THIS WEEK’S FOCUS</span>
              <h2>From good questions<br />to useful insights.</h2>
              <p>Build confidence in the research process, then put it to work on a real product question.</p>
              <div className="clw-focus-tags"><span><Target size={13} /> UX Researcher pathway</span><span><Clock3 size={13} /> About 20 min a day</span></div>
            </div>
            <div className="clw-week-progress">
              <div className="clw-progress-ring" style={{ "--progress": `${(completeCount / milestones.length) * 100}%` } as CSSProperties}>
                <div><b>{completeCount}<small>/5</small></b><span>STEPS DONE</span></div>
              </div>
              <p>{completeCount === 5 ? "Beautifully done. Your week is complete." : `${5 - completeCount} ${5 - completeCount === 1 ? "step" : "steps"} left in your week`}</p>
            </div>
            <div className="clw-week-index">01 <span>/ 04</span></div>
          </section>

          <div className="clw-journey-heading">
            <div><span className="clw-eyebrow">THE PLAN <i /> YOUR PACE</span><h2>Your week, at a glance</h2></div>
            <span className="clw-auto-label"><span /> A little progress adds up</span>
          </div>

          <section className="clw-journey" aria-label="Weekly learning milestones">
            {milestones.map((milestone, index) => (
              <article className={`clw-milestone ${milestone.done ? "is-done" : ""} ${milestone.current && !milestone.done ? "is-current" : ""}`} key={milestone.day}>
                <div className="clw-day"><b>{milestone.day}</b><span>{milestone.date}</span></div>
                <div className="clw-rail"><button className="clw-check" aria-label={`${milestone.done ? "Mark incomplete" : "Mark complete"}: ${milestone.title}`} onClick={() => toggleMilestone(index)}>{milestone.done ? <Check size={16} /> : <span />}</button>{index < milestones.length - 1 && <i />}</div>
                <div className="clw-milestone-card">
                  <div className="clw-milestone-content">
                    <div className="clw-milestone-meta"><span className="clw-skill-tag">{milestone.skill}</span>{milestone.current && !milestone.done && <span className="clw-today">UP NEXT</span>}</div>
                    <h3>{milestone.title}</h3><p>{milestone.detail}</p>
                    <div className="clw-duration"><Clock3 size={13} /> {milestone.duration} <span>·</span> self-paced</div>
                  </div>
                  <button className={`clw-step-action ${milestone.done ? "completed" : ""}`} onClick={() => toggleMilestone(index)}>{milestone.done ? <><Check size={15} /> Completed</> : <>View milestone <ArrowRight size={15} /></>}</button>
                </div>
              </article>
            ))}
          </section>

          <section className="clw-encouragement">
            <span className="clw-encourage-icon"><BookOpen size={19} /></span>
            <div><b>Make this week yours.</b><p>Missed a day? No catch-up required. Pick up wherever you are.</p></div>
            <button onClick={() => setToast("Your milestones are flexible—continue whenever you’re ready.")}>How the roadmap works <ArrowRight size={15} /></button>
          </section>
          <footer className="clw-footer"><span><ShieldCheck size={14} /> Your profile stays yours. You choose what to confirm.</span><span>Built around your goals, not a deadline.</span></footer>
        </div>
      </main>
    </div>
  );
}
