import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import heroImg from "@/assets/hero-battle.jpg";
import { Mic2, Trophy, Users, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

interface Stats { mcs: number; batalhas: number; votos: number; }
interface Batalha {
  _id: string; nome: string; data?: string; local?: string; status: string;
  participantes: { _id: string; nomeArtistico: string }[];
  confrontos: { _id: string; mc1: { nomeArtistico: string }; mc2?: { nomeArtistico: string } }[];
}

function Home() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["home-stats"],
    queryFn: () => api.get("/stats"),
  });

  const { data: batalhas } = useQuery<Batalha[]>({
    queryKey: ["proximas-batalhas"],
    queryFn: () => api.get("/batalhas"),
  });

  // Pega as 3 mais recentes que ainda estão em andamento ou criadas
  const proximas = (batalhas ?? [])
    .filter(b => b.status !== 'finalizada')
    .slice(0, 3);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-40">
          <span className="inline-block rounded-sm bg-accent px-3 py-1 text-xs font-display tracking-widest text-accent-foreground">
            CENA · UNDERGROUND · AO VIVO
          </span>
          <h1 className="mt-6 font-display text-6xl leading-none tracking-tight md:text-8xl">
            QUEM SOBE NO <span className="text-primary">PALCO</span>,<br />
            <span className="text-stroke">QUEM LEVA</span> O <span className="text-accent">CINTURÃO</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Cadastre MCs, marque batalhas e deixe o público decidir o vencedor voto a voto. A liga é da rua.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/mcs" className="rounded-sm bg-primary px-6 py-3 font-display text-lg tracking-widest text-primary-foreground shadow-neon transition hover:translate-y-[-2px]">
              CADASTRAR MC
            </Link>
            <Link to="/batalhas" className="rounded-sm border border-foreground px-6 py-3 font-display text-lg tracking-widest hover:bg-foreground hover:text-background transition">
              VER BATALHAS
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border">
          <Stat icon={<Mic2 className="h-5 w-5" />} label="MCs" value={stats?.mcs ?? 0} />
          <Stat icon={<Trophy className="h-5 w-5" />} label="Batalhas" value={stats?.batalhas ?? 0} />
          <Stat icon={<Users className="h-5 w-5" />} label="Votos do público" value={stats?.votos ?? 0} />
        </div>
      </section>

      {/* PRÓXIMAS BATALHAS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-display tracking-widest text-primary">AGENDA</p>
            <h2 className="font-display text-4xl md:text-5xl">PRÓXIMAS BATALHAS</h2>
          </div>
          <Link to="/batalhas" className="text-sm font-display tracking-widest text-muted-foreground hover:text-primary">VER TUDO →</Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {proximas.length === 0 && (
            <div className="md:col-span-3 rounded-sm border border-dashed border-border p-10 text-center text-muted-foreground">
              Nenhuma batalha marcada ainda.{" "}
              <Link to="/batalhas" className="text-primary underline">Marca a primeira</Link>.
            </div>
          )}
          {proximas.map((b) => {
            const confrontoFinal = b.confrontos?.[0];
            return (
              <Link
                key={b._id}
                to="/batalhas/$id"
                params={{ id: b._id }}
                className="group relative block overflow-hidden rounded-sm border border-border bg-card p-6 transition hover:border-primary"
              >
                {b.data && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(b.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                )}
                <h3 className="mt-3 font-display text-2xl group-hover:text-primary">{b.nome}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{b.local ?? "Local a confirmar"}</p>
                {confrontoFinal?.mc1 && (
                  <div className="mt-6 flex items-center justify-between font-display text-lg">
                    <span>{confrontoFinal.mc1.nomeArtistico}</span>
                    <span className="text-primary">VS</span>
                    <span>{confrontoFinal.mc2?.nomeArtistico ?? "A definir"}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-primary">{icon}</div>
      <div className="mt-3 font-display text-5xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
