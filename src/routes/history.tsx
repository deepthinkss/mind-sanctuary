import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/components/HistoryPage";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Version History — Knowledge Hub" },
      { name: "description", content: "Review previous AI summaries, tags, folders, and edits for every Knowledge Hub note." },
      { property: "og:title", content: "Version History — Knowledge Hub" },
      { property: "og:description", content: "Review previous AI summaries, tags, folders, and edits for every Knowledge Hub note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});