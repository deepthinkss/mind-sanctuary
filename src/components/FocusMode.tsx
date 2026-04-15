import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Loader2 } from "lucide-react";

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  isProcessing: boolean;
}

export function FocusMode({ isOpen, onClose, onSave, isProcessing }: FocusModeProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!content.trim() || isProcessing) return;
    await onSave(content.trim());
    setContent("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Minimal header */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-8">
        <span className="text-sm text-muted-foreground">Focus Mode — distraction-free writing</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {content.length > 0 ? `${content.length} chars` : ""}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Writing area */}
      <div className="flex flex-1 justify-center overflow-auto px-4 py-8 sm:px-8">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing... let your thoughts flow freely."
          className="w-full max-w-2xl resize-none border-0 bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 sm:text-lg sm:leading-relaxed"
          disabled={isProcessing}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-4 py-3 sm:px-8">
        <p className="text-xs text-muted-foreground">Press Esc to exit</p>
        <Button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className="gap-2"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Smart Save
        </Button>
      </div>
    </div>
  );
}
