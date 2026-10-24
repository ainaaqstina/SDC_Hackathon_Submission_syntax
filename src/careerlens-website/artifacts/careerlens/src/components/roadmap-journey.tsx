import { useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Sparkles,
  Target,
} from 'lucide-react';
import type { Roadmap } from '@workspace/api-client-react';
import './roadmap-journey.css';
import { LearningResources, type ResourcePreference } from './learning-resources';

type RoadmapJourneyProps = {
  roadmap: Roadmap | null;
  onCreate: () => void;
  onToggle: (roadmapId: string, stepId: string, complete: boolean) => void;
  saving: boolean;
};

export function RoadmapJourney({ roadmap, onCreate, onToggle, saving }: RoadmapJourneyProps) {
  const [resourcePreference, setResourcePreference] = useState<ResourcePreference>('all');
  const steps = roadmap?.steps ?? [];
  const completeCount = steps.filter((step) => step.complete).length;
  const progress = steps.length ? Math.max(0, Math.min(100, Math.round(roadmap?.progress ?? 0))) : 0;
  const nextIndex = steps.findIndex((step) => !step.complete);
  const nextStep = nextIndex >= 0 ? steps[nextIndex] : undefined;
  const focusIndex = nextIndex >= 0 ? nextIndex : steps.length - 1;
  const allComplete = steps.length > 0 && completeCount === steps.length;

  return (
    <div className="roadmap-journey animate-in" data-testid="page-learning-roadmap">
      <div className="journey-eyebrow"><span>YOUR LEARNING ROADMAP</span><i /> SELF-PACED JOURNEY</div>
      <div className="journey-title-row">
        <div>
          <h1>Small steps. <em>Real momentum.</em></h1>
          <p className="journey-intro">
            {roadmap
              ? `A practical learning path for ${roadmap.careerTitle}. One focused milestone at a time.`
              : 'Build a practical learning path from a career direction that fits your goals.'}
          </p>
        </div>
        {roadmap && (
          <div className="journey-pace-chip" data-testid="status-roadmap-pace">
            <CalendarDays size={17} aria-hidden="true" />
            <span>SELF-PACED</span>
            <i />
            <span>{steps.length} {steps.length === 1 ? 'milestone' : 'milestones'}</span>
          </div>
        )}
      </div>

      {!roadmap ? (
        <section className="journey-empty">
          <span className="journey-empty-icon"><BookOpen size={26} aria-hidden="true" /></span>
          <span className="journey-overline">A CLEAR NEXT STEP</span>
          <h2>Your learning journey starts with a direction.</h2>
          <p>Choose a career path and CareerLens will organize the skills to explore into a saved, self-paced roadmap.</p>
          <button className="journey-primary-action" type="button" onClick={onCreate} data-testid="button-explore-careers">
            Explore career directions <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      ) : (
        <>
          <section className="journey-focus" aria-labelledby="journey-focus-title">
            <div className="journey-focus-copy">
              <span className="journey-overline"><Sparkles size={15} aria-hidden="true" /> {allComplete ? 'ROADMAP COMPLETE' : nextStep ? 'YOUR NEXT MILESTONE' : 'YOUR LEARNING PATH'}</span>
              <h2 id="journey-focus-title">
                {nextStep?.skill ?? (allComplete ? 'You’ve built real momentum.' : 'Your path is ready to explore.')}
              </h2>
              <p>
                {nextStep?.reason
                  ?? (allComplete
                    ? 'Every milestone in this learning path is complete. Keep exploring or choose another direction when you’re ready.'
                    : 'There are no outstanding skill gaps in this path. You can explore another direction whenever you like.')}
              </p>
              <div className="journey-focus-tags">
                <span><Target size={14} aria-hidden="true" /> {roadmap.careerTitle} pathway</span>
                {nextStep && <span><Clock3 size={14} aria-hidden="true" /> Typical duration: {nextStep.duration}</span>}
                {nextStep && <span>{nextStep.difficulty}</span>}
              </div>
            </div>
            <div className="journey-focus-progress">
              <div
                className="journey-progress-ring"
                style={{ '--journey-progress': `${progress}%` } as CSSProperties}
                role="img"
                aria-label={`${completeCount} of ${steps.length} milestones complete`}
                data-testid="progress-roadmap"
              >
                <div><b>{completeCount}<small>/{steps.length}</small></b><span>MILESTONES</span></div>
              </div>
              <p>
                {steps.length === 0
                  ? 'No milestones in this path'
                  : allComplete
                    ? 'Every milestone complete'
                    : `${steps.length - completeCount} ${steps.length - completeCount === 1 ? 'step' : 'steps'} left in your path`}
              </p>
            </div>
            {steps.length > 0 && (
              <div className="journey-focus-index">{String(focusIndex + 1).padStart(2, '0')} <span>/ {String(steps.length).padStart(2, '0')}</span></div>
            )}
          </section>

          <div className="journey-section-heading">
            <div>
              <span className="journey-eyebrow">THE PLAN <i /> YOUR PACE</span>
              <h2>Your roadmap, at a glance</h2>
            </div>
            <span className="journey-progress-note"><i /> {progress}% of milestones complete</span>
          </div>
          <p className="small-copy" role="note">Progress is the number of milestones you have marked complete divided by the total milestones in this roadmap. It does not measure skill mastery or job readiness.</p>

          {steps.length > 0 && <div className="field journey-resource-filter" style={{ marginBottom: 20 }}>
            <label htmlFor="resource-preference">Learning resource preference</label>
            <select id="resource-preference" value={resourcePreference} onChange={(event) => setResourcePreference(event.target.value as ResourcePreference)}>
              <option value="all">All resources</option>
              <option value="free">Free learning</option>
              <option value="certificate">Certificate courses</option>
            </select>
            <p className="small-copy">Technical skills link to online courses or clearly labelled course searches. Soft skills link to free YouTube videos, which remain visible with any course preference. Free options are shown first. Provider prices and availability may change; completing a course or video does not prove skill mastery or guarantee a job.</p>
          </div>}
          {steps.length ? (
            <section className="journey-timeline" aria-label="Learning roadmap milestones">
              {steps.map((step, index) => {
                const isNext = index === nextIndex;
                return (
                  <article
                    className={`journey-milestone ${step.complete ? 'is-complete' : ''} ${isNext ? 'is-next' : ''}`}
                    key={step.id}
                    data-testid={`card-roadmap-step-${step.id}`}
                  >
                    <div className="journey-step-index"><b>STEP</b><span>{String(index + 1).padStart(2, '0')}</span></div>
                    <div className="journey-rail">
                      <button
                        className="journey-check"
                        type="button"
                        aria-label={`${step.complete ? 'Mark incomplete' : 'Mark complete'}: ${step.skill}`}
                        aria-pressed={step.complete}
                        disabled={saving}
                        onClick={() => onToggle(roadmap.id, step.id, !step.complete)}
                        data-testid={`button-step-status-${step.id}`}
                      >
                        {step.complete ? <Check size={17} aria-hidden="true" /> : <span />}
                      </button>
                      {index < steps.length - 1 && <i aria-hidden="true" />}
                    </div>
                    <div className="journey-milestone-card">
                      <div className="journey-milestone-copy">
                        <div className="journey-milestone-meta">
                          <span className="journey-skill-tag">{step.difficulty}</span>
                          {isNext && <span className="journey-next-label">UP NEXT</span>}
                          {step.complete && <span className="journey-done-label">COMPLETED</span>}
                        </div>
                        <h3>{step.skill}</h3>
                        <p>{step.reason}</p>
                        {step.prerequisites.length > 0 && (
                          <div className="journey-prerequisites">
                            <strong>Before this:</strong> {step.prerequisites.join(', ')}
                          </div>
                        )}
                        <div className="journey-duration"><Clock3 size={14} aria-hidden="true" /> {step.duration}<span>·</span> self-paced</div>
                        <LearningResources resources={step.resources} preference={resourcePreference} skill={step.skill} />
                      </div>
                      <button
                        className={`journey-step-action ${step.complete ? 'is-complete' : ''}`}
                        type="button"
                        aria-label={`${step.complete ? 'Mark incomplete' : 'Mark complete'}: ${step.skill}`}
                        aria-pressed={step.complete}
                        disabled={saving}
                        onClick={() => onToggle(roadmap.id, step.id, !step.complete)}
                        data-testid={`button-step-${step.id}`}
                      >
                        {step.complete
                          ? <><Check size={16} aria-hidden="true" /> Completed · undo</>
                          : <>Mark complete <ArrowRight size={16} aria-hidden="true" /></>}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="journey-no-steps">
              <p>This path has no milestones to complete right now.</p>
              <button type="button" className="journey-text-action" onClick={onCreate} data-testid="button-explore-another-career">
                Explore another career direction <ArrowRight size={16} aria-hidden="true" />
              </button>
            </section>
          )}

          <section className="journey-encouragement">
            <span className="journey-encouragement-icon"><BookOpen size={20} aria-hidden="true" /></span>
            <div><b>Progress, not pressure.</b><p>Your roadmap is self-paced. Pick up at the next milestone whenever you’re ready.</p></div>
            <button type="button" onClick={onCreate} data-testid="button-explore-another-direction">
              Explore another direction <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
          <footer className="journey-footer">
            <span><Check size={15} aria-hidden="true" /> Your progress is saved with this career profile.</span>
            <span>Built around your goals, not a deadline.</span>
          </footer>
        </>
      )}
    </div>
  );
}
