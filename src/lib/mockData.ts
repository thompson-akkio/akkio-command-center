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

export const MOCK_DOCUMENTS = [
  { id: "doc-1", name: "Data Dictionary", required: true, uploaded: true, uploadedBy: "Alice Johnson", date: "2026-02-05" },
  { id: "doc-2", name: "Use Case Brief", required: true, uploaded: true, uploadedBy: "Bob Smith", date: "2026-02-07" },
  { id: "doc-3", name: "Sample Dataset (CSV)", required: true, uploaded: false },
  { id: "doc-4", name: "Success Criteria", required: true, uploaded: false },
  { id: "doc-5", name: "Integration Requirements", required: false, uploaded: false },
  { id: "doc-6", name: "Stakeholder List", required: false, uploaded: true, uploadedBy: "Carol Davis", date: "2026-02-10" },
];

export const MOCK_ENGAGEMENT = [
  {
    teamId: "team-1", teamName: "Acme Corp", totalHours: 42.5,
    users: [
      { name: "Alice Johnson", totalHours: 18.2, weekHours: 5.5, totalChats: 34 },
      { name: "Bob Smith", totalHours: 15.1, weekHours: 3.2, totalChats: 22 },
      { name: "Carol Davis", totalHours: 9.2, weekHours: 2.0, totalChats: 11 },
    ],
  },
  {
    teamId: "team-2", teamName: "Globex Inc", totalHours: 14.8,
    users: [
      { name: "Dave Wilson", totalHours: 8.3, weekHours: 4.1, totalChats: 15 },
      { name: "Eve Brown", totalHours: 6.5, weekHours: 1.8, totalChats: 9 },
    ],
  },
  {
    teamId: "team-3", teamName: "Initech", totalHours: 67.3,
    users: [
      { name: "Frank Miller", totalHours: 22.1, weekHours: 6.0, totalChats: 45 },
      { name: "Grace Lee", totalHours: 19.8, weekHours: 5.2, totalChats: 38 },
      { name: "Hank Taylor", totalHours: 14.5, weekHours: 3.8, totalChats: 20 },
      { name: "Ivy Chen", totalHours: 10.9, weekHours: 2.5, totalChats: 16 },
    ],
  },
  {
    teamId: "team-4", teamName: "Umbrella Co", totalHours: 2.1,
    users: [
      { name: "Jack White", totalHours: 2.1, weekHours: 2.1, totalChats: 3 },
    ],
  },
  {
    teamId: "team-5", teamName: "Stark Industries", totalHours: 55.0,
    users: [
      { name: "Karen Black", totalHours: 20.5, weekHours: 4.0, totalChats: 30 },
      { name: "Leo Green", totalHours: 18.7, weekHours: 5.5, totalChats: 28 },
      { name: "Mia Hall", totalHours: 15.8, weekHours: 3.2, totalChats: 19 },
    ],
  },
];

export const MOCK_ACHIEVEMENTS = [
  { id: "ach-1", title: "First Audience Created", description: "You created your first audience segment!", icon: "🎯", date: "2026-02-08" },
  { id: "ach-2", title: "Dashboard Pioneer", description: "You started your first dashboard!", icon: "📊", date: "2026-02-09" },
];
