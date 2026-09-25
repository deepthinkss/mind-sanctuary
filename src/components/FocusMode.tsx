import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Sparkles, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import SideRays from "./SideRays";

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, title: string) => Promise<void>;
  isProcessing: boolean;
  /** Inline AI generation failure (e.g. missing API key) shown as a banner with retry. */
  aiError?: string | null;
  onDismissAiError?: () => void;
  /** Re-run AI generation for the note that failed (summary & tags). */
  onRetryAi?: () => Promise<boolean | void>;
}

export function FocusMode({ isOpen, onClose, onSave, isProcessing, aiError, onDismissAiError, onRetryAi }: FocusModeProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
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
    setSaveError(null);
    try {
      await onSave(content.trim(), title.trim());
      setTitle("");
      setContent("");
      onClose();
    } catch (err: any) {
      // Keep the note open with the draft intact so the user can retry.
      setSaveError(err?.message || "AI generation failed. Check your API key configuration.");
    }
  };

  const handleRetryAi = async () => {
    if (!onRetryAi || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetryAi();
    } finally {
      setIsRetrying(false);
    }
  };

  const activeError = saveError || aiError || null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="ambient-glow absolute inset-0" />
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <SideRays
          speed={0.6}
          rayColor1="#ffffff"
          rayColor2="#cbd5e1"
          intensity={0.6}
          spread={1.2}
          origin="top-right"
          tilt={0}
          saturation={0.3}
          blend={0.35}
          falloff={2.2}
          opacity={0.35}
        />
      </div>
      {/* Minimal header */}
      <div className="relative flex items-center justify-between border-b px-4 py-3 sm:px-8">
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

      {/* Inline AI error banner */}
      {activeError && (
        <div className="relative border-b px-4 py-3 sm:px-8">
          <div className="mx-auto flex w-full max-w-2xl items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-destructive">AI generation failed</p>
              <p className="mt-0.5 break-words text-xs text-destructive/90">{activeError}</p>
            </div>
            {onRetryAi && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 border-destructive/40"
                onClick={handleRetryAi}
                disabled={isRetrying}
                aria-busy={isRetrying}
              >
                {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {isRetrying ? "Retrying…" : "Retry"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Dismiss error"
              onClick={() => {
                setSaveError(null);
                onDismissAiError?.();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Writing area */}
      <div className="relative flex flex-1 justify-center overflow-auto px-4 py-8 sm:px-8">
        <div className="flex w-full max-w-2xl flex-col">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            maxLength={120}
            className="mb-4 h-auto border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 sm:text-2xl"
            disabled={isProcessing}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing... let your thoughts flow freely."
            className="w-full flex-1 resize-none border-0 bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 sm:text-lg sm:leading-relaxed"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between border-t px-4 py-3 sm:px-8">
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
