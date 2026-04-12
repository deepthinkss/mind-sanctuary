import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface NoteInputProps {
  onSave: (content: string) => Promise<void>;
  isProcessing: boolean;
}

export function NoteInput({ onSave, isProcessing }: NoteInputProps) {
  const [content, setContent] = useState("");

  const handleSave = async () => {
    if (!content.trim() || isProcessing) return;
    await onSave(content.trim());
    setContent("");
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <label className="mb-2 block text-sm font-medium text-muted-foreground">
        What's on your mind?
      </label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your thoughts, ideas, or brain dump here..."
        className="min-h-[140px] w-full resize-none rounded-md border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
        disabled={isProcessing}
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {content.length > 0 ? `${content.length} characters` : "AI will summarize, tag & categorize"}
        </span>
        <Button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Smart Save
        </Button>
      </div>
    </div>
  );
}
