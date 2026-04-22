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

    const candidates = (notes || []).slice(0, 60).map((n: any) => ({
      id: n.id,
      summary: n.summary || (n.content || "").slice(0, 200),
      folder: n.folder || "Uncategorized",
      tags: n.tags || [],
    }));

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ note_ids: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Pick the 3-7 notes most relevant to the user's goal. Return only their exact IDs.`;
    const userPrompt = `GOAL: ${goal.title}\n${goal.description ? `DESCRIPTION: ${goal.description}\n` : ""}\nNOTES:\n${JSON.stringify(candidates, null, 2)}`;

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
            name: "submit_suggestions",
            description: "Submit suggested note IDs",
            parameters: {
              type: "object",
              properties: { note_ids: { type: "array", items: { type: "string" } } },
              required: ["note_ids"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : { note_ids: [] };
    const validIds = new Set(candidates.map((c: any) => c.id));
    const note_ids = (args.note_ids || []).filter((id: string) => validIds.has(id)).slice(0, 7);

    return new Response(JSON.stringify({ note_ids }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-goal-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
