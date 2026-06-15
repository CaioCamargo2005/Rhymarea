import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarDays, MapPin, Trophy, ChevronRight, Swords, Trash2, Pencil, X, Check } from "lucide-react";
import { z } from "zod";

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

const editSchema = z.object({
  nome:      z.string().trim().min(1, "Nome é obrigatório").max(120),
  local:     z.string().trim().max(120).optional().or(z.literal("")),
  data:      z.string().optional().or(z.literal("")),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
});

// ── Modal de edição da batalha ───────────────────────────────────────────────
function EditBatalhaModal({
  batalha, onClose, onSave, isPending,
}: {
  batalha: Batalha;
  onClose: () => void;
  onSave: (v: z.infer<typeof editSchema>) => void;
  isPending: boolean;
}) {
  const toLocal = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    nome: batalha.nome ?? "",
    local: batalha.local ?? "",
    data: toLocal(batalha.data),
    descricao: batalha.descricao ?? "",
  });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const r = editSchema.safeParse(form);
    if (!r.success) { toast.error(r.error.issues[0].message); return; }
    onSave(r.data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-widest">EDITAR BATALHA</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <Field label="Nome *" value={form.nome} onChange={v => setForm(p => ({ ...p, nome: v }))} placeholder="Final da temporada" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Local" value={form.local} onChange={v => setForm(p => ({ ...p, local: v }))} placeholder="Praça XV" />
            <div>
              <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DATA</label>
              <input type="datetime-local" value={form.data}
                onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DESCRIÇÃO</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              maxLength={500} rows={3}
              className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-sm border border-border py-2 font-display text-sm tracking-widest hover:border-foreground transition-colors">
              CANCELAR
            </button>
            <button disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-primary py-2 font-display text-sm tracking-widest text-primary-foreground shadow-neon disabled:opacity-60">
              <Check className="h-4 w-4" />
              {isPending ? "SALVANDO..." : "SALVAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
function BatalhaPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [votados, setVotados] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`votados_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [mcSelecionado, setMcSelecionado] = useState("");
  const [editando, setEditando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const editarBatalha = useMutation({
    mutationFn: (values: z.infer<typeof editSchema>) =>
      api.put(`/batalhas/${id}`, {
        nome: values.nome,
        local: values.local || null,
        data: values.data ? new Date(values.data).toISOString() : null,
        descricao: values.descricao || null,
      }),
    onSuccess: () => {
      toast.success("Batalha atualizada!");
      setEditando(false);
      qc.invalidateQueries({ queryKey: ["batalha", id] });
      qc.invalidateQueries({ queryKey: ["batalhas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletarBatalha = useMutation({
    mutationFn: () => api.delete(`/batalhas/${id}`),
    onSuccess: () => {
      toast.success("Batalha deletada.");
      qc.invalidateQueries({ queryKey: ["batalhas"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
      navigate({ to: "/batalhas" });
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
        <div className="flex-1 min-w-0">
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

        {/* Badge de status + botões de ação */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-sm border px-3 py-1 text-xs font-display tracking-widest ${statusColor[batalha.status] ?? ""}`}>
            {batalha.status.replace("_", " ").toUpperCase()}
          </span>
          <button
            onClick={() => setEditando(true)}
            title="Editar batalha"
            className="rounded-sm border border-border bg-card p-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            title="Deletar batalha"
            className="rounded-sm border border-border bg-card p-2 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CAMPEÃO */}
      {batalha.campeao && (
        <div className="mt-8 flex items-center gap-4 rounded-sm border border-yellow-500/30 bg-yellow-500/10 p-5">
          <Trophy className="h-8 w-8 text-yellow-400" />
          <div>
            <p className="text-xs font-display tracking-widest text-yellow-400">CAMPEÃO</p>
            <p className="font-display text-2xl">{batalha.campeao.nomeArtistico}</p>
          </div>
        </div>
      )}

      {/* INSCRIÇÕES (status: criada) */}
      {batalha.status === "criada" && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-2xl tracking-widest">INSCRIÇÕES</h2>

          {/* Adicionar MC */}
          {mcsParaAdicionar.length > 0 && (
            <div className="mb-6 flex gap-3">
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
                onClick={() => { if (mcSelecionado) { adicionarParticipante.mutate(mcSelecionado); setMcSelecionado(""); } }}
                disabled={!mcSelecionado || adicionarParticipante.isPending}
                className="rounded-sm border border-primary px-5 py-2 font-display text-sm tracking-widest text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-all"
              >
                + ADICIONAR
              </button>
            </div>
          )}

          {/* Lista de inscritos */}
          <div className="grid gap-2 sm:grid-cols-2">
            {batalha.participantes.map(p => (
              <div key={p._id} className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3">
                <ChevronRight className="h-4 w-4 text-primary" />
                <span className="font-display">{p.nomeArtistico}</span>
                {p.bairro && <span className="ml-auto text-xs text-muted-foreground">{p.bairro}</span>}
              </div>
            ))}
            {batalha.participantes.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">Nenhum MC inscrito ainda.</p>
            )}
          </div>

          {/* Gerar chaveamento */}
          {batalha.participantes.length >= 2 && (
            <div className="mt-6">
              <button
                onClick={() => gerarChaveamento.mutate()}
                disabled={gerarChaveamento.isPending}
                className="rounded-sm bg-primary px-8 py-3 font-display text-lg tracking-widest text-primary-foreground shadow-neon disabled:opacity-60 hover:translate-y-[-1px] transition-all"
              >
                {gerarChaveamento.isPending ? "GERANDO..." : "⚡ GERAR CHAVEAMENTO"}
              </button>
            </div>
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
                          {/* MC 1 */}
                          <MCRow
                            mc={c.mc1}
                            votos={c.votos.mc1}
                            pct={p1}
                            isWinner={c.vencedor?._id === c.mc1._id}
                            voted={jaVotei === c.mc1._id}
                            canVote={ativo && !jaVotei}
                            canForce={podeDefinirVencedor}
                            onVote={() => votar.mutate({ confrontoId: c._id, mcId: c.mc1._id })}
                            onForce={() => definirVencedor.mutate({ confrontoId: c._id, mcId: c.mc1._id })}
                          />

                          {/* Separador */}
                          <div className="border-t border-border/30 px-4 py-1 text-center text-[10px] font-display tracking-widest text-muted-foreground/50">
                            VS
                          </div>

                          {/* MC 2 */}
                          {c.mc2 ? (
                            <MCRow
                              mc={c.mc2}
                              votos={c.votos.mc2}
                              pct={p2}
                              isWinner={c.vencedor?._id === c.mc2._id}
                              voted={jaVotei === c.mc2._id}
                              canVote={ativo && !jaVotei}
                              canForce={podeDefinirVencedor}
                              onVote={() => votar.mutate({ confrontoId: c._id, mcId: c.mc2!._id })}
                              onForce={() => definirVencedor.mutate({ confrontoId: c._id, mcId: c.mc2!._id })}
                            />
                          ) : (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic">BYE — passa automático</div>
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

      {/* Modal de edição */}
      {editando && (
        <EditBatalhaModal
          batalha={batalha}
          onClose={() => setEditando(false)}
          onSave={(values) => editarBatalha.mutate(values)}
          isPending={editarBatalha.isPending}
        />
      )}

      {/* Confirmação de delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-sm border border-destructive/50 bg-card p-6 shadow-xl">
            <h2 className="font-display text-xl tracking-widest text-destructive">DELETAR BATALHA</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Essa ação é permanente. Todos os confrontos e dados de <strong className="text-foreground">{batalha.nome}</strong> serão removidos.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-sm border border-border py-2 font-display text-sm tracking-widest hover:border-foreground transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={() => deletarBatalha.mutate()}
                disabled={deletarBatalha.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-destructive py-2 font-display text-sm tracking-widest text-destructive-foreground disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletarBatalha.isPending ? "DELETANDO..." : "CONFIRMAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componente para linha de MC no bracket ───────────────────────────────
function MCRow({
  mc, votos, pct, isWinner, voted, canVote, canForce, onVote, onForce,
}: {
  mc: MC; votos: number; pct: number;
  isWinner: boolean; voted: boolean;
  canVote: boolean; canForce: boolean;
  onVote: () => void; onForce: () => void;
}) {
  return (
    <div
      className={`group/mc relative px-4 py-3 transition-colors ${
        isWinner ? "bg-green-500/10" :
        voted ? "bg-primary/5" : ""
      } ${canVote ? "cursor-pointer hover:bg-primary/10" : ""}`}
      onClick={() => { if (canVote) onVote(); }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`font-display text-sm ${isWinner ? "text-green-400" : ""}`}>
          {mc.nomeArtistico}
          {isWinner && " 🏆"}
          {voted && !isWinner && " ✓"}
        </span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      {/* Barra de progresso */}
      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isWinner ? "bg-green-400" : "bg-primary/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Botão forçar vencedor (hover) */}
      {canForce && (
        <button
          onClick={e => { e.stopPropagation(); onForce(); }}
          className="absolute right-2 top-2 hidden rounded-sm border border-border bg-card px-2 py-0.5 text-[10px] font-display tracking-widest text-muted-foreground hover:border-primary hover:text-primary group-hover/mc:flex transition-colors"
        >
          DEFINIR
        </button>
      )}
    </div>
  );
}

// ── Input auxiliar ───────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">{label}</label>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}