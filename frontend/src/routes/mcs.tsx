import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/mcs")({
  head: () => ({
    meta: [
      { title: "MCs cadastrados — RhymArea" },
      { name: "description", content: "Lista de MCs cadastrados na plataforma e formulário pra entrar na cena." },
      { property: "og:title", content: "MCs cadastrados — RhymArea" },
    ],
  }),
  component: () => <Outlet />,
});