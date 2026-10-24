# CareerLens — AI-Powered Career Intelligence Platform

**Explore career possibilities, understand your skills gaps, and plan your next step with explainable, data-informed guidance.**

CareerLens is an AI-powered career intelligence prototype developed by **Team syntax** for the **SDC Hackathon 2026 (Domain 1)**. It supports **SDG 4: Quality Education** as its primary focus and **SDG 8: Decent Work and Economic Growth** as a related goal.

## Quick Links

| Resource | Link |
|---|---|
| Live Prototype | [CareerLens on Replit](https://CareerLens.replit.app) |
| GitHub Repository | [SDC_Hackathon_Submission_syntax](https://github.com/ainaaqstina/SDC_Hackathon_Submission_syntax) |
| Project Overview | [CareerLens Project Overview](https://CareerLens.replit.app/careerlens-project-overview/) |
| Demo Video | [Watch on YouTube](https://youtu.be/iPwUJ7ccQLg) |

## Team Information

| Field | Details |
|---|---|
| Team Name | syntax |
| Project Name | CareerLens |
| Hackathon | SDC Hackathon 2026 |
| Domain | Domain 1 |
| Primary SDG | SDG 4 — Quality Education |
| Related SDG | SDG 8 — Decent Work and Economic Growth |
| University | Universiti Teknikal Malaysia Melaka (UTeM) |
| Number of Members | 2 |
| Team Leader | 'Ainaa Qistina Binti Mohd Nazrin |
| Team Member | Sharifah Nur Hayati binti Syed Zakaria |

## 1. Project Overview

### Problem Statement

Artificial intelligence is transforming the workforce and changing the skills required across industries. However, university students, fresh graduates, and working professionals often struggle to identify suitable career paths, understand employer expectations, and determine which skills they need to remain competitive.

Traditional job search platforms primarily display vacancies and qualifications without providing comprehensive explanations of skill gaps, emerging opportunities, or personalized learning pathways.

According to the **Hays Asia Salary Guide 2025**, 64% of Malaysian organizations experienced moderate to extreme skills shortages, highlighting the mismatch between workforce capabilities and employer expectations.

This can lead individuals to pursue unsuitable career opportunities, overlook emerging occupations, or invest resources in training that does not align with industry demands.

### Proposed Solution

**CareerLens** is an AI-powered career intelligence platform designed to help individuals identify suitable career opportunities, understand missing competencies, explore changing skill demands, and develop personalized learning pathways.

Users can upload a CV or manually enter their skills, experiences, and interests. The platform analyzes their information and provides explainable career recommendations based on structured occupational data and job-market evidence.

By combining AI-assisted skills extraction, evidence-based career matching, labour-market intelligence, and personalized upskilling guidance, CareerLens aims to help individuals make informed career decisions.

CareerLens serves as a **career decision-support tool**, not an automated recruitment or hiring system.

## 2. Key Features

### 2.1 AI-Powered CV Analysis

- Upload CVs in PDF or DOCX formats.
- Extract relevant information including skills, education, and experience.
- Use Qwen3-8B through RunPod for AI-assisted information extraction.
- Allow users to review and correct extracted information.
- Organize confirmed information into a structured skills profile.

### 2.2 Dual Career Exploration Pathways

**Pathway 1 — Target a Specific Career**

Users select a desired occupation and receive an analysis of how their existing skills align with occupational requirements.

The platform identifies matching competencies, missing skills, and potential areas for improvement.

**Pathway 2 — Discover Suitable Careers**

Users explore career recommendations based on their existing skills, qualifications, experiences, and interests.

The system presents career-fit explanations to help users understand why specific occupations may suit them.

### 2.3 Explainable Career Matching

- Compare user skills against structured occupational requirements.
- Use occupational evidence from resources such as O*NET.
- Evaluate software skill relevance, transferable skills, and interests.
- Generate explainable career-fit scores.
- Separate structured matching calculations from AI-generated explanations.

### 2.4 Intelligent Skills Gap Analysis

- Identify skills already possessed by users.
- Highlight missing competencies relevant to target occupations.
- Consider available employer requirements and labour-market evidence.
- Help users prioritize skills for improvement.

### 2.5 Personalized Upskilling Recommendations

- Recommend relevant learning activities.
- Provide suggested tutorials, online courses, and educational resources.
- Include indicative learning durations.
- Support personalized career-development pathways.

### 2.6 Future Skills Radar

- Present emerging and changing workforce skill demands.
- Incorporate dated and source-attributed labour-market information.
- Help users explore future career opportunities.
- Support awareness of technological changes affecting occupational skills.

### 2.7 AI Disruption Scenarios

CareerLens presents illustrative moderate and accelerated AI disruption scenarios to help users understand potential changes in occupations and skills requirements.

These scenarios are intended for exploration and are not guaranteed predictions of future employment conditions.

### 2.8 Sustainable Development Goals Integration

CareerLens associates relevant occupations and skills with United Nations Sustainable Development Goals where supported mappings are available.

This helps users explore how career choices and professional development may contribute to sustainable development.

### 2.9 Job Market Insights

CareerLens incorporates job-market information from declared sources including:

- TheirStack Job Search API
- Adzuna Job Search API
- O*NET occupational information
- Public job-related datasets

Job-market information supports career exploration, employer skill requirements, and labour-market insights. Historical dataset records should not be interpreted as currently available vacancies.

## 3. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React 19.1.0 | Interactive user interface |
| Programming Language | TypeScript 5.9 | Frontend and backend application logic |
| Build Tool | Vite 7.3.7 | Frontend development and build |
| Styling | Tailwind CSS 4.3.3 | Responsive application design |
| UI Components | Radix UI | Accessible interface components |
| Backend Runtime | Node.js 24 | Server-side JavaScript runtime |
| Backend Framework | Express 5.3.x | REST API and application services |
| Input Validation | Zod 3.25.76 | Request and data validation |
| Database | PostgreSQL 16.10 | Structured data storage |
| ORM | Drizzle ORM 0.45.4 | Database operations |
| Supporting Component | Python 3.11.14 | Career-matching computation |
| PDF Processing | pdf-parse 2.4.x | Extract information from PDF CVs |
| DOCX Processing | Mammoth 1.13.x | Extract information from DOCX CVs |
| AI Model | Qwen3-8B | Skills extraction and career guidance assistance |
| AI Infrastructure | RunPod | Model inference |
| Development and Hosting | Replit Core | Development, testing, and deployment |
| Version Control | GitHub | Source code repository |

## 4. System Architecture

```text
                  USER
                    |
                    v
             CareerLens Website
       React + TypeScript + Tailwind
                    |
                    v
             Node.js / Express
                    |
          +---------+---------+
          |                   |
          v                   v
    CV Processing        PostgreSQL
    PDF / DOCX           Drizzle ORM
          |
          v
      RunPod AI
      Qwen3-8B
          |
          v
    Structured Skills Profile
          |
          v
     Career Matching Engine
       Python Component
          |
     +----+----------------+
     |                     |
     v                     v
 O*NET / Datasets     Job Market Data
                      TheirStack / Adzuna
     |                     |
     +----------+----------+
                |
                v
       Career Recommendations
       Skills Gap Analysis
       Upskilling Pathways
       Future Skills Radar
       SDG Associations
                |
                v
         Results Dashboard
```

### Architecture Explanation

The frontend provides an interactive interface for uploading CVs, entering skills, exploring occupations, and reviewing career recommendations.

The Node.js and Express backend manages application services, data processing, and integration with external resources.

CV content is extracted using document-processing libraries and analyzed through the configured Qwen3-8B model hosted on RunPod.

Confirmed user profiles and related structured information are managed using PostgreSQL and Drizzle ORM.

The supporting career-matching component evaluates skills against occupational requirements and produces explainable career-fit information.

External job-market information from TheirStack and Adzuna provides additional context for employment opportunities, employer requirements, and changing workforce demands.

## 5. APIs and Cloud Services

| Service | Purpose |
|---|---|
| RunPod AI Inference API | Hosts the configured AI model for CV analysis and personalized guidance |
| TheirStack Job Search API | Provides job listings, employer skill requirements, and hiring signals |
| Adzuna Job Search API | Supports job listing and occupation data updates |
| Replit Core | Application development, testing, and deployment |
| Replit-managed PostgreSQL | Persistent data storage |
| GitHub | Version control and project submission |

### Replit Integration

Replit is the primary environment used to develop, test, debug, and prepare CareerLens for deployment.

The application uses Replit's development environment to manage its web application and backend services.

TheirStack is accessed through a Replit connector to support job-market data integration.

### RunPod Integration

RunPod provides AI inference infrastructure for the Qwen3-8B pre-trained model.

The backend sends relevant extracted information for AI processing, and the resulting structured analysis supports CareerLens features such as CV understanding and personalized guidance.

The project declares the use of **US$25 in SDC-sponsored RunPod credits**.

RunPod inference and application hosting are separate components: Replit runs the web application, while RunPod supports AI workloads.

## 6. Data Sources and Datasets

CareerLens uses publicly available occupational resources, labour-market research, declared job datasets, and synthetic demonstration profiles.

| Dataset / Resource | Purpose | Declared License / Terms |
|---|---|---|
| O*NET 31.0 Database | Occupational and skills information | CC BY 4.0 |
| ESCO Skills Dataset | Supplementary skills taxonomy | Relevant attribution/share-alike terms |
| WEF Future of Jobs Report 2025 | Workforce research and future skills context | WEF publication terms |
| Job Listings: Open Jobs in Every Field (Daily) | Job listings dataset | License pending verification |
| Future Jobs & Skills Demand 2025 | Future jobs and skills dataset | CC0 |
| Global AI Jobs 2026 Dataset | AI-related employment dataset | CC0 |
| CareerLens Synthetic Profiles | Prototype demonstration and evaluation | Team-created |

### Dataset Sources

- [O*NET Resource Center](https://www.onetcenter.org/)
- [ESCO](https://esco.ec.europa.eu/)
- [World Economic Forum — Future of Jobs Report 2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/)
- [Kaggle — Job Listings: Open Jobs in Every Field (Daily)](https://www.kaggle.com/datasets/chandranshbinjola/job-listings)
- [Kaggle — Future Jobs & Skills Demand 2025](https://www.kaggle.com/datasets/ahsanneural/future-jobs-and-skills-demand-2025)
- [Kaggle — Global AI Jobs 2026](https://www.kaggle.com/datasets/datascikhan/global-ai-jobs-2026)

The project does not claim to have trained or fine-tuned Qwen3-8B using these datasets.

Dataset contents, licences, coverage, and update dates should be verified before redistribution or production use.

## 7. How to Use CareerLens

1. Visit [CareerLens](https://CareerLens.replit.app).
2. Upload a PDF or DOCX CV, or manually enter your skills and career information.
3. Review and confirm the extracted skills profile.
4. Select either **Target a Specific Career** or **Discover Suitable Careers**.
5. Examine recommended occupations, career-fit explanations, and skills gaps.
6. Review recommended learning resources and upskilling pathways.
7. Explore Future Skills Radar insights, AI disruption scenarios, and SDG associations where available.

## 8. How to Run the Project

### Option 1 — Online Prototype

Visit:

https://CareerLens.replit.app

### Option 2 — Local Development

Clone the repository:

```bash
git clone https://github.com/ainaaqstina/SDC_Hackathon_Submission_syntax.git
cd SDC_Hackathon_Submission_syntax
```

Install dependencies if the Node.js application is located at the repository root:

```bash
npm install
```

Inspect available application scripts:

```bash
npm run
```

Use the appropriate script defined in the repository's package.json to start the development server.

Configure PostgreSQL, RunPod, TheirStack, and Adzuna using the environment-variable names expected by the application.

The exact startup commands, database migrations, and supporting Python component instructions should be checked against the final repository source code.

**Important:** Never commit API keys, credentials, or database passwords to GitHub.

## 9. Security and Privacy

CareerLens processes CV information, qualifications, skills, experiences, interests, and career preferences to provide personalized recommendations.

The team's technical declaration describes the following data-handling approach:

- Uploaded CV content is extracted for AI processing.
- Relevant extracted text is processed through the configured RunPod service.
- Original CV files and raw extracted text are not intentionally retained after analysis.
- Users can review structured profile information before saving it.
- Confirmed profiles and learning roadmaps are stored in PostgreSQL.
- The application is described as supporting deletion of saved profiles and roadmaps.
- API credentials are managed through server-side environment variables.
- Administrative data imports use configured access controls.
- Synthetic user profiles are used for hackathon demonstrations.

The prototype does not yet establish a fixed automatic data-retention period.

Additional authentication, security testing, privacy controls, and access-management improvements are required before production deployment.

## 10. Known Limitations and Risks

### AI Reliability

AI-assisted extraction and explanations may contain inaccuracies. Users should review extracted information before relying on recommendations.

### Occupational Data Coverage

O*NET occupational information may not fully reflect current Malaysian employment requirements.

### External API Availability

TheirStack, Adzuna, and RunPod availability may depend on provider restrictions, access credentials, credits, and usage limits.

### Dataset Freshness

Historical job datasets and labour-market reports may not represent current vacancies or employer requirements.

### SDG Mapping Coverage

Some occupations may not have complete or verified SDG associations.

### Future Predictions

AI disruption scenarios are illustrative estimates rather than guaranteed forecasts.

### Recommendation Fairness

Further testing is required to evaluate recommendation relevance, reliability, and fairness across different user profiles.

## 11. Sustainable Development Goals Impact

### Primary Goal — SDG 4: Quality Education

CareerLens supports **Target 4.4**, which promotes relevant technical and vocational skills for employment and entrepreneurship.

The platform encourages users to identify missing skills and pursue accessible learning opportunities.

### Related Goal — SDG 8: Decent Work and Economic Growth

CareerLens supports **Target 8.5**, which focuses on productive employment and decent work.

The platform aims to improve career awareness and skills alignment with occupational demands.

### Proposed Phase 2 Evaluation Targets

| KPI | Target |
|---|---|
| Top-three career recommendation relevance | At least 80% |
| Source-supported learning pathways for successfully matched synthetic profiles | At least 90% |

These are **planned Phase 2 evaluation targets**, not achieved or independently validated results.

## 12. Development Methodology

CareerLens follows a human-centered design-thinking process:

1. **Empathise:** Understand career exploration and skills-development challenges faced by students, fresh graduates, and working professionals.
2. **Define:** Identify limitations in conventional career searching and skills-matching approaches.
3. **Ideate:** Develop AI-assisted CV analysis, career matching, Future Skills Radar, and personalized upskilling features.
4. **Prototype:** Build an interactive web-based prototype using the declared technologies.
5. **Test:** Review application behavior, matching logic, AI responses, dataset handling, and usability.

## 13. Challenges and Learnings

### CV Information Extraction

CVs have different structures and layouts, making consistent information extraction challenging.

**Approach:** Combine PDF/DOCX text extraction with structured AI-assisted skills analysis.

### Skills Terminology and Career Matching

Different occupational sources may describe similar competencies using different terminology.

**Approach:** Use structured occupational requirements and explainable matching criteria.

### Replit and RunPod Integration

The application and AI inference environment operate as separate services.

**Approach:** Use backend integration, structured requests, environment variables, and service testing.

### External Data Reliability

Job listing datasets and APIs may differ in freshness, availability, and geographic coverage.

**Approach:** Use identifiable data sources and distinguish historical evidence from current market information.

### Hackathon Time Constraints

Developing multiple integrated features within a limited period requires careful prioritization.

**Approach:** Focus on demonstrating an end-to-end career intelligence workflow while identifying additional improvements for Phase 2.

## 14. AI-Assisted Development Tools

The team declared the use of the following AI-assisted development tools:

| Tool | Usage |
|---|---|
| ChatGPT (OpenAI) | Project ideation, feature planning, technical assistance, debugging, and documentation |
| Replit AI | Application development, code generation, debugging, and component integration |
| Manus AI | Trial website design assistance |

AI-generated suggestions and code are subject to team review, debugging, testing, and validation.

The team remains responsible for the implementation and submitted project.

## 15. Future Improvements

- Improve Malaysian labour-market coverage.
- Strengthen evidence-based career matching.
- Expand occupational and skills datasets.
- Improve job market updates and source attribution.
- Enhance personalized learning recommendations.
- Refine AI disruption scenarios and Future Skills Radar.
- Improve SDG association coverage.
- Strengthen security, authentication, and privacy safeguards.
- Evaluate recommendations using more diverse and representative profiles.
- Conduct additional usability and accessibility testing.

## 16. Sponsors and Acknowledgments

The team acknowledges the SDC Hackathon organizers and sponsor-provided resources, including:

- **Replit Core** — Development, testing, and deployment environment.
- **RunPod** — US$25 sponsored credits supporting AI inference.

CareerLens also acknowledges the third-party technologies, occupational resources, datasets, and research references described in this README.

## 17. Project Submission

**SDC Hackathon 2026 — Phase 1**

- Preliminary Project Proposal
- Technical & Tools Declaration
- Replit Proof of Use
- RunPod Proof of Use
- CareerLens Live Prototype
- Project Overview
- Demo Video
- GitHub Repository

Supporting documents and evidence should be linked using their actual repository paths once uploaded.

## 18. Licensing

Third-party libraries, models, datasets, and services remain subject to their respective licenses and provider terms.

The license for the team's own source code should be confirmed from the repository's LICENSE file before a specific license is stated.

---

**CareerLens | Team syntax | Universiti Teknikal Malaysia Melaka (UTeM) | SDC Hackathon 2026**