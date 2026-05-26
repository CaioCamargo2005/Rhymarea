import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MapPin, Mic2, Trophy, X, Swords } from "lucide-react";

export const Route = createFileRoute("/mcs/$id")({
  component: MCPage,
});

interface MC {
  _id: string; nomeArtistico: string; nomeReal?: string;
  bairro?: string; cidade?: string; estilo?: string; bio?: string;
  vitorias: number; derrotas: number;
}
interface Confronto {
  _id: string; fase: string;
  mc1: { _id: string; nomeArtistico: string };
  mc2?: { _id: string; nomeArtistico: string };
  vencedor?: { _id: string; nomeArtistico: string };
}
interface Perfil { mc: MC; confrontos: Confronto[]; }

const FASE_LABELS: Record<string, string> = {
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semifinal",
  final: "Final",
  fase_custom: "Fase",
};

function MCPage() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery<Perfil>({
    queryKey: ["mc", id],
    queryFn: () => api.get(`/mcs/${id}`),
  });

  if (isLoading) return (
    <div className="mx-auto max-w-4xl px-6 py-20 text-muted-foreground font-display tracking-widest">
      CARREGANDO...
    </div>
  );

  if (error || !data) return (
    <div className="mx-auto max-w-4xl px-6 py-20 text-center">
      <p className="text-muted-foreground mb-4">MC não encontrado.</p>
      <Link to="/mcs" className="text-primary underline font-display tracking-widest text-sm">
        ← VOLTAR
      </Link>
    </div>
  );

  const { mc, confrontos } = data;
  const total = mc.vitorias + mc.derrotas;
  const winrate = total ? Math.round((mc.vitorias / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link
        to="/mcs"
        className="text-xs font-display tracking-widest text-muted-foreground hover:text-primary transition-colors"
      >
        ← TODOS OS MCS
      </Link>

      {/* HEADER */}
      <div className="mt-8 flex items-start gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
          <Mic2 className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display tracking-widest text-primary mb-1">PERFIL DO MC</p>
          <h1 className="font-display text-5xl md:text-6xl leading-none">{mc.nomeArtistico}</h1>
          {mc.nomeReal && (
            <p className="mt-2 text-sm text-muted-foreground">{mc.nomeReal}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {(mc.bairro || mc.cidade) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[mc.bairro, mc.cidade].filter(Boolean).join(" · ")}
              </span>
            )}
            {mc.estilo && (
              <span className="rounded-sm bg-secondary px-2 py-0.5 font-display tracking-widest">
                {mc.estilo}
              </span>
            )}
          </div>
          {mc.bio && (
            <p className="mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed">{mc.bio}</p>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="mt-10 grid grid-cols-3 divide-x divide-border rounded-sm border border-border overflow-hidden">
        <div className="flex flex-col items-center py-8 text-center bg-card">
          <Trophy className="h-5 w-5 text-green-400 mb-2" />
          <div className="font-display text-4xl text-green-400">{mc.vitorias}</div>
          <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Vitórias</div>
        </div>
        <div className="flex flex-col items-center py-8 text-center bg-card">
          <X className="h-5 w-5 text-red-400 mb-2" />
          <div className="font-display text-4xl text-red-400">{mc.derrotas}</div>
          <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Derrotas</div>
        </div>
        <div className="flex flex-col items-center py-8 text-center bg-card">
          <div className="text-primary text-xs font-display tracking-widest mb-2">WIN RATE</div>
          <div className="font-display text-4xl text-primary">{winrate}%</div>
          <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {total} batalha{total !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* HISTÓRICO */}
      <div className="mt-12">
        <h2 className="mb-4 font-display text-2xl tracking-widest flex items-center gap-3">
          <Swords className="h-5 w-5 text-primary" />
          HISTÓRICO DE CONFRONTOS
        </h2>
        {confrontos.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhum confronto registrado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {confrontos.map(c => {
              const venceu = c.vencedor?._id === mc._id;
              const adversario = c.mc1._id === mc._id ? c.mc2 : c.mc1;
              return (
                <div
                  key={c._id}
                  className={`flex items-center justify-between rounded-sm border p-4 transition-colors ${
                    venceu
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-display tracking-widest text-muted-foreground mb-1">
                      {FASE_LABELS[c.fase] ?? c.fase.toUpperCase()}
                    </p>
                    <p className="font-display text-lg">
                      <span className={venceu ? "text-green-400" : ""}>{mc.nomeArtistico}</span>
                      <span className="text-muted-foreground text-sm mx-2">vs</span>
                      <span>{adversario?.nomeArtistico ?? "W.O."}</span>
                    </p>
                  </div>
                  <span className={`ml-4 shrink-0 rounded-sm px-3 py-1 font-display text-xs tracking-widest ${
                    venceu
                      ? "bg-green-500/20 text-green-400 border border-green-500/20"
                      : "bg-red-500/20 text-red-400 border border-red-500/20"
                  }`}>
                    {venceu ? "VITÓRIA" : "DERROTA"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
