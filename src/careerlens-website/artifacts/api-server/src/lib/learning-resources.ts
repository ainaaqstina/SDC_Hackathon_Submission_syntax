import type { LearningResource, Roadmap } from "@workspace/api-zod";
import { canonicalSkillName } from "./skill-matching";

// Curated provider pages, not AI-generated course URLs. Access describes the
// learning page; a provider may charge separately for exams or credentials.
const catalog: Record<string, LearningResource[]> = {
  React: [
    { title: "Learn React", provider: "React", url: "https://react.dev/learn", access: "free", kind: "learning", providerUrl: "https://react.dev/" },
    { title: "Meta Front-End Developer Professional Certificate", provider: "Coursera", url: "https://www.coursera.org/professional-certificates/meta-front-end-developer", access: "paid", kind: "certificate", providerUrl: "https://www.coursera.org/" },
  ],
  JavaScript: [
    { title: "JavaScript Guide", provider: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", access: "free", kind: "learning", providerUrl: "https://developer.mozilla.org/" },
  ],
  Python: [
    { title: "The Python Tutorial", provider: "Python", url: "https://docs.python.org/3/tutorial/", access: "free", kind: "learning", providerUrl: "https://www.python.org/" },
    { title: "Python for Everybody Specialization", provider: "Coursera", url: "https://www.coursera.org/specializations/python", access: "paid", kind: "certificate", providerUrl: "https://www.coursera.org/" },
  ],
  SQL: [
    { title: "SQLBolt interactive lessons", provider: "SQLBolt", url: "https://sqlbolt.com/", access: "free", kind: "learning", providerUrl: "https://sqlbolt.com/" },
  ],
  Java: [
    { title: "Learn Java", provider: "Oracle Java", url: "https://dev.java/learn/", access: "free", kind: "learning", providerUrl: "https://dev.java/" },
  ],
  "Data visualization": [
    { title: "Get started with Power BI", provider: "Microsoft Learn", url: "https://learn.microsoft.com/en-us/training/modules/get-started-power-bi/", access: "free", kind: "learning", providerUrl: "https://learn.microsoft.com/" },
  ],
  "Machine learning": [
    { title: "Intro to Machine Learning", provider: "Kaggle Learn", url: "https://www.kaggle.com/learn/intro-to-machine-learning", access: "free", kind: "learning", providerUrl: "https://www.kaggle.com/learn" },
  ],
  "Data storytelling": [
    { title: "What is data storytelling?", provider: "Microsoft Power BI", url: "https://www.microsoft.com/en-gb/power-platform/products/power-bi/topics/data-storytelling", access: "free", kind: "learning", providerUrl: "https://www.microsoft.com/" },
  ],
  Marketing: [
    { title: "Marketing Analytics", provider: "Coursera", url: "https://www.coursera.org/learn/marketing-analytics", access: "paid", kind: "certificate", providerUrl: "https://www.coursera.org/" },
  ],
  "AI literacy": [
    { title: "AI for Everyone", provider: "Coursera", url: "https://www.coursera.org/learn/ai-for-everyone", access: "paid", kind: "certificate", providerUrl: "https://www.coursera.org/" },
  ],
};

const course = (title: string, slug: string): LearningResource => ({
  title, provider: "Coursera", url: `https://www.coursera.org/learn/${slug}`,
  kind: "learning", providerUrl: "https://www.coursera.org/",
});
const webCourse = course("HTML, CSS, and Javascript for Web Developers", "html-css-javascript-for-web-developers");
const systemsCourse = course("Introduction to Systems Engineering", "systems-engineering");
catalog.HTML = [webCourse];
catalog.CSS = [webCourse];
catalog.JavaScript.unshift(webCourse);
catalog.Java.unshift(course("Java Programming: Solving Problems with Software", "java-programming"));
catalog["Data storytelling"].unshift(course("Data Visualization and Communication with Tableau", "analytics-tableau"));
catalog.Programming = [catalog.Python[1]];
catalog["Systems Analysis"] = [systemsCourse];
catalog["Systems Evaluation"] = [systemsCourse];
catalog["Technology Design"] = [systemsCourse];
catalog["Quality Control Analysis"] = [course("Six Sigma Principles", "six-sigma-principles2")];
catalog["Software testing"] = [course("Introduction to Software Testing", "introduction-software-testing")];
catalog.Statistics = [course("Basic Statistics", "basic-statistics")];
catalog.Mathematics = [course("Basic Statistics", "basic-statistics")];

// Direct video URLs and titles checked against YouTube's oEmbed metadata.
// These are learning suggestions, not evidence that watching a video proves a skill.
const videos = {
  communication: {
    title: "Think Fast, Talk Smart: Communication Techniques",
    provider: "YouTube", url: "https://www.youtube.com/watch?v=HAnw168huqA",
    access: "free", kind: "learning", providerUrl: "https://www.youtube.com/@stanfordgsb",
  },
  time: {
    title: "How to gain control of your free time | Laura Vanderkam | TED",
    provider: "YouTube", url: "https://www.youtube.com/watch?v=n3kNlFMXslo",
    access: "free", kind: "learning", providerUrl: "https://www.youtube.com/@TED",
  },
  thinking: {
    title: "5 tips to improve your critical thinking - Samantha Agoos",
    provider: "YouTube", url: "https://www.youtube.com/watch?v=dItUGF8GdTw",
    access: "free", kind: "learning", providerUrl: "https://www.youtube.com/@TEDEd",
  },
} satisfies Record<string, LearningResource>;

export const learningResourcesFor = (skill: string, careerTitle = ""): LearningResource[] => {
  const canonical = canonicalSkillName(skill);
  const normalized = canonical.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\b(time management|prioriti[sz]ation|scheduling|productivity)\b/.test(normalized)) {
    return [{ ...videos.time }];
  }
  if (/\b(problem solving|critical thinking|decision making|judgment|judgement|learning strategies|active learning)\b/.test(normalized)) {
    return [{ ...videos.thinking }];
  }
  if (/\b(communication|listening|speaking|writing|reading comprehension|coordination|teamwork|team work|collaboration|leadership|persuasion|negotiation|social perceptiveness|service orientation|instructing|interviewing|empathy|emotional intelligence|interpersonal|conflict resolution|customer service)\b/.test(normalized)) {
    return [{ ...videos.communication }];
  }
  const key = Object.keys(catalog).find((name) => name.toLowerCase() === canonical.toLowerCase())
    ?? (/marketing/i.test(skill) ? "Marketing" : /storytelling/i.test(skill) ? "Data storytelling" : undefined);
  if (key) return catalog[key].map((resource) => ({ ...resource }));
  if (/troubleshooting|technical support/i.test(skill) && /computer|software|network|information technology|web/i.test(careerTitle)) {
    return [course("Technical Support Fundamentals", "technical-support-fundamentals")];
  }
  // Do not fabricate a course URL for an unfamiliar or specialist skill.
  // The label explicitly distinguishes a provider search from a selected course.
  return [{
    title: `Find online courses for ${skill}`, provider: "Coursera",
    url: `https://www.coursera.org/search?query=${encodeURIComponent(`${skill} ${careerTitle}`.trim())}`,
    kind: "learning", providerUrl: "https://www.coursera.org/",
  }];
};

// Enrich old saved roadmaps on read, preserving milestone IDs and completion.
export const refreshRoadmapLearningResources = (roadmap: Roadmap): Roadmap => ({
  ...roadmap,
  steps: roadmap.steps.map((step) => ({
    ...step, resources: learningResourcesFor(step.skill, roadmap.careerTitle),
  })),
});
