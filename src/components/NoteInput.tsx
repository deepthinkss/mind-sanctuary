import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Lightbulb, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  title: string;
  content: string;
}

interface NoteInputProps {
  onSave: (content: string) => Promise<void>;
  isProcessing: boolean;
}

export function NoteInput({ onSave, isProcessing }: NoteInputProps) {
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || isProcessing) return;
    await onSave(content.trim());
    setContent("");
    setSuggestions([]);
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
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          What's on your mind?
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts, ideas, or brain dump here..."
          className="min-h-[140px] w-full resize-none rounded-md border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
          disabled={isProcessing || isSuggesting}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {content.length > 0 ? `${content.length} characters` : "AI will summarize, tag & categorize"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggest}
              disabled={!content.trim() || isSuggesting || isProcessing}
              className="gap-1.5"
            >
              {isSuggesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5" />
              )}
              Suggest
            </Button>
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
      </div>

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
