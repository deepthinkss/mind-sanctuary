import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

type Note = Tables<"notes">;
type Relation = Tables<"note_relations">;

interface Props {
  notes: Note[];
  goalNoteIds?: Set<string>;
}

type SimNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  note: Note;
};

const RELATION_COLOR: Record<string, string> = {
  related_to: "hsl(var(--muted-foreground))",
  extends: "hsl(var(--primary))",
  contradicts: "hsl(var(--destructive))",
};

export function GraphView({ notes, goalNoteIds }: Props) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    fetchRelations();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: Math.max(420, r.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const fetchRelations = async () => {
    const { data, error } = await supabase.from("note_relations").select("*");
    if (error) toast.error("Failed to load relations");
    else setRelations(data || []);
    setLoading(false);
  };

  // Initialize node positions
  useEffect(() => {
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return notes.map((n, i) => {
        const existing = prevMap.get(n.id);
        if (existing) return { ...existing, note: n };
        const angle = (i / Math.max(notes.length, 1)) * Math.PI * 2;
        const r = Math.min(size.w, size.h) * 0.3;
        return {
          id: n.id,
          x: size.w / 2 + Math.cos(angle) * r,
          y: size.h / 2 + Math.sin(angle) * r,
          vx: 0,
          vy: 0,
          note: n,
        };
      });
    });
  }, [notes, size.w, size.h]);

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return;
    const edgeMap = relations.map((r) => ({ s: r.source_note_id, t: r.target_note_id }));
    let frame = 0;
    const tick = () => {
      frame++;
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));
        const byId = new Map(next.map((n) => [n.id, n]));

        // Repulsion
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i], b = next[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist2 = dx * dx + dy * dy + 0.01;
            const dist = Math.sqrt(dist2);
            const force = 1800 / dist2;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }

        // Spring on edges
        for (const e of edgeMap) {
          const a = byId.get(e.s); const b = byId.get(e.t);
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = 120;
          const k = 0.02;
          const force = (dist - target) * k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }

        // Center gravity
        for (const n of next) {
          n.vx += (size.w / 2 - n.x) * 0.002;
          n.vy += (size.h / 2 - n.y) * 0.002;
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
          // Bounds
          n.x = Math.max(30, Math.min(size.w - 30, n.x));
          n.y = Math.max(30, Math.min(size.h - 30, n.y));
        }
        return next;
      });
      if (frame < 200) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relations.length, notes.length, size.w, size.h]);

  const connectedIds = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set<string>();
    for (const r of relations) {
      if (r.source_note_id === selected) s.add(r.target_note_id);
      if (r.target_note_id === selected) s.add(r.source_note_id);
    }
    return s;
  }, [selected, relations]);

  const selectedNote = selected ? notes.find((n) => n.id === selected) : null;
  const selectedRelations = selected ? relations.filter((r) => r.source_note_id === selected || r.target_note_id === selected) : [];

  const handleLinkAll = async () => {
    setLinking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      let created = 0;
      // Re-link the most recent 8 notes against the rest
      const targets = notes.slice(0, 8);
      for (const note of targets) {
        const others = notes.filter((n) => n.id !== note.id);
        const { data, error } = await supabase.functions.invoke("link-notes", {
          body: { content: note.content, notes: others },
        });
        if (error || !data?.relations) continue;
        for (const r of data.relations) {
          const { error: insErr } = await supabase.from("note_relations").upsert({
            user_id: user.id,
            source_note_id: note.id,
            target_note_id: r.target_note_id,
            relation_type: r.relation_type,
            confidence: r.confidence,
          }, { onConflict: "source_note_id,target_note_id,relation_type" });
          if (!insErr) created++;
        }
      }
      toast.success(`Generated ${created} relations`);
      fetchRelations();
    } catch (e: any) {
      toast.error(e.message || "Failed to link notes");
    } finally {
      setLinking(false);
    }
  };

  const handleDeleteRelation = async (id: string) => {
    const { error } = await supabase.from("note_relations").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      setRelations((prev) => prev.filter((r) => r.id !== id));
      toast.success("Relation removed");
    }
  };

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading graph...</div>;

  if (notes.length < 2) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Add at least 2 notes to see your knowledge graph.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {notes.length} notes · {relations.length} relations
        </div>
        <Button size="sm" variant="outline" onClick={handleLinkAll} disabled={linking}>
          {linking ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
          AI Link Notes
        </Button>
      </div>

      <div ref={containerRef} className="relative h-[560px] w-full overflow-hidden rounded-lg border bg-card">
        <svg width={size.w} height={size.h} className="absolute inset-0">
          {/* Edges */}
          {relations.map((r) => {
            const a = nodes.find((n) => n.id === r.source_note_id);
            const b = nodes.find((n) => n.id === r.target_note_id);
            if (!a || !b) return null;
            const isHighlighted = !selected || selected === r.source_note_id || selected === r.target_note_id;
            return (
              <line
                key={r.id}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={RELATION_COLOR[r.relation_type] || "hsl(var(--muted-foreground))"}
                strokeWidth={1 + (r.confidence || 0.5) * 1.5}
                strokeOpacity={isHighlighted ? 0.7 : 0.1}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map((n) => {
            const isSelected = selected === n.id;
            const isConnected = connectedIds.has(n.id);
            const isGoal = goalNoteIds?.has(n.id);
            const dim = selected && !isSelected && !isConnected;
            return (
              <g key={n.id} onClick={() => setSelected(isSelected ? null : n.id)} className="cursor-pointer">
                <circle
                  cx={n.x} cy={n.y}
                  r={isSelected ? 10 : isConnected ? 8 : 6}
                  fill={isGoal ? "hsl(var(--primary))" : "hsl(var(--card))"}
                  stroke={isSelected ? "hsl(var(--primary))" : isGoal ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={dim ? 0.25 : 1}
                />
                <text
                  x={n.x} y={n.y - 12}
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-foreground text-[10px]"
                  opacity={dim ? 0.3 : 0.85}
                >
                  {(n.note.summary || n.note.content).slice(0, 24)}{(n.note.summary || n.note.content).length > 24 ? "…" : ""}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected note panel */}
        {selectedNote && (
          <div className="absolute right-3 top-3 w-72 rounded-lg border bg-popover p-3 shadow-lg">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="text-xs font-semibold text-foreground">{selectedNote.folder || "Uncategorized"}</div>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSelected(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="mb-2 text-xs text-muted-foreground line-clamp-4">{selectedNote.summary || selectedNote.content}</p>
            <div className="space-y-1">
              <div className="text-[10px] font-medium text-muted-foreground">Connections ({selectedRelations.length})</div>
              {selectedRelations.length === 0 && <div className="text-[11px] text-muted-foreground/70">No relations yet</div>}
              {selectedRelations.map((r) => {
                const otherId = r.source_note_id === selected ? r.target_note_id : r.source_note_id;
                const other = notes.find((n) => n.id === otherId);
                return (
                  <div key={r.id} className="flex items-center justify-between rounded border bg-card px-2 py-1">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-foreground">{other?.summary || other?.content || "—"}</div>
                      <div className="text-[9px] text-muted-foreground">{r.relation_type} · {Math.round((r.confidence || 0) * 100)}%</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteRelation(r.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg border bg-popover/90 px-3 py-1.5 text-[10px] backdrop-blur">
          <span className="flex items-center gap-1"><span className="h-2 w-3 bg-muted-foreground" /> related</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 bg-primary" /> extends</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 bg-destructive" /> contradicts</span>
        </div>
      </div>
    </div>
  );
}
