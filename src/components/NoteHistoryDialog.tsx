import { useEffect, useState } from "react";
import { Loader2, History, RotateCcw, Folder, Sparkles, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Version = {
  id: string;
  note_id: string;
  content: string;
  summary: string | null;
  folder: string | null;
  tags: string[] | null;
  change_type: string;
  created_at: string;
};

interface Props {
  note: Tables<"notes">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (id: string, content: string) => Promise<void>;
}

export function NoteHistoryDialog({ note, open, onOpenChange, onRestore }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("note_versions")
        .select("*")
        .eq("note_id", note.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load history");
      } else {
        setVersions((data || []) as Version[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, note.id]);

  const handleRestore = async (v: Version) => {
    setRestoringId(v.id);
    try {
      await onRestore(note.id, v.content);
      toast.success("Restored previous version");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Version history
          </DialogTitle>
          <DialogDescription>
            Previous AI summaries and edits for this note.
          </DialogDescription>
        </DialogHeader>

        {/* Current version */}
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Current
            </span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(note.updated_at).toLocaleString()}
            </span>
          </div>
          {note.summary && <p className="mb-1 text-sm font-medium text-foreground">{note.summary}</p>}
          <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{note.content}</p>
        </div>

        <ScrollArea className="max-h-[50vh] pr-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No previous versions yet. Edits and AI updates will appear here.
            </div>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => {
                const isAi = v.change_type === "ai_update";
                return (
                  <li key={v.id} className="rounded-md border bg-card p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        {isAi ? <Sparkles className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                        {isAi ? "AI update" : "Edit"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    {v.summary && (
                      <p className="mb-1 text-sm font-medium text-foreground">{v.summary}</p>
                    )}
                    <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                      {v.content}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {v.folder && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            <Folder className="h-2.5 w-2.5" />
                            {v.folder}
                          </span>
                        )}
                        {(v.tags || []).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-tag-bg px-2 py-0.5 text-[11px] text-tag-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={restoringId === v.id}
                        onClick={() => handleRestore(v)}
                      >
                        {restoringId === v.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Restore
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
