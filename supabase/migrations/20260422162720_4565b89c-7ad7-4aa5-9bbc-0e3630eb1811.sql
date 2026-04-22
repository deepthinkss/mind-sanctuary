-- Knowledge Graph: note_relations
CREATE TABLE public.note_relations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  source_note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'related_to',
  confidence real NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_relations_no_self CHECK (source_note_id <> target_note_id),
  CONSTRAINT note_relations_unique UNIQUE (source_note_id, target_note_id, relation_type)
);

CREATE INDEX idx_note_relations_source ON public.note_relations(source_note_id);
CREATE INDEX idx_note_relations_target ON public.note_relations(target_note_id);
CREATE INDEX idx_note_relations_user ON public.note_relations(user_id);

ALTER TABLE public.note_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relations"
  ON public.note_relations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own relations"
  ON public.note_relations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relations"
  ON public.note_relations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own relations"
  ON public.note_relations FOR DELETE USING (auth.uid() = user_id);

-- Goals
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goals_status_check CHECK (status IN ('active','completed'))
);

CREATE INDEX idx_goals_user ON public.goals(user_id);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own goals"
  ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- goal_notes junction
CREATE TABLE public.goal_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goal_notes_unique UNIQUE (goal_id, note_id)
);

CREATE INDEX idx_goal_notes_goal ON public.goal_notes(goal_id);
CREATE INDEX idx_goal_notes_note ON public.goal_notes(note_id);
CREATE INDEX idx_goal_notes_user ON public.goal_notes(user_id);

ALTER TABLE public.goal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goal_notes"
  ON public.goal_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own goal_notes"
  ON public.goal_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goal_notes"
  ON public.goal_notes FOR DELETE USING (auth.uid() = user_id);