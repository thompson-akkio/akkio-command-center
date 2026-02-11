import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Map, BarChart3, Shield, User } from "lucide-react";
import DocumentsTab from "@/components/CommandCenter/DocumentsTab";
import POCJourneyTab from "@/components/CommandCenter/POCJourneyTab";
import EngagementTab from "@/components/CommandCenter/EngagementTab";

type ViewMode = "admin" | "user";
type TabId = "documents" | "journey" | "engagement";

const tabs = [
  { id: "documents" as TabId, label: "Documents", icon: FileText },
  { id: "journey" as TabId, label: "POC Journey", icon: Map },
  { id: "engagement" as TabId, label: "Engagement", icon: BarChart3 },
];

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("admin");
  const [activeTab, setActiveTab] = useState<TabId>("documents");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
            <span className="font-mono text-primary text-sm font-bold">A</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide">COMMAND CENTER</h1>
            <p className="text-xs text-muted-foreground font-mono">Akkio POC Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("admin")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "admin"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>
          <button
            onClick={() => setViewMode("user")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "user"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            User
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="border-b border-border px-6 flex gap-1 shrink-0">
        {tabs.map((tab) => {
          // Hide engagement tab for user view
          if (tab.id === "engagement" && viewMode === "user") return null;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "documents" && <DocumentsTab viewMode={viewMode} />}
            {activeTab === "journey" && <POCJourneyTab viewMode={viewMode} />}
            {activeTab === "engagement" && viewMode === "admin" && <EngagementTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
