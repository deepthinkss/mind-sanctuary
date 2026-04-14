import { useState } from "react";
import { Folder, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

interface NoteCardProps {
  note: Tables<"notes">;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
}

export function NoteCard({ note, onDelete, onEdit }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);

  const date = new Date(note.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handleSave = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onEdit(note.id, editContent.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  return (
    <div className="group flex flex-col rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-surface-hover sm:p-4">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Folder className="h-3 w-3" />
          <span>{note.folder || "Uncategorized"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{date}</span>
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onDelete(note.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px] w-full resize-none rounded-md border bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={isSaving}
          />
          <div className="flex items-center gap-1.5 self-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-7 gap-1 px-2 text-xs"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editContent.trim() || isSaving}
              className="h-7 gap-1 px-2 text-xs"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Re-process & Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          {note.summary && (
            <p className="mb-2 text-sm font-medium text-foreground">{note.summary}</p>
          )}
          <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{note.content}</p>
        </>
      )}

      {note.tags && note.tags.length > 0 && !isEditing && (
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
