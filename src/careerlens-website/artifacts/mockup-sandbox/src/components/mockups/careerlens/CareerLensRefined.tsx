import { useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown,
  CircleHelp, Compass, FileText, Gauge, Leaf, ListChecks, Menu, PanelTop, Radar,
  Search, Settings, ShieldCheck, Sparkles, TrendingUp, X,
} from "lucide-react";
import "./careerlensrefined.css";

const nav = [
  { name: "Dashboard", icon: PanelTop },
  { name: "My Skills", icon: Gauge },
  { name: "Future Skills Radar", icon: Radar },
  { name: "Career Explorer", icon: Compass },
  { name: "My Learning Roadmap", icon: BookOpen },
  { name: "Future Scenarios", icon: TrendingUp },
  { name: "SDG Impact", icon: Leaf },
  { name: "My Progress", icon: ListChecks },
];

export function CareerLensRefined() {
  const [active, setActive] = useState("Dashboard");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="cl-app">
      <aside className={`cl-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="cl-brand"><span className="cl-mark">c</span><span>careerlens</span></div>
        <button className="cl-workspace" onClick={() => setNotice("Career workspace · Personal plan")}>
          <span className="cl-avatar">AM</span>
          <span className="cl-workcopy"><b>Career workspace</b><small>Product & research</small></span>
          <ChevronDown size={15} />
        </button>
        <div className="cl-nav-label">WORKSPACE</div>
        <nav className="cl-nav">
          {nav.map(({ name, icon: Icon }) => (
            <button key={name} className={`cl-navitem ${active === name ? "active" : ""}`} onClick={() => { setActive(name); setMenuOpen(false); }}>
              <Icon size={17} strokeWidth={1.8} /><span>{name}</span>
              {name === "Future Skills Radar" && <i className="cl-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="cl-nav-label cl-support-label">SUPPORT</div>
        <nav className="cl-nav">
          <button className="cl-navitem" onClick={() => setNotice("Settings are ready to explore.")}><Settings size={17} /><span>Settings</span></button>
          <button className="cl-navitem" onClick={() => setNotice("CareerLens · career intelligence for your next move.")}><CircleHelp size={17} /><span>About CareerLens</span></button>
          <button className="cl-navitem" onClick={() => setNotice("Methodology: public labor-market signals and your profile.")}><ShieldCheck size={17} /><span>Data sources</span></button>
        </nav>
        <div className="cl-side-bottom">
          <div className="cl-momentum-head"><span>Your momentum</span><b>38%</b></div>
          <div className="cl-progress"><span /></div>
          <div className="cl-user"><span className="cl-avatar">AM</span><span><b>Alex Morgan</b><small>Career workspace</small></span><ChevronDown size={14} /></div>
        </div>
      </aside>
      {menuOpen && <button className="cl-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="cl-main">
        <header className="cl-topbar">
          <button className="cl-menu-button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="cl-crumb"><span>CareerLens</span><b>/</b>{active}</div>
          <div className="cl-top-actions">
            <div className="cl-signal"><span className="cl-signal-dot" /> Signal layer active</div>
            <button className="cl-icon-button" aria-label="Search" onClick={() => setNotice("Search your skills, roles, and learning plan.")}><Search size={17} /></button>
            <button className="cl-icon-button" aria-label="Notifications" onClick={() => setNotice("You’re all caught up.")}><Activity size={17} /></button>
            <button className="cl-upload" onClick={() => setNotice("CV upload is ready for your profile.")}><FileText size={15} /><span>Upload CV</span></button>
          </div>
        </header>
        {notice && <div className="cl-notice">{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}><X size={14} /></button></div>}
        <div className="cl-content">
          <div className="cl-heading-row">
            <div>
              <div className="cl-eyebrow"><span>CAREER INTELLIGENCE</span><i />01 / YOUR WORKSPACE</div>
              <h1>A clearer route to your<br className="cl-desktop-break" /> next role<span>.</span></h1>
              <p className="cl-intro">Know what you bring, see where demand is moving, and turn ambition into a plan you can follow.</p>
            </div>
            <button className="cl-profile-pill" onClick={() => setNotice("Profile: Alex Morgan · Product & research")}>
              <span className="cl-avatar">AM</span><span><b>Alex Morgan</b><small>Confirmed profile</small></span><ChevronDown size={15} />
            </button>
          </div>

          <div className="cl-disclaimer"><span className="cl-disclaimer-icon"><Sparkles size={16} /></span><span><b>A thoughtful place to explore.</b><small>Career matches are illustrative signals—not predictions of hiring outcomes.</small></span><button onClick={() => setNotice("Your roadmap turns career signals into practical learning steps.")}>How it works <ArrowRight size={15} /></button></div>

          <section className="cl-feature-grid">
            <article className="cl-match">
              <div className="cl-card-top"><span className="cl-overline">BEST-FIT DIRECTION</span><span className="cl-match-mark"><Compass size={16} /></span></div>
              <div className="cl-match-main">
                <div>
                  <span className="cl-domain">PRODUCT & RESEARCH</span>
                  <h2>UX Researcher</h2>
                  <p>A strong fit for your mix of user empathy, analytical thinking, and product experience.</p>
                </div>
                <div className="cl-score"><div><strong>82</strong><small>%</small></div><span>signal match</span></div>
              </div>
              <div className="cl-match-divider" />
              <div className="cl-strength-row"><span>STRENGTHS IN THIS MATCH</span><span className="cl-strengths"><i>User research</i><i>Data analysis</i><i>Product thinking</i></span></div>
              <div className="cl-match-footer"><span>Match score ≠ hiring probability</span><button aria-label="Explore career matches" onClick={() => setActive("Career Explorer")}><ArrowRight size={17} /></button></div>
            </article>
            <article className="cl-momentum">
              <div className="cl-card-top"><span className="cl-overline">A PLAN IN MOTION</span><BookOpen size={17} /></div>
              <h2>Learning momentum</h2>
              <div className="cl-progress-line"><div className="cl-progress-number">38<span>%</span></div><span className="cl-trend"><ArrowDownRight size={14} /> 2 steps this month</span></div>
              <div className="cl-momentum-bar"><span /></div>
              <div className="cl-momentum-foot"><span>3 of 8 milestones complete</span><button onClick={() => setActive("My Learning Roadmap")}>Continue learning <ArrowRight size={14} /></button></div>
            </article>
          </section>

          <section className="cl-signal-head">
            <div><div className="cl-eyebrow">THE SIGNAL <i /> YOUR PROFILE</div><h2>Your skill signature</h2><p>What you already do well—and where the market is pointing.</p></div>
            <button className="cl-outline" onClick={() => setActive("Future Skills Radar")}>Explore market signals <ArrowRight size={15} /></button>
          </section>

          <section className="cl-snapshot">
            <div className="cl-snap-intro"><span className="cl-snap-icon"><BriefcaseBusiness size={17} /></span><div><small>EXPERIENCE SNAPSHOT</small><b>Product research & insights</b><span>5 years across digital products</span></div></div>
            <div className="cl-snap-divider" />
            <div className="cl-snap-intro cl-education"><span className="cl-snap-icon"><BookOpen size={17} /></span><div><small>EDUCATION & LEARNING</small><b>Human-computer interaction</b><span>Master’s degree · 2021</span></div></div>
            <div className="cl-experience"><span>EXPERIENCE</span><b>5<span> yrs</span></b></div>
          </section>

          <section className="cl-lower-grid">
            <article className="cl-skills-card">
              <div className="cl-card-heading"><div><div className="cl-eyebrow">YOUR CURRENT ADVANTAGE</div><h3>Skills in your corner</h3></div><button className="cl-edit" onClick={() => setActive("My Skills")}>Edit <ArrowRight size={14} /></button></div>
              <div className="cl-skills-list">
                {[["User research", "Confirmed", "Advanced"], ["Data analysis", "Confirmed", "Advanced"], ["Product strategy", "Self-reported", "Proficient"], ["Workshop facilitation", "Confirmed", "Proficient"]].map(([skill, status, level], i) => (
                  <div className="cl-skill-row" key={skill}><span className={`cl-skill-icon tone-${i}`}><span /></span><div className="cl-skill-name"><b>{skill}</b><small>{status}</small></div><span className="cl-skill-level">{level}</span></div>
                ))}
              </div>
            </article>
            <article className="cl-demand-card">
              <div className="cl-card-heading"><div><div className="cl-eyebrow">MARKET PULSE</div><h3>Skills gaining signal</h3></div><span className="cl-snapshot-tag"><i /> SNAPSHOT</span></div>
              <p className="cl-demand-caption">A dated view of skills appearing across relevant roles.</p>
              <div className="cl-demand-list">
                {[["Research operations", "+18", "Steady growth"], ["AI-assisted research", "+14", "Emerging"], ["Experiment design", "+11", "Steady growth"]].map(([skill, score, trend]) => (
                  <div className="cl-demand-row" key={skill}><div><b>{skill}</b><small>{trend}</small></div><span>+{score.replace("+", "")}<small> signal</small></span></div>
                ))}
              </div>
              <div className="cl-demand-foot"><span>Illustrative public-data snapshot</span><span>Updated 14 Feb 2025</span></div>
            </article>
          </section>
          <div className="cl-bottom-note"><span><ShieldCheck size={14} /> Your profile stays yours. You choose what to confirm.</span><button onClick={() => setSaved(!saved)}>{saved ? "Saved to your workspace" : "Save this overview"} {saved ? <Sparkles size={14} /> : <ArrowRight size={14} />}</button></div>
        </div>
      </main>
    </div>
  );
}
