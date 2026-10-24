import { describe, expect, it } from "vitest";
import { learningResourcesFor, refreshRoadmapLearningResources } from "./learning-resources";
import type { Roadmap } from "@workspace/api-zod";

describe("skill-appropriate roadmap resources", () => {
  it.each(["Communication", "Business communication", "Coordination", "Time Management", "Complex Problem Solving"])("provides a direct free YouTube video for %s", (skill) => {
    const [resource] = learningResourcesFor(skill);
    const url = new URL(resource.url);
    expect(resource.provider).toBe("YouTube");
    expect(resource.access).toBe("free");
    expect(url.hostname).toBe("www.youtube.com");
    expect(url.pathname).toBe("/watch");
    expect(url.searchParams.get("v")).toBeTruthy();
  });
  it("uses different relevant videos for communication and time management", () => {
    expect(learningResourcesFor("Communication")[0].title).toContain("Communication Techniques");
    expect(learningResourcesFor("Time Management")[0].title).toContain("free time");
    expect(learningResourcesFor("Communication")[0].url).not.toBe(learningResourcesFor("Time Management")[0].url);
  });
  it.each(["Programming", "Python", "Java", "JavaScript", "HTML", "CSS", "Data storytelling", "Systems Analysis", "Systems Evaluation", "Software testing", "Quality Control Analysis", "Statistics"])("includes a relevant online course for %s", (skill) => {
    const resources = learningResourcesFor(skill);
    expect(resources.some((resource) => resource.url.startsWith("https://www.coursera.org/learn/") || resource.url.startsWith("https://www.coursera.org/professional-certificates/") || resource.url.startsWith("https://www.coursera.org/specializations/"))).toBe(true);
    expect(resources.every((resource) => resource.provider !== "YouTube")).toBe(true);
  });
  it("labels unknown specialist skills as course searches, without inventing course URLs", () => {
    const [resource] = learningResourcesFor("Specialist equipment calibration", "Medical Equipment Repairers");
    expect(resource.title).toBe("Find online courses for Specialist equipment calibration");
    expect(new URL(resource.url).searchParams.get("query")).toContain("Medical Equipment Repairers");
  });
  it("does not substitute an IT troubleshooting course for unrelated clinical work", () => {
    expect(learningResourcesFor("Troubleshooting", "Computer User Support Specialists")[0].title).toBe("Technical Support Fundamentals");
    expect(learningResourcesFor("Troubleshooting", "Registered Nurses")[0].title).toContain("Find online courses");
  });
  it("adds resources to older saved roadmaps without resetting progress or mutating the stored object", () => {
    const original: Roadmap = {
      id: "roadmap-1", profileId: "profile-1", careerId: "occupation-101", careerTitle: "Web Developers", progress: 50,
      steps: ["Time Management", "Systems Analysis"].map((skill, index) => ({
        id: `step-${index}`, skill, reason: "Learning goal", duration: "2 weeks",
        difficulty: "Foundational", prerequisites: [], resources: [], complete: index === 0,
      })),
    };
    const refreshed = refreshRoadmapLearningResources(original);
    expect(refreshed.id).toBe(original.id);
    expect(refreshed.progress).toBe(50);
    expect(refreshed.steps.map(({ id, complete }) => ({ id, complete }))).toEqual(original.steps.map(({ id, complete }) => ({ id, complete })));
    expect(refreshed.steps[0].resources[0].provider).toBe("YouTube");
    expect(refreshed.steps[1].resources[0].title).toBe("Introduction to Systems Engineering");
    expect(original.steps[0].resources).toEqual([]);
  });
});
