# Smart Personal Knowledge Hub — Project Documentation

## Overview

A modern, minimalist **AI-powered note-taking app** that automatically organizes thoughts and notes. Users write "brain dumps" and AI processes them into structured, searchable knowledge with summaries, tags, and folder categories.

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
| **Icons**        | Lucide React                                                  |
| **Backend**      | Lovable Cloud (Supabase) — Database, Auth, Edge Functions     |
| **AI Gateway**   | Lovable AI Gateway (`google/gemini-3-flash-preview`)          |
| **Edge Runtime** | Deno (Supabase Edge Functions)                                |
| **Deployment**   | Lovable Cloud (Cloudflare Workers for SSR)                    |

---

## Project Structure

```
├── src/
│   ├── routes/
│   │   ├── __root.tsx          # Root layout (HTML shell, Toaster, 404 page)
│   │   └── index.tsx           # Main route — Auth gate + Dashboard
│   ├── components/
│   │   ├── AuthForm.tsx        # Email/password sign-in & sign-up form
│   │   ├── Dashboard.tsx       # Main dashboard with notes CRUD, search, filter
│   │   ├── NoteInput.tsx       # Text area + Smart Save + AI Suggest buttons
│   │   ├── NoteCard.tsx        # Individual note card (summary, tags, folder)
│   │   ├── SearchBar.tsx       # Search input for filtering notes
│   │   ├── FolderFilter.tsx    # Pill-based folder category filter
│   │   ├── ThemeToggle.tsx     # Light/dark mode toggle
│   │   └── ui/                 # shadcn/ui component library
│   ├── integrations/supabase/
│   │   ├── client.ts           # Supabase browser client (auto-generated)
│   │   ├── client.server.ts    # Supabase server client
│   │   ├── auth-middleware.ts  # Auth middleware for SSR
│   │   └── types.ts            # Database types (auto-generated)
│   ├── hooks/
│   │   └── use-mobile.tsx      # Responsive breakpoint hook
│   ├── styles.css              # Tailwind v4 config + OKLCH design tokens
│   ├── router.tsx              # TanStack Router setup
│   └── routeTree.gen.ts        # Auto-generated route tree
├── supabase/
│   ├── config.toml             # Supabase project configuration
│   ├── functions/
│   │   ├── process-note/       # Edge Function: AI summarize + tag + categorize
│   │   └── suggest-notes/      # Edge Function: AI topic-based suggestions
│   └── migrations/             # SQL migration files
├── project.md                  # This file
└── vite.config.ts              # Vite + TanStack Start config
```

---

## Workflow — Step by Step

### Step 1: Project Setup

1. Initialized a TanStack Start v1 project with Vite 7 and React 19.
2. Configured Tailwind CSS v4 with custom OKLCH-based design tokens in `src/styles.css`.
3. Set up the root layout in `src/routes/__root.tsx` with HTML shell, meta tags, Sonner toaster, and a 404 page.

### Step 2: Database & Authentication

1. **Enabled Lovable Cloud** to provision a Supabase backend.
2. **Created the `notes` table** via SQL migration:
   ```sql
   CREATE TABLE public.notes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     content TEXT NOT NULL,
     summary TEXT,
     tags TEXT[],
     folder TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );
   ```
3. **Enabled Row Level Security (RLS)** so each user can only read/write their own notes:
   ```sql
   ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can manage own notes" ON public.notes
     FOR ALL USING (auth.uid() = user_id);
   ```
