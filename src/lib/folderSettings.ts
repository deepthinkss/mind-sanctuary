import { supabase } from "@/integrations/supabase/client";
import { CANONICAL_FOLDERS, normalizeFolderName } from "@/lib/folders";

export interface FolderSettings {
  folders: string[];
  guidance: string;
}

export const DEFAULT_GUIDANCE =
  "Prefer one of the user's folders. Only invent a new folder if none reasonably fits. A new folder must be 1-2 words, Title Case, singular topic words, plain English.";

export const DEFAULT_FOLDER_SETTINGS: FolderSettings = {
  folders: CANONICAL_FOLDERS.filter((f) => f !== "Uncategorized"),
  guidance: "",
};

let cache: FolderSettings | null = null;

export function invalidateFolderSettingsCache() {
  cache = null;
}

export async function loadFolderSettings(): Promise<FolderSettings> {
  if (cache) return cache;
  try {
    const { data, error } = await supabase
      .from("user_folder_settings" as any)
      .select("folders, guidance")
      .maybeSingle();
    if (error) throw error;
    const row = data as any;
    cache = row
      ? {
          folders: Array.isArray(row.folders) && row.folders.length ? row.folders : DEFAULT_FOLDER_SETTINGS.folders,
          guidance: typeof row.guidance === "string" ? row.guidance : "",
        }
      : DEFAULT_FOLDER_SETTINGS;
  } catch {
    cache = DEFAULT_FOLDER_SETTINGS;
  }
  return cache;
}

export async function saveFolderSettings(settings: FolderSettings): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not signed in");
  const { error } = await supabase.from("user_folder_settings" as any).upsert(
    {
      user_id: userId,
      folders: settings.folders,
      guidance: settings.guidance,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  cache = settings;
}

/**
 * Normalize an AI-returned folder name, then snap it to the user's saved
 * folder list when it matches case-insensitively.
 */
export function normalizeWithUserFolders(raw: string | null | undefined, userFolders: string[]): string {
  const n = normalizeFolderName(raw);
  const match = userFolders.find((f) => f.toLowerCase() === n.toLowerCase());
  return match ?? n;
}

/** Body for process-note calls, including the user's folder settings. */
export function processNoteBody(content: string, settings: FolderSettings) {
  return {
    content,
    folders: settings.folders,
    guidance: settings.guidance.trim() || undefined,
  };
}
