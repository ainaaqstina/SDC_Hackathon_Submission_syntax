import { describe, expect, it } from "vitest";
import { ONET_RELEASE, parseOnet31Csvs, SOC_MAJOR_GROUPS } from "./onet";

describe("O*NET occupation importer", () => {
  it("uses official occupation titles, SOC families, and highest-rated transferable skills", () => {
    const result = parseOnet31Csvs({
      occupationDataCsv:
        'O*NET-SOC Code,Title,Description\n29-1141.00,Registered Nurses,"Assess patient health; provide nursing care."\n',
      transferableSkillsCsv:
        "O*NET-SOC Code,Title,Element Name,Scale ID,Data Value,Recommend Suppress\n" +
        "29-1141.00,Registered Nurses,Service Orientation,IM,4.1,N\n" +
        "29-1141.00,Registered Nurses,Programming,IM,1.2,N\n" +
        "29-1141.00,Registered Nurses,Service Orientation,LV,4.0,N\n",
      careerInterestTypesCsv:
        "O*NET-SOC Code,Title,Element Name,Scale ID,Data Value\n29-1141.00,Registered Nurses,Social,OI,4.2\n",
      educationCsv:
        "O*NET-SOC Code,Title,Scale ID,Category,Data Value\n29-1141.00,Registered Nurses,RL,7,42.5\n",
      educationCategoriesCsv:
        "Category,Category Description\n7,Bachelor's degree\n",
      emergingTasksCsv:
        "O*NET-SOC Code,Title,Task,Category,Date,Domain Source\n29-1141.00,Registered Nurses,Use remote patient monitoring,New,08/2026,Incumbent\n",
      softwareSkillsCsv:
        "O*NET-SOC Code,Title,Workplace Example,In Demand\n29-1141.00,Registered Nurses,Electronic health record software,Y\n99-9999.00,Unknown,Invented software,N\n",
    });

    expect(result.occupations).toHaveLength(1);
    expect(result.occupations[0]).toMatchObject({
      externalId: "29-1141.00",
      title: "Registered Nurses",
      industry: "Healthcare Practitioners and Technical Occupations",
      requiredSkills: ["Service Orientation", "Programming"],
    });
    expect(result.occupations[0].metadata).toMatchObject({
      releaseVersion: ONET_RELEASE,
      occupationFamilyCode: "29-0000",
      description: "Assess patient health; provide nursing care.",
      educationDistribution: [{ category: "Bachelor's degree", share: 42.5 }],
      emergingTasks: [{ task: "Use remote patient monitoring", category: "New" }],
      softwareSkills: [{ name: "Electronic health record software", inDemand: true }],
      softwareEvidenceVersion: 1,
    });
    expect(result.skillNames).toContain("Service Orientation");
    expect(result.occupationFamilies).toBe(1);
    expect(result.sourceFileRows.softwareSkills).toBe(2);
    expect(result.occupations[0].requiredSkills).not.toContain("Electronic health record software");
  });

  it("does not invent a family for an unknown SOC major group", () => {
    const result = parseOnet31Csvs({
      occupationDataCsv: "O*NET-SOC Code,Title,Description\n99-9999.00,Unknown Role,Unknown\n",
      transferableSkillsCsv:
        "O*NET-SOC Code,Title,Element Name,Scale ID,Data Value\n99-9999.00,Unknown Role,Programming,IM,4.0\n",
      careerInterestTypesCsv: "O*NET-SOC Code,Title,Element Name,Scale ID,Data Value\n",
      educationCsv: "O*NET-SOC Code,Title,Scale ID,Category,Data Value\n",
      educationCategoriesCsv: "Category,Category Description\n1,High school\n",
      emergingTasksCsv: "O*NET-SOC Code,Title,Task,Category,Date\n",
    });

    expect(result.occupations).toHaveLength(0);
    expect(result.skipped).toBe(1);
    expect(SOC_MAJOR_GROUPS["29"]).toContain("Healthcare");
  });

  it("retains a specific occupation with software evidence but no transferable ratings, without inventing gaps", () => {
    const result = parseOnet31Csvs({
      occupationDataCsv: "O*NET-SOC Code,Title,Description\n15-1254.00,Web Developers,Develop websites.\n",
      transferableSkillsCsv: "O*NET-SOC Code,Title,Element Name,Scale ID,Data Value\n",
      careerInterestTypesCsv: "O*NET-SOC Code,Title,Element Name,Scale ID,Data Value\n",
      educationCsv: "O*NET-SOC Code,Title,Scale ID,Category,Data Value\n",
      educationCategoriesCsv: "Category,Category Description\n1,High school\n",
      emergingTasksCsv: "O*NET-SOC Code,Title,Task,Category,Date\n",
      softwareSkillsCsv: "O*NET-SOC Code,Title,Workplace Example,In Demand\n15-1254.00,Web Developers,JavaScript,Y\n",
    });
    expect(result.occupations[0]).toMatchObject({
      externalId: "15-1254.00", title: "Web Developers", requiredSkills: [],
      metadata: { softwareSkills: [{ name: "JavaScript", inDemand: true }] },
    });
    expect(result.skipped).toBe(0);
  });
});
