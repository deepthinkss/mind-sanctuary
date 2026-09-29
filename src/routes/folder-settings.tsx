import { createFileRoute } from "@tanstack/react-router";
import { FolderSettingsPage } from "@/components/FolderSettingsPage";

export const Route = createFileRoute("/folder-settings")({
  component: FolderSettingsPage,
  head: () => ({
    meta: [
      { title: "Folder Settings — Knowledge Hub" },
      { name: "description", content: "Edit your canonical folders and AI filing guidance, and preview how notes would be organized." },
      { property: "og:title", content: "Folder Settings — Knowledge Hub" },
      { property: "og:description", content: "Edit your canonical folders and AI filing guidance, and preview how notes would be organized." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
