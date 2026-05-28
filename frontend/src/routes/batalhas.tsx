import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/batalhas")({
  head: () => ({
    meta: [
      { title: "Batalhas — RhymArea" },
      { name: "description", content: "Agenda de batalhas marcadas, vencedores e criação de novos confrontos." },
      { property: "og:title", content: "Batalhas — RhymArea" },
    ],
  }),
  component: () => <Outlet />,
});