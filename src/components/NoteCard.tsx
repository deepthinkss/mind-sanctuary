import { Folder, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

interface NoteCardProps {
  note: Tables<"notes">;
  onDelete: (id: string) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  const date = new Date(note.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group flex flex-col rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-surface-hover sm:p-4">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Folder className="h-3 w-3" />
          <span>{note.folder || "Uncategorized"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{date}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onDelete(note.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {note.summary && (
        <p className="mb-2 text-sm font-medium text-foreground">{note.summary}</p>
      )}

      <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{note.content}</p>

      {note.tags && note.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-tag-bg px-2 py-0.5 text-xs text-tag-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
