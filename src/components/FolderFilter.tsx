interface FolderFilterProps {
  folders: string[];
  selected: string | null;
  onSelect: (folder: string | null) => void;
}

export function FolderFilter({ folders, selected, onSelect }: FolderFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selected === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-accent"
        }`}
      >
        All
      </button>
      {folders.map((folder) => (
        <button
          key={folder}
          onClick={() => onSelect(folder === selected ? null : folder)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selected === folder
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          {folder}
        </button>
      ))}
    </div>
  );
}
