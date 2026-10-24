# SDC_Hackathon_Submission_syntax
---

# Project Name

> A one-sentence description of what your project does and who it is for.

---

## Team Information

| Field                  | Details                                     |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | syntax                                      |
| **Team Domain**        | Domain 1                                    |
| **SDG Track (1–17)**   | SDG 8 - Decent Work and Economic Growth |
| **Team Leader**        | 'Ainaa Qistina binti Mohd Nazrin                                 |
| **University**         | Universiti Teknikal Malaysia Melaka                          |
| **Number of Members**  | 2                                      |

## Links

| Resource          | Link                                           |
| ----------------- | ---------------------------------------------- |
| GitHub Repository | https://github.com/ainaaqstina/SDC_Hackathon_Submission_syntax  |
| Live Demo         | https://CareerLens.replit.app                 |
| Slide Deck        | https://CareerLens.replit.app/careerlens-project-overview/                     |
| Demo Video        | https://youtu.be/iPwUJ7ccQLg?si=_FS2O1S8FuZ0F2-E                |

---

## Overview

### Problem

Many students, fresh graduates, and job seekers struggle to identify career opportunities that match their existing skills and qualifications. Traditional job-search platforms primarily focus on displaying job vacancies without providing detailed insights into the skills applicants lack or the steps needed to become more competitive.

As a result, job seekers may apply for unsuitable positions or spend time learning skills that are not relevant to their desired careers. This contributes to skill mismatches, reduced employability, and difficulties transitioning from education to employment.

### Solution

CareerLens addresses these challenges through an AI-powered career guidance and skill gap analysis platform.

The system allows users to upload their CVs, which are analyzed using artificial intelligence to identify their existing technical and professional skills.

Users can then choose between two career exploration pathways:

Pathway 1: Target a Specific Career

Users select a desired job role, and the system compares their existing skills against the requirements of relevant job opportunities.

The AI identifies missing skills, highlights frequently requested competencies, and recommends personalized learning resources to help users become better qualified.

Pathway 2: Discover Suitable Careers

Users who are unsure about their career direction can allow the AI to analyze their existing skills and recommend career roles that best align with their qualifications and experience.

The system also provides explanations of the recommendations, helping users make informed career decisions.

By combining CV analysis, career matching, skill gap identification, and personalized upskilling recommendations, SkillBridge AI aims to bridge the gap between education and employment.

### Key Features

- **Feature 1 : AI-Powered CV Analysis** — Users upload their CVs in supported document formats.

AI extracts relevant information, including technical skills, soft skills, education, and experience.

Extracted information is organized into a structured skill profile for further analysis.
- **Feature 2 : Dual Career Exploration Pathways** — Target a Job: Users specify their desired career and receive skill compatibility analysis.

Discover Careers: AI recommends suitable job roles based on the user's existing skill set.

Recommendations are accompanied by explanations to support career planning.
- **Feature 3 : Intelligent Skill Gap Analysis** — Compares extracted CV skills against job requirements.

Identifies skills that users already possess and those they need to develop.

Highlights frequently requested missing skills across relevant job opportunities.

Helps users prioritize skills that may improve their employability.
- **Feature 4 : Personalized Upskilling Recommendations** — Suggests relevant learning resources based on identified skill gaps.

Recommends introductory YouTube tutorials for self-paced learning.

Suggests structured courses and certifications from platforms such as Coursera.

Helps users develop a practical learning pathway toward their career goals.
- **Feature 5 : AI-Generated Career Insights** — Provides understandable explanations of career recommendations.

Summarizes skill compatibility and improvement areas.

Helps users make informed decisions about their professional development.

### Tech Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| Frontend      | HTML, CSS, JavaScript             |
| Backend       | Python, Flask  |
| Database      | e.g. PostgreSQL, SQLite      |
| CV Processing | Python PDF/text extraction libraries      |
| AI / Compute  | RunPod (GPU)                 |
| Hosting / Dev | Replit                       |
| Version Control | GitHub                       |

---

## Project Structure

```
.
CareerLens/
├── docs/
│   ├── screenshots/
│   └── architecture/
│
├── runpod/
│   ├── handler.py
│   └── requirements.txt
│
├── src/
│   ├── main.py
│   ├── cv_parser.py
│   ├── skill_analyzer.py
│   ├── career_matcher.py
│   └── recommendations.py
│
├── templates/
│   ├── index.html
│   ├── upload.html
│   └── results.html
│
├── static/
│   ├── css/
│   └── js/
│
├── submission/
│   ├── SDC2026_syntax_Preliminary.pdf
│   ├── SDC2026_syntax_TechDeclaration.pdf
│   ├── SDC2026_syntax_Replit_POU.pdf
│   └── SDC2026_syntax_Runpod_POU.pdf
│
├── tests/
│   └── test_utils.py
│
├── .env.example
├── .gitignore
├── .replit
├── LICENSE
├── requirements.txt
└── README.md
```

