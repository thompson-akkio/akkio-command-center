import { FileText, Map, BarChart3, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onDismissPermanently: () => void;
}

const features = [
  {
    icon: Map,
    title: "POC Journey",
    description:
      "Follow your proof-of-concept from kickoff to final review. Each stage shows what's expected from your team and from Akkio.",
  },
  {
    icon: BarChart3,
    title: "Engagement",
    description:
      "See how your team is using Akkio — active hours, chat activity, and login trends — so you can get the most out of your evaluation.",
  },
  {
    icon: FileText,
    title: "Documents",
    description:
      "Upload and track required POC deliverables like your use case brief, data dictionary, and success criteria. Note: this does not include the data you'll upload or connect directly to the Akkio platform.",
  },
];

const IntroDialog = ({ open, onClose, onDismissPermanently }: Props) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to the Command Center</DialogTitle>
          <DialogDescription>
            Your hub for managing and tracking your Akkio POC. Here's what you
            can do:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {features.map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
          <button
            onClick={onDismissPermanently}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Don't show this again
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntroDialog;
