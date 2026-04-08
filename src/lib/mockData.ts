export const MOCK_TEAMS = [
  { id: "team-1", name: "Acme Corp", stage: 4, members: ["Alice Johnson", "Bob Smith", "Carol Davis"] },
  { id: "team-2", name: "Globex Inc", stage: 2, members: ["Dave Wilson", "Eve Brown"] },
  { id: "team-3", name: "Initech", stage: 5, members: ["Frank Miller", "Grace Lee", "Hank Taylor", "Ivy Chen"] },
  { id: "team-4", name: "Umbrella Co", stage: 0, members: ["Jack White"] },
  { id: "team-5", name: "Stark Industries", stage: 6, members: ["Karen Black", "Leo Green", "Mia Hall"] },
];

/* ──────────────────────────────────────────────
   POC Journey – phases, stages, deliverables
   ────────────────────────────────────────────── */

export interface POCStage {
  id: number;
  label: string;
  subtitle: string;
  description: string;
  clientRole: string;
  akkioRole: string;
  outcomes: string[];
}

export interface POCPhase {
  id: string;
  label: string;
  subtitle?: string;
  description: string;
  stages: POCStage[];
}

export const POC_PHASES: POCPhase[] = [
  {
    id: "pre-kickoff",
    label: "Pre-Kickoff Preparation",
    description: "Building the foundation together before Day Zero",
    stages: [
      {
        id: 0,
        label: "Brief Building",
        subtitle: "Guided Conversation",
        description:
          "We bring structure, you bring context. Understanding goals, objectives, and what success looks like.",
        clientRole: "Share business context, goals, and pain points",
        akkioRole: "Guide the conversation and capture requirements",
        outcomes: [
          "Objectives defined",
          "Success metrics identified",
          "Threshold criteria established",
        ],
      },
      {
        id: 1,
        label: "Share Assets",
        subtitle: "Collaborative Brief",
        description:
          "Align on goals, success criteria, assets, and scope. Data access, workflows, and deliverables.",
        clientRole: "Provide data access, workflows, and deliverables",
        akkioRole: "Align on scope, success criteria, and brief",
        outcomes: [
          "Complete project brief",
          "Use cases finalized",
          "Data assets shared",
        ],
      },
      {
        id: 2,
        label: "Setup & Prepare",
        subtitle: "Configuration",
        description:
          "Akkio configures the instance and prepares your data for the implementation.",
        clientRole: "Identify champion and active user cohort (2-3)",
        akkioRole: "Configure instance, prepare data, set up environment",
        outcomes: [
          "Platform configured",
          "Data loaded",
          "Team access ready",
        ],
      },
      {
        id: 3,
        label: "Review & Refine",
        subtitle: "Alignment Check",
        description:
          "Confirm everything is aligned before launching Day Zero.",
        clientRole: "Review brief, confirm alignment, finalize use cases",
        akkioRole: "Present setup and confirm readiness",
        outcomes: [
          "Brief approved",
          "Alignment confirmed",
          "Ready for Day Zero",
        ],
      },
    ],
  },
  {
    id: "day-zero",
    label: "Day Zero Implementation",
    subtitle: "14-Day Journey",
    description:
      "Your team actively uses the platform throughout — feedback shapes what we build.",
    stages: [
      {
        id: 4,
        label: "Kickoff → First Insights",
        subtitle: "Days 1–3",
        description:
          "Kickoff session to launch the implementation. Begin testing and exploring the platform.",
        clientRole: "Attend kickoff session, begin testing and exploring",
        akkioRole: "Lead kickoff, deploy initial solution, guide exploration",
        outcomes: [
          "Kickoff complete",
          "Initial solution deployed",
          "Team onboarded",
        ],
      },
      {
        id: 5,
        label: "Build Phase → Mid-Point Review",
        subtitle: "Days 4–7",
        description:
          "Mid-point working sessions — not status updates, but design sessions. Active testing and live feedback.",
        clientRole: "Mid-point working session, active testing, live feedback",
        akkioRole: "Iterate on solution, incorporate feedback in real-time",
        outcomes: [
          "Mid-point review complete",
          "Feedback incorporated",
          "Solution refined",
        ],
      },
      {
        id: 6,
        label: "Refinement → Final Review",
        subtitle: "Days 8–14",
        description:
          "Final review with stakeholders. Continued testing and feedback leads to the completed implementation.",
        clientRole: "Final review with stakeholders, continued testing",
        akkioRole: "Finalize solution, prepare deliverables, present results",
        outcomes: [
          "Final review complete",
          "Solution finalized",
          "Deliverables ready",
        ],
      },
    ],
  },
];

