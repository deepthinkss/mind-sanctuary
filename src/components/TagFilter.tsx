import { Hash, X } from "lucide-react";

interface TagFilterProps {
  tags: { tag: string; count: number }[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export function TagFilter({ tags, selected, onToggle, onClear }: TagFilterProps) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Hash className="h-3 w-3" /> Tags
      </span>
      {tags.slice(0, 12).map(({ tag, count }) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {tag} <span className="opacity-60">{count}</span>
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          onClick={onClear}
          className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
