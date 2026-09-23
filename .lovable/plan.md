# Folder Settings

## What to build
Add an authenticated Folder Settings page where each user can edit and save their canonical folder names and AI filing guidance. Changes should affect new AI-organized notes and existing notes' folder normalization without changing note content.

Include editable folder-list controls, a filing-guidance editor, and a sample-note preview that runs the actual organizer on demand using the unsaved settings, so typing does not trigger repeated AI requests.

## Approach
- Store each user's folder names and AI guidance in a private, RLS-protected Lovable Cloud table, with the current folder set and guidance as defaults.
- Add `/folder-settings` with page metadata, loading/signed-out/saving states, editable folder controls, and an AI-powered sample preview.
- Add navigation from the notes page and folder sidebar; make saved settings available to the dashboard and all note-organization calls.
- Update the organizer prompt to accept the user's folder names and guidance, and normalize returned names against the user's saved list.
- Validate the new page, filing flow, and build output.

## Technical details
- Preserve the fixed `Uncategorized` fallback and existing alias normalization while honoring user-defined canonical names.
- Preview requests use the current unsaved folder list and prompt, and only run when explicitly requested.
- Database access is restricted to each signed-in user's own settings; no settings are shared between users.