4. **Built `AuthForm.tsx`** — email/password authentication with sign-up and sign-in flows using `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
5. **Auth gate in `index.tsx`** — listens to `onAuthStateChange` and renders either `AuthForm` or `Dashboard` based on session state.

### Step 3: AI Processing — Edge Function (`process-note`)

1. **Created `supabase/functions/process-note/index.ts`** — a Deno Edge Function.
2. **Workflow:**
   - Receives note `content` from the client.
   - Calls the Lovable AI Gateway (`google/gemini-3-flash-preview`) with a structured tool call.
   - AI returns a JSON object: `{ summary, tags, folder }`.
   - Response is sent back to the client.
3. **AI Prompt:** Instructs the model to return a one-sentence summary, exactly 3 lowercase tags, and a category folder name.
4. **Error handling:** Rate limiting (429), credit exhaustion (402), and general errors are handled with user-friendly messages.

### Step 4: Smart Save Workflow

1. User writes a note in the `NoteInput` textarea.
2. Clicks **"Smart Save"** button.
3. Client calls the `process-note` Edge Function with the note content.
4. AI returns `{ summary, tags, folder }`.
5. Client inserts the note + AI metadata into the `notes` table via Supabase SDK.
6. The new note appears at the top of the grid with its AI-generated summary, tags, and folder.

### Step 5: AI Suggestions — Edge Function (`suggest-notes`)

1. **Created `supabase/functions/suggest-notes/index.ts`** — another Deno Edge Function.
2. **Workflow:**
   - Receives a `topic` string from the client.
   - Calls the Lovable AI Gateway with a structured tool call.
   - AI returns `{ suggestions: [{ title, content }, ...] }` — 3 note ideas.
3. **UI Integration in `NoteInput.tsx`:**
   - User types a topic and clicks **"Suggest"** button.
   - AI suggestions appear as clickable cards below the input.
   - Clicking a suggestion auto-fills the textarea with that content.
   - User can then edit and "Smart Save" the suggestion.

### Step 6: Library View & Notes Grid

1. **`Dashboard.tsx`** fetches all user notes on mount, ordered by `created_at DESC`.
2. Notes are displayed in a responsive **card grid**:
   - 1 column on mobile
   - 2 columns on tablet
   - 3 columns on desktop
3. **`NoteCard.tsx`** displays:
   - Folder name with icon
   - Date created
   - AI-generated summary (bold)
   - Note content (truncated to 3 lines)
   - Tags as colored pills
   - Delete button (visible on hover)

### Step 7: Search & Filter

1. **`SearchBar.tsx`** — full-text client-side search across content, summary, tags, and folder names.
2. **`FolderFilter.tsx`** — pill-based filter derived from unique folder names in the user's notes. Clicking a folder filters the grid; clicking again shows all.
3. Both filters are combined (search + folder) with `useMemo` for performance.

### Step 8: Theme & Design System

1. **OKLCH color tokens** defined in `src/styles.css` for both light and dark modes.
2. Custom tokens: `--tag-bg`, `--tag-foreground`, `--surface`, `--surface-hover` for note-specific styling.
3. **`ThemeToggle.tsx`** toggles `.dark` class on `<html>` element with `localStorage` persistence.
4. Font: Inter (sans-serif).

### Step 9: Responsive Layout

1. Dashboard uses Tailwind responsive classes (`sm:`, `lg:`) for adaptive spacing, padding, and grid columns.
2. Note input buttons stack full-width on mobile, inline on desktop.
3. All components adapt to screen sizes from 320px to 1920px.

---

## Data Flow Diagram

```
User Input
    │
    ▼
┌──────────────┐     ┌─────────────────────┐
│  NoteInput   │────▶│ process-note (Edge)  │
│  Component   │     │  Lovable AI Gateway  │
└──────┬───────┘     │  gemini-3-flash      │
       │             └──────────┬────────────┘
       │                        │
       │    { summary, tags, folder }
       │                        │
       ▼                        ▼
┌──────────────────────────────────┐
│     Supabase — notes table       │
│  (RLS: user_id = auth.uid())     │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│     Dashboard — Notes Grid       │
│  Search + Folder Filter          │
│  NoteCard × N                    │
└──────────────────────────────────┘
```

---

## Key API Endpoints

| Endpoint                         | Method | Description                              |
| -------------------------------- | ------ | ---------------------------------------- |
| `supabase.functions/process-note`| POST   | AI: summarize, tag, categorize a note    |
| `supabase.functions/suggest-notes`| POST  | AI: generate 3 note suggestions          |
| `supabase.from("notes")`        | CRUD   | Notes table (RLS-protected per user)     |
| `supabase.auth.*`               | —      | Email/password authentication            |

---

## Environment Variables

| Variable                          | Source         | Purpose                        |
| --------------------------------- | -------------- | ------------------------------ |
| `VITE_SUPABASE_URL`              | Auto (Lovable) | Supabase project URL           |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Auto (Lovable) | Supabase anon key              |
| `LOVABLE_API_KEY`                | Auto (Edge Fn) | AI Gateway authentication      |

---

## Future Enhancements

- [ ] Edit existing notes & re-run AI processing
- [ ] Markdown support with rich text preview
- [ ] Folder sidebar with note counts
- [ ] Note pinning & favorites
- [ ] Export notes as PDF/Markdown
- [ ] Realtime sync across devices
