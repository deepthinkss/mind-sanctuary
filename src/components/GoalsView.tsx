import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Trash2, CheckCircle2, Circle, Loader2, Link2, X } from "lucide-react";
import { toast } from "sonner";

type Goal = Tables<"goals">;
type Note = Tables<"notes">;
type GoalNote = Tables<"goal_notes">;

interface Props {
  notes: Note[];
}

type Analysis = {
  progress: number;
  summary: string;
  missing_knowledge: string[];
  next_steps: string[];
};

export function GoalsView({ notes }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalNotes, setGoalNotes] = useState<GoalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [g, gn] = await Promise.all([
        supabase.from("goals").select("*").order("created_at", { ascending: false }),
        supabase.from("goal_notes").select("*"),
      ]);
      if (g.error) toast.error("Failed to load goals");
      else setGoals(g.data || []);
      if (!gn.error) setGoalNotes(gn.data || []);
      setLoading(false);
    })();
  }, []);

  const linkedNotesFor = useCallback(
    (goalId: string) => {
      const ids = new Set(goalNotes.filter((g) => g.goal_id === goalId).map((g) => g.note_id));
      return notes.filter((n) => ids.has(n.id));
    },
    [goalNotes, notes]
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: goal, error } = await supabase
        .from("goals")
        .insert({ user_id: user.id, title: newTitle.trim(), description: newDesc.trim() || null })
        .select().single();
      if (error) throw error;
      setGoals((prev) => [goal, ...prev]);
      setNewTitle("");
      setNewDesc("");
      toast.success("Goal created");

      // Suggest initial notes
      try {
        const { data } = await supabase.functions.invoke("suggest-goal-notes", { body: { goal, notes } });
        const suggested: string[] = data?.note_ids || [];
        if (suggested.length > 0) {
          const rows = suggested.map((nid) => ({ user_id: user.id, goal_id: goal.id, note_id: nid }));
          const { data: inserted } = await supabase.from("goal_notes").insert(rows).select();
          if (inserted) setGoalNotes((prev) => [...prev, ...inserted]);
          toast.success(`Linked ${suggested.length} suggested notes`);
        }
      } catch (e) { console.error(e); }
    } catch (e: any) {
      toast.error(e.message || "Failed to create goal");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setGoalNotes((prev) => prev.filter((gn) => gn.goal_id !== id));
    }
  };

  const handleToggleStatus = async (g: Goal) => {
    const next = g.status === "active" ? "completed" : "active";
    const { error } = await supabase.from("goals").update({ status: next }).eq("id", g.id);
    if (error) toast.error("Failed to update");
    else setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, status: next } : x)));
  };

  const handleAnalyze = async (g: Goal) => {
    setBusy(g.id);
    try {
      const linked = linkedNotesFor(g.id);
      const { data, error } = await supabase.functions.invoke("analyze-goal", { body: { goal: g, notes: linked } });
      if (error) throw error;
      setAnalyses((prev) => ({ ...prev, [g.id]: data }));
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setBusy(null);
    }
  };

  const handleToggleNote = async (goalId: string, noteId: string) => {
    const existing = goalNotes.find((gn) => gn.goal_id === goalId && gn.note_id === noteId);
    if (existing) {
      const { error } = await supabase.from("goal_notes").delete().eq("id", existing.id);
      if (!error) setGoalNotes((prev) => prev.filter((gn) => gn.id !== existing.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("goal_notes")
        .insert({ user_id: user.id, goal_id: goalId, note_id: noteId })
        .select().single();
      if (!error && data) setGoalNotes((prev) => [...prev, data]);
    }
  };

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading goals...</div>;

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="text-xs font-semibold text-foreground">New Goal</div>
        <Input placeholder="Goal title (e.g. Learn Rust)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} />
        <Button size="sm" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
          {creating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
          Create & Auto-link Notes
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No goals yet. Create one above.</div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const linked = linkedNotesFor(g.id);
            const analysis = analyses[g.id];
            const isExpanded = activeGoalId === g.id;
            return (
              <div key={g.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleStatus(g)} className="shrink-0">
                        {g.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <h3 className={`text-sm font-semibold ${g.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{g.title}</h3>
                      <Badge variant="secondary" className="text-[10px]">{linked.length} notes</Badge>
                    </div>
                    {g.description && <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleAnalyze(g)} disabled={busy === g.id}>
                      {busy === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setActiveGoalId(isExpanded ? null : g.id)}>
                      <Link2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>

                {analysis && (
                  <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <Progress value={analysis.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-foreground">{analysis.progress}%</span>
                    </div>
                    <p className="text-xs text-foreground">{analysis.summary}</p>
                    {analysis.next_steps.length > 0 && (
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground">Next steps</div>
                        <ul className="mt-0.5 list-disc pl-4 text-xs text-foreground/90">
                          {analysis.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {analysis.missing_knowledge.length > 0 && (
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground">Knowledge gaps</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {analysis.missing_knowledge.map((s, i) => <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-md border bg-background/50 p-2">
                    <div className="mb-1 text-[10px] font-medium text-muted-foreground">Click notes to link / unlink</div>
                    {notes.map((n) => {
                      const isLinked = linked.some((l) => l.id === n.id);
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleToggleNote(g.id, n.id)}
                          className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${isLinked ? "bg-primary/10 text-foreground" : "hover:bg-muted"}`}
                        >
                          {isLinked ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />}
                          <span className="line-clamp-2">{n.summary || n.content}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
