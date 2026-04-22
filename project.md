# Smart Personal Knowledge Hub — Project Documentation

## Overview

A modern, minimalist **AI-powered Second Brain** that automatically organizes thoughts into structured, searchable knowledge. Users write "brain dumps" and AI processes them into summaries, tags, folders, semantic clusters, and conversational insights.

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
│   │   └── chat-with-notes/        # AI: streaming Second Brain chat (notes + goals)
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

## Data Flow

```
            ┌─────────────────────────────────────────┐
            │              User in Browser             │
            └───────────────┬─────────────────────────┘
                            │
        ┌───────────────────┼───────────────────────┐
        ▼                   ▼                       ▼
   Smart Save          Semantic / Chat         Cluster / Insights
        │                   │                       │
        ▼                   ▼                       ▼
   process-note      semantic-search /         cluster-notes
   rewrite-note      chat-with-notes (SSE)
   generate-questions
        │                   │                       │
        └─────────┬─────────┴───────────┬───────────┘
                  ▼                     ▼
        Lovable AI Gateway      Supabase notes table
        google/gemini-3-                (RLS per user)
        flash-preview
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
- [ ] Realtime multi-device sync
- [ ] Public API / plugin system
