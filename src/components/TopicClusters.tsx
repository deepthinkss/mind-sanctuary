import { useState, useCallback } from "react";
import { Network, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

interface Cluster {
  name: string;
  description: string;
  noteIndices: number[];
}

interface TopicClustersProps {
  notes: Tables<"notes">[];
}

export function TopicClusters({ notes }: TopicClustersProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);

  const handleCluster = useCallback(async () => {
    if (notes.length < 3) {
      toast.error("Need at least 3 notes to cluster");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cluster-notes", {
        body: { notes: notes.map((n) => ({ content: n.content, summary: n.summary, tags: n.tags })) },
      });
      if (error) throw error;
      setClusters(data?.clusters || []);
      toast.success(`Found ${data?.clusters?.length || 0} topic clusters`);
    } catch (err: any) {
      console.error("Cluster error:", err);
      toast.error(err.message || "Failed to cluster notes");
    } finally {
      setIsLoading(false);
    }
  }, [notes]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Network className="h-4 w-4" /> Topic Clusters
        </h3>
        <Button size="sm" variant="outline" onClick={handleCluster} disabled={isLoading || notes.length < 3} className="h-7 gap-1 px-2 text-xs">
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Network className="h-3 w-3" />}
          {clusters.length > 0 ? "Recluster" : "Analyze"}
        </Button>
      </div>

      {clusters.length > 0 && (
        <div className="space-y-2">
          {clusters.map((cluster, i) => (
            <div key={i} className="rounded-lg border bg-card">
              <button
                className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                onClick={() => setExpandedCluster(expandedCluster === i ? null : i)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{cluster.name}</p>
                  <p className="text-xs text-muted-foreground">{cluster.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {cluster.noteIndices.length} notes
                  </span>
                  {expandedCluster === i ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </button>
              {expandedCluster === i && (
                <div className="border-t px-3 py-2 space-y-1.5">
                  {cluster.noteIndices.map((idx) => {
                    const note = notes[idx];
                    if (!note) return null;
                    return (
                      <div key={note.id} className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                        <p className="font-medium text-foreground">{note.summary || note.content.slice(0, 80)}</p>
                        <div className="mt-1 flex gap-1">
                          {(note.tags || []).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-tag-bg px-1.5 py-0.5 text-[10px] text-tag-foreground">{tag}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
