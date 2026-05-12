# Smart Personal Knowledge Hub — Project Documentation

## Overview

A modern, minimalist **AI-powered Second Brain** that turns scattered thoughts into a connected, goal-aware knowledge system. Users write brain dumps; the AI organizes them into summaries, tags, folders, semantic clusters, **typed relations between notes (knowledge graph)**, and **goal progress with next-step suggestions**.

**Live Preview:** https://id-preview--dea5fc16-0949-43c8-a896-881b4f8a6893.lovable.app

---

## Tech Stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| **Framework**    | TanStack Start v1 (React 19, SSR/SSG, file-based routing)    |
| **Build Tool**   | Vite 7                                                        |
| **Language**     | TypeScript (strict mode)                                      |
| **Styling**      | Tailwind CSS v4 (OKLCH color tokens, light/dark theme)        |
| **UI Components**| shadcn/ui (Button, Card, Toast via Sonner, etc.)              |
| **Markdown**     | react-markdown                                                |
| **Icons**        | Lucide React                                                  |
| **Backend**      | Lovable Cloud (Supabase) — Database, Auth, Edge Functions     |
| **AI Gateway**   | Lovable AI Gateway → Google Gemini models                     |
| **Edge Runtime** | Deno (Supabase Edge Functions)                                |
| **Deployment**   | Lovable Cloud (Cloudflare Workers for SSR)                    |

---

## AI Models — Google Gemini via Lovable AI Gateway

