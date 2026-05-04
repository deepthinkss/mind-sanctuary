import { useMemo } from "react";
import { BarChart3, Tag, FolderOpen, Calendar, TrendingUp, Hash } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface KnowledgeDashboardProps {
  notes: Tables<"notes">[];
}

export function KnowledgeDashboard({ notes }: KnowledgeDashboardProps) {
  const stats = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    const folderCounts: Record<string, number> = {};
    const weeklyActivity: Record<string, number> = {};

    notes.forEach((n) => {
      (n.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      const folder = n.folder || "Uncategorized";
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;

      const date = new Date(n.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weeklyActivity[key] = (weeklyActivity[key] || 0) + 1;
    });

    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topFolders = Object.entries(folderCounts).sort((a, b) => b[1] - a[1]);
    const activityData = Object.entries(weeklyActivity).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
    const maxActivity = Math.max(...activityData.map(([, v]) => v), 1);

    const pinnedCount = notes.filter((n) => n.pinned).length;
    const totalTags = Object.keys(tagCounts).length;
    const avgTagsPerNote = notes.length > 0 ? (notes.reduce((sum, n) => sum + (n.tags?.length || 0), 0) / notes.length).toFixed(1) : "0";

    return { topTags, topFolders, activityData, maxActivity, pinnedCount, totalTags, avgTagsPerNote };
  }, [notes]);

  if (notes.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { icon: BarChart3, label: "Total Notes", value: notes.length },
          { icon: Hash, label: "Unique Tags", value: stats.totalTags },
          { icon: FolderOpen, label: "Folders", value: stats.topFolders.length },
          { icon: TrendingUp, label: "Avg Tags/Note", value: stats.avgTagsPerNote },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3 w-3" /> {label}
            </div>
            <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Activity chart */}
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Calendar className="h-3 w-3" /> Weekly Activity
          </h3>
          <div className="flex items-end gap-1.5 h-20">
            {stats.activityData.map(([week, count]) => (
              <div key={week} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-primary/70 transition-all"
                  style={{ height: `${(count / stats.maxActivity) * 100}%`, minHeight: 4 }}
                />
                <span className="text-[8px] text-muted-foreground">{new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top tags */}
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Tag className="h-3 w-3" /> Top Tags
          </h3>
          <div className="space-y-1.5">
            {stats.topTags.map(([tag, count]) => (
              <div key={tag} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{tag}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${(count / (stats.topTags[0]?.[1] || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Folder distribution */}
      <div className="rounded-lg border bg-card p-3">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <FolderOpen className="h-3 w-3" /> Folder Distribution
        </h3>
        <div className="flex flex-wrap gap-2">
          {stats.topFolders.map(([folder, count]) => (
            <div key={folder} className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
              <span className="text-foreground">{folder}</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tag cloud */}
      {stats.topTags.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Hash className="h-3 w-3" /> Tag Cloud
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {stats.topTags.map(([tag, count]) => {
              const max = stats.topTags[0]?.[1] || 1;
              const size = 0.75 + (count / max) * 1.0; // 0.75rem -> 1.75rem
              const opacity = 0.5 + (count / max) * 0.5;
              return (
                <span
                  key={tag}
                  className="font-medium text-primary"
                  style={{ fontSize: `${size}rem`, opacity }}
                  title={`${count} note${count === 1 ? "" : "s"}`}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
