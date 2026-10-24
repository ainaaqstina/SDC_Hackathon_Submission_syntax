import { useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check,
  CheckCircle2, ChevronDown, Clock3, Compass, Focus, Leaf, Menu, MoreHorizontal,
  Plus, Sparkles, Target, X,
} from "lucide-react";
import "./careerLensPracticeStudio.css";

type Activity = {
  id: number;
  title: string;
  description: string;
  lane: "Discover" | "Practice" | "Reflect";
  time: string;
  skill: string;
  state: "ready" | "later" | "done";
};

const startingActivities: Activity[] = [
  { id: 1, title: "Frame the question", description: "Turn a broad product challenge into one thing you can actually learn.", lane: "Discover", time: "18 min", skill: "Research foundations", state: "done" },
  { id: 2, title: "Pick your method", description: "Choose the right conversation for the question in front of you.", lane: "Discover", time: "24 min", skill: "Method selection", state: "done" },
  { id: 3, title: "Draft your interview guide", description: "Write prompts that make room for stories, not just yes-or-no answers.", lane: "Practice", time: "20 min", skill: "Interview craft", state: "ready" },
  { id: 4, title: "Rehearse the opening", description: "Say your first two questions out loud. Notice what feels natural.", lane: "Practice", time: "15 min", skill: "Applied practice", state: "later" },
  { id: 5, title: "Name one useful signal", description: "Turn a small observation into a clear next move for your team.", lane: "Reflect", time: "22 min", skill: "Insight synthesis", state: "later" },
];

const lanes = [
  { name: "Discover" as const, index: "01", subtitle: "Get clear on what you need to learn.", icon: Compass },
  { name: "Practice" as const, index: "02", subtitle: "Try it in a low-stakes setting.", icon: Focus },
  { name: "Reflect" as const, index: "03", subtitle: "Carry one useful insight forward.", icon: Sparkles },
];

export function CareerLensPracticeStudio() {
  const [activities, setActivities] = useState(startingActivities);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [week, setWeek] = useState(0);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [toast, setToast] = useState("");
  const completed = activities.filter((activity) => activity.state === "done").length;
  const shownActivities = useMemo(
    () => activities.filter((activity) => filter === "all" || (filter === "done" ? activity.state === "done" : activity.state !== "done")),
    [activities, filter],
  );

  function markDone(id: number) {
    setActivities((items) => items.map((item) => item.id === id ? { ...item, state: item.state === "done" ? "ready" : "done" } : item));
    setSelected(null);
    setToast("Nice work. Your progress is saved for this week.");
  }

  return (
    <div className="cps-shell">
      <header className="cps-topbar">
        <a className="cps-brand" href="#" onClick={(event) => event.preventDefault()}><span className="cps-brand-mark">c</span><span>careerlens</span></a>
        <div className="cps-path"><span>My learning</span><i>/</i><b>Practice studio</b></div>
        <div className="cps-top-right">
          <span className="cps-signal"><i /> Career signal active</span>
          <button className="cps-profile" onClick={() => setToast("Your personal career workspace.")} aria-label="Open profile">AM</button>
        </div>
      </header>

      {toast && <div className="cps-toast" role="status">{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={14} /></button></div>}

      <main className="cps-main">
        <div className="cps-overline"><span>YOUR CAREER, IN MOTION</span><i /> LEARNING STUDIO</div>
        <section className="cps-intro">
          <div className="cps-intro-copy">
            <div className="cps-week-control">
              <button aria-label="Previous week" onClick={() => setWeek(Math.max(-1, week - 1))}><ArrowLeft size={15} /></button>
              <span>{week === -1 ? "10—14 FEB" : week === 1 ? "24—28 FEB" : "17—21 FEB"} <b>·</b> WEEK {String(week + 2).padStart(2, "0")}</span>
              <button aria-label="Next week" onClick={() => setWeek(Math.min(1, week + 1))}><ArrowRight size={15} /></button>
            </div>
            <h1>Make the work<br /><em>your own.</em></h1>
            <p>Build your research instincts by choosing a small, useful action. No catch-up. No perfect week required.</p>
          </div>
          <aside className="cps-focus">
            <div className="cps-focus-top"><span><Target size={14} /> THIS WEEK’S INTENTION</span><MoreHorizontal size={18} /></div>
            <h2>From good questions<br />to useful insights.</h2>
            <p>UX Researcher pathway <i /> About 20 minutes a day</p>
            <div className="cps-focus-bottom">
              <div className="cps-progress" aria-label={`${completed} of 5 activities complete`}><i style={{ width: `${completed / activities.length * 100}%` }} /></div>
              <span>{completed}<b>/</b>5 actions</span>
            </div>
          </aside>
        </section>

        <section className="cps-workbench">
          <div className="cps-workbench-head">
            <div><span className="cps-section-kicker">A FLEXIBLE ROUTE</span><h2>Choose your next move</h2></div>
            <div className="cps-filters" role="group" aria-label="Filter activities">
              {(["all", "open", "done"] as const).map((option) => <button key={option} className={filter === option ? "is-active" : ""} onClick={() => setFilter(option)}>{option === "all" ? "Everything" : option === "open" ? "To explore" : "Completed"}</button>)}
            </div>
          </div>

          <div className="cps-lanes">
            {lanes.map((lane) => {
              const Icon = lane.icon;
              const laneActivities = shownActivities.filter((activity) => activity.lane === lane.name);
              const laneDone = activities.filter((activity) => activity.lane === lane.name && activity.state === "done").length;
              return (
                <section className={`cps-lane cps-lane-${lane.name.toLowerCase()}`} key={lane.name}>
                  <header className="cps-lane-head">
                    <span className="cps-lane-icon"><Icon size={17} /></span>
                    <div className="cps-lane-name"><span>{lane.index} / {String(activities.filter((activity) => activity.lane === lane.name).length).padStart(2, "0")}</span><h3>{lane.name}</h3></div>
                    <span className="cps-lane-count">{laneDone} done</span>
                  </header>
                  <p className="cps-lane-caption">{lane.subtitle}</p>
                  <div className="cps-activity-stack">
                    {laneActivities.length ? laneActivities.map((activity) => (
                      <button className={`cps-activity ${activity.state === "done" ? "is-done" : ""} ${activity.state === "ready" ? "is-ready" : ""}`} key={activity.id} onClick={() => setSelected(activity)}>
                        <span className="cps-activity-state">{activity.state === "done" ? <Check size={15} /> : activity.state === "ready" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</span>
                        <span className="cps-activity-copy"><b>{activity.title}</b><small>{activity.description}</small><span className="cps-activity-meta">{activity.skill}<i /> <Clock3 size={12} /> {activity.time}</span></span>
                        <ArrowRight className="cps-card-arrow" size={15} />
                      </button>
                    )) : <div className="cps-filter-empty"><span>Nothing in this view.</span><button onClick={() => setFilter("all")}>Show all actions</button></div>}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="cps-note">
          <span className="cps-note-icon"><Leaf size={17} /></span>
          <div><b>Your pace is part of the plan.</b><p>Pick one action that fits today. The order is a guide, not a deadline.</p></div>
          <button onClick={() => setToast("Start anywhere. Your learning path will be here when you return.")}>How this works <ArrowRight size={14} /></button>
        </section>
        <footer className="cps-footer"><span><BookOpen size={13} /> Built around your goals, not a deadline.</span><span>CareerLens <i>·</i> Personal learning path</span></footer>
      </main>

      {selected && <div className="cps-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
        <section className="cps-detail" role="dialog" aria-modal="true" aria-labelledby="cps-detail-title" onClick={(event) => event.stopPropagation()}>
          <button className="cps-close" onClick={() => setSelected(null)} aria-label="Close details"><X size={18} /></button>
          <span className="cps-section-kicker">{selected.lane.toUpperCase()} · {selected.skill.toUpperCase()}</span>
          <h2 id="cps-detail-title">{selected.title}</h2>
          <p>{selected.description}</p>
          <div className="cps-detail-info"><span><Clock3 size={15} /> {selected.time}</span><span><CheckCircle2 size={15} /> Self-paced</span></div>
          <div className="cps-detail-prompt"><b>A useful outcome</b><p>Leave with one concrete thing you can use in a real product conversation.</p></div>
          <button className="cps-start" onClick={() => markDone(selected.id)}>{selected.state === "done" ? "Reopen this action" : "Mark this action complete"} <ArrowRight size={16} /></button>
        </section>
      </div>}
    </div>
  );
}
