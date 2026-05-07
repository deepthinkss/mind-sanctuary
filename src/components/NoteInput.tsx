import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Lightbulb, X, Check, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  title: string;
  content: string;
}

export interface AiPreview {
  summary: string | null;
  tags: string[];
  folder: string;
}

interface NoteInputProps {
  onSave: (content: string, ai?: AiPreview) => Promise<void>;
  isProcessing: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function NoteInput({ onSave, isProcessing, textareaRef }: NoteInputProps) {
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const [tagInput, setTagInput] = useState("");

  const resetAll = () => {
    setContent("");
    setSuggestions([]);
    setPreview(null);
    setTagInput("");
  };

  const handleSmartSave = async () => {
    if (!content.trim() || isProcessing || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-note", {
        body: { content: content.trim() },
      });
      if (error) throw error;
      setPreview({
        summary: data?.summary || null,
        tags: Array.isArray(data?.tags) ? data.tags : [],
        folder: data?.folder || "Uncategorized",
      });
    } catch (err: any) {
      console.error("Analyze error:", err);
      toast.error(err.message || "Failed to analyze note");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!preview || !content.trim() || isProcessing) return;
    await onSave(content.trim(), preview);
    resetAll();
  };

  const handleQuickSave = async () => {
    if (!content.trim() || isProcessing) return;
    await onSave(content.trim());
    resetAll();
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || !preview) return;
    if (preview.tags.includes(t)) return;
    setPreview({ ...preview, tags: [...preview.tags, t] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (!preview) return;
    setPreview({ ...preview, tags: preview.tags.filter((t) => t !== tag) });
  };

  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && preview?.tags.length) {
      removeTag(preview.tags[preview.tags.length - 1]);
    }
  };

  const handleSuggest = async () => {
    if (!content.trim() || isSuggesting) return;
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-notes", {
        body: { topic: content.trim() },
      });
      if (error) throw error;
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        toast.error("No suggestions returned");
      }
    } catch (err: any) {
      console.error("Suggest error:", err);
      toast.error(err.message || "Failed to get suggestions");
    } finally {
      setIsSuggesting(false);
    }
  };

  const useSuggestion = (suggestion: Suggestion) => {
    setContent(suggestion.content);
    setSuggestions([]);
    setPreview(null);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
        <label className="mb-2 block text-xs font-medium text-muted-foreground sm:text-sm">
          What's on your mind?
        </label>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (preview) setPreview(null);
          }}
          placeholder="Write your thoughts, ideas, or brain dump here..."
          className="min-h-[100px] w-full resize-none rounded-md border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 sm:min-h-[140px] sm:text-base"
          disabled={isProcessing || isSuggesting || isAnalyzing}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="hidden text-xs text-muted-foreground sm:block">
            {content.length > 0 ? `${content.length} characters` : "AI will summarize, tag & categorize"}
          </span>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggest}
              disabled={!content.trim() || isSuggesting || isProcessing || isAnalyzing}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              {isSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
              Suggest
            </Button>
            <Button
              onClick={handleSmartSave}
              disabled={!content.trim() || isProcessing || isAnalyzing || !!preview}
              className="flex-1 gap-2 sm:flex-none"
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Smart Save
            </Button>
          </div>
        </div>
      </div>

      {/* AI preview / edit */}
      {preview && (
        <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Pencil className="h-4 w-4 text-primary" />
              Review & edit before saving
            </div>
            <button
              onClick={() => setPreview(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss preview"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {preview.summary && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Summary</label>
              <p className="text-sm text-foreground">{preview.summary}</p>
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Folder</label>
            <Input
              value={preview.folder}
              onChange={(e) => setPreview({ ...preview, folder: e.target.value })}
              placeholder="Folder name"
              className="h-9"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2">
              {preview.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={preview.tags.length ? "Add tag…" : "Type a tag and press Enter"}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmSave} disabled={isProcessing} className="gap-1.5">
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save note
            </Button>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lightbulb className="h-4 w-4 text-primary" />
              AI Suggestions
            </div>
            <button
              onClick={() => setSuggestions([])}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => useSuggestion(s)}
                className="w-full rounded-md border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.content}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
