import { useEffect, useState } from "react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Search, Plus, Moon, Sun, LogOut } from "lucide-react";

interface CommandPaletteProps {
  onNewNote: () => void;
  onFocusSearch: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  isDark: boolean;
}

export function CommandPalette({ onNewNote, onFocusSearch, onToggleTheme, onSignOut, isDark }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 100);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(onNewNote)}>
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </CommandItem>
          <CommandItem onSelect={() => run(onFocusSearch)}>
            <Search className="mr-2 h-4 w-4" />
            Search Notes
          </CommandItem>
          <CommandItem onSelect={() => run(onToggleTheme)}>
            {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Toggle Theme
          </CommandItem>
          <CommandItem onSelect={() => run(onSignOut)}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
