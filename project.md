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
│   │   ├── Dashboard.tsx           # Main view: grid/timeline/insights/clusters
│   │   ├── NoteInput.tsx           # Textarea + Smart Save + AI Suggest
│   │   ├── NoteCard.tsx            # Note card: markdown, pin, tags, AI tools
│   │   ├── SearchBar.tsx           # Keyword search input
│   │   ├── SemanticSearch.tsx      # AI meaning-based search
│   │   ├── FolderFilter.tsx        # Folder pill filter
│   │   ├── DateFilter.tsx          # Calendar/date filter
│   │   ├── TimelineView.tsx        # Notes grouped by date
│   │   ├── KnowledgeDashboard.tsx  # Insights: activity, tags, folders
│   │   ├── TopicClusters.tsx       # AI semantic clustering view
│   │   ├── SecondBrainChat.tsx     # Floating streaming chat with notes
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
│   │   ├── semantic-search/        # AI: rank notes by meaning
│   │   ├── cluster-notes/          # AI: group notes into 2–6 topic clusters
│   │   └── chat-with-notes/        # AI: streaming Second Brain chat
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

- **Semantic Search** (`semantic-search`) — AI ranks notes by meaning, not keywords.
- **Second Brain Chat** (`chat-with-notes`) — floating streaming chat that uses the user's notes as context.
- **Knowledge Dashboard** (`KnowledgeDashboard.tsx`) — weekly activity bars, tag frequency, folder stats.
- **Topic Clustering** (`cluster-notes`) — AI groups notes into 2–6 named semantic clusters.

---

## Edge Functions Reference

| Function              | Model                              | Output mechanism      | Purpose                                    |
| --------------------- | ---------------------------------- | --------------------- | ------------------------------------------ |
| `process-note`        | `google/gemini-3-flash-preview`    | Tool calling          | `{ summary, tags[3], folder }`             |
| `suggest-notes`       | `google/gemini-3-flash-preview`    | Tool calling          | 3 `{ title, content }` suggestions         |
| `rewrite-note`        | `google/gemini-3-flash-preview`    | Plain completion      | Rewritten text (5 action variants)         |
| `generate-questions`  | `google/gemini-3-flash-preview`    | Tool calling          | 3 reflective questions                     |
| `semantic-search`     | `google/gemini-3-flash-preview`    | Tool calling          | Ranked note indices                        |
| `cluster-notes`       | `google/gemini-3-flash-preview`    | Tool calling          | 2–6 clusters with name + description       |
| `chat-with-notes`     | `google/gemini-3-flash-preview`    | **SSE streaming**     | Conversational answers grounded in notes   |

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