/** Flat list of all stages (for index lookups) */
export const POC_ALL_STAGES: POCStage[] = POC_PHASES.flatMap((p) => p.stages);
export const POC_TOTAL_STAGES = POC_ALL_STAGES.length; // 7

export interface POCDeliverable {
  icon: string;
  label: string;
  description: string;
}

export const POC_DELIVERABLES: POCDeliverable[] = [
  {
    icon: "cpu",
    label: "Working AI Solution",
    description: "Deployed on your data, tested by your team, ready to use",
  },
  {
    icon: "map",
    label: "Implementation Roadmap",
    description: "Clear path forward for deployment and expansion",
  },
  {
    icon: "handshake",
    label: "Partnership Foundation",
    description: "Established working relationship for what comes next",
  },
];

export interface POCRequirement {
  label: string;
  description: string;
  timing: string;
}

export const POC_REQUIREMENTS: POCRequirement[] = [
  {
    label: "Champion",
    description: "Dedicated point of contact with decision-making authority",
    timing: "Pre-Kickoff",
  },
  {
    label: "Active User Cohort",
    description: "2-3 end users with hands-on workflow knowledge",
    timing: "Pre-Kickoff",
  },
  {
    label: "Use Case Alignment",
    description: "1-2 specific use cases with success metrics",
    timing: "Pre-Kickoff",
  },
  {
    label: "Hands-On Engagement",
    description: "3-5 hrs/week — consistent testing and feedback",
    timing: "Throughout",
  },
];

// Mock current logged-in account — can be on multiple teams (admin)
export const MOCK_CURRENT_USER = {
  id: "user-alice",
  name: "Alice Johnson",
  email: "alice@acmecorp.com",
  isAdmin: true,
  // Admin can be on multiple teams; regular users would only have one
  teamIds: ["team-1", "team-3", "team-5"],
};

export interface MockDocument {
  id: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  uploadedBy?: string;
  date?: string;
  description?: string;
  /** "standard" = added by admin to the checklist; "additional" = uploaded by client under "Other" */
  category: "standard" | "additional";
}

