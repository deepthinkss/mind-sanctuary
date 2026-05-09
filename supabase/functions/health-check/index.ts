import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTIONS = [
  "process-note",
  "link-notes",
  "analyze-goal",
  "suggest-goal-notes",
  "cluster-notes",
  "generate-questions",
  "rewrite-note",
  "chat-with-notes",
  "suggest-notes",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

  const checks = await Promise.all(
    FUNCTIONS.map(async (name) => {
      const start = Date.now();
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
          method: "OPTIONS",
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        return {
          name,
          status: res.ok ? "healthy" : "degraded",
          httpStatus: res.status,
          latencyMs: Date.now() - start,
        };
      } catch (e) {
        return {
          name,
          status: "down",
          error: e instanceof Error ? e.message : "unreachable",
          latencyMs: Date.now() - start,
        };
      }
    })
  );

  const overall = checks.every((c) => c.status === "healthy") ? "healthy" : "degraded";

  return new Response(
    JSON.stringify({
      overall,
      timestamp: new Date().toISOString(),
      env: {
        aiKeyConfigured: !!AI_API_KEY,
        supabaseUrl: !!SUPABASE_URL,
      },
      functions: checks,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
