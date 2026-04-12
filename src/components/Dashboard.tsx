import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NoteInput } from "@/components/NoteInput";
import { NoteCard } from "@/components/NoteCard";
import { SearchBar } from "@/components/SearchBar";
import { FolderFilter } from "@/components/FolderFilter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brain, LogOut, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { ClientOnly } from "@tanstack/react-router";

export function Dashboard() {
  const [notes, setNotes] = useState<Tables<"notes">[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load notes");
      console.error(error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (content: string) => {
    setIsProcessing(true);

    try {
      // Get AI processing
      const { data: aiData, error: fnError } = await supabase.functions.invoke("process-note", {
        body: { content },
      });

      if (fnError) throw fnError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: note, error: insertError } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          content,
          summary: aiData?.summary || null,
          tags: aiData?.tags || [],
          folder: aiData?.folder || "Uncategorized",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setNotes((prev) => [note, ...prev]);
      toast.success("Note saved & organized by AI");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save note");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete note");
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const folders = useMemo(() => {
    const set = new Set(notes.map((n) => n.folder || "Uncategorized"));
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedFolder) {
      result = result.filter((n) => (n.folder || "Uncategorized") === selectedFolder);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.content.toLowerCase().includes(q) ||
          n.summary?.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q)) ||
          n.folder?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [notes, search, selectedFolder]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Knowledge Hub</h1>
        </div>
        <div className="flex items-center gap-1">
          <ClientOnly fallback={null}>
            <ThemeToggle />
          </ClientOnly>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Note Input */}
      <div className="mb-6">
        <NoteInput onSave={handleSave} isProcessing={isProcessing} />
      </div>

      {/* Search & Filter */}
      {notes.length > 0 && (
        <div className="mb-4 space-y-3">
          <SearchBar value={search} onChange={setSearch} />
          {folders.length > 1 && (
            <FolderFilter
              folders={folders}
              selected={selectedFolder}
              onSelect={setSelectedFolder}
            />
          )}
        </div>
      )}

      {/* Notes Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-20 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {notes.length === 0 ? "No notes yet. Start with a brain dump above!" : "No notes match your search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
