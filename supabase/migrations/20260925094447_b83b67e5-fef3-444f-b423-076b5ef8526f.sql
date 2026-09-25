ALTER TABLE public.notes ADD COLUMN title text NOT NULL DEFAULT 'Untitled note';
ALTER TABLE public.note_versions ADD COLUMN title text NOT NULL DEFAULT 'Untitled note';

UPDATE public.notes
SET title = COALESCE(
  NULLIF(btrim(summary), ''),
  NULLIF(left(regexp_replace(btrim(content), '\s+', ' ', 'g'), 80), ''),
  'Untitled note'
);

UPDATE public.note_versions AS versions
SET title = notes.title
FROM public.notes
WHERE versions.note_id = notes.id;

CREATE OR REPLACE FUNCTION public.snapshot_note_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.title IS DISTINCT FROM NEW.title)
     OR (OLD.content IS DISTINCT FROM NEW.content)
     OR (OLD.summary IS DISTINCT FROM NEW.summary)
     OR (OLD.folder IS DISTINCT FROM NEW.folder)
     OR (OLD.tags IS DISTINCT FROM NEW.tags) THEN
    INSERT INTO public.note_versions (note_id, user_id, title, content, summary, folder, tags, change_type)
    VALUES (
      OLD.id,
      OLD.user_id,
      OLD.title,
      OLD.content,
      OLD.summary,
      OLD.folder,
      OLD.tags,
      CASE WHEN OLD.content IS DISTINCT FROM NEW.content THEN 'edit' ELSE 'ai_update' END
    );
  END IF;
  RETURN NEW;
END;
$$;