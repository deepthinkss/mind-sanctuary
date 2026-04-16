import { useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

interface SemanticSearchProps {
  notes: Tables<"notes">[];
  onResults: (noteIds: string[] | null) => void;
}

export function SemanticSearch({ notes, onResults }: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [active, setActive] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || notes.length === 0) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("semantic-search", {
        body: {
          query: query.trim(),
          notes: notes.map((n) => ({ id: n.id, content: n.content, summary: n.summary, tags: n.tags })),
        },
      });
      if (error) throw error;
      const indices: number[] = data?.indices || [];
      const matchedIds = indices.map((i) => notes[i]?.id).filter(Boolean);
      onResults(matchedIds.length > 0 ? matchedIds : []);
      setActive(true);
      toast.success(`Found ${matchedIds.length} semantically related notes`);
    } catch (err: any) {
      console.error("Semantic search error:", err);
      toast.error(err.message || "Semantic search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setActive(false);
    onResults(null);
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/60" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="AI semantic search — find by meaning..."
          className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <Button size="sm" onClick={handleSearch} disabled={isSearching || !query.trim()} className="h-9 gap-1.5">
        {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        Search
      </Button>
      {active && (
        <Button size="sm" variant="ghost" onClick={handleClear} className="h-9 text-xs">
          Clear
        </Button>
      )}
    </div>
  );
}
