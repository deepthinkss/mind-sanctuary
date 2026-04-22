import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { goal, notes } = await req.json();
    if (!goal?.title) {
      return new Response(JSON.stringify({ error: "goal required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const notesContext = (notes || []).map((n: any) =>
      `[${n.folder || "Uncategorized"}] ${n.summary || ""}\n${(n.content || "").slice(0, 250)}`
    ).join("\n---\n") || "No notes linked yet.";

    const systemPrompt = `You are a knowledge coach. Given a user's goal and the notes they've linked to it, evaluate progress and suggest next steps. Be concise and concrete.`;
    const userPrompt = `GOAL: ${goal.title}\n${goal.description ? `DESCRIPTION: ${goal.description}\n` : ""}\nLINKED NOTES:\n${notesContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_analysis",
            description: "Submit goal progress analysis",
            parameters: {
              type: "object",
              properties: {
                progress: { type: "number", description: "0-100 estimated progress" },
                summary: { type: "string", description: "1-2 sentence progress summary" },
                missing_knowledge: { type: "array", items: { type: "string" } },
                next_steps: { type: "array", items: { type: "string" } },
              },
              required: ["progress", "summary", "missing_knowledge", "next_steps"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : null;

    return new Response(JSON.stringify(args || { progress: 0, summary: "No analysis", missing_knowledge: [], next_steps: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-goal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
