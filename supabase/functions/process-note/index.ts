import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    // Configure your AI provider's endpoint here
    const AI_ENDPOINT = Deno.env.get("AI_ENDPOINT") || "https://api.openai.com/v1/chat/completions";
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that organizes notes. Given a note, you must return a JSON object with exactly these fields:
- "summary": A single concise sentence summarizing the note.
- "tags": An array of exactly 3 relevant tags (lowercase, no hashtags).
- "folder": A single category/folder name for this note (e.g., "Work", "Ideas", "Personal", "Learning", "Projects", "Health", "Finance").

Return ONLY valid JSON, no markdown, no explanation.`
          },
          { role: "user", content: content.slice(0, 2000) }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "organize_note",
              description: "Organize a note with summary, tags, and folder",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "One sentence summary" },
                  tags: { type: "array", items: { type: "string" }, description: "3 relevant tags" },
                  folder: { type: "string", description: "Category folder name" }
                },
                required: ["summary", "tags", "folder"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "organize_note" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing from content
    const text = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-note error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
