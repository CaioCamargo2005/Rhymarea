import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Trophy, CalendarDays, MapPin } from "lucide-react";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — RhymArea" },
      { name: "description", content: "Batalhas finalizadas e campeões." },
    ],
  }),
  component: HistoricoPage,
});

interface MC { _id: string; nomeArtistico: string; }
interface Batalha {
  _id: string; nome: string; data?: string; local?: string;
  status: string; campeao?: MC;
  participantes: MC[];
  createdAt: string;
}

function HistoricoPage() {
  const { data: batalhas, isLoading } = useQuery<Batalha[]>({
    queryKey: ["batalhas"],
    queryFn: () => api.get("/batalhas"),
  });

  const finalizadas = (batalhas ?? []).filter(b => b.status === "finalizada");
  const emAndamento = (batalhas ?? []).filter(b => b.status === "em_andamento");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs font-display tracking-widest text-primary">ARQUIVO</p>
      <h1 className="font-display text-5xl md:text-6xl">HISTÓRICO</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Batalhas encerradas e seus campeões.</p>

      {/* EM ANDAMENTO */}
      {emAndamento.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-2xl tracking-widest text-primary">AO VIVO</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {emAndamento.map(b => (
              <Link
                key={b._id}
                to="/batalhas/$id"
                params={{ id: b._id }}
                className="group flex items-center justify-between rounded-sm border border-primary/30 bg-primary/5 p-5 transition hover:border-primary"
              >
                <div>
                  <h3 className="font-display text-xl group-hover:text-primary">{b.nome}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.participantes.length} participantes
                  </p>
                </div>
                <span className="rounded-sm bg-primary/20 px-2 py-1 text-xs font-display tracking-widest text-primary">
                  AO VIVO
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* FINALIZADAS */}
      <div className="mt-12">
        <h2 className="mb-4 font-display text-2xl tracking-widest">FINALIZADAS</h2>
        {isLoading && <p className="text-muted-foreground">Carregando...</p>}
        {!isLoading && finalizadas.length === 0 && (
          <div className="rounded-sm border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhuma batalha finalizada ainda.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {finalizadas.map(b => (
            <Link
              key={b._id}
              to="/batalhas/$id"
              params={{ id: b._id }}
              className="group rounded-sm border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {b.data && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(b.data).toLocaleString("pt-BR", { dateStyle: "short" })}
                  </span>
                )}
                {b.local && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {b.local}
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-display text-xl group-hover:text-primary">{b.nome}</h3>
              {b.campeao && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-sm bg-accent/10 px-3 py-1.5">
                  <Trophy className="h-3.5 w-3.5 text-accent" />
                  <span className="font-display text-sm tracking-widest">{b.campeao.nomeArtistico}</span>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {b.participantes.length} participantes
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
