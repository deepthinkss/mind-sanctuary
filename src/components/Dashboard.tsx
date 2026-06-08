import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NoteInput } from "@/components/NoteInput";
import { NoteCard } from "@/components/NoteCard";
import { SearchBar } from "@/components/SearchBar";
import { FolderFilter } from "@/components/FolderFilter";
import { StatusFilter, type NoteStatus } from "@/components/StatusFilter";
import { DateFilter } from "@/components/DateFilter";
import { TagFilter } from "@/components/TagFilter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { TimelineView } from "@/components/TimelineView";
import { FocusMode } from "@/components/FocusMode";
import { SecondBrainChat } from "@/components/SecondBrainChat";
import { KnowledgeDashboard } from "@/components/KnowledgeDashboard";
import { TopicClusters } from "@/components/TopicClusters";
import { TodoList } from "@/components/TodoList";
import { GraphView } from "@/components/GraphView";
import { GoalsView } from "@/components/GoalsView";
import { Brain, LogOut, FileText, Clock, LayoutGrid, Focus, BarChart3, Network, ListTodo, Share2, Target, RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { ClientOnly } from "@tanstack/react-router";
import { HealthStatus } from "@/components/HealthStatus";
import { AiActivityBanner, type AiErrorMap, type AiSuccess } from "@/components/AiActivityBanner";

type NoteWithMeta = Tables<"notes"> & { _questions?: string[] };

export function Dashboard() {
  const [notes, setNotes] = useState<NoteWithMeta[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"todos" | "grid" | "timeline" | "dashboard" | "clusters" | "graph" | "goals">("grid");
  const [goalNoteIds, setGoalNoteIds] = useState<Set<string>>(new Set());
  const [focusMode, setFocusMode] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [aiErrors, setAiErrors] = useState<AiErrorMap>({});
  const [lastAiSuccess, setLastAiSuccess] = useState<AiSuccess | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<NoteStatus>("all");
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  const markProcessing = useCallback((id: string, on: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const recordAiError = useCallback((fn: string, err: any) => {
    const message = err?.message || (typeof err === "string" ? err : "Unknown error");
    setAiErrors((prev) => ({ ...prev, [fn]: { message, at: new Date().toISOString() } }));
  }, []);

  const recordAiSuccess = useCallback((fn: string, summary: string) => {
    setAiErrors((prev) => {
      if (!(fn in prev)) return prev;
      const next = { ...prev };
      delete next[fn];
      return next;
    });
    setLastAiSuccess({ fn, summary, at: new Date().toISOString() });
  }, []);

  const callAiFn = useCallback(
    async <T,>(fn: string, body: any, summarize: (data: T) => string): Promise<T> => {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) {
        recordAiError(fn, error);
        throw error;
      }
      try { recordAiSuccess(fn, summarize(data as T)); } catch { /* ignore */ }
      return data as T;
    },
    [recordAiError, recordAiSuccess]
  );

  useEffect(() => {
    fetchNotes();
    fetchGoalNoteIds();
  }, []);

  const fetchGoalNoteIds = async () => {
    const { data } = await supabase.from("goal_notes").select("note_id");
    if (data) setGoalNoteIds(new Set(data.map((d: any) => d.note_id)));
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load notes");
      console.error(error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (content: string, ai?: { summary: string | null; tags: string[]; folder: string }) => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert immediately so the card shows up; AI fills in summary/tags after.
      const initial = ai
        ? { summary: ai.summary, tags: ai.tags, folder: ai.folder || "Uncategorized" }
        : { summary: null as string | null, tags: [] as string[], folder: "Uncategorized" };
      const { data: note, error: insertError } = await supabase
        .from("notes")
        .insert({ user_id: user.id, content, ...initial })
        .select()
        .single();
      if (insertError) throw insertError;
      setNotes((prev) => [note, ...prev]);
      if (ai) {
        recordAiSuccess("process-note", ai.summary || "Processed note");
        toast.success("Note saved & organized by AI");
      } else {
        toast.success("Note saved — organizing with AI…");
        markProcessing(note.id, true);
        (async () => {
          try {
            const data = await callAiFn<any>("process-note", { content }, (d) => d?.summary || "Processed note");
            const aiData = { summary: data?.summary || null, tags: data?.tags || [], folder: data?.folder || "Uncategorized" };
            const { data: updated } = await supabase
              .from("notes")
              .update(aiData)
              .eq("id", note.id).select().single();
            if (updated) setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
          } catch (e) {
            console.error("AI organize failed:", e);
          } finally {
            markProcessing(note.id, false);
          }
        })();
      }

      // Auto-link new note with existing notes (background)
      (async () => {
        try {
          const others = notes.filter((n) => n.id !== note.id);
          if (others.length === 0) return;
          const linkData = await callAiFn<any>(
            "link-notes",
            { content, notes: others },
            (d) => `Found ${d?.relations?.length || 0} related note(s)`
          );
          const rels = linkData?.relations || [];
          if (rels.length > 0) {
            const rows = rels.map((r: any) => ({
              user_id: user.id,
              source_note_id: note.id,
              target_note_id: r.target_note_id,
              relation_type: r.relation_type,
              confidence: r.confidence,
            }));
            await supabase.from("note_relations").upsert(rows, { onConflict: "source_note_id,target_note_id,relation_type" });
          }
        } catch (e) { console.error("auto-link failed:", e); }
      })();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save note");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) toast.error("Failed to delete note");
    else setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleEdit = async (id: string, content: string) => {
    markProcessing(id, true);
    try {
      const aiData = await callAiFn<any>("process-note", { content }, (d) => d?.summary || "Processed note");
      const { data: updated, error: updateError } = await supabase
        .from("notes")
        .update({ content, summary: aiData?.summary || null, tags: aiData?.tags || [], folder: aiData?.folder || "Uncategorized" })
        .eq("id", id).select().single();
      if (updateError) throw updateError;
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      toast.success("Note updated & re-processed by AI");
    } catch (err: any) {
      console.error("Edit error:", err);
      toast.error(err.message || "Failed to update note");
      throw err;
    } finally {
      markProcessing(id, false);
    }
  };

  const handleRewrite = useCallback(async (id: string, content: string, action: string) => {
    markProcessing(id, true);
    try {
      const data = await callAiFn<any>(
        "rewrite-note",
        { content, action },
        (d) => `${action}: ${(d?.result || "").slice(0, 80)}`
      );
      if (!data?.result) throw new Error("No result returned");
      const aiData = await callAiFn<any>("process-note", { content: data.result }, (d) => d?.summary || "Processed note");
      const { data: updated, error: updateError } = await supabase
        .from("notes")
        .update({ content: data.result, summary: aiData?.summary || null, tags: aiData?.tags || [], folder: aiData?.folder || "Uncategorized" })
        .eq("id", id).select().single();
      if (updateError) throw updateError;
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      toast.success(`Note ${action === "expand" ? "expanded" : action === "simplify" ? "simplified" : "rewritten"} by AI`);
    } catch (err: any) {
      console.error("Rewrite error:", err);
      toast.error(err.message || "Failed to rewrite note");
    } finally {
      markProcessing(id, false);
    }
  }, [callAiFn, markProcessing]);

  const handleRetryProcess = useCallback(async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    markProcessing(id, true);
    try {
      const aiData = await callAiFn<any>("process-note", { content: note.content }, (d) => d?.summary || "Processed note");
      const update = { summary: aiData?.summary || null, tags: aiData?.tags || [], folder: aiData?.folder || "Uncategorized" };
      const { data: updated, error: updateError } = await supabase
        .from("notes")
        .update(update)
        .eq("id", id).select().single();
      if (updateError) throw updateError;
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      toast.success("Note re-processed by AI");
    } catch (err: any) {
      console.error("Retry error:", err);
      toast.error(err.message || "Failed to re-process note");
    } finally {
      markProcessing(id, false);
    }
  }, [notes, callAiFn, markProcessing]);

  const handleGenerateQuestions = useCallback(async (id: string) => {
    try {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const data = await callAiFn<any>(
        "generate-questions",
        { content: note.content },
        (d) => `${(d?.questions || []).length} question(s) generated`
      );
      if (!data?.questions) throw new Error("No questions returned");
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, _questions: data.questions } : n)));
      toast.success("Reflective questions generated");
    } catch (err: any) {
      console.error("Questions error:", err);
      toast.error(err.message || "Failed to generate questions");
    }
  }, [notes, callAiFn]);

  const handleTogglePin = useCallback(async (id: string, pinned: boolean) => {
    const { error } = await supabase.from("notes").update({ pinned }).eq("id", id);
    if (error) {
      toast.error("Failed to update pin");
    } else {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned } : n)));
      toast.success(pinned ? "Note pinned" : "Note unpinned");
    }
  }, []);

  const handleUpdateTags = useCallback(async (id: string, tags: string[]) => {
    const { error } = await supabase.from("notes").update({ tags }).eq("id", id);
    if (error) {
      toast.error("Failed to update tags");
    } else {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, tags } : n)));
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const toggleTheme = () => { document.documentElement.classList.toggle("dark"); };

  const folders = useMemo(() => {
    const set = new Set(notes.map((n) => n.folder || "Uncategorized"));
    return Array.from(set).sort();
  }, [notes]);

  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => (n.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  }, [notes]);

  const statusOf = useCallback(
    (n: NoteWithMeta): Exclude<NoteStatus, "all"> => {
      if (processingIds.has(n.id)) return "processing";
      if (n.summary) return "ready";
      return "failed";
    },
    [processingIds]
  );

  const statusCounts = useMemo(() => {
    const c = { processing: 0, ready: 0, failed: 0 };
    notes.forEach((n) => { c[statusOf(n)]++; });
    return c;
  }, [notes, statusOf]);

  const filteredNotes = useMemo(() => {
    let result: NoteWithMeta[] = notes;

    if (selectedFolder) result = result.filter((n) => (n.folder || "Uncategorized") === selectedFolder);
    if (statusFilter !== "all") result = result.filter((n) => statusOf(n) === statusFilter);
    if (selectedTags.length > 0) {
      result = result.filter((n) => selectedTags.every((t) => (n.tags || []).includes(t)));
    }
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      result = result.filter((n) => n.created_at.slice(0, 10) === dateStr);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) => n.content.toLowerCase().includes(q) || n.summary?.toLowerCase().includes(q) || n.tags?.some((t) => t.toLowerCase().includes(q)) || n.folder?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notes, search, selectedFolder, selectedDate, selectedTags, statusFilter, statusOf]);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <ClientOnly fallback={null}>
        <CommandPalette onNewNote={() => noteInputRef.current?.focus()} onFocusSearch={() => searchRef.current?.focus()} onToggleTheme={toggleTheme} onSignOut={handleSignOut} isDark={isDark} />
      </ClientOnly>
      <ClientOnly fallback={null}>
        <FocusMode isOpen={focusMode} onClose={() => setFocusMode(false)} onSave={handleSave} isProcessing={isProcessing} />
      </ClientOnly>

      {/* Header */}
      <header className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary sm:h-9 sm:w-9">
            <Brain className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground sm:text-lg">Knowledge Hub</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Press <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">⌘K</kbd> for commands</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setFocusMode(true)} title="Focus Mode">
            <Focus className="h-4 w-4" />
          </Button>
          <ClientOnly fallback={null}>
            <HealthStatus />
          </ClientOnly>
          <ClientOnly fallback={null}>
            <ThemeToggle />
          </ClientOnly>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* AI activity (errors + last success) */}
      <AiActivityBanner
        errors={aiErrors}
        lastSuccess={lastAiSuccess}
        onDismissError={(fn) => setAiErrors((prev) => { const n = { ...prev }; delete n[fn]; return n; })}
        onDismissSuccess={() => setLastAiSuccess(null)}
      />

      {/* Note Input */}
      <div className="mb-4 sm:mb-6">
        <NoteInput onSave={handleSave} isProcessing={isProcessing} textareaRef={noteInputRef} />
      </div>

      {/* Search & Filter */}
      {notes.length > 0 && (
        <div className="mb-3 space-y-2 sm:mb-4 sm:space-y-3">
          <SearchBar value={search} onChange={setSearch} inputRef={searchRef} />
          <div className="flex flex-wrap items-center gap-2">
            <DateFilter selectedDate={selectedDate} onSelect={setSelectedDate} />
            {folders.length > 1 && <FolderFilter folders={folders} selected={selectedFolder} onSelect={setSelectedFolder} />}
            <StatusFilter selected={statusFilter} counts={statusCounts} onSelect={setStatusFilter} />

            {/* View toggle */}
            <div className="ml-auto flex items-center rounded-md border bg-muted p-0.5">
              <Button variant={viewMode === "todos" ? "default" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewMode("todos")}>
                <ListTodo className="h-3 w-3" /> Todos
              </Button>
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="h-3 w-3" /> Grid
              </Button>
              <Button variant={viewMode === "timeline" ? "default" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewMode("timeline")}>
                <Clock className="h-3 w-3" /> Timeline
              </Button>
              <Button variant={viewMode === "dashboard" ? "default" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewMode("dashboard")}>
                <BarChart3 className="h-3 w-3" /> Insights
              </Button>
              <Button variant={viewMode === "clusters" ? "default" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewMode("clusters")}>
                <Network className="h-3 w-3" /> Clusters
              </Button>
              <Button variant={viewMode === "graph" ? "default" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewMode("graph")}>
                <Share2 className="h-3 w-3" /> Graph
              </Button>
              <Button variant={viewMode === "goals" ? "default" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewMode("goals")}>
                <Target className="h-3 w-3" /> Goals
              </Button>
            </div>
          </div>
          {tagStats.length > 0 && (
            <TagFilter
              tags={tagStats}
              selected={selectedTags}
              onToggle={(t) => setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
              onClear={() => setSelectedTags([])}
            />
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground sm:py-20">Loading...</div>
      ) : viewMode === "todos" ? (
        <ClientOnly fallback={null}>
          <div
            key="todos-view"
            className="mx-auto w-full max-w-5xl animate-slide-in-right rounded-xl border bg-card/40 p-4 shadow-sm sm:p-8"
          >
            <TodoList />
          </div>
        </ClientOnly>
      ) : viewMode === "dashboard" ? (
        <KnowledgeDashboard notes={notes} />
      ) : viewMode === "clusters" ? (
        <TopicClusters notes={notes} />
      ) : viewMode === "graph" ? (
        <GraphView notes={notes} goalNoteIds={goalNoteIds} />
      ) : viewMode === "goals" ? (
        <div
          key="goals-view"
          className="mx-auto w-full max-w-5xl animate-slide-in-right rounded-xl border bg-card/40 p-4 shadow-sm sm:p-8"
        >
          <GoalsView notes={notes} />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-16 text-center sm:py-20">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {notes.length === 0 ? "No notes yet. Start with a brain dump above!" : "No notes match your search."}
          </p>
        </div>
      ) : viewMode === "timeline" ? (
        <TimelineView notes={filteredNotes} processingIds={processingIds} onDelete={handleDelete} onEdit={handleEdit} onTogglePin={handleTogglePin} onUpdateTags={handleUpdateTags} onRewrite={handleRewrite} onGenerateQuestions={handleGenerateQuestions} onRetryProcess={handleRetryProcess} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} isAiProcessing={processingIds.has(note.id)} onDelete={handleDelete} onEdit={handleEdit} onTogglePin={handleTogglePin} onUpdateTags={handleUpdateTags} onRewrite={handleRewrite} onGenerateQuestions={handleGenerateQuestions} onRetryProcess={handleRetryProcess} />
          ))}
        </div>
      )}

      {/* Second Brain Chat */}
      <ClientOnly fallback={null}>
        <SecondBrainChat notes={notes} />
      </ClientOnly>
    </div>
  );
}
