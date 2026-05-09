import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type FnCheck = {
  name: string;
  status: "healthy" | "degraded" | "down";
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
};

type HealthResponse = {
  overall: "healthy" | "degraded";
  timestamp: string;
  env: { aiKeyConfigured: boolean; supabaseUrl: boolean };
  functions: FnCheck[];
};

export function HealthStatus() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("health-check");
      if (error) throw error;
      setData(data as HealthResponse);
    } catch (e) {
      console.error("health-check failed:", e);
      setData({
        overall: "degraded",
        timestamp: new Date().toISOString(),
        env: { aiKeyConfigured: false, supabaseUrl: false },
        functions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  const overall = data?.overall ?? "degraded";
  const Icon = overall === "healthy" ? CheckCircle2 : AlertTriangle;
  const color =
    overall === "healthy" ? "text-emerald-500" : "text-amber-500";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Edge Functions Health">
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : data ? (
            <Icon className={`h-4 w-4 ${color}`} />
          ) : (
            <Activity className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Edge Functions</h3>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={check} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {data && (
          <>
            <div className="mb-2 flex items-center gap-2 text-xs">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className="font-medium capitalize">{data.overall}</span>
              <span className="ml-auto text-muted-foreground">
                {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="mb-2 flex gap-2 text-[10px] text-muted-foreground">
              <span className={data.env.aiKeyConfigured ? "text-emerald-500" : "text-destructive"}>
                AI key {data.env.aiKeyConfigured ? "✓" : "✗"}
              </span>
              <span className={data.env.supabaseUrl ? "text-emerald-500" : "text-destructive"}>
                DB {data.env.supabaseUrl ? "✓" : "✗"}
              </span>
            </div>

            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {data.functions.map((fn) => {
                const FnIcon =
                  fn.status === "healthy" ? CheckCircle2 :
                  fn.status === "degraded" ? AlertTriangle : XCircle;
                const fnColor =
                  fn.status === "healthy" ? "text-emerald-500" :
                  fn.status === "degraded" ? "text-amber-500" : "text-destructive";
                return (
                  <li key={fn.name} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted">
                    <FnIcon className={`h-3 w-3 shrink-0 ${fnColor}`} />
                    <span className="truncate font-mono">{fn.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {fn.latencyMs}ms
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