export const MOCK_DOCUMENTS: Record<string, MockDocument[]> = {
  "team-1": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: true, uploadedBy: "Alice Johnson", date: "2026-02-05", category: "standard" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Bob Smith", date: "2026-02-07", category: "standard" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: false, category: "standard" },
    { id: "doc-4", name: "Success Criteria", required: true, uploaded: false, category: "standard" },
    { id: "doc-5", name: "Integration Requirements", required: false, uploaded: false, category: "standard" },
    { id: "doc-6", name: "Stakeholder List", required: false, uploaded: true, uploadedBy: "Carol Davis", date: "2026-02-10", category: "standard" },
  ],
  "team-2": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: false, category: "standard" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Dave Wilson", date: "2026-02-06", category: "standard" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: false, category: "standard" },
    { id: "doc-4", name: "Success Criteria", required: false, uploaded: false, category: "standard" },
  ],
  "team-3": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: true, uploadedBy: "Frank Miller", date: "2026-02-01", category: "standard" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Grace Lee", date: "2026-02-02", category: "standard" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: true, uploadedBy: "Frank Miller", date: "2026-02-03", category: "standard" },
    { id: "doc-4", name: "Success Criteria", required: true, uploaded: true, uploadedBy: "Grace Lee", date: "2026-02-04", category: "standard" },
    { id: "doc-5", name: "Integration Requirements", required: false, uploaded: true, uploadedBy: "Hank Taylor", date: "2026-02-05", category: "standard" },
    { id: "doc-6", name: "Stakeholder List", required: false, uploaded: false, category: "standard" },
  ],
  "team-4": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: false, category: "standard" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: false, category: "standard" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: false, category: "standard" },
  ],
  "team-5": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: true, uploadedBy: "Karen Black", date: "2026-01-28", category: "standard" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Karen Black", date: "2026-01-29", category: "standard" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: true, uploadedBy: "Leo Green", date: "2026-01-30", category: "standard" },
    { id: "doc-4", name: "Success Criteria", required: true, uploaded: true, uploadedBy: "Leo Green", date: "2026-01-31", category: "standard" },
    { id: "doc-5", name: "Integration Requirements", required: false, uploaded: true, uploadedBy: "Mia Hall", date: "2026-02-02", category: "standard" },
    { id: "doc-6", name: "Stakeholder List", required: false, uploaded: true, uploadedBy: "Mia Hall", date: "2026-02-03", category: "standard" },
  ],
};

export interface MockUserMetric {
  name: string;
  totalHours: number;
  weekHours: number;
  totalChats: number;
}

export interface MockTeamEngagement {
  totalHours: number;
  weekHours: number;
  totalChats: number;
  users: MockUserMetric[];
}

export const MOCK_ENGAGEMENT: Record<string, MockTeamEngagement> = {
  "team-1": {
    totalHours: 42.5, weekHours: 10.7, totalChats: 67,
    users: [
      { name: "Alice Johnson", totalHours: 18.2, weekHours: 5.5, totalChats: 34 },
      { name: "Bob Smith", totalHours: 15.1, weekHours: 3.2, totalChats: 22 },
      { name: "Carol Davis", totalHours: 9.2, weekHours: 2.0, totalChats: 11 },
    ],
  },
  "team-2": {
    totalHours: 14.8, weekHours: 5.9, totalChats: 24,
    users: [
      { name: "Dave Wilson", totalHours: 8.3, weekHours: 4.1, totalChats: 15 },
      { name: "Eve Brown", totalHours: 6.5, weekHours: 1.8, totalChats: 9 },
    ],
  },
  "team-3": {
    totalHours: 67.3, weekHours: 17.5, totalChats: 119,
    users: [
      { name: "Frank Miller", totalHours: 22.1, weekHours: 6.0, totalChats: 45 },
      { name: "Grace Lee", totalHours: 19.8, weekHours: 5.2, totalChats: 38 },
      { name: "Hank Taylor", totalHours: 14.5, weekHours: 3.8, totalChats: 20 },
      { name: "Ivy Chen", totalHours: 10.9, weekHours: 2.5, totalChats: 16 },
    ],
  },
  "team-4": {
    totalHours: 2.1, weekHours: 2.1, totalChats: 3,
    users: [
      { name: "Jack White", totalHours: 2.1, weekHours: 2.1, totalChats: 3 },
    ],
  },
  "team-5": {
    totalHours: 55.0, weekHours: 12.7, totalChats: 77,
    users: [
      { name: "Karen Black", totalHours: 20.5, weekHours: 4.0, totalChats: 30 },
      { name: "Leo Green", totalHours: 18.7, weekHours: 5.5, totalChats: 28 },
      { name: "Mia Hall", totalHours: 15.8, weekHours: 3.2, totalChats: 19 },
    ],
  },
};

// Achievements are per logged-in account, not per team
export const MOCK_ACHIEVEMENTS = [
  { id: "ach-1", title: "First Audience Created", description: "You created your first audience segment!", icon: "🎯", date: "2026-02-08" },
  { id: "ach-2", title: "Dashboard Pioneer", description: "You started your first dashboard!", icon: "📊", date: "2026-02-09" },
];
