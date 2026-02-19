import { useState } from "react";
import { CheckCircle2, Circle, Upload, FileUp, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { MOCK_DOCUMENTS, MOCK_ACHIEVEMENTS, MOCK_CURRENT_USER } from "@/lib/mockData";
import HelpBot from "./HelpBot";

interface Props {
  teamId: string;
  currentUser: typeof MOCK_CURRENT_USER;
}

const DocumentsTab = ({ teamId, currentUser }: Props) => {
  const docs = MOCK_DOCUMENTS[teamId] ?? [];

  return (
    <div className="flex h-[calc(100vh-105px)]">
      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Achievements — always shown, tied to logged-in account */}
        {MOCK_ACHIEVEMENTS.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
              🏆 Your Achievements
            </h3>
            <div className="flex gap-3 flex-wrap">
              {MOCK_ACHIEVEMENTS.map((ach, i) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 glow-accent"
                >
                  <span className="text-2xl">{ach.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-accent">{ach.title}</p>
                    <p className="text-xs text-muted-foreground">{ach.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Document Checklist */}
        <div className="mb-6">
          <h3 className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
            Document Checklist
          </h3>
          <div className="space-y-2">
            {docs.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 card-hover"
              >
                <div className="flex items-center gap-3">
                  {doc.uploaded ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    {doc.uploaded ? (
                      <p className="text-xs text-muted-foreground">
                        Uploaded by {doc.uploadedBy} · {doc.date}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {doc.required && <AlertCircle className="w-3 h-3 text-warning" />}
                        {doc.required ? "Required" : "Optional"} · Not uploaded
                      </p>
                    )}
                  </div>
                </div>
                {!doc.uploaded && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-colors cursor-pointer">
          <FileUp className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF, CSV, XLSX, DOCX up to 50MB
          </p>
        </div>
      </div>

      {/* Help Bot Panel */}
      <HelpBot />
    </div>
  );
};

export default DocumentsTab;
