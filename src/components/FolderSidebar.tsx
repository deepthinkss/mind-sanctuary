import { useMemo, useState } from "react";
import { Folder, FolderPlus, Layers, Pencil, Trash2, Check, X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  notes: Tables<"notes">[];
  selected: string | null;
  onSelect: (folder: string | null) => void;
  onRenameFolder: (oldName: string, newName: string) => Promise<void>;
  onDeleteFolder: (name: string) => Promise<void>;
  onCreateFolder: (name: string) => void;
  extraFolders?: string[];
}

export function FolderSidebar({
  notes,
  selected,
  onSelect,
  onRenameFolder,
  onDeleteFolder,
  onCreateFolder,
  extraFolders = [],
}: Props) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const folders = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      const f = n.folder || "Uncategorized";
      counts[f] = (counts[f] || 0) + 1;
    });
    extraFolders.forEach((f) => {
      if (!(f in counts)) counts[f] = 0;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [notes, extraFolders]);

  const handleAdd = () => {
    const n = newName.trim();
    if (!n) return;
    onCreateFolder(n);
    onSelect(n);
    setNewName("");
  };

  const startEdit = (name: string) => {
    setEditing(name);
    setEditValue(name);
  };

  const commitEdit = async () => {
    if (!editing) return;
    const v = editValue.trim();
    if (v && v !== editing) {
      await onRenameFolder(editing, v);
      if (selected === editing) onSelect(v);
    }
    setEditing(null);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={selected === null}
                  onClick={() => onSelect(null)}
                  className="gap-2"
                >
                  <Layers className="h-4 w-4" />
                  <span>All notes</span>
                  <span className="ml-auto text-xs text-muted-foreground">{notes.length}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {folders.map(([name, count]) => {
                const isEditing = editing === name;
                const canModify = name !== "Uncategorized";
                return (
                  <SidebarMenuItem key={name} className="group/folder">
                    {isEditing ? (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="h-7 text-xs"
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commitEdit}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <SidebarMenuButton
                          isActive={selected === name}
                          onClick={() => onSelect(name)}
                          className="gap-2 flex-1"
                        >
                          <Folder className="h-4 w-4" />
                          <span className="truncate">{name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                        </SidebarMenuButton>
                        {canModify && (
                          <div className="ml-1 flex items-center opacity-0 transition-opacity group-hover/folder:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => startEdit(name)}
                              title="Rename folder"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                if (confirm(`Delete folder "${name}"? Notes will move to Uncategorized.`)) {
                                  onDeleteFolder(name);
                                  if (selected === name) onSelect(null);
                                }
                              }}
                              title="Delete folder"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>New folder</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex items-center gap-1 px-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Folder name"
                className="h-8 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAdd} title="Add folder">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