### Architecture

```
 USER
                    |
                    v
             REPLIT WEB APP
                    |
             Upload CV / Input
                    |
                    v
             FLASK BACKEND
                    |
          Extract CV Text
                    |
                    v
           RUNPOD GPU ENDPOINT
                    |
          AI Skill Analysis
                    |
          +---------+---------+
          |                   |
          v                   v
     Target a Job       Discover Careers
          |                   |
          v                   v
     Compare Skills      Match Career Roles
          |                   |
          +---------+---------+
                    |
                    v
             Skill Gap Results
                    |
                    v
       Upskilling Recommendations
                    |
                    v
            RESULTS DASHBOARD
```

---

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Open the Replit Project or import the GitHub repository into Replit.
2. Install the required Python dependencies.
3. Open the Secrets tab in Replit.
4. Add the following environment variables:
- RUNPOD_API_KEY
- RUNPOD_ENDPOINT_ID
5. Verify that the RunPod endpoint is active and accessible.
6. Click Run to start the application.
7. Open the web preview to interact with CareerLens.

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone YOUR_GITHUB_REPOSITORY_URL
cd CareerLens

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env            # then fill in your values

# 5. Run the app
python src/main.py
```

### Run Tests

```bash
python -m unittest discover tests
```

---

## How We Use Replit *(Required)*

Replit is the proposed primary development and hosting environment for CareerLens. 

- **Development:** Develop the web interface and backend application using Replit's cloud-based development environment.
- **Hosting:** Host the application using Replit's deployment services.
- **Secrets:** API keys are stored in Replit Secrets, never in the code.

📄 Proof of use: [`submission/SDC2026_TeamName_Replit_POU.pdf`](submission/SDC2026_TeamName_Replit_POU.pdf)

## How We Use RunPod *(Required)*

Describe how your team used RunPod. For example:

- **AI Workload:** Process extracted CV information using an AI model.
Identify and categorize relevant skills.
Support career suitability analysis.
Generate structured skill gap insights and career recommendations.
- **Setup:** Deploy the selected AI model using a RunPod GPU environment.
Configure a serverless endpoint or other supported inference service.
Implement a request handler to process incoming analysis requests.
- **Integration:** The Replit backend sends CV-derived information and analysis instructions to RunPod.
RunPod processes the request using the deployed model.
The generated analysis is returned to Replit for presentation to the user.
Example request:

```bash
curl -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": {"prompt": "Hello"}}'
```

📄 Proof of use: [`submission/SDC2026_TeamName_Runpod_POU.pdf`](submission/SDC2026_TeamName_Runpod_POU.pdf)

---

## Challenges & Learnings

1. Extracting Accurate Information from CVs

CVs contain different layouts and formatting styles, making consistent information extraction challenging.

Proposed approach: Combine document text extraction with AI-powered skill identification to improve the consistency of structured CV analysis.

2. Identifying Relevant Skill Gaps

Job descriptions may use different terminology for similar technical skills.

Proposed approach: Normalize extracted skills and compare them against structured job requirements.

3. Integrating Replit with RunPod

Connecting the web application to a separate AI inference environment requires secure API communication and reliable response handling.

Proposed approach: Use environment variables, structured JSON requests, error handling, and endpoint testing.

4. Managing Development Time

Developing multiple AI-powered features within a limited hackathon timeframe requires careful prioritization.

Proposed approach: Focus on an end-to-end minimum viable product (MVP) that demonstrates CV analysis, career matching, and actionable skill recommendations.

## Future Improvements

- Real-Time Job Market Integration: Integrate authorized job listing APIs to retrieve current employment opportunities.

- Advanced Career Matching: Improve recommendation accuracy using more detailed skills, qualifications, and experience analysis.

- Personalized Learning Roadmaps: Generate structured weekly or monthly learning plans.

## Team

| Name        | Role                | GitHub                                   |
| ----------- | ------------------- | ---------------------------------------- |
| 'Ainaa Qistina binti Mohd Nazrin | Team Lead / Backend | [@username](https://github.com/ainaaqistina) |
| Sharifah Nur Hayati binti Syed Zakaria | Frontend, AI, RunPod        | [@username](https://github.com/username) |
---

## License

This project is licensed under the [Apache License 2.0](LICENSE).