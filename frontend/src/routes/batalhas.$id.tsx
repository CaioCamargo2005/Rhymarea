import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarDays, MapPin, Trophy, ChevronRight, Swords } from "lucide-react";

export const Route = createFileRoute("/batalhas/$id")({
  component: BatalhaPage,
});

interface MC { _id: string; nomeArtistico: string; bairro?: string; }
interface Confronto {
  _id: string; fase: string;
  mc1: MC; mc2?: MC; vencedor?: MC;
  votos: { mc1: number; mc2: number };
}
interface Batalha {
  _id: string; nome: string; data?: string; local?: string;
  descricao?: string; status: string; faseAtual?: string;
  participantes: MC[];
  confrontos: Confronto[];
  campeao?: MC;
}

const FASE_LABELS: Record<string, string> = {
  oitavas: "OITAVAS DE FINAL",
  quartas: "QUARTAS DE FINAL",
  semifinal: "SEMIFINAL",
  final: "FINAL",
  fase_custom: "FASE",
};

function BatalhaPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [votados, setVotados] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`votados_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [mcSelecionado, setMcSelecionado] = useState("");

  const { data: batalha, isLoading } = useQuery<Batalha>({
    queryKey: ["batalha", id],
    queryFn: () => api.get(`/batalhas/${id}`),
    refetchInterval: 5000,
  });

  const { data: mcsDisponiveis } = useQuery<MC[]>({
    queryKey: ["mcs"],
    queryFn: () => api.get("/mcs"),
    enabled: batalha?.status === "criada",
  });

  const votar = useMutation({
    mutationFn: ({ confrontoId, mcId }: { confrontoId: string; mcId: string }) =>
      api.post(`/confrontos/${confrontoId}/votar`, { mcId }),
    onSuccess: (_, vars) => {
      toast.success("Voto computado!");
      const novosVotados = { ...votados, [vars.confrontoId]: vars.mcId };
      setVotados(novosVotados);
      try { localStorage.setItem(`votados_${id}`, JSON.stringify(novosVotados)); } catch {}
      qc.invalidateQueries({ queryKey: ["batalha", id] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const definirVencedor = useMutation({
    mutationFn: ({ confrontoId, mcId }: { confrontoId: string; mcId: string }) =>
      api.put(`/confrontos/${confrontoId}/vencedor`, { mcId }),
    onSuccess: () => {
      toast.success("Vencedor definido!");
      qc.invalidateQueries({ queryKey: ["batalha", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adicionarParticipante = useMutation({
    mutationFn: (mcId: string) => api.post(`/batalhas/${id}/participantes`, { mcId }),
    onSuccess: () => {
      toast.success("MC adicionado!");
      qc.invalidateQueries({ queryKey: ["batalha", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gerarChaveamento = useMutation({
    mutationFn: () => api.post(`/batalhas/${id}/gerar`, {}),
    onSuccess: () => {
      toast.success("Chaveamento gerado!");
      qc.invalidateQueries({ queryKey: ["batalha", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proximaFase = useMutation({
    mutationFn: () => api.post(`/batalhas/${id}/proxima-fase`, {}),
    onSuccess: (data: any) => {
      if (data.campeao) toast.success(`🏆 Campeão: ${data.campeao.nomeArtistico}`);
      else toast.success(`Avançando para: ${data.proximaFase}`);
      qc.invalidateQueries({ queryKey: ["batalha", id] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return (
    <div className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground font-display tracking-widest">
      CARREGANDO...
    </div>
  );

  if (!batalha) return (
    <div className="mx-auto max-w-5xl px-6 py-20 text-center">
      <p className="text-muted-foreground">Batalha não encontrada.</p>
      <Link to="/batalhas" className="mt-4 inline-block text-primary underline font-display tracking-widest">
        ← VOLTAR
      </Link>
    </div>
  );

  // Agrupa confrontos por fase
  const fases: Record<string, Confronto[]> = {};
  batalha.confrontos.forEach(c => {
    if (!fases[c.fase]) fases[c.fase] = [];
    fases[c.fase].push(c);
  });
  const ordemFases = ["oitavas", "quartas", "semifinal", "final", "fase_custom"];
  const fasesOrdenadas = Object.keys(fases).sort(
    (a, z) => ordemFases.indexOf(a) - ordemFases.indexOf(z)
  );

  const participantesIds = new Set(batalha.participantes.map(p => p._id));
  const mcsParaAdicionar = (mcsDisponiveis ?? []).filter(m => !participantesIds.has(m._id));

  // Verifica se todos os confrontos da fase atual têm vencedor
  const confrontosFaseAtual = batalha.confrontos.filter(c => c.fase === batalha.faseAtual);
  const podaAvançar = confrontosFaseAtual.length > 0 && confrontosFaseAtual.every(c => c.vencedor);

  const statusColor: Record<string, string> = {
    criada: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    em_andamento: "bg-primary/20 text-primary border-primary/30",
    finalizada: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link
        to="/batalhas"
        className="text-xs font-display tracking-widest text-muted-foreground hover:text-primary transition-colors"
      >
        ← TODAS AS BATALHAS
      </Link>

      {/* HEADER */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          {batalha.data && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(batalha.data).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
              </span>
              {batalha.local && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {batalha.local}
                </span>
              )}
            </div>
          )}
          <h1 className="font-display text-5xl md:text-7xl leading-none">{batalha.nome}</h1>
          {batalha.faseAtual && (
            <p className="mt-2 text-xs font-display tracking-widest text-primary">
              // FASE ATUAL: {FASE_LABELS[batalha.faseAtual] ?? batalha.faseAtual.toUpperCase()}
            </p>
          )}
          {batalha.descricao && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{batalha.descricao}</p>
          )}
        </div>
        <span className={`rounded-sm border px-3 py-1 text-xs font-display tracking-widest ${statusColor[batalha.status] ?? ""}`}>
          {batalha.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {/* CAMPEÃO */}
      {batalha.campeao && (
        <div className="mt-8 inline-flex items-center gap-3 rounded-sm border border-accent bg-accent/10 px-6 py-3 shadow-neon">
          <Trophy className="h-6 w-6 text-accent" />
          <div>
            <p className="text-xs font-display tracking-widest text-accent/70">CAMPEÃO</p>
            <p className="font-display text-2xl tracking-widest">{batalha.campeao.nomeArtistico}</p>
          </div>
        </div>
      )}

      {/* ADICIONAR MC (criada) */}
      {batalha.status === "criada" && (
        <div className="mt-10 rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl tracking-widest">INSCREVER MCS</h2>
          <div className="flex gap-3">
            <select
              value={mcSelecionado}
              onChange={e => setMcSelecionado(e.target.value)}
              className="flex-1 rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Selecione um MC...</option>
              {mcsParaAdicionar.map(m => (
                <option key={m._id} value={m._id}>{m.nomeArtistico}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (mcSelecionado) {
                  adicionarParticipante.mutate(mcSelecionado);
                  setMcSelecionado("");
                }
              }}
              disabled={!mcSelecionado || adicionarParticipante.isPending}
              className="rounded-sm bg-primary px-4 py-2 font-display text-sm tracking-widest text-primary-foreground disabled:opacity-50 transition-opacity"
            >
              + ADICIONAR
            </button>
          </div>

          {batalha.participantes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-display tracking-widest text-muted-foreground mb-2">
                INSCRITOS ({batalha.participantes.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {batalha.participantes.map(p => (
                  <span key={p._id} className="rounded-sm bg-secondary px-3 py-1 text-xs font-display tracking-widest">
                    {p.nomeArtistico}
                  </span>
                ))}
              </div>
            </div>
          )}

          {batalha.participantes.length >= 2 && (
            <button
              onClick={() => gerarChaveamento.mutate()}
              disabled={gerarChaveamento.isPending}
              className="mt-6 rounded-sm bg-primary px-6 py-3 font-display tracking-widest text-primary-foreground shadow-neon disabled:opacity-50 transition-opacity"
            >
              {gerarChaveamento.isPending ? "GERANDO..." : "⚡ GERAR CHAVEAMENTO"}
            </button>
          )}
        </div>
      )}

      {/* CONTROLES (em andamento) */}
      {batalha.status === "em_andamento" && (
        <div className="mt-6 flex items-center gap-4 rounded-sm border border-border bg-card p-4">
          <div className="flex-1">
            <p className="text-xs font-display tracking-widest text-muted-foreground">
              {podaAvançar
                ? "✅ Todos os confrontos desta fase foram decididos"
                : `⏳ Aguardando resultados dos confrontos de ${FASE_LABELS[batalha.faseAtual ?? ""] ?? batalha.faseAtual}`
              }
            </p>
          </div>
          <button
            onClick={() => proximaFase.mutate()}
            disabled={proximaFase.isPending || !podaAvançar}
            className="rounded-sm border border-primary px-5 py-2 font-display text-sm tracking-widest text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {proximaFase.isPending ? "AVANÇANDO..." : "AVANÇAR FASE →"}
          </button>
        </div>
      )}

      {/* BRACKET */}
      {fasesOrdenadas.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 font-display text-2xl tracking-widest flex items-center gap-3">
            <Swords className="h-5 w-5 text-primary" />
            BRACKET
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {fasesOrdenadas.map(fase => {
              const isFaseAtual = fase === batalha.faseAtual;
              return (
                <div key={fase} className="min-w-[260px]">
                  <div className={`mb-3 flex items-center gap-2 ${isFaseAtual ? "text-primary" : "text-muted-foreground"}`}>
                    {isFaseAtual && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                    <p className="text-xs font-display tracking-widest">
                      {FASE_LABELS[fase] ?? fase.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {fases[fase].map(c => {
                      const jaVotei = votados[c._id];
                      const total = c.votos.mc1 + c.votos.mc2;
                      const p1 = total ? Math.round((c.votos.mc1 / total) * 100) : 50;
                      const p2 = total ? 100 - p1 : 50;
                      const ativo = !c.vencedor && isFaseAtual;
                      const podeDefinirVencedor = ativo && batalha.status === "em_andamento";

                      return (
                        <div
                          key={c._id}
                          className={`overflow-hidden rounded-sm border bg-card transition-all ${
                            c.vencedor ? "border-border/50 opacity-80" :
                            isFaseAtual ? "border-primary/40 shadow-sm" : "border-border"
                          }`}
                        >
                          {/* MC1 */}
                          <div className="relative">
                            <div
                              className={`relative flex items-center justify-between px-4 py-3 transition-colors
                                ${c.vencedor?._id === c.mc1._id ? "bg-green-500/10" : ""}
                                ${ativo && !jaVotei ? "cursor-pointer hover:bg-primary/10" : ""}
                              `}
                              onClick={() => {
                                if (ativo && !jaVotei) votar.mutate({ confrontoId: c._id, mcId: c.mc1._id });
                              }}
                            >
                              <div
                                className="absolute inset-y-0 left-0 bg-primary/8 transition-all"
                                style={{ width: `${p1}%` }}
                              />
                              <div className="relative flex items-center gap-2 min-w-0">
                                {c.vencedor?._id === c.mc1._id && (
                                  <Trophy className="h-3 w-3 text-green-400 shrink-0" />
                                )}
                                <span className="font-display text-sm truncate">{c.mc1.nomeArtistico}</span>
                              </div>
                              <div className="relative flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">{c.votos.mc1}</span>
                                {jaVotei === c.mc1._id && (
                                  <span className="text-xs text-primary">✓</span>
                                )}
                              </div>
                            </div>

                            {/* Botão definir vencedor (organizador) */}
                            {podeDefinirVencedor && !c.vencedor && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  definirVencedor.mutate({ confrontoId: c._id, mcId: c.mc1._id });
                                }}
                                className="absolute right-0 top-0 bottom-0 px-2 opacity-0 hover:opacity-100 bg-green-500/20 hover:bg-green-500/30 transition-all text-green-400 text-xs font-display"
                                title="Definir como vencedor"
                              >
                                WIN
                              </button>
                            )}
                          </div>

                          <div className="border-t border-border/50" />

                          {/* MC2 */}
                          {c.mc2 ? (
                            <div className="relative">
                              <div
                                className={`relative flex items-center justify-between px-4 py-3 transition-colors
                                  ${c.vencedor?._id === c.mc2._id ? "bg-green-500/10" : ""}
                                  ${ativo && !jaVotei ? "cursor-pointer hover:bg-primary/10" : ""}
                                `}
                                onClick={() => {
                                  if (ativo && !jaVotei && c.mc2) votar.mutate({ confrontoId: c._id, mcId: c.mc2._id });
                                }}
                              >
                                <div
                                  className="absolute inset-y-0 left-0 bg-primary/8 transition-all"
                                  style={{ width: `${p2}%` }}
                                />
                                <div className="relative flex items-center gap-2 min-w-0">
                                  {c.vencedor?._id === c.mc2._id && (
                                    <Trophy className="h-3 w-3 text-green-400 shrink-0" />
                                  )}
                                  <span className="font-display text-sm truncate">{c.mc2.nomeArtistico}</span>
                                </div>
                                <div className="relative flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-muted-foreground">{c.votos.mc2}</span>
                                  {jaVotei === c.mc2._id && (
                                    <span className="text-xs text-primary">✓</span>
                                  )}
                                </div>
                              </div>

                              {podeDefinirVencedor && !c.vencedor && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    definirVencedor.mutate({ confrontoId: c._id, mcId: c.mc2!._id });
                                  }}
                                  className="absolute right-0 top-0 bottom-0 px-2 opacity-0 hover:opacity-100 bg-green-500/20 hover:bg-green-500/30 transition-all text-green-400 text-xs font-display"
                                  title="Definir como vencedor"
                                >
                                  WIN
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic">
                              — bye (W.O.)
                            </div>
                          )}

                          {/* Info de votos total */}
                          {total > 0 && (
                            <div className="border-t border-border/30 px-4 py-1.5 text-xs text-muted-foreground flex justify-between">
                              <span>{total} voto{total !== 1 ? "s" : ""}</span>
                              {c.vencedor && (
                                <span className="text-green-400 font-display tracking-widest text-xs">ENCERRADO</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          {batalha.status === "em_andamento" && (
            <p className="mt-4 text-xs text-muted-foreground">
              💡 Clique em um MC para votar · Passe o mouse no card para ver opção de definir vencedor manualmente
            </p>
          )}
        </div>
      )}
    </div>
  );
}
