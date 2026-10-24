export type CareerRoleSeed = {
  id: string;
  title: string;
  domain: string;
  required: string[];
  interests: string[];
  tasks: string[];
};

type RoleRow = [string, string, string[], string[], string[]];

const sector = (domain: string, rows: RoleRow[]): CareerRoleSeed[] =>
  rows.map(([id, title, required, interests, tasks]) => ({
    id,
    title,
    domain,
    required,
    interests,
    tasks,
  }));

// These are illustrative career paths, not live vacancies or labor-market data.
// Trend scores are intentionally omitted unless supported by a dated source.
export const ADDITIONAL_CAREER_ROLES: CareerRoleSeed[] = [
  ...sector("Healthcare and Nursing", [
    ["emergency-department-nurse", "Emergency Department Registered Nurse", ["Triage", "Patient assessment", "Emergency care", "Clinical documentation"], ["nursing", "emergency medicine", "patient care"], ["Triage arriving patients", "Provide time-sensitive clinical care", "Coordinate with the emergency care team"]],
    ["intensive-care-nurse", "Intensive Care Registered Nurse", ["Critical care", "Patient monitoring", "Medication administration", "Clinical judgment"], ["nursing", "critical care", "patient safety"], ["Monitor patients requiring intensive care", "Administer and document clinical interventions", "Coordinate with specialist teams"]],
    ["pediatric-nurse", "Pediatric Registered Nurse", ["Pediatric assessment", "Patient education", "Medication administration", "Family communication"], ["nursing", "child health", "patient advocacy"], ["Assess children’s health needs", "Support age-appropriate care plans", "Communicate with families and care teams"]],
    ["community-health-nurse", "Community Health Nurse", ["Community health", "Patient education", "Health assessment", "Care coordination"], ["nursing", "public health", "community care"], ["Provide health education", "Connect people with community services", "Support preventive care activities"]],
    ["clinical-nurse-educator", "Clinical Nurse Educator", ["Clinical education", "Nursing practice", "Instructional design", "Feedback"], ["nursing", "teaching", "professional development"], ["Develop learning sessions for clinical staff", "Support practice development", "Review learning needs with care teams"]],
    ["pharmacist", "Pharmacist", ["Medication safety", "Pharmacology", "Patient counseling", "Prescription review"], ["pharmacy", "medicines", "patient education"], ["Review prescriptions for safety", "Explain medication use to patients", "Coordinate medicine information with care teams"]],
    ["physical-therapist", "Physical Therapist", ["Rehabilitation", "Movement assessment", "Treatment planning", "Patient education"], ["rehabilitation", "movement", "patient care"], ["Assess movement and functional goals", "Plan rehabilitation activities", "Track progress with patients"]],
    ["occupational-therapist", "Occupational Therapist", ["Functional assessment", "Rehabilitation", "Assistive technology", "Patient-centered planning"], ["rehabilitation", "independent living", "patient care"], ["Assess daily living needs", "Plan activities that support independence", "Recommend suitable adaptations"]],
    ["medical-laboratory-technologist", "Medical Laboratory Technologist", ["Clinical laboratory", "Specimen handling", "Quality control", "Laboratory safety"], ["laboratory science", "diagnostics", "healthcare"], ["Prepare and process clinical specimens", "Run laboratory tests under approved procedures", "Record quality-control results"]],
    ["radiologic-technologist", "Radiologic Technologist", ["Medical imaging", "Patient positioning", "Radiation safety", "Clinical communication"], ["medical imaging", "diagnostics", "patient care"], ["Prepare patients for imaging procedures", "Follow imaging and safety protocols", "Maintain accurate examination records"]],
  ]),
  ...sector("Data and Analytics", [
    ["data-scientist", "Data Scientist", ["Python", "Statistics", "Machine learning", "Data storytelling"], ["data", "experimentation", "analytics"], ["Frame analytical questions", "Build and evaluate statistical models", "Communicate findings and limitations"]],
    ["data-engineer", "Data Engineer", ["SQL", "Python", "Data pipelines", "Cloud platforms"], ["data infrastructure", "engineering", "analytics"], ["Build reliable data pipelines", "Maintain data quality checks", "Support secure data access"]],
    ["business-intelligence-developer", "Business Intelligence Developer", ["SQL", "Data modeling", "Dashboard development", "Data visualization"], ["business intelligence", "analytics", "reporting"], ["Model data for reporting", "Build dashboards for business users", "Document metric definitions"]],
    ["statistician", "Statistician", ["Statistical modeling", "Experimental design", "R", "Data interpretation"], ["statistics", "research", "evidence"], ["Choose methods for study questions", "Analyze uncertainty in datasets", "Explain statistical results"]],
    ["operations-research-analyst", "Operations Research Analyst", ["Optimization", "Statistics", "Modeling", "Decision analysis"], ["operations research", "planning", "analytics"], ["Model operational constraints", "Compare possible solutions", "Explain trade-offs to decision-makers"]],
  ]),
  ...sector("Information Technology", [
    ["cybersecurity-analyst", "Cybersecurity Analyst", ["Security monitoring", "Incident response", "Network security", "Risk assessment"], ["cybersecurity", "investigation", "technology"], ["Review security alerts", "Document and escalate incidents", "Support risk-reduction controls"]],
    ["cloud-engineer", "Cloud Engineer", ["Cloud platforms", "Infrastructure as code", "Networking", "Scripting"], ["cloud computing", "automation", "technology"], ["Configure cloud infrastructure", "Automate repeatable operations", "Monitor reliability and access controls"]],
    ["systems-administrator", "Systems Administrator", ["Linux", "System administration", "Networking", "Troubleshooting"], ["IT operations", "systems", "technology"], ["Maintain computer systems", "Manage user access and updates", "Investigate service issues"]],
    ["IT-support-specialist", "IT Support Specialist", ["Technical support", "Troubleshooting", "Operating systems", "Customer communication"], ["help desk", "technology", "problem solving"], ["Resolve user technology requests", "Document support steps", "Escalate issues that need specialist review"]],
    ["network-engineer", "Network Engineer", ["Network configuration", "Routing", "Network security", "Troubleshooting"], ["networking", "infrastructure", "technology"], ["Configure and maintain networks", "Diagnose connectivity issues", "Document network changes"]],
    ["devops-engineer", "DevOps Engineer", ["CI/CD", "Cloud infrastructure", "Scripting", "Monitoring"], ["automation", "software delivery", "reliability"], ["Automate build and deployment workflows", "Improve service monitoring", "Collaborate on operational reliability"]],
  ]),
  ...sector("Engineering and Manufacturing", [
    ["civil-engineer", "Civil Engineer", ["Structural design", "CAD", "Project coordination", "Engineering analysis"], ["infrastructure", "design", "construction"], ["Develop and review civil engineering designs", "Coordinate technical documentation", "Support project delivery"]],
    ["electrical-engineer", "Electrical Engineer", ["Circuit design", "Electrical systems", "Testing", "Technical documentation"], ["electrical systems", "engineering", "technology"], ["Design or assess electrical systems", "Review test results", "Coordinate engineering changes"]],
    ["industrial-engineer", "Industrial Engineer", ["Process analysis", "Workflow design", "Statistics", "Continuous improvement"], ["manufacturing", "operations", "efficiency"], ["Study production workflows", "Identify process constraints", "Evaluate improvement options"]],
    ["quality-engineer", "Quality Engineer", ["Quality systems", "Root cause analysis", "Audit", "Statistical process control"], ["quality", "manufacturing", "problem solving"], ["Review quality processes", "Investigate nonconformities", "Coordinate corrective actions"]],
    ["process-engineer", "Process Engineer", ["Process design", "Process safety", "Data analysis", "Continuous improvement"], ["engineering", "production", "process improvement"], ["Document process requirements", "Review process performance", "Support safe process improvements"]],
  ]),
  ...sector("Marketing and Communications", [
    ["digital-marketing-specialist", "Digital Marketing Specialist", ["Digital campaigns", "Analytics", "Content planning", "Marketing platforms"], ["digital marketing", "campaigns", "audiences"], ["Coordinate digital campaigns", "Review channel performance", "Prepare campaign summaries"]],
    ["communications-specialist", "Communications Specialist", ["Writing", "Editing", "Stakeholder communication", "Content planning"], ["communications", "storytelling", "public information"], ["Draft clear organizational messages", "Coordinate communication calendars", "Review content for accuracy"]],
    ["public-relations-specialist", "Public Relations Specialist", ["Media relations", "Writing", "Stakeholder management", "Issue monitoring"], ["public relations", "communications", "media"], ["Prepare media materials", "Coordinate stakeholder responses", "Track public communications"]],
    ["content-strategist", "Content Strategist", ["Content design", "Editorial planning", "Audience research", "Writing"], ["content", "digital products", "storytelling"], ["Plan content around audience needs", "Set editorial guidelines", "Review content effectiveness"]],
  ]),
  ...sector("Finance and Accounting", [
    ["accountant", "Accountant", ["Financial statements", "Reconciliation", "Accounting standards", "Excel"], ["accounting", "financial reporting", "business"], ["Prepare and review financial records", "Reconcile accounts", "Support reporting deadlines"]],
    ["internal-auditor", "Internal Auditor", ["Audit planning", "Risk assessment", "Internal controls", "Evidence review"], ["audit", "governance", "risk"], ["Review control processes", "Gather and assess audit evidence", "Document findings and follow-up actions"]],
    ["risk-analyst", "Risk Analyst", ["Risk modeling", "Data analysis", "Financial analysis", "Reporting"], ["risk", "finance", "decision support"], ["Analyze risk information", "Prepare clear risk summaries", "Support monitoring and mitigation plans"]],
    ["financial-planner", "Financial Planner", ["Financial planning", "Client communication", "Portfolio concepts", "Regulatory awareness"], ["personal finance", "planning", "client service"], ["Understand client financial goals", "Prepare planning scenarios", "Explain options and assumptions"]],
  ]),
  ...sector("Business and Management", [
    ["project-coordinator", "Project Coordinator", ["Project planning", "Scheduling", "Documentation", "Stakeholder communication"], ["project delivery", "coordination", "planning"], ["Track project actions and milestones", "Coordinate team updates", "Maintain project documentation"]],
    ["operations-manager", "Operations Manager", ["Operations management", "Process improvement", "Team coordination", "Performance reporting"], ["operations", "leadership", "service delivery"], ["Coordinate daily operations", "Review process performance", "Support team planning and improvements"]],
    ["procurement-specialist", "Procurement Specialist", ["Supplier evaluation", "Negotiation", "Purchasing", "Contract documentation"], ["procurement", "supply management", "operations"], ["Coordinate sourcing activities", "Compare supplier proposals", "Maintain purchasing records"]],
    ["management-consultant", "Management Consultant", ["Business analysis", "Problem structuring", "Research", "Client communication"], ["strategy", "consulting", "organizational change"], ["Clarify organizational problems", "Analyze evidence and options", "Present practical recommendations"]],
  ]),
  ...sector("Sustainability and Environment", [
    ["environmental-scientist", "Environmental Scientist", ["Environmental sampling", "Data analysis", "Environmental regulations", "Technical writing"], ["environment", "field research", "conservation"], ["Collect environmental observations", "Analyze samples or datasets", "Prepare evidence-based reports"]],
    ["renewable-energy-analyst", "Renewable Energy Analyst", ["Energy analysis", "Excel", "Research", "Technical reporting"], ["renewable energy", "climate", "energy systems"], ["Review renewable energy project information", "Compare technical assumptions", "Summarize analysis and limitations"]],
    ["conservation-officer", "Conservation Officer", ["Environmental monitoring", "Community engagement", "Fieldwork", "Report writing"], ["conservation", "biodiversity", "environment"], ["Support conservation activities", "Record field observations", "Share guidance with local stakeholders"]],
  ]),
  ...sector("Education and Training", [
    ["primary-school-teacher", "Primary School Teacher", ["Lesson planning", "Classroom management", "Assessment", "Student communication"], ["teaching", "learning", "child development"], ["Plan age-appropriate lessons", "Support classroom learning", "Review student progress"]],
    ["instructional-designer", "Instructional Designer", ["Learning design", "Learning objectives", "Digital learning", "Content development"], ["education technology", "learning design", "training"], ["Design learning materials", "Align activities with learning objectives", "Review learner feedback"]],
    ["learning-and-development-specialist", "Learning and Development Specialist", ["Training needs analysis", "Facilitation", "Learning evaluation", "Content design"], ["workplace learning", "professional development", "people"], ["Identify learning needs", "Coordinate training sessions", "Review learning outcomes"]],
    ["academic-coordinator", "Academic Coordinator", ["Academic administration", "Scheduling", "Student support", "Communication"], ["education", "program coordination", "student success"], ["Coordinate academic schedules", "Support student and faculty processes", "Maintain program records"]],
  ]),
  ...sector("Human Resources", [
    ["recruiter", "Recruiter", ["Candidate sourcing", "Interview coordination", "Job communication", "Applicant tracking"], ["recruitment", "people", "communication"], ["Coordinate candidate pipelines", "Schedule interviews", "Communicate process updates"]],
    ["HR-generalist", "HR Generalist", ["Employee relations", "HR administration", "Policy communication", "Record management"], ["human resources", "employee support", "people operations"], ["Support employee lifecycle processes", "Answer routine policy questions", "Maintain accurate HR records"]],
    ["talent-acquisition-specialist", "Talent Acquisition Specialist", ["Workforce planning", "Sourcing strategy", "Interviewing", "Stakeholder communication"], ["talent acquisition", "recruitment", "workforce planning"], ["Partner with teams on hiring needs", "Develop sourcing approaches", "Review recruitment process data"]],
  ]),
  ...sector("Legal Services", [
    ["paralegal", "Paralegal", ["Legal research", "Document preparation", "Case organization", "Confidentiality"], ["legal research", "case support", "documentation"], ["Organize matter documents", "Support legal research", "Prepare materials for review by counsel"]],
    ["legal-assistant", "Legal Assistant", ["Legal administration", "Scheduling", "Document control", "Client communication"], ["legal services", "administration", "client support"], ["Coordinate legal schedules", "Maintain matter records", "Support routine client communications"]],
    ["compliance-officer", "Compliance Officer", ["Regulatory monitoring", "Policy review", "Risk assessment", "Training"], ["compliance", "governance", "regulation"], ["Review processes against applicable policies", "Track compliance activities", "Support staff guidance and reporting"]],
  ]),
  ...sector("Government and Public Service", [
    ["policy-analyst", "Policy Analyst", ["Policy research", "Evidence synthesis", "Writing", "Stakeholder engagement"], ["public policy", "research", "community outcomes"], ["Review policy evidence", "Compare implementation options", "Prepare concise policy briefs"]],
    ["public-administrator", "Public Administrator", ["Program administration", "Public service delivery", "Budget tracking", "Communication"], ["public administration", "community service", "government"], ["Coordinate public programs", "Maintain service and budget records", "Support public-facing processes"]],
    ["urban-planner", "Urban Planner", ["Land-use planning", "GIS", "Community consultation", "Planning policy"], ["urban planning", "cities", "public infrastructure"], ["Review land-use proposals", "Analyze planning information", "Support community consultation"]],
  ]),
  ...sector("Hospitality and Food Services", [
    ["chef", "Chef", ["Food preparation", "Menu planning", "Kitchen safety", "Team coordination"], ["culinary arts", "food service", "hospitality"], ["Prepare food to established standards", "Coordinate kitchen workflows", "Maintain food-safety practices"]],
    ["hotel-operations-manager", "Hotel Operations Manager", ["Hospitality operations", "Guest service", "Team leadership", "Service recovery"], ["hotels", "guest experience", "operations"], ["Coordinate hotel service teams", "Review guest-service processes", "Address operational issues"]],
    ["event-coordinator", "Event Coordinator", ["Event planning", "Supplier coordination", "Scheduling", "Customer communication"], ["events", "hospitality", "project coordination"], ["Coordinate event schedules and suppliers", "Track event requirements", "Support event-day operations"]],
  ]),
  ...sector("Retail and E-commerce", [
    ["retail-store-manager", "Retail Store Manager", ["Store operations", "Team leadership", "Inventory management", "Customer service"], ["retail", "store operations", "team leadership"], ["Coordinate daily store operations", "Support staff and customer needs", "Review inventory and service processes"]],
    ["retail-merchandiser", "Retail Merchandiser", ["Visual merchandising", "Inventory analysis", "Retail planning", "Communication"], ["merchandising", "retail", "product presentation"], ["Plan product displays", "Review stock and presentation", "Coordinate merchandising updates"]],
    ["ecommerce-manager", "E-commerce Manager", ["E-commerce platforms", "Digital merchandising", "Analytics", "Customer experience"], ["online retail", "digital commerce", "product"], ["Coordinate online product listings", "Review ecommerce performance", "Improve the digital shopping experience"]],
  ]),
  ...sector("Logistics and Transportation", [
    ["supply-chain-analyst", "Supply Chain Analyst", ["Supply chain analysis", "Excel", "Inventory planning", "Data visualization"], ["supply chain", "logistics", "planning"], ["Review supply chain data", "Identify inventory or delivery patterns", "Share operational findings"]],
    ["logistics-coordinator", "Logistics Coordinator", ["Shipment coordination", "Scheduling", "Documentation", "Supplier communication"], ["logistics", "transportation", "coordination"], ["Coordinate shipment schedules", "Maintain transport documentation", "Resolve routine delivery issues"]],
    ["transport-planner", "Transport Planner", ["Transport planning", "GIS", "Demand analysis", "Stakeholder consultation"], ["transportation", "mobility", "urban planning"], ["Review transport needs", "Analyze route or service options", "Coordinate planning input"]],
  ]),
  ...sector("Construction and Trades", [
    ["construction-project-manager", "Construction Project Manager", ["Construction planning", "Scheduling", "Contract coordination", "Site safety"], ["construction", "project delivery", "infrastructure"], ["Coordinate project schedules", "Track scope and contractor activities", "Support site safety processes"]],
    ["construction-site-supervisor", "Construction Site Supervisor", ["Site coordination", "Construction methods", "Safety practices", "Quality checks"], ["construction", "site operations", "team coordination"], ["Coordinate site activities", "Monitor work against plans", "Record safety and quality observations"]],
    ["electrician", "Electrician", ["Electrical installation", "Electrical safety", "Blueprint reading", "Testing"], ["electrical trades", "construction", "maintenance"], ["Install or maintain electrical systems", "Follow applicable safety requirements", "Test and document completed work"]],
    ["plumbing-technician", "Plumbing Technician", ["Plumbing systems", "Pipe installation", "Troubleshooting", "Site safety"], ["plumbing", "building services", "maintenance"], ["Install and maintain plumbing systems", "Diagnose routine system issues", "Follow site safety procedures"]],
  ]),
  ...sector("Science and Research", [
    ["laboratory-technician", "Laboratory Technician", ["Laboratory procedures", "Sample preparation", "Quality control", "Safety protocols"], ["laboratory science", "experimentation", "research"], ["Prepare samples and equipment", "Follow laboratory procedures", "Record and check results"]],
    ["research-scientist", "Research Scientist", ["Research methods", "Experimental design", "Data analysis", "Scientific writing"], ["scientific research", "experimentation", "discovery"], ["Plan or conduct research studies", "Analyze experimental results", "Communicate methods and findings"]],
    ["research-technician", "Research Technician", ["Research support", "Data collection", "Laboratory equipment", "Documentation"], ["research", "laboratory work", "science"], ["Support research protocols", "Collect and organize study data", "Maintain accurate research records"]],
  ]),
  ...sector("Creative, Design and Media", [
    ["graphic-designer", "Graphic Designer", ["Visual design", "Typography", "Design software", "Brand systems"], ["graphic design", "visual communication", "creative work"], ["Create visual communication materials", "Apply brand and accessibility guidance", "Prepare assets for delivery"]],
    ["product-designer", "Product Designer", ["Interaction design", "Prototyping", "User research", "Design systems"], ["product design", "digital products", "user experience"], ["Explore product design concepts", "Create and test interface prototypes", "Collaborate on design implementation"]],
    ["journalist", "Journalist", ["Interviewing", "Fact checking", "Reporting", "Writing"], ["journalism", "current affairs", "storytelling"], ["Research and verify story information", "Interview relevant sources", "Write clear reporting for an audience"]],
    ["video-editor", "Video Editor", ["Video editing", "Story structure", "Audio editing", "Media production"], ["video", "storytelling", "digital media"], ["Assemble footage into coherent stories", "Edit audio and visual material", "Prepare exports for intended platforms"]],
  ]),
  ...sector("Sales and Customer Service", [
    ["account-executive", "Account Executive", ["Consultative selling", "Customer discovery", "Negotiation", "CRM"], ["sales", "customer relationships", "business development"], ["Understand prospective customer needs", "Coordinate solution discussions", "Maintain accurate account records"]],
    ["customer-success-manager", "Customer Success Manager", ["Customer onboarding", "Relationship management", "Product communication", "Issue coordination"], ["customer success", "retention", "product adoption"], ["Guide customers through onboarding", "Coordinate responses to customer needs", "Review product adoption goals"]],
    ["customer-support-specialist", "Customer Support Specialist", ["Customer communication", "Issue triage", "Product knowledge", "Support documentation"], ["customer support", "problem solving", "service"], ["Respond to customer questions", "Triage and document support cases", "Share recurring issues with product teams"]],
  ]),
  ...sector("Agriculture and Food Production", [
    ["agronomist", "Agronomist", ["Crop science", "Soil assessment", "Field research", "Data interpretation"], ["agriculture", "crop production", "soil health"], ["Assess crop and soil information", "Support evidence-based growing practices", "Document field observations"]],
    ["agricultural-technician", "Agricultural Technician", ["Field sampling", "Crop monitoring", "Equipment operation", "Record keeping"], ["agriculture", "fieldwork", "food production"], ["Collect field and crop observations", "Support agricultural trials", "Maintain accurate production records"]],
    ["farm-operations-manager", "Farm Operations Manager", ["Farm operations", "Workforce coordination", "Production planning", "Safety practices"], ["agriculture", "operations", "food systems"], ["Coordinate daily farm activities", "Plan labor and equipment needs", "Track production and safety records"]],
  ]),
  ...sector("Public Safety and Security", [
    ["security-operations-analyst", "Security Operations Analyst", ["Security monitoring", "Incident documentation", "Threat triage", "Communication"], ["security operations", "risk", "public safety"], ["Review security events", "Document and escalate incidents", "Coordinate response information"]],
    ["emergency-management-specialist", "Emergency Management Specialist", ["Emergency planning", "Risk assessment", "Public communication", "Coordination"], ["emergency preparedness", "community resilience", "public safety"], ["Support preparedness plans", "Coordinate information across response partners", "Review lessons from exercises"]],
    ["firefighter", "Firefighter", ["Emergency response", "Fire safety", "Team coordination", "Physical readiness"], ["fire service", "emergency response", "community safety"], ["Respond as part of an emergency team", "Support fire prevention activities", "Maintain readiness and response equipment"]],
  ]),
  ...sector("Real Estate and Property", [
    ["property-manager", "Property Manager", ["Property operations", "Tenant communication", "Maintenance coordination", "Record keeping"], ["property management", "real estate", "building operations"], ["Coordinate property maintenance", "Respond to tenant and owner needs", "Maintain property records"]],
    ["real-estate-analyst", "Real Estate Analyst", ["Market research", "Financial modeling", "Property analysis", "Reporting"], ["real estate", "property investment", "market analysis"], ["Research property information", "Compare financial and location factors", "Prepare analytical summaries"]],
    ["real-estate-agent", "Real Estate Agent", ["Client communication", "Property marketing", "Negotiation", "Transaction coordination"], ["real estate", "sales", "client service"], ["Understand client property needs", "Coordinate viewings and transaction steps", "Communicate relevant property information"]],
  ]),
  ...sector("Insurance", [
    ["insurance-claims-adjuster", "Insurance Claims Adjuster", ["Claims review", "Evidence assessment", "Customer communication", "Documentation"], ["insurance", "claims", "investigation"], ["Review claim information", "Document evidence and decisions", "Communicate next steps to claimants"]],
    ["insurance-underwriter", "Insurance Underwriter", ["Risk assessment", "Policy analysis", "Data review", "Decision documentation"], ["insurance", "risk", "financial services"], ["Review information relevant to coverage decisions", "Assess risk against policy guidance", "Record underwriting rationale"]],
    ["insurance-account-manager", "Insurance Account Manager", ["Account management", "Policy coordination", "Customer service", "Communication"], ["insurance", "client relationships", "service"], ["Coordinate client policy needs", "Support renewals and account updates", "Explain process and documentation requirements"]],
  ]),
];