All AI features route through the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`), which is OpenAI-compatible and authenticated via the auto-provisioned `LOVABLE_API_KEY` secret. Calls are **never made from the client** — every request goes through a Deno Edge Function for security and prompt control.

### Default Model: `google/gemini-3-flash-preview`

Used by every edge function in this project. It's a fast, cost-efficient preview of Google's next-generation Gemini model with strong reasoning at low latency — the right balance for note processing, search, and chat.

### Available Google models on the gateway

| Model                                    | Best for                                                          |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `google/gemini-3-flash-preview` ✅ used  | Fast multipurpose reasoning (default for all functions)           |
| `google/gemini-3.1-pro-preview`          | Heaviest reasoning, latest preview                                |
| `google/gemini-2.5-pro`                  | Multimodal + complex reasoning, large context                     |
| `google/gemini-2.5-flash`                | Balanced cost/latency vs Pro                                      |
| `google/gemini-2.5-flash-lite`           | Cheapest, simple classification/summarization                     |
| `google/gemini-3-pro-image-preview`      | Image generation                                                  |
| `google/gemini-3.1-flash-image-preview`  | Fast image generation/editing                                     |

### Patterns used

- **Tool-calling for structured output** — `process-note`, `generate-questions`, `semantic-search`, `cluster-notes` all force a `tool_choice` so the model returns clean, schema-validated JSON instead of free text.
- **SSE streaming** — `chat-with-notes` streams tokens from the gateway directly through to the client for the Second Brain chat.
- **Plain completion** — `rewrite-note` uses a simple chat completion for tone/length transforms.
- **Error surfacing** — every function maps `429` → "Rate limited" and `402` → "AI credits exhausted" so the UI can show a meaningful toast.

---

## Project Structure

```
├── src/
│   ├── routes/
│   │   ├── __root.tsx              # Root layout (HTML shell, Toaster, 404)
│   │   └── index.tsx               # Auth gate + Dashboard
│   ├── components/
│   │   ├── AuthForm.tsx            # Email/password sign-in & sign-up
│   │   ├── Dashboard.tsx           # Main view: grid/timeline/insights/clusters/graph/goals
│   │   ├── NoteInput.tsx           # Textarea + Smart Save + AI Suggest
│   │   ├── NoteCard.tsx            # Note card: markdown, pin, tags, AI tools
│   │   ├── SearchBar.tsx           # Keyword search input
│   │   ├── FolderFilter.tsx        # Folder pill filter
│   │   ├── DateFilter.tsx          # Calendar/date filter
│   │   ├── TimelineView.tsx        # Notes grouped by date
│   │   ├── TodoList.tsx            # Local-first to-do list view
│   │   ├── KnowledgeDashboard.tsx  # Insights: activity, tags, folders
│   │   ├── TopicClusters.tsx       # AI semantic clustering view
│   │   ├── GraphView.tsx           # Force-directed knowledge graph (notes + relations)
│   │   ├── GoalsView.tsx           # Goals CRUD + AI progress + note linking
│   │   ├── SecondBrainChat.tsx     # Floating streaming chat (notes + goals context)
│   │   ├── CommandPalette.tsx      # ⌘K / Ctrl+K quick navigation
│   │   ├── FocusMode.tsx           # Distraction-free writing mode
│   │   ├── ThemeToggle.tsx         # Light/dark toggle
│   │   ├── HealthStatus.tsx        # Edge Function health popover (live status, per-fn errors)
│   │   ├── AiActivityBanner.tsx    # Per-function AI error + last successful result banner
│   │   └── ui/                     # shadcn/ui library
│   ├── integrations/supabase/      # Auto-generated client + types
│   ├── styles.css                  # Tailwind v4 + OKLCH tokens
│   └── router.tsx
├── supabase/
│   ├── functions/
│   │   ├── process-note/           # AI: summary + tags + folder
│   │   ├── suggest-notes/          # AI: 3 note suggestions from a topic
│   │   ├── rewrite-note/           # AI: rewrite/expand/simplify/tone shift
│   │   ├── generate-questions/     # AI: 3 Socratic reflection questions
│   │   ├── cluster-notes/          # AI: group notes into 2–6 topic clusters
│   │   ├── link-notes/             # AI: detect related/extends/contradicts relations
│   │   ├── analyze-goal/           # AI: progress %, gaps, next steps for a goal
│   │   ├── suggest-goal-notes/     # AI: pick 3–7 notes most relevant to a goal
│   │   ├── chat-with-notes/        # AI: streaming Second Brain chat (notes + goals)
│   │   └── health-check/           # Pings every edge fn, reports status + env
│   └── migrations/
└── project.md
```

---

## Feature Phases

### Phase 0 — Core (MVP)

- Email/password auth with Supabase, RLS-protected `notes` table.
- Smart Save: write a note → `process-note` returns `{ summary, tags, folder }` → stored in DB.
- AI Suggest: enter a topic → `suggest-notes` returns 3 starter notes.
- Responsive card grid, keyword search, folder filter, light/dark theme.

### Phase 1 — Organization & Navigation

- **Pin & priority notes** — `pinned` boolean column; pinned notes sort to the top.
- **Markdown rendering** — `react-markdown` in `NoteCard` for headings, lists, bold, code.
- **Custom tag editing** — inline add/remove tags directly on a card.
- **Command Palette** (`⌘K` / `Ctrl+K`) — quick navigation to input, search, theme toggle.

### Phase 2 — AI Content Tools & Views

- **Rewrite & Expand** (`rewrite-note`) — five actions: rewrite, expand, simplify, professional, casual. Re-runs `process-note` after to refresh metadata.
- **Reflective Questions** (`generate-questions`) — generates 3 Socratic questions per note.
- **Timeline View** — notes grouped chronologically by date.
- **Focus Mode** — full-screen distraction-free editor with character counter.
- **Date Filter** — calendar-based filtering by created date.
- **Edit existing notes** — full edit + re-run AI processing.

### Phase 3 — Discovery & Visualization

- **Second Brain Chat** (`chat-with-notes`) — floating streaming chat that uses the user's notes as context.
- **Knowledge Dashboard** (`KnowledgeDashboard.tsx`) — weekly activity bars, tag frequency, folder stats.
- **Topic Clustering** (`cluster-notes`) — AI groups notes into 2–6 named semantic clusters.

### Phase 4 — Productivity

- **To-do List View** (`TodoList.tsx`) — dedicated view mode (alongside Grid, Timeline, Insights, Clusters) with add/toggle/delete tasks, All/Active/Done filters, and `localStorage` persistence. Replaces the prior floating popup.
- **Search simplification** — semantic search removed; keyword search via `SearchBar` is the single search path.

---

### Phase 5 — Knowledge Graph & Goal-Oriented System

**Knowledge Graph** — notes stop being isolated cards and become a connected graph of ideas.

- New `note_relations` table (`source_note_id`, `target_note_id`, `relation_type` ∈ `related_to|extends|contradicts`, `confidence`, RLS-scoped to the user).
- New edge function `link-notes` — sends a new note + candidate notes to Gemini and uses tool-calling to return the top 3–5 typed relations with confidence scores.
- **Auto-linking** — `Dashboard.handleSave` invokes `link-notes` in the background after every save and upserts the relations.
- **Graph View** (`GraphView.tsx`) — renders notes as nodes and relations as edges using a custom force-directed SVG simulation (no extra deps). Click a node to highlight connections, see a side panel with linked notes, and remove relations. The toolbar action **AI Link Notes** re-runs linking on demand.
- **Goal overlay** — nodes belonging to any goal are tinted with the primary color so the graph doubles as a goal-progress visualization.

**Goal-Oriented System** — connects notes to user goals and tracks progress intelligently.

- New `goals` table (`title`, `description`, `status` ∈ `active|completed`, RLS) and `goal_notes` junction table.
- **Goals View** (`GoalsView.tsx`) — create/edit/delete goals, toggle complete, and click a goal to expand a checklist that links/unlinks any note.
- New edge function `suggest-goal-notes` — on goal creation, Gemini picks the 3–7 most relevant existing notes and they are auto-linked.
- New edge function `analyze-goal` — on demand, returns `{ progress%, summary, missing_knowledge[], next_steps[] }` rendered with a progress bar, gap badges, and a next-steps list.
- **Second Brain Chat now includes goals** — `chat-with-notes` accepts a `goals` array and prepends them to the system prompt so answers are aware of what the user is trying to accomplish.

---

### Phase 6 — Developer Productivity

- **Tag filtering & tag cloud** (`TagFilter.tsx`) — multi-select tag chips above the grid that combine with search/folder/date filters. The Insights view also renders a frequency-weighted tag cloud.
- **Code syntax highlighting** (`CodeBlock.tsx`) — fenced code blocks inside notes are highlighted via `react-syntax-highlighter` (Prism, light/dark theme aware) with a per-block copy-to-clipboard button.
- **Markdown export** — each note card has a Download (⬇) action that exports the raw markdown content as a `.md` file (browser-side `Blob`, no backend call).

---

### Phase 7 — Reliability & Observability

- **Smart Save preview & edit** (`NoteInput.tsx`) — after `process-note` returns, the AI-generated **summary, folder, and tags** are shown in an inline review card. Users can rename the folder, add/remove tags (Enter / comma to add, Backspace to delete the last), or dismiss before committing. Only on **Save note** does the data get persisted, so AI output is always editable before it lands in the DB.
- **Edge Function health check** (`supabase/functions/health-check/index.ts` + `HealthStatus.tsx`) — a dedicated edge function pings every other function with `OPTIONS` requests in parallel and reports `{ overall, env: { aiKeyConfigured, supabaseUrl }, functions: [{ name, status, httpStatus, latencyMs, error }] }`. The dashboard header shows a live status icon (green/amber/red) with a popover listing per-function latency, HTTP code, and **per-function error messages** when down. Auto-refreshes every 60s. Configured with `verify_jwt = false` in `supabase/config.toml`.
- **Per-function AI error banner** (`AiActivityBanner.tsx`) — every AI call in `Dashboard.tsx` is routed through a `callAiFn` wrapper that records `{ message, at }` per function name on failure and the **last successful AI summary** on success. A banner above the note input shows current per-function errors (dismissible) alongside the most recent successful result, so a failed `process-note` / `link-notes` / `rewrite-note` / `generate-questions` / `analyze-goal` call never wipes the user's previous successful AI output and always surfaces the specific error message.
- **Note version history** (`NoteHistoryDialog.tsx` + `note_versions` table) — a Postgres trigger (`snapshot_note_version`) snapshots the previous `{ content, summary, folder, tags }` of a note into `note_versions` whenever any of those fields change, tagged as `edit` or `ai_update`. Each `NoteCard` exposes a History button that opens a dialog listing all prior versions with timestamp, change type, and a **Restore** action that loads the version back into the editor.
- **Client-only home route fix** (`src/routes/index.tsx`) — replaced the unavailable `ClientOnly` import from `@tanstack/react-router` with a local `mounted` gate so the Supabase auth bootstrap only runs in the browser without breaking the dynamic route module load.



## Edge Functions Reference

| Function              | Model                              | Output mechanism      | Purpose                                    |
| --------------------- | ---------------------------------- | --------------------- | ------------------------------------------ |
| `process-note`        | `google/gemini-3-flash-preview`    | Tool calling          | `{ summary, tags[3], folder }`             |
| `suggest-notes`       | `google/gemini-3-flash-preview`    | Tool calling          | 3 `{ title, content }` suggestions         |
| `rewrite-note`        | `google/gemini-3-flash-preview`    | Plain completion      | Rewritten text (5 action variants)         |
| `generate-questions`  | `google/gemini-3-flash-preview`    | Tool calling          | 3 reflective questions                     |
| `cluster-notes`       | `google/gemini-3-flash-preview`    | Tool calling          | 2–6 clusters with name + description       |
| `link-notes`          | `google/gemini-3-flash-preview`    | Tool calling          | 3–5 typed relations with confidence        |
| `analyze-goal`        | `google/gemini-3-flash-preview`    | Tool calling          | Progress %, gaps, next steps for a goal    |
| `suggest-goal-notes`  | `google/gemini-3-flash-preview`    | Tool calling          | 3–7 note IDs most relevant to a goal       |
| `chat-with-notes`     | `google/gemini-3-flash-preview`    | **SSE streaming**     | Conversational answers (notes + goals)     |

---

## Database Schema

| Table             | Purpose                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `notes`           | Brain-dump content, AI-generated `summary` / `tags` / `folder`, `pinned` flag.           |
| `note_relations`  | Typed edges between notes: `relation_type` ∈ `related_to`/`extends`/`contradicts` + `confidence`. Unique on (source, target, type). |
| `goals`           | User goals with `status` ∈ `active`/`completed`.                                         |
| `goal_notes`      | Many-to-many junction linking notes to goals.                                            |

All tables are RLS-protected — every row is scoped to `auth.uid() = user_id`.

---

## Data Flow

```
            ┌─────────────────────────────────────────┐
            │              User in Browser             │
            └───────────────┬─────────────────────────┘
                            │
   ┌────────────┬───────────┼────────────┬─────────────┐
   ▼            ▼           ▼            ▼             ▼
Smart Save   Chat       Insights      Graph         Goals
   │            │           │            │             │
   ▼            ▼           ▼            ▼             ▼
process-note  chat-     cluster-     link-notes    suggest-goal-notes
rewrite-note  with-     notes        (auto on     analyze-goal
generate-     notes                  every save)
questions     (SSE,
              notes+
              goals)
   │            │           │            │             │
   └─────┬──────┴───────────┼────────────┴─────────────┘
         ▼                  ▼
  Lovable AI Gateway   Supabase tables (RLS per user)
  google/gemini-3-     notes · note_relations
  flash-preview        goals · goal_notes
```

---

## Environment Variables

| Variable                         | Source         | Purpose                    |
| -------------------------------- | -------------- | -------------------------- |
| `VITE_SUPABASE_URL`              | Auto (Lovable) | Supabase project URL       |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Auto (Lovable) | Supabase publishable key   |
| `LOVABLE_API_KEY`                | Auto (Edge Fn) | AI Gateway authentication  |

---

## Future Enhancements

- [ ] Markdown / PDF import & export
- [ ] Daily brain-dump prompt with streak tracking
- [ ] Drag-and-drop notes between folders
- [ ] Voice-to-note with Gemini transcription
- [ ] Realtime multi-device sync (notes, relations, goals)
- [ ] Sync to-do list to the backend (currently `localStorage`)
- [ ] Weekly AI digest: "You're progressing on X, focus on Y"
- [ ] Drag-to-create relations directly in the Graph View
- [ ] Public API / plugin system
