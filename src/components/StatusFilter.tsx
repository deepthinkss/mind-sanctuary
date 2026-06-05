import { Loader2, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

export type NoteStatus = "all" | "processing" | "ready" | "failed";

interface Props {
  selected: NoteStatus;
  counts: Record<Exclude<NoteStatus, "all">, number>;
  onSelect: (s: NoteStatus) => void;
}

const items: { value: NoteStatus; label: string; Icon: typeof Layers }[] = [
  { value: "all", label: "All", Icon: Layers },
  { value: "processing", label: "Processing", Icon: Loader2 },
  { value: "ready", label: "Ready", Icon: CheckCircle2 },
  { value: "failed", label: "Failed", Icon: AlertTriangle },
];

export function StatusFilter({ selected, counts, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(({ value, label, Icon }) => {
        const count = value === "all" ? undefined : counts[value];
        const active = selected === value;
        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            <Icon className={`h-3 w-3 ${value === "processing" && active ? "animate-spin" : ""}`} />
            {label}
            {count !== undefined && (
              <span className="ml-0.5 rounded-full bg-background/40 px-1.5 text-[10px]">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
