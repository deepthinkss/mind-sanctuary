# 🧠 Smart Personal Knowledge Hub (Second Brain)

> An AI-powered **Second Brain** that transforms messy thoughts into structured, searchable knowledge.

---

## 🚀 Live Demo  
👉 https://id-preview--dea5fc16-0949-43c8-a896-881b4f8a6893.lovable.app  

---

## ✨ Overview  

Smart Personal Knowledge Hub is a modern, minimalist **AI-driven note system** that helps you think better.

Instead of manually organizing notes, you just write a *brain dump* — the system automatically:
- Summarizes content  
- Generates tags  
- Assigns folders  
- Clusters related ideas  
- Enables chat-based interaction with your knowledge  

Basically… it turns chaos into clarity.

---

## 🛠 Tech Stack  

| Layer            | Tech |
|------------------|------|
| Frontend         | React 19 + TanStack Start |
| Language         | TypeScript |
| Styling          | Tailwind CSS v4 |
| UI Components    | shadcn/ui |
| Backend          | Supabase (Lovable Cloud) |
| AI Models        | Google Gemini via Lovable AI Gateway |
| Runtime          | Deno (Edge Functions) |
| Deployment       | Cloudflare Workers |

---

## 🤖 AI Features  

All AI operations run securely through **Edge Functions** (never client-side).

### Core Capabilities
- ✍️ **Smart Save** → Converts raw text into structured notes  
- 💡 **AI Suggestions** → Generates starter ideas from topics  
- 🔄 **Rewrite Engine** → Expand, simplify, or change tone  
- ❓ **Reflective Questions** → Deep thinking prompts  
- 🧩 **Topic Clustering** → Groups notes semantically  
- 💬 **Second Brain Chat** → Chat with your own knowledge  

---

## 🧱 Project Structure  
src/
├── routes/
├── components/
├── integrations/
├── styles.css
└── router.tsx

supabase/
├── functions/
└── migrations/


---

## 🔥 Key Features  

### 🟢 Core (MVP)
- Authentication (Supabase)
- Smart AI note processing
- Search + folder filtering
- Responsive UI with dark mode  

### 🟡 Organization
- Pin important notes  
- Markdown support  
- Tag editing  
- Command palette (⌘K / Ctrl+K)  

### 🔵 AI Tools
- Rewrite / Expand notes  
- Generate questions  
- Timeline view  
- Focus mode  

### 🟣 Advanced
- Second Brain Chat (streaming AI)  
- Knowledge dashboard  
- AI-powered clustering  

### ⚡ Productivity
- Built-in To-Do system  
- Local storage persistence  
- Simplified search  

---

## 🧠 How AI Summarization & Tag Generation Work

When a user writes a brain dump and clicks **Smart Save**, the note goes through a secure server-side pipeline before it ever touches the database.

### 1. Client → Edge Function
- `NoteInput.tsx` collects the raw text and calls the `process-note` Supabase Edge Function via `supabase.functions.invoke("process-note", { body: { content } })`.
- The raw API key (`LOVABLE_API_KEY`) is **never** exposed to the browser — only the edge function reads it.

### 2. Edge Function → Lovable AI Gateway
- `supabase/functions/process-note/index.ts` forwards the content to the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`).
- Model used: **`google/gemini-3-flash-preview`** (fast, cost-efficient, strong reasoning).
- The request uses **OpenAI-compatible tool calling** with a forced `tool_choice` of `organize_note`. This guarantees the model returns valid, schema-validated JSON instead of free-form text.
- Input is truncated to 2000 chars to keep latency and cost predictable.

### 3. Structured AI Output
The model is required to return exactly this shape:

```json
{
  "summary": "One concise sentence summarizing the note.",
  "tags": ["tag1", "tag2", "tag3"],
  "folder": "Work"
}
```

- **summary** — single-sentence TL;DR of the note.
- **tags** — exactly 3 lowercase tags, no `#` symbol.
- **folder** — one category like `Work`, `Ideas`, `Personal`, `Learning`, `Projects`, `Health`, `Finance`.

Errors are mapped to user-friendly responses:
- `429` → "Rate limited. Please try again in a moment."
- `402` → "AI credits exhausted. Please add funds."

### 4. What Gets Stored in Supabase

After the edge function returns, the client inserts a row into the `notes` table (RLS-protected to `auth.uid() = user_id`):

| Column        | Type        | Source                          | Description                                  |
| ------------- | ----------- | ------------------------------- | -------------------------------------------- |
| `id`          | uuid        | `gen_random_uuid()`             | Primary key                                  |
| `user_id`     | uuid        | Authenticated session           | Owner — enforced by Row-Level Security       |
| `content`     | text        | User input                      | The raw brain-dump text                      |
| `summary`     | text        | **AI generated**                | One-sentence summary from Gemini             |
| `tags`        | text[]      | **AI generated**                | Array of exactly 3 tags                      |
| `folder`      | text        | **AI generated**                | Auto-assigned category (default `Uncategorized`) |
| `pinned`      | boolean     | User action                     | Whether the note is pinned to the top        |
| `created_at`  | timestamptz | `now()`                         | Insert timestamp                             |
| `updated_at`  | timestamptz | `now()`                         | Auto-updated via `update_updated_at_column` trigger |

### 5. Downstream AI Pipelines
After the note is saved, additional edge functions enrich the knowledge graph in the background:
- `link-notes` → writes typed relations into `note_relations` (`related_to` / `extends` / `contradicts` + confidence).
- `suggest-goal-notes` → links new notes to relevant entries in the `goals` table via `goal_notes`.
- `cluster-notes` → groups notes into 2–6 semantic clusters for the Insights view.

All of these follow the same secure pattern: **client → edge function → AI Gateway → Supabase (RLS-scoped)** — no AI keys or service-role access ever leak to the browser.

---

## 🔄 Data Flow
User → Edge Functions → AI Gateway → Supabase → UI
📈 Future Improvements
Markdown / PDF import-export
Voice-to-note
Daily journaling streaks
Drag & drop organization
Multi-device sync
Public API / plugins
📌 Why This Project?

This project solves a real problem:

👉 People capture ideas… but never organize them.

This system:

Reduces cognitive load
Improves knowledge recall
Turns notes into insights
🧑‍💻 Author

Deep Thakur

⭐ Support

If you like this project:

Star ⭐ the repo
Fork 🍴 it
Build something cool 🚀


