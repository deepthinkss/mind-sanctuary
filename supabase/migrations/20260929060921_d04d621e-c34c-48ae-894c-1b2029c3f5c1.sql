CREATE TABLE public.user_folder_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  folders TEXT[] NOT NULL DEFAULT '{}',
  guidance TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_folder_settings TO authenticated;
GRANT ALL ON public.user_folder_settings TO service_role;
ALTER TABLE public.user_folder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own folder settings" ON public.user_folder_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_user_folder_settings_updated_at BEFORE UPDATE ON public.user_folder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();