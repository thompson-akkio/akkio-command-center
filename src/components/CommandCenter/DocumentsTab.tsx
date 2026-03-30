import { useState, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Upload,
  FileUp,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_ACHIEVEMENTS, MOCK_CURRENT_USER } from "@/lib/mockData";
import {
  useDocuments,
  useAddDocument,
  useUpdateDocument,
  useDeleteDocument,
  type Document,
} from "@/hooks/useDocuments";
import HelpBot from "./HelpBot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  teamId: string;
  currentUser: typeof MOCK_CURRENT_USER;
}

const DocumentsTab = ({ teamId, currentUser }: Props) => {
  // ── Data from Supabase (or mock fallback) ────────────────────────────
  const { data: docs = [], isLoading } = useDocuments(teamId);
  const addMutation = useAddDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();

  const isAdmin = currentUser.isAdmin;

  // ── UI state ─────────────────────────────────────────────────────────
  // Admin add/edit dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [formName, setFormName] = useState("");
  const [formRequired, setFormRequired] = useState(true);

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState<string>("");
  const [uploadIsOther, setUploadIsOther] = useState(false);
  const [otherTitle, setOtherTitle] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  // ── Admin: Add / Edit ────────────────────────────────────────────────
  const openAddDialog = () => {
    setEditingDoc(null);
    setFormName("");
    setFormRequired(true);
    setAddDialogOpen(true);
  };

  const openEditDialog = (doc: Document) => {
    setEditingDoc(doc);
    setFormName(doc.name);
    setFormRequired(doc.required);
    setAddDialogOpen(true);
  };

  const handleSaveDocument = () => {
    const trimmed = formName.trim();
    if (!trimmed) return;

    if (editingDoc) {
      updateMutation.mutate(
        { id: editingDoc.id, teamId, name: trimmed, required: formRequired },
        { onSuccess: () => setAddDialogOpen(false) },
      );
    } else {
      addMutation.mutate(
        { teamId, name: trimmed, required: formRequired, category: "standard" },
        { onSuccess: () => setAddDialogOpen(false) },
      );
    }
  };

  // ── Admin: Delete ────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id, teamId },
      { onSuccess: () => setDeleteTarget(null) },
    );
  };

  // ── Upload ───────────────────────────────────────────────────────────
  const openUploadDialog = (preselectedDocId?: string) => {
    setUploadTargetId(preselectedDocId ?? "");
    setUploadIsOther(!preselectedDocId);
    setOtherTitle("");
    setOtherDescription("");
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const handleUploadSelectChange = (value: string) => {
    if (value === "__other__") {
      setUploadTargetId("");
      setUploadIsOther(true);
    } else {
      setUploadTargetId(value);
      setUploadIsOther(false);
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) return;

    if (uploadIsOther) {
      const title = otherTitle.trim();
      if (!title) return;
      addMutation.mutate(
        {
          teamId,
          name: title,
          required: false,
          category: "additional",
          description: otherDescription.trim() || undefined,
          uploadedBy: currentUser.name,
        },
        { onSuccess: () => setUploadDialogOpen(false) },
      );
    } else {
      updateMutation.mutate(
        {
          id: uploadTargetId,
          teamId,
          uploaded: true,
          uploadedBy: currentUser.name,
        },
        { onSuccess: () => setUploadDialogOpen(false) },
      );
    }
    // TODO: Once GDrive Edge Function is ready, send `selectedFile` here
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────
  const standardDocs = docs.filter((d) => d.category === "standard");
  const additionalDocs = docs.filter((d) => d.category === "additional");
  const pendingDocs = standardDocs.filter((d) => !d.uploaded);
  const isMutating =
    addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const canSubmitUpload =
    selectedFile &&
    !isMutating &&
    (uploadIsOther ? otherTitle.trim().length > 0 : uploadTargetId);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-105px)]">
      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Achievements */}
        {MOCK_ACHIEVEMENTS.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
              Your Achievements
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Document Checklist
            </h3>
            <div className="flex items-center gap-2">
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              )}
              {isAdmin && (
                <button
                  onClick={openAddDialog}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {standardDocs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 card-hover"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {doc.uploaded ? (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <Badge
                          variant={doc.required ? "default" : "secondary"}
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${
                            doc.required
                              ? "bg-warning/15 text-warning border-warning/30"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {doc.required ? "Required" : "Optional"}
                        </Badge>
                      </div>
                      {doc.uploaded ? (
                        <p className="text-xs text-muted-foreground">
                          Uploaded by {doc.uploadedBy} · {doc.uploadedAt}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {doc.required && (
                            <AlertCircle className="w-3 h-3 text-warning" />
                          )}
                          Not uploaded
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {!doc.uploaded && (
                      <button
                        onClick={() => openUploadDialog(doc.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditDialog(doc)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(doc)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Additional Documents (uploaded via "Other") */}
        {additionalDocs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
              Additional Documents
            </h3>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {additionalDocs.map((doc, i) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 card-hover"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 shrink-0 border-info/30 text-info"
                          >
                            Additional
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uploaded by {doc.uploadedBy} · {doc.uploadedAt}
                          {doc.description && ` · ${doc.description}`}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-3"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => openUploadDialog()}
          className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary/30 transition-colors cursor-pointer"
        >
          <FileUp className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Drag & drop POC documents here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF, XLSX, DOCX up to 50MB
          </p>
          <p className="text-xs text-muted-foreground/60 mt-3 border-t border-border pt-3 max-w-xs">
            Note: Data files for analysis should be uploaded directly within the
            Akkio app — not here.
          </p>
        </div>
      </div>

      {/* Help Bot Panel */}
      <HelpBot />

      {/* ── Admin: Add / Edit Document Dialog ─────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? "Edit Document Item" : "Add Document Item"}
            </DialogTitle>
            <DialogDescription>
              {editingDoc
                ? "Update the document name or requirement status."
                : "Add a new item to this team's document checklist."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Name</label>
              <Input
                placeholder="e.g. Data Dictionary"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveDocument()}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Required</p>
                <p className="text-xs text-muted-foreground">
                  Mark this document as required for the POC
                </p>
              </div>
              <Switch
                checked={formRequired}
                onCheckedChange={setFormRequired}
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setAddDialogOpen(false)}
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDocument}
              disabled={!formName.trim() || isMutating}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(addMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {editingDoc ? "Save Changes" : "Add Document"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{deleteTarget?.name}" from the
              checklist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Dialog ─────────────────────────────────────────────── */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Select which document you're uploading, then choose a file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Document selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <Select
                value={uploadIsOther ? "__other__" : uploadTargetId}
                onValueChange={handleUploadSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a document..." />
                </SelectTrigger>
                <SelectContent>
                  {pendingDocs.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <span className="flex items-center gap-2">
                        {doc.name}
                        {doc.required && (
                          <span className="text-[10px] text-warning">
                            Required
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  {pendingDocs.length > 0 && <SelectSeparator />}
                  <SelectItem value="__other__">
                    <span className="text-muted-foreground">Other...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Other: title + description */}
            <AnimatePresence>
              {uploadIsOther && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Document Title</label>
                    <Input
                      placeholder="e.g. Competitive Analysis Report"
                      value={otherTitle}
                      onChange={(e) => setOtherTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Description{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </label>
                    <Textarea
                      placeholder="Brief description of this document..."
                      value={otherDescription}
                      onChange={(e) => setOtherDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-md px-3 py-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-0.5 rounded hover:bg-secondary transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md px-3 py-4 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Choose a file
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                PDF, XLSX, DOCX, CSV — up to 50 MB
              </p>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setUploadDialogOpen(false)}
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={!canSubmitUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMutating && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              Upload
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsTab;
