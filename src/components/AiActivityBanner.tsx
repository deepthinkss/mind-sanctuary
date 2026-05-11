import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AiSuccess = {
  fn: string;
  summary: string;
  at: string;
};

export type AiErrorMap = Record<string, { message: string; at: string }>;

interface Props {
  errors: AiErrorMap;
  lastSuccess: AiSuccess | null;
  onDismissError: (fn: string) => void;
  onDismissSuccess: () => void;
}

export function AiActivityBanner({ errors, lastSuccess, onDismissError, onDismissSuccess }: Props) {
  const errorEntries = Object.entries(errors);
  if (errorEntries.length === 0 && !lastSuccess) return null;

  return (
    <div className="mb-3 space-y-2">
      {errorEntries.map(([fn, info]) => (
        <div
          key={fn}
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-medium text-destructive">{fn}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(info.at).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-0.5 break-words text-destructive/90">{info.message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => onDismissError(fn)}
            aria-label={`Dismiss ${fn} error`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {lastSuccess && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                Last successful AI result
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{lastSuccess.fn}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(lastSuccess.at).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-0.5 break-words text-foreground/80">{lastSuccess.summary}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={onDismissSuccess}
            aria-label="Dismiss last success"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
