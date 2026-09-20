import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Folder, History, Loader2, Pencil, RotateCcw, Search, Sparkles, Tags } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Note = Tables<"notes">;
type Version = Tables<"note_versions">;
type ChangeFilter = "all" | "ai_update" | "edit";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TagsList({ tags }: { tags: string[] | null }) {
  if (!tags?.length) {
    return <span className="text-xs text-muted-foreground">No tags</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className="rounded-full bg-tag-bg px-2 py-0.5 text-[11px] text-tag-foreground">
          {tag}
        </span>
      ))}
    </div>
  );
}

export function HistoryPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (note: Note, version: Version) => {
    setRestoringId(version.id);
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          content: version.content,
          summary: version.summary,
          folder: version.folder,
          tags: version.tags,
        })
        .eq("id", note.id);
      if (error) throw error;

      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id
            ? { ...n, content: version.content, summary: version.summary, folder: version.folder, tags: version.tags }
            : n,
        ),
      );
      const { data: versionData } = await supabase
        .from("note_versions")
        .select("*")
        .order("created_at", { ascending: false });
      if (versionData) setVersions(versionData);
      toast.success("Restored previous version");
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore");
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!userData.user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }

      setSignedIn(true);
      const [{ data: noteData, error: notesError }, { data: versionData, error: versionsError }] = await Promise.all([
        supabase.from("notes").select("*").order("updated_at", { ascending: false }),
        supabase.from("note_versions").select("*").order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (notesError || versionsError) {
        toast.error("Failed to load version history");
      } else {
        setNotes(noteData || []);
        setVersions(versionData || []);
      }
      setLoading(false);
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const versionsByNote = useMemo(() => {
    const grouped = new Map<string, Version[]>();
    versions.forEach((version) => {
      const existing = grouped.get(version.note_id) || [];
      existing.push(version);
      grouped.set(version.note_id, existing);
    });
    return grouped;
  }, [versions]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notes.filter((note) => {
      const noteVersions = versionsByNote.get(note.id) || [];
      const hasMatchingChange = changeFilter === "all"
        ? true
        : noteVersions.some((version) => version.change_type === changeFilter);
      if (!hasMatchingChange) return false;

      if (!normalizedQuery) return true;
      const searchable = [
        note.content,
        note.summary || "",
        note.folder || "",
        ...(note.tags || []),
        ...noteVersions.flatMap((version) => [
          version.content,
          version.summary || "",
          version.folder || "",
          ...(version.tags || []),
        ]),
      ].join(" ").toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [changeFilter, notes, query, versionsByNote]);

  const totalChanges = versions.length;

  if (signedIn === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <History className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Your history is private</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to view previous summaries, tags, and edits.</p>
          <Button asChild className="mt-6 gap-2">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-2 text-muted-foreground">
              <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to notes</Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Version history</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Previous summaries, tags, folders, and edits for every note.
                </p>
              </div>
            </div>
          </div>
          {!loading && (
            <div className="text-left text-sm text-muted-foreground sm:text-right">
              <p className="font-medium text-foreground">{notes.length} notes</p>
              <p>{totalChanges} saved changes</p>
            </div>
          )}
        </header>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes, summaries, or tags"
              className="pl-9"
            />
          </div>
          <Select value={changeFilter} onValueChange={(value) => setChangeFilter(value as ChangeFilter)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Change type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All changes</SelectItem>
              <SelectItem value="ai_update">AI updates</SelectItem>
              <SelectItem value="edit">Edits</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="border-t py-20 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <h2 className="font-medium text-foreground">No history found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {notes.length === 0 ? "Saved note changes will appear here." : "Try a different search or change type."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredNotes.map((note) => {
              const noteVersions = (versionsByNote.get(note.id) || []).filter(
                (version) => changeFilter === "all" || version.change_type === changeFilter,
              );

              return (
                <article key={note.id} className="rounded-lg border bg-card shadow-sm">
                  <div className="border-b p-4 sm:p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Folder className="h-3.5 w-3.5" />
                          <span>{note.folder || "Uncategorized"}</span>
                          <span>·</span>
                          <span>Updated {formatDate(note.updated_at)}</span>
                        </div>
                        <p className="line-clamp-2 text-sm text-foreground">{note.content}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {noteVersions.length} {noteVersions.length === 1 ? "change" : "changes"}
                      </span>
                    </div>

                    <div className="grid gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Current summary</p>
                        <p className="text-sm font-medium text-foreground">{note.summary || "Summary unavailable"}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:justify-end">
                          <Tags className="h-3 w-3" /> Current tags
                        </p>
                        <TagsList tags={note.tags} />
                      </div>
                    </div>
                  </div>

                  <div className="px-4 sm:px-5">
                    {noteVersions.length === 0 ? (
                      <p className="py-5 text-sm text-muted-foreground">No saved changes match this filter.</p>
                    ) : (
                      noteVersions.map((version) => {
                        const isAiUpdate = version.change_type === "ai_update";
                        return (
                          <div key={version.id} className="grid gap-3 border-b py-4 last:border-b-0 sm:grid-cols-[150px_1fr]">
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                              {isAiUpdate ? <Sparkles className="mt-0.5 h-3.5 w-3.5 text-primary" /> : <Pencil className="mt-0.5 h-3.5 w-3.5" />}
                              <div>
                                <p className="font-medium text-foreground">{isAiUpdate ? "AI update" : "Edit"}</p>
                                <p className="mt-0.5">{formatDate(version.created_at)}</p>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{version.content}</p>
                              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                <div>
                                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Previous summary</p>
                                  <p className="text-sm text-foreground">{version.summary || "Summary unavailable"}</p>
                                </div>
                                <div className="sm:text-right">
                                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Previous tags</p>
                                  <TagsList tags={version.tags} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}