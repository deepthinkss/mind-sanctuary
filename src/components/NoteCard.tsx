import { useState } from "react";
import { Folder, Trash2, Pencil, Check, X, Loader2, Pin, PinOff, Plus, RefreshCw, HelpCircle, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/CodeBlock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteCardProps {
  note: Tables<"notes">;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onRewrite: (id: string, content: string, action: string) => Promise<void>;
  onGenerateQuestions: (id: string) => Promise<void>;
}

export function NoteCard({ note, onDelete, onEdit, onTogglePin, onUpdateTags, onRewrite, onGenerateQuestions }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);

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

  const handleRewrite = async (action: string) => {
    setIsRewriting(true);
    try {
      await onRewrite(note.id, note.content, action);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      await onGenerateQuestions(note.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const safeTitle = (note.summary || note.content.slice(0, 40))
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "note";
    const blob = new Blob([note.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || (note.tags || []).includes(tag)) {
      setTagInput("");
      return;
    }
    onUpdateTags(note.id, [...(note.tags || []), tag]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateTags(note.id, (note.tags || []).filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      setIsEditingTags(false);
      setTagInput("");
    }
  };

  return (
    <div className={`group flex flex-col rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-surface-hover sm:p-4 ${note.pinned ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Folder className="h-3 w-3" />
          <span>{note.folder || "Uncategorized"}</span>
          {note.pinned && <Pin className="h-3 w-3 text-primary" />}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{date}</span>
          {!isEditing && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => onTogglePin(note.id, !note.pinned)} title={note.pinned ? "Unpin" : "Pin"}>
                {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              </Button>

              {/* Rewrite dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" disabled={isRewriting} title="Rewrite">
                    {isRewriting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleRewrite("rewrite")}>✨ Improve clarity</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRewrite("expand")}>📝 Expand ideas</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRewrite("simplify")}>🎯 Simplify</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRewrite("professional")}>💼 Professional tone</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRewrite("casual")}>😊 Casual tone</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Generate questions */}
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={handleGenerateQuestions} disabled={isGenerating} title="Generate questions">
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <HelpCircle className="h-3 w-3" />}
              </Button>

              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={handleExport} title="Export as markdown">
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => onDelete(note.id)}>
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
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving} className="h-7 gap-1 px-2 text-xs">
              <X className="h-3 w-3" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!editContent.trim() || isSaving} className="h-7 gap-1 px-2 text-xs">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Re-process & Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          {note.summary && <p className="mb-2 text-sm font-medium text-foreground">{note.summary}</p>}
          <div className="mb-3 line-clamp-4 text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
            <ReactMarkdown>{note.content}</ReactMarkdown>
          </div>
        </>
      )}

      {/* AI-generated questions */}
      {(note as any)._questions && (note as any)._questions.length > 0 && !isEditing && (
        <div className="mb-3 rounded-md border border-primary/20 bg-primary/5 p-2.5">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-primary">
            <HelpCircle className="h-3 w-3" /> Reflective Questions
          </p>
          <ul className="space-y-1">
            {(note as any)._questions.map((q: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground">• {q}</li>
            ))}
          </ul>
        </div>
      )}

      {!isEditing && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {(note.tags || []).map((tag) => (
            <span key={tag} className="group/tag flex items-center gap-0.5 rounded-full bg-tag-bg px-2 py-0.5 text-xs text-tag-foreground">
              {tag}
              {isEditingTags && (
                <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 rounded-full hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}
          {isEditingTags ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag..."
                className="h-5 w-20 rounded border bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <button onClick={() => { setIsEditingTags(false); setTagInput(""); }} className="text-muted-foreground hover:text-foreground">
                <Check className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTags(true)}
              className="flex items-center gap-0.5 rounded-full border border-dashed border-muted-foreground/30 px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:border-primary/50 hover:text-primary group-hover:opacity-100"
            >
              <Plus className="h-2.5 w-2.5" />
              tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}
