export const MOCK_TEAMS = [
  { id: "team-1", name: "Acme Corp", stage: 2, members: ["Alice Johnson", "Bob Smith", "Carol Davis"] },
  { id: "team-2", name: "Globex Inc", stage: 1, members: ["Dave Wilson", "Eve Brown"] },
  { id: "team-3", name: "Initech", stage: 3, members: ["Frank Miller", "Grace Lee", "Hank Taylor", "Ivy Chen"] },
  { id: "team-4", name: "Umbrella Co", stage: 0, members: ["Jack White"] },
  { id: "team-5", name: "Stark Industries", stage: 4, members: ["Karen Black", "Leo Green", "Mia Hall"] },
];

export const POC_STAGES = [
  { id: 0, label: "Info Gathering", description: "Collecting requirements and onboarding data" },
  { id: 1, label: "Learning Features", description: "Exploring Akkio's capabilities and tools" },
  { id: 2, label: "Active Usage", description: "Building models and running analyses" },
  { id: 3, label: "Review", description: "Evaluating results and performance" },
  { id: 4, label: "Conclusion", description: "Final assessment and decision" },
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
}

export const MOCK_DOCUMENTS: Record<string, MockDocument[]> = {
  "team-1": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: true, uploadedBy: "Alice Johnson", date: "2026-02-05" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Bob Smith", date: "2026-02-07" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: false },
    { id: "doc-4", name: "Success Criteria", required: true, uploaded: false },
    { id: "doc-5", name: "Integration Requirements", required: false, uploaded: false },
    { id: "doc-6", name: "Stakeholder List", required: false, uploaded: true, uploadedBy: "Carol Davis", date: "2026-02-10" },
  ],
  "team-2": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: false },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Dave Wilson", date: "2026-02-06" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: false },
    { id: "doc-4", name: "Success Criteria", required: false, uploaded: false },
  ],
  "team-3": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: true, uploadedBy: "Frank Miller", date: "2026-02-01" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Grace Lee", date: "2026-02-02" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: true, uploadedBy: "Frank Miller", date: "2026-02-03" },
    { id: "doc-4", name: "Success Criteria", required: true, uploaded: true, uploadedBy: "Grace Lee", date: "2026-02-04" },
    { id: "doc-5", name: "Integration Requirements", required: false, uploaded: true, uploadedBy: "Hank Taylor", date: "2026-02-05" },
    { id: "doc-6", name: "Stakeholder List", required: false, uploaded: false },
  ],
  "team-4": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: false },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: false },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: false },
  ],
  "team-5": [
    { id: "doc-1", name: "Data Dictionary", required: true, uploaded: true, uploadedBy: "Karen Black", date: "2026-01-28" },
    { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Karen Black", date: "2026-01-29" },
    { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: true, uploadedBy: "Leo Green", date: "2026-01-30" },
    { id: "doc-4", name: "Success Criteria", required: true, uploaded: true, uploadedBy: "Leo Green", date: "2026-01-31" },
    { id: "doc-5", name: "Integration Requirements", required: false, uploaded: true, uploadedBy: "Mia Hall", date: "2026-02-02" },
    { id: "doc-6", name: "Stakeholder List", required: false, uploaded: true, uploadedBy: "Mia Hall", date: "2026-02-03" },
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
