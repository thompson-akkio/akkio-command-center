import { useState } from "react";
import { Loader2, UserPlus, X, CheckCircle2, AlertCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useInviteUsers, type InviteResult } from "@/hooks/useInviteUser";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill team from the current selection */
  defaultTeamId?: string;
  defaultTeamName?: string;
}

const InviteUsersDialog = ({
  open,
  onOpenChange,
  defaultTeamId,
  defaultTeamName,
}: Props) => {
  const [emailsText, setEmailsText] = useState("");
  const [teamId, setTeamId] = useState(defaultTeamId ?? "");
  const [teamName, setTeamName] = useState(defaultTeamName ?? "");
  const [results, setResults] = useState<InviteResult[] | null>(null);

  const inviteMutation = useInviteUsers();

  // Parse emails from the text area — supports comma, semicolon, newline, or space separated
  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@") && e.includes("."));
  };

  const emails = parseEmails(emailsText);

  const handleSubmit = async () => {
    if (emails.length === 0 || !teamId.trim() || !teamName.trim()) return;

    const inputs = emails.map((email) => ({
      email,
      teams: [{ team_id: teamId.trim(), team_name: teamName.trim(), role: "member" as const }],
    }));

    const res = await inviteMutation.mutateAsync(inputs);
    setResults(res);
  };

  const handleClose = () => {
    if (!inviteMutation.isPending) {
      setEmailsText("");
      setTeamId(defaultTeamId ?? "");
      setTeamName(defaultTeamName ?? "");
      setResults(null);
      onOpenChange(false);
    }
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const errorCount = results?.filter((r) => r.error).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Users
          </DialogTitle>
          <DialogDescription>
            Invite users to the Command Center. All users will be added to the same team.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <>
            <div className="space-y-4 py-2">
              {/* Team info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team ID</label>
                  <Input
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    placeholder="e.g. acme-corp"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team Name</label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </div>
              </div>

              {/* Email list */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Email Addresses
                </label>
                <Textarea
                  value={emailsText}
                  onChange={(e) => setEmailsText(e.target.value)}
                  placeholder={"alice@acme.com\nbob@acme.com\ncarol@acme.com"}
                  rows={5}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  One email per line, or separated by commas.
                  {emails.length > 0 && (
                    <span className="text-primary ml-1">
                      {emails.length} email{emails.length !== 1 ? "s" : ""} detected
                    </span>
                  )}
                </p>
              </div>

              {/* Preview */}
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {emails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="text-xs font-mono"
                    >
                      {email}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  emails.length === 0 ||
                  !teamId.trim() ||
                  !teamName.trim() ||
                  inviteMutation.isPending
                }
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {inviteMutation.isPending
                  ? `Inviting ${emails.length}...`
                  : `Invite ${emails.length} User${emails.length !== 1 ? "s" : ""}`}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 text-sm">
                {successCount > 0 && (
                  <span className="flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    {successCount} invited
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {errorCount} failed
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-60 overflow-auto">
                {results.map((r) => (
                  <div
                    key={r.email}
                    className="flex items-center justify-between bg-secondary/50 rounded-md px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs truncate">{r.email}</span>
                    {r.success ? (
                      <Badge variant="secondary" className="text-success text-[10px] shrink-0">
                        {r.warning ? "Invited (with warning)" : "Invited"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-destructive text-[10px] shrink-0 max-w-[200px] truncate">
                        {r.error}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteUsersDialog;
