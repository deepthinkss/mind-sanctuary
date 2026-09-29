import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DEFAULT_FOLDER_SETTINGS,
  DEFAULT_GUIDANCE,
  FolderSettings,
  loadFolderSettings,
  processNoteBody,
  saveFolderSettings,
} from "@/lib/folderSettings";
import { normalizeFolderName } from "@/lib/folders";
import type { Session } from "@supabase/supabase-js";

const SAMPLE_NOTE =
  "Reminded myself to book the dentist appointment, renew the gym membership, and look into that pasta recipe Maya sent over.";

export function FolderSettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [guidance, setGuidance] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [sample, setSample] = useState(SAMPLE_NOTE);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ summary: string; tags: string[]; folder: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadFolderSettings()
      .then((s: FolderSettings) => {
        setFolders(s.folders);
        setGuidance(s.guidance);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const addFolder = () => {
    const name = normalizeFolderName(newFolder);
    if (!name || name === "Uncategorized") return;
    if (folders.some((f) => f.toLowerCase() === name.toLowerCase())) {
      toast.info(`"${name}" already exists`);
      return;
    }
    setFolders((prev) => [...prev, name]);
    setNewFolder("");
  };

  const renameFolder = (index: number, value: string) => {
    setFolders((prev) => prev.map((f, i) => (i === index ? value : f)));
  };

  const commitRename = (index: number) => {
    setFolders((prev) => {
      const normalized = normalizeFolderName(prev[index]);
      const next = prev.map((f, i) => (i === index ? normalized : f));
      return next.filter((f, i) => f && (i === index || f.toLowerCase() !== normalized.toLowerCase()));
    });
  };

  const removeFolder = (index: number) => {
    setFolders((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = folders.map((f) => normalizeFolderName(f)).filter((f) => f && f !== "Uncategorized");
      const unique = cleaned.filter((f, i) => cleaned.findIndex((x) => x.toLowerCase() === f.toLowerCase()) === i);
      await saveFolderSettings({ folders: unique, guidance });
      setFolders(unique);
      toast.success("Folder settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!sample.trim() || previewing) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "process-note",
        { body: processNoteBody(sample.trim(), { folders, guidance }) }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPreview({
        summary: data?.summary || "",
        tags: Array.isArray(data?.tags) ? data.tags : [],
        folder: data?.folder || "Uncategorized",
      });
    } catch (err: any) {
      toast.error(err.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  if (authLoading || (session && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">Sign in to manage your folder settings.</p>
        <Button asChild variant="outline">
          <Link to="/">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" title="Back to notes">
          <Link to="/" aria-label="Back to notes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Folder Settings</h1>
          <p className="text-xs text-muted-foreground">Control how the AI files your notes.</p>
        </div>
      </div>

      {/* Folder list */}
      <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-medium text-foreground">Your folders</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          The AI prefers these names when filing notes. "Uncategorized" is always kept as a fallback.
        </p>
        <div className="space-y-2">
          {folders.map((folder, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={folder}
                onChange={(e) => renameFolder(i, e.target.value)}
                onBlur={() => commitRename(i)}
                onKeyDown={(e) => e.key === "Enter" && commitRename(i)}
                className="h-9"
                maxLength={32}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeFolder(i)}
                aria-label={`Remove ${folder}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFolder()}
            placeholder="New folder name"
            className="h-9"
            maxLength={32}
          />
          <Button variant="outline" size="sm" onClick={addFolder} className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </section>

      {/* Guidance */}
      <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-medium text-foreground">AI filing guidance</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Extra instructions for the organizer, e.g. "Anything about my band goes to Music" or "Receipts and invoices go to Finance".
        </p>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder={DEFAULT_GUIDANCE}
          rows={4}
          maxLength={1000}
          className="w-full resize-y rounded-md border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </section>

      {/* Live preview */}
      <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-medium text-foreground">Try it out</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Runs the real organizer with your current (unsaved) settings. Nothing is saved.
        </p>
        <textarea
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          rows={3}
          maxLength={2000}
          className="mb-3 w-full resize-y rounded-md border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button onClick={handlePreview} disabled={!sample.trim() || previewing} size="sm" className="gap-1.5">
          {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Run preview
        </Button>
        {preview && (
          <div className="mt-4 rounded-md border bg-background p-3 text-sm">
            <div className="mb-2">
              <span className="text-xs font-medium text-muted-foreground">Folder: </span>
              <span className="font-medium text-foreground">{preview.folder}</span>
            </div>
            {preview.summary && (
              <p className="mb-2 text-foreground/90">{preview.summary}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {preview.tags.map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFolders(DEFAULT_FOLDER_SETTINGS.folders);
            setGuidance("");
          }}
        >
          Reset to defaults
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}
