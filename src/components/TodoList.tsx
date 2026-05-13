import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

const STORAGE_KEY = "knowledge-hub-todos";

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTodos(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to load todos", e);
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error("Failed to save todos", e);
    }
  }, [todos]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: crypto.randomUUID(), text, done: false, createdAt: Date.now() },
      ...prev,
    ]);
    setInput("");
    inputRef.current?.focus();
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearDone = () => {
    setTodos((prev) => prev.filter((t) => !t.done));
  };

  const filtered = todos.filter((t) =>
    filter === "all" ? true : filter === "active" ? !t.done : t.done
  );

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - activeCount;

  return (
    <div className="mx-auto w-full max-w-4xl rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">My To-do List</h3>
          <span className="text-xs text-muted-foreground">
            {activeCount} active · {doneCount} done
          </span>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2 border-b p-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTodo();
            }
          }}
          placeholder="Add a task..."
          className="h-9 text-sm"
        />
        <Button size="sm" onClick={addTodo} disabled={!input.trim()} className="h-9 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 border-b px-3 py-2">
        {(["all", "active", "done"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs capitalize"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
        {doneCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearDone}
          >
            Clear done
          </Button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {todos.length === 0
                ? "No tasks yet. Add one above!"
                : filter === "active"
                ? "All caught up! 🎉"
                : "Nothing here."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {filtered.map((todo, index) => (
              <li
                key={todo.id}
                className="group flex min-h-20 items-start gap-3 rounded-md border bg-background/70 px-3 py-3 shadow-sm transition-colors hover:bg-muted/50 animate-stagger-slide"
                style={{ animationDelay: `${Math.min(index * 70, 560)}ms` }}
              >
                <Checkbox
                  checked={todo.done}
                  onCheckedChange={() => toggleTodo(todo.id)}
                  className="mt-0.5"
                />
                <span
                  className={cn(
                    "flex-1 break-words text-sm",
                    todo.done && "text-muted-foreground line-through"
                  )}
                >
                  {todo.text}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
