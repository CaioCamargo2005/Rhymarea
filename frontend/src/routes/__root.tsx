import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-display text-primary">404</h1>
        <h2 className="mt-2 text-2xl font-display">Beat perdido</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Essa página saiu da rima. Volta pro palco principal.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm bg-primary px-5 py-2 text-sm font-display tracking-widest text-primary-foreground transition hover:opacity-90"
          >
            VOLTAR PRO PALCO
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-primary">Falhou no flow</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-display tracking-widest text-primary-foreground"
          >
            TENTAR DE NOVO
          </button>
          <a href="/" className="rounded-sm border border-border px-4 py-2 text-sm font-display tracking-widest">HOME</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RhymArea — Batalha de MCs" },
      { name: "description", content: "Cadastre MCs, marque batalhas e deixe o público decidir quem leva o cinturão." },
      { property: "og:title", content: "RhymArea — Batalha de MCs" },
      { property: "og:description", content: "Cadastre MCs, marque batalhas e deixe o público decidir quem leva o cinturão." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-widest text-primary">RHYM</span>
          <span className="font-display text-2xl tracking-widest">AREA</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-display tracking-widest">
          <Link to="/" className="rounded-sm px-3 py-2 hover:text-primary" activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>HOME</Link>
          <Link to="/mcs" className="rounded-sm px-3 py-2 hover:text-primary" activeProps={{ className: "text-primary" }}>MCS</Link>
          <Link to="/batalhas" className="rounded-sm px-3 py-2 hover:text-primary" activeProps={{ className: "text-primary" }}>BATALHAS</Link>
          <Link to="/historico" className="rounded-sm px-3 py-2 hover:text-primary" activeProps={{ className: "text-primary" }}>HISTÓRICO</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} RhymArea — feito pra cena.
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <Toaster theme="dark" />
      </div>
    </QueryClientProvider>
  );
}
