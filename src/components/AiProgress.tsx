import { useEffect, useState } from "react";
import { Loader2, FileText, Tags, FolderTree, Check } from "lucide-react";

const STEPS = [
  { key: "summarize", label: "Summarizing", Icon: FileText },
  { key: "tag", label: "Tagging", Icon: Tags },
  { key: "organize", label: "Organizing", Icon: FolderTree },
] as const;

const STEP_MS = 1200;

interface Props {
  active: boolean;
  done?: boolean;
}

export function AiProgress({ active, done = false }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const id = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [active]);

  if (!active && !done) return null;

  return (
    <div className="mb-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs text-primary">
      <div className="flex items-center gap-1.5">
        {done ? (
          <Check className="h-3 w-3" />
        ) : (
          <Loader2 className="h-3 w-3 animate-spin" />
        )}
        <span className="font-medium">
          {done ? "Ready" : `${STEPS[step].label}…`}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isActive = !done && i === step;
          const isDone = done || (active && i < step);
          return (
            <div key={s.key} className="flex flex-1 items-center gap-1">
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isDone
                      ? "border-primary/50 bg-primary/30 text-primary"
                      : "border-primary/20 bg-background text-primary/40"
                }`}
                aria-label={s.label}
              >
                <s.Icon className="h-2.5 w-2.5" />
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 transition-colors ${
                    isDone ? "bg-primary/50" : "bg-primary/15"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
