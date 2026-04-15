import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { NoteCard } from "@/components/NoteCard";
import { Calendar } from "lucide-react";

interface TimelineViewProps {
  notes: Tables<"notes">[];
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onRewrite: (id: string, content: string, action: string) => Promise<void>;
  onGenerateQuestions: (id: string) => Promise<void>;
}

export function TimelineView({ notes, onDelete, onEdit, onTogglePin, onUpdateTags, onRewrite, onGenerateQuestions }: TimelineViewProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Tables<"notes">[]>();
    for (const note of notes) {
      const d = new Date(note.created_at);
      const key = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(note);
    }
    return Array.from(map.entries());
  }, [notes]);

  if (grouped.length === 0) {
    return (
      <div className="py-16 text-center">
        <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No notes to show on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border sm:left-4" />

      {grouped.map(([dateLabel, dateNotes]) => (
        <div key={dateLabel} className="relative pl-8 sm:pl-10">
          {/* Timeline dot */}
          <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background sm:left-2.5" />

          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">{dateLabel}</h3>
            <p className="text-xs text-muted-foreground">{dateNotes.length} note{dateNotes.length !== 1 ? "s" : ""}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {dateNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDelete={onDelete}
                onEdit={onEdit}
                onTogglePin={onTogglePin}
                onUpdateTags={onUpdateTags}
                onRewrite={onRewrite}
                onGenerateQuestions={onGenerateQuestions}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
