-- Create note_versions table to capture AI summary and edit history
CREATE TABLE public.note_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  folder TEXT,
  tags TEXT[] DEFAULT '{}',
  change_type TEXT NOT NULL DEFAULT 'edit',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_note_versions_note_id ON public.note_versions(note_id, created_at DESC);

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note versions"
ON public.note_versions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own note versions"
ON public.note_versions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own note versions"
ON public.note_versions FOR DELETE
USING (auth.uid() = user_id);

-- Trigger: snapshot the OLD row into note_versions whenever content/summary/folder/tags change
CREATE OR REPLACE FUNCTION public.snapshot_note_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.content IS DISTINCT FROM NEW.content)
     OR (OLD.summary IS DISTINCT FROM NEW.summary)
     OR (OLD.folder IS DISTINCT FROM NEW.folder)
     OR (OLD.tags IS DISTINCT FROM NEW.tags) THEN
    INSERT INTO public.note_versions (note_id, user_id, content, summary, folder, tags, change_type)
    VALUES (
      OLD.id,
      OLD.user_id,
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

CREATE TRIGGER trg_snapshot_note_version
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_note_version();