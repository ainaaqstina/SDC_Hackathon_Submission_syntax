import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Compass,
  Minus,
  Pencil,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { CareerMatch, Dashboard, Profile, Roadmap } from '@workspace/api-client-react';
import './career-dashboard.css';

type CareerDashboardProps = {
  profile: Profile;
  dashboard?: Dashboard;
  matches: CareerMatch[];
  roadmap: Roadmap | null;
  selectedCareer: string;
  firstStepsDismissed: boolean;
  onDismissFirstSteps: () => void;
  onNavigate: (path: string) => void;
  onSaveExperienceYears: (years: number) => Promise<void>;
  savingExperienceYears: boolean;
};

const humanize = (value: string) => value ? value[0].toUpperCase() + value.slice(1) : '—';
const displaySourceName = (value: string) => value.replace(/\s+—\s+/g, ': ');

const formatSnapshotDate = (value?: string | Date | null) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

type FirstStepsChecklistProps = {
  profile: Profile;
  matches: CareerMatch[];
  roadmap: Roadmap | null;
  selectedCareer: string;
  dismissed: boolean;
  onDismiss: () => void;
  onNavigate: (path: string) => void;
};

export function FirstStepsChecklist({ profile, matches, roadmap, selectedCareer, dismissed, onDismiss, onNavigate }: FirstStepsChecklistProps) {
  const chosenCareer = roadmap ? roadmap.careerTitle : matches.find((match) => match.id === selectedCareer)?.title;
  const hasChosenCareer = Boolean(roadmap || selectedCareer);
  const firstSteps = [
    {
      title: 'Review and confirm your profile',
      detail: profile.confirmed ? 'Your profile is confirmed and ready to use.' : 'Check the details and confirm them before using them for recommendations.',
      complete: profile.confirmed,
      action: 'Review profile',
      path: '/skills',
    },
    {
      title: 'Choose a career direction',
      detail: hasChosenCareer ? `Chosen direction: ${chosenCareer ?? 'selected career'}.` : 'Compare possible roles and select one worth exploring.',
      complete: hasChosenCareer,
      action: hasChosenCareer ? 'Review direction' : 'Explore careers',
      path: '/careers',
    },
    {
      title: 'Build a learning roadmap',
      detail: roadmap ? `Your learning path for ${roadmap.careerTitle} is ready.` : 'Create a learning path for the direction you choose.',
      complete: Boolean(roadmap),
      action: roadmap ? 'View roadmap' : 'Choose a direction',
      path: roadmap ? '/roadmap' : '/careers',
    },
  ];
  const completeCount = firstSteps.filter((step) => step.complete).length;

  if (dismissed) return null;

  return (
    <section className="cl-first-steps" aria-labelledby="cl-first-steps-title" data-testid="card-first-steps">
      <div className="cl-first-steps-heading">
        <div>
          <div className="cl-eyebrow"><span>GETTING STARTED</span><i />AT YOUR PACE</div>
          <h2 id="cl-first-steps-title">Your first steps</h2>
          <p>{completeCount} of {firstSteps.length} steps complete. Start wherever you are.</p>
        </div>
        <button
          className="cl-first-steps-dismiss"
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss first steps checklist"
          data-testid="button-dismiss-first-steps"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <ol className="cl-first-steps-list">
        {firstSteps.map((step, index) => (
          <li className={`cl-first-step ${step.complete ? 'is-complete' : ''}`} key={step.title} data-testid={`first-step-${index + 1}`}>
            <span className="cl-first-step-check" aria-label={step.complete ? 'Complete' : 'Not complete'}>
              {step.complete ? <Check size={14} aria-hidden="true" /> : index + 1}
            </span>
            <div className="cl-first-step-copy">
              <b>{step.title}</b>
              <span>{step.detail}</span>
            </div>
            <button type="button" onClick={() => onNavigate(step.path)} data-testid={`button-first-step-${index + 1}`}>
              {step.action} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CareerDashboard({ profile, dashboard, matches, roadmap, selectedCareer, firstStepsDismissed, onDismissFirstSteps, onNavigate, onSaveExperienceYears, savingExperienceYears }: CareerDashboardProps) {
  const [editingExperienceYears, setEditingExperienceYears] = useState(false);
  const [experienceYearsDraft, setExperienceYearsDraft] = useState('');
  const [experienceYearsError, setExperienceYearsError] = useState('');
  const editExperienceYearsButton = useRef<HTMLButtonElement>(null);
  const topMatch = dashboard?.topMatch ?? matches[0];
  const skills = profile.skills.slice(0, 4);
  const trends = (dashboard?.trends ?? []).slice(0, 3);
  const steps = roadmap?.steps ?? [];
  const completedSteps = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete);
  const progress = steps.length ? Math.max(0, Math.min(100, Math.round(roadmap?.progress ?? 0))) : 0;
  const remainingSteps = Math.max(steps.length - completedSteps, 0);
  const latestExperience = profile.experience[0];
  const yearsLabel = profile.totalExperienceYears != null
    ? Number.isInteger(profile.totalExperienceYears) ? String(profile.totalExperienceYears) : profile.totalExperienceYears.toFixed(1)
    : '—';
  const educationTitle = profile.fieldOfStudy || profile.education || 'Education details not added';
  const educationDetail = profile.fieldOfStudy && profile.education
    ? profile.education
    : profile.education ? 'Listed in your profile' : 'Add education in My Skills';
  const snapshotDate = formatSnapshotDate(dashboard?.marketUpdatedAt ?? trends[0]?.observedAt);
  const openExperienceYearsEditor = () => {
    setExperienceYearsDraft(profile.totalExperienceYears == null ? '' : String(profile.totalExperienceYears));
    setExperienceYearsError('');
    setEditingExperienceYears(true);
  };
  const closeExperienceYearsEditor = () => {
    setEditingExperienceYears(false);
    setExperienceYearsError('');
    window.requestAnimationFrame(() => editExperienceYearsButton.current?.focus());
  };

  useEffect(() => {
    if (!editingExperienceYears) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExperienceYearsEditor();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [editingExperienceYears]);

  return (
    <div className="career-dashboard cl-content animate-in" data-testid="page-career-dashboard">
      <div className="cl-heading-row">
        <div>
          <div className="cl-eyebrow"><span>CAREER INTELLIGENCE</span><i />YOUR WORKSPACE</div>
          <h1>A clearer route to your<br className="cl-desktop-break" /> next role<span>.</span></h1>
          <p className="cl-intro">Know what you bring, see where demand is moving, and turn ambition into a plan you can follow.</p>
        </div>
      </div>

      <FirstStepsChecklist
        profile={profile}
        matches={matches}
        roadmap={roadmap}
        selectedCareer={selectedCareer}
        dismissed={firstStepsDismissed}
        onDismiss={onDismissFirstSteps}
        onNavigate={onNavigate}
      />

      <div className="cl-disclaimer">
        <span className="cl-disclaimer-icon"><Sparkles size={17} aria-hidden="true" /></span>
        <span><b>A thoughtful place to explore.</b><small>Career matches are illustrative signals, not predictions of hiring outcomes.</small></span>
        <button type="button" onClick={() => onNavigate('/about')} data-testid="button-dashboard-how-it-works">
          How it works <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>

      <section className="cl-feature-grid" aria-label="Career direction and learning progress">
        <article className="cl-match" data-testid="card-top-match">
          <div className="cl-card-top">
            <span className="cl-overline">BEST-FIT DIRECTION</span>
            <span className="cl-match-mark"><Compass size={18} aria-hidden="true" /></span>
          </div>
          {topMatch ? (
            <>
              <div className="cl-match-main">
                <div>
                  <span className="cl-domain">{topMatch.domain}</span>
                  <h2>{topMatch.title}</h2>
                  <p>{topMatch.explanation}</p>
                </div>
                <div className="cl-score" role="img" aria-label={`Signal match score: ${topMatch.score} out of 100`}>
                  <div><strong>{topMatch.score}</strong><small>%</small></div><span>signal match</span>
                </div>
              </div>
              <div className="cl-match-divider" />
              <div className="cl-strength-row">
                <span>STRENGTHS IN THIS MATCH</span>
                <span className="cl-strengths">
                  {topMatch.matchedSkills.slice(0, 3).map((skill) => <i key={skill}>{skill}</i>)}
                  {!topMatch.matchedSkills.length && <i>Explore your role signals</i>}
                </span>
              </div>
              {Number(topMatch.observedListingCount ?? 0) > 0 && topMatch.listingEvidenceSourceName && (
                <p className="small-copy" data-testid="status-dashboard-listing-evidence" style={{ margin: '12px 0 0', fontSize: 11 }}>
                  Cached sample: {topMatch.observedListingCount} job listings · refreshed {formatSnapshotDate(topMatch.listingEvidenceUpdatedAt)}
                  {' · Source: '}
                  {topMatch.listingEvidenceSourceUrl ? (
                    <a href={topMatch.listingEvidenceSourceUrl} target="_blank" rel="noreferrer">
                      {topMatch.listingEvidenceSourceName}
                    </a>
                  ) : topMatch.listingEvidenceSourceName}
                </p>
              )}
              <div className="cl-match-footer">
                <span>Percentage of career alignment, not hiring probability or verified job readiness.</span>
                <button type="button" onClick={() => onNavigate('/careers')} aria-label="Explore career matches" data-testid="button-explore-careers">
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="cl-match-empty">
              <h2>Explore a possible next role.</h2>
              <p>Review career directions that connect your skills and interests.</p>
              <button type="button" className="cl-match-empty-action" onClick={() => onNavigate('/careers')} data-testid="button-explore-careers">
                Explore career matches <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </article>

        <article className="cl-momentum" data-testid="card-learning-momentum">
          <div className="cl-card-top"><span className="cl-overline">A PLAN IN MOTION</span><BookOpen size={18} aria-hidden="true" /></div>
          <h2>Learning momentum</h2>
          <div className="cl-progress-line">
            <div className="cl-progress-number" data-testid="text-roadmap-progress">{progress}<span>%</span></div>
            <span className="cl-trend"><span className="cl-self-paced-dot" />{roadmap ? steps.length ? `${remainingSteps} ${remainingSteps === 1 ? 'step' : 'steps'} to go` : 'No milestones yet' : 'Ready when you are'}</span>
          </div>
          <div className="cl-momentum-bar" role="img" aria-label={`${progress}% of the learning roadmap complete`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="small-copy" style={{ fontSize: 12, margin: '10px 0' }}>Percentage of roadmap milestones you have marked complete, not a measure of skill mastery.</p>
          <div className={`cl-next-step ${nextStep ? '' : 'is-empty'}`} data-testid="card-next-milestone">
            {nextStep ? (
              <>
                <div><span className="cl-next-step-label">NEXT MILESTONE</span><b>{nextStep.skill}</b></div>
                <span className="cl-next-step-duration">{nextStep.duration}</span>
              </>
            ) : (
              <>
                <span className="cl-next-step-label">{roadmap ? 'THIS PATH' : 'NEXT UP'}</span>
                <b>{roadmap ? 'No milestones left to complete' : 'Choose a role to build your learning path'}</b>
              </>
            )}
          </div>
          <div className="cl-momentum-foot">
            <span>{roadmap ? steps.length ? `${completedSteps} of ${steps.length} milestones complete` : 'No milestones in this path' : 'No learning path saved yet'}</span>
            <button type="button" onClick={() => onNavigate(roadmap ? '/roadmap' : '/careers')} data-testid="button-continue-learning">
              {roadmap ? 'Continue learning' : 'Choose a direction'} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </article>
      </section>

      <section className="cl-signal-head">
        <div>
          <div className="cl-eyebrow">THE SIGNAL <i /> YOUR PROFILE</div>
          <h2>Your skill signature</h2>
          <p>What you already do well and where the market is pointing.</p>
        </div>
        <button className="cl-outline" type="button" onClick={() => onNavigate('/radar')} data-testid="button-explore-market-signals">
          Explore market signals <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>

      <section className="cl-snapshot" aria-label="Experience and education summary">
        <div className="cl-snap-intro">
          <span className="cl-snap-icon"><BriefcaseBusiness size={18} aria-hidden="true" /></span>
          <div>
            <small>EXPERIENCE SNAPSHOT</small>
            <b>{latestExperience?.title || latestExperience?.description || 'Experience details are ready to refine.'}</b>
            <span>{latestExperience?.organization || 'Add an organization in My Skills'}</span>
          </div>
        </div>
        <div className="cl-snap-divider" />
        <div className="cl-snap-intro cl-education">
          <span className="cl-snap-icon"><BookOpen size={18} aria-hidden="true" /></span>
          <div>
            <small>EDUCATION &amp; LEARNING</small>
            <b>{educationTitle}</b>
            <span>{educationDetail}</span>
          </div>
        </div>
        <div className="cl-experience">
          <span>TOTAL EXPERIENCE</span>
          <div className="cl-experience-value">
            <b>{yearsLabel}<span> yrs</span></b>
            <button
              ref={editExperienceYearsButton}
              className="cl-experience-edit"
              type="button"
              onClick={openExperienceYearsEditor}
              aria-label={profile.totalExperienceYears == null ? 'Add total years of experience' : 'Edit total years of experience'}
              aria-haspopup="dialog"
              data-testid="button-edit-experience-years"
            >
              <Pencil size={13} aria-hidden="true" /> {profile.totalExperienceYears == null ? 'Add' : 'Edit'}
            </button>
          </div>
        </div>
      </section>

      {editingExperienceYears && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeExperienceYearsEditor();
          }}
        >
          <section className="modal cl-years-modal" role="dialog" aria-modal="true" aria-labelledby="experience-years-title">
            <div className="cl-years-modal-head">
              <div>
                <div className="section-label">PROFILE DETAIL</div>
                <h2 id="experience-years-title">Confirm your total experience</h2>
              </div>
              <button className="cl-years-modal-close" type="button" onClick={closeExperienceYearsEditor} aria-label="Close experience editor">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="cl-years-help">
              CVs can include overlapping roles, so adding job durations can inflate your total. Enter your verified, non-overlapping years; this is saved to your profile.
            </p>
            <form
              className="cl-years-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const years = Number(experienceYearsDraft);
                if (!experienceYearsDraft.trim() || !Number.isFinite(years) || years < 0 || years > 70) {
                  setExperienceYearsError('Enter a total from 0 to 70 years.');
                  return;
                }
                setExperienceYearsError('');
                try {
                  await onSaveExperienceYears(years);
                  closeExperienceYearsEditor();
                } catch (error) {
                  setExperienceYearsError(error instanceof Error ? error.message : 'We could not save your experience. Please try again.');
                }
              }}
            >
              <label htmlFor="total-experience-years">Total years of experience</label>
              <input
                id="total-experience-years"
                data-testid="input-total-experience-years"
                type="number"
                min="0"
                max="70"
                step="0.5"
                placeholder="e.g. 5"
                value={experienceYearsDraft}
                onChange={(event) => setExperienceYearsDraft(event.currentTarget.value)}
                autoFocus
                required
              />
              <small>Count concurrent roles only once. You can use half-year increments.</small>
              {experienceYearsError && <p className="cl-years-error" role="alert">{experienceYearsError}</p>}
              <div className="cl-years-actions">
                <button className="btn" type="button" onClick={closeExperienceYearsEditor} disabled={savingExperienceYears}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={savingExperienceYears} data-testid="button-save-experience-years">
                  {savingExperienceYears ? 'Saving…' : 'Save total'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="cl-lower-grid" aria-label="Skills and market signals">
        <article className="cl-skills-card">
          <div className="cl-card-heading">
            <div><div className="cl-eyebrow">YOUR CURRENT ADVANTAGE</div><h3>Skills in your corner</h3></div>
            <button className="cl-edit" type="button" onClick={() => onNavigate('/skills')} data-testid="button-edit-skills">
              Edit <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="cl-skills-list">
            {skills.length ? skills.map((skill, index) => (
              <div className="cl-skill-row" key={`${skill.name}-${index}`} data-testid={`row-profile-skill-${index}`}>
                <span className={`cl-skill-icon tone-${index % 4}`}><span /></span>
                <div className="cl-skill-name"><b>{skill.name}</b><small>{skill.verified ? 'Confirmed in your profile' : 'Self-reported'}</small></div>
                <span className="cl-skill-level">{humanize(skill.level)}</span>
              </div>
            )) : (
              <div className="cl-empty-inline">
                <p>Add skills to give your profile more signal.</p>
                <button type="button" onClick={() => onNavigate('/skills')}>Add skills <ArrowRight size={14} aria-hidden="true" /></button>
              </div>
            )}
          </div>
        </article>

        <article className="cl-demand-card">
          <div className="cl-card-heading">
            <div><div className="cl-eyebrow">MARKET PULSE</div><h3>Market signals</h3></div>
            <span className="cl-snapshot-tag"><i /> DATED SNAPSHOT</span>
          </div>
          <p className="cl-demand-caption">Direction and signal strength from the latest career-market snapshot.</p>
          {trends.length ? (
            <div className="cl-demand-list">
              {trends.map((trend) => (
                <div className={`cl-demand-row direction-${trend.direction}`} key={trend.skill} data-testid={`row-market-signal-${trend.skill}`}>
                  <div><b>{trend.skill}</b><small>{humanize(trend.direction)} signal</small></div>
                  <span>
                    {trend.direction === 'rising'
                      ? <TrendingUp size={15} aria-hidden="true" />
                      : trend.direction === 'declining'
                        ? <TrendingDown size={15} aria-hidden="true" />
                        : <Minus size={15} aria-hidden="true" />}
                    {trend.score}<small> / 100</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="cl-empty-inline cl-market-empty">
              <p>No market signals are available yet.</p>
              <button type="button" onClick={() => onNavigate('/radar')}>Explore radar <ArrowRight size={14} aria-hidden="true" /></button>
            </div>
          )}
          <div className="cl-demand-foot">
            <span>{trends[0]?.source ? `Source: ${displaySourceName(trends[0].source)}` : 'Career-market signals'}</span>
            <span>Updated {snapshotDate}</span>
          </div>
        </article>
      </section>

      <footer className="cl-bottom-note">
        <span><ShieldCheck size={16} aria-hidden="true" /> Career matches are signals, not employment predictions.</span>
        <button type="button" onClick={() => onNavigate('/sources')} data-testid="button-dashboard-sources">
          Data sources &amp; methodology <ArrowRight size={15} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
