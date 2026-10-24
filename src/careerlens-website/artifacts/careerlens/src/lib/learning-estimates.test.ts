import { describe, expect, it } from 'vitest';
import { defaultLearningAssumptions as defaults, estimateSkillLearning, skillPlans } from './learning-estimates';

describe('Future Scenarios learning estimates', () => {
  it('does not reuse the same 1–2-week accelerated estimate for every skill', () => {
    const python = estimateSkillLearning('Python');
    const ml = estimateSkillLearning('Machine learning');
    const html = estimateSkillLearning('HTML');
    expect(python.accelerated).not.toBe('1–2 weeks');
    expect(ml.accelerated).not.toBe(python.accelerated);
    expect(html.accelerated).not.toBe(python.accelerated);
    expect(ml.basis).toContain('prerequisite preparation');
  });
  it.each(skillPlans.map((entry) => entry.name))('has a finite transparent planning estimate for %s', (skill) => {
    const estimate = estimateSkillLearning(skill);
    expect(estimate.status).toBe('estimated');
    expect(estimate.effort).toMatch(/^\d+–\d+ study and practice hours$/);
    expect(estimate.accelerated).toMatch(/^\d+(–\d+)? weeks?$/);
    expect(estimate.basis).toContain('not validated averages');
  });
  it('adjusts for starting level, prerequisites and selected learning goal', () => {
    const beginner = estimateSkillLearning('React');
    const related = estimateSkillLearning('React', { ...defaults, startingLevel: 'related' });
    const introduction = estimateSkillLearning('React', { ...defaults, startingLevel: 'related', goal: 'intro' });
    expect(beginner.effort).not.toBe(related.effort);
    expect(related.effort).not.toBe(introduction.effort);
    expect(beginner.basis).toContain('prerequisite preparation');
    expect(related.basis).not.toContain('prerequisite preparation');
  });
  it('uses actual weekly study commitments rather than a fixed half-duration rule', () => {
    const normal = estimateSkillLearning('Python');
    const custom = estimateSkillLearning('Python', { ...defaults, acceleratedHours: 18 });
    expect(custom.moderate).toBe(normal.moderate);
    expect(custom.accelerated).not.toBe(normal.accelerated);
  });
  it('allows several weeks for repeated soft-skill practice, even at a high hourly pace', () => {
    expect(estimateSkillLearning('Time management', { ...defaults, acceleratedHours: 40 }).accelerated).toBe('4 weeks');
  });
  it('normalizes aliases without confusing Java, JavaScript, C++ and C#', () => {
    expect(estimateSkillLearning('JS').matchedName).toBe('JavaScript');
    expect(estimateSkillLearning('Java').matchedName).toBe('Java');
    expect(estimateSkillLearning('C++').matchedName).toBe('C++');
    expect(estimateSkillLearning('C#').matchedName).toBe('C#');
  });
  it('does not invent a precise duration for an unfamiliar skill', () => {
    expect(estimateSkillLearning('Specialist flux calibration').status).toBe('needs-category');
    const broader = estimateSkillLearning('Specialist flux calibration', { ...defaults, family: 'engineering' });
    expect(broader.status).toBe('estimated');
    expect(broader.basis).toContain('lower-confidence');
  });
  it.each(['CPR', 'Wound care', 'Medication administration', 'Electrical installation'])('does not imply self-study qualifies someone to perform %s', (skill) => {
    const estimate = estimateSkillLearning(skill);
    expect(estimate.status).toBe('supervised');
    expect(estimate.moderate).toBe('Estimate unavailable');
    expect(estimate.basis).toContain('supervised practice');
  });
  it.each([0, -1, 41, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid weekly study hours %s', (hours) => {
    expect(estimateSkillLearning('Python', { ...defaults, moderateHours: hours }).status).toBe('invalid');
  });
  it('rejects an accelerated schedule that is not faster', () => {
    expect(estimateSkillLearning('Python', { ...defaults, acceleratedHours: 4 }).status).toBe('invalid');
  });
  it('distinguishes course workload references from broader planning assumptions', () => {
    expect(estimateSkillLearning('Python').source?.url).toContain('/specializations/python');
    expect(estimateSkillLearning('Machine learning').source?.label).toContain('95 guided hours');
    expect(estimateSkillLearning('Communication').source).toBeUndefined();
  });
});
