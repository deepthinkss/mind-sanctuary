import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, notes } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const candidates = (notes || []).slice(0, 50).map((n: any) => ({
      id: n.id,
      summary: n.summary || n.content?.slice(0, 200) || "",
      folder: n.folder || "Uncategorized",
      tags: n.tags || [],
    }));

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ relations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You analyze a new note against an existing knowledge base and identify the most semantically meaningful relationships. For each relation, choose:
- "related_to": shares a topic or theme
- "extends": deepens or builds on the target note
- "contradicts": conflicts with the target note
Return only the strongest 3-5 relations. Use the exact note IDs provided.`;

    const userPrompt = `NEW NOTE:\n${content}\n\nEXISTING NOTES:\n${JSON.stringify(candidates, null, 2)}`;

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
            name: "submit_relations",
            description: "Submit related notes with relation type and confidence",
            parameters: {
              type: "object",
              properties: {
                relations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      target_note_id: { type: "string" },
                      relation_type: { type: "string", enum: ["related_to", "extends", "contradicts"] },
                      confidence: { type: "number" },
                    },
                    required: ["target_note_id", "relation_type", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["relations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_relations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : { relations: [] };
    const validIds = new Set(candidates.map((c: any) => c.id));
    const relations = (args.relations || []).filter((r: any) => validIds.has(r.target_note_id)).slice(0, 5);

    return new Response(JSON.stringify({ relations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("link-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
