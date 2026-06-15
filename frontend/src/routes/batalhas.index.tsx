import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarDays, MapPin, Trash2, Pencil, X, Check } from "lucide-react";

export const Route = createFileRoute("/batalhas/")({
  component: BatalhasPage,
});

interface MC { _id: string; nomeArtistico: string; }
interface Batalha {
  _id: string; nome: string; data?: string; local?: string;
  descricao?: string; status: string; participantes: MC[];
}

const schema = z.object({
  nome:      z.string().trim().min(1, "Nome é obrigatório").max(120),
  local:     z.string().trim().max(120).optional().or(z.literal("")),
  data:      z.string().optional().or(z.literal("")),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
});

const EMPTY_FORM = { nome: "", local: "", data: "", descricao: "" };

// ── Modal de edição ──────────────────────────────────────────────────────────
interface EditModalProps {
  batalha: Batalha;
  onClose: () => void;
  onSave: (values: z.infer<typeof schema>) => void;
  isPending: boolean;
}

function EditModal({ batalha, onClose, onSave, isPending }: EditModalProps) {
  const toDatetimeLocal = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    nome:      batalha.nome ?? "",
    local:     batalha.local ?? "",
    data:      toDatetimeLocal(batalha.data),
    descricao: batalha.descricao ?? "",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    onSave(parsed.data);
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

        <form onSubmit={handleSave} className="space-y-4">
          <FieldInput label="Nome da batalha *" value={form.nome}
            onChange={v => setForm(p => ({ ...p, nome: v }))} placeholder="Final da temporada" />

          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Local" value={form.local}
              onChange={v => setForm(p => ({ ...p, local: v }))} placeholder="Praça XV" />
            <div>
              <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DATA</label>
              <input
                type="datetime-local" value={form.data}
                onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DESCRIÇÃO</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              maxLength={500} rows={3}
              className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-sm border border-border py-2 font-display text-sm tracking-widest hover:border-foreground transition-colors"
            >
              CANCELAR
            </button>
            <button
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-primary py-2 font-display text-sm tracking-widest text-primary-foreground shadow-neon disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isPending ? "SALVANDO..." : "SALVAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
function BatalhasPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editando, setEditando] = useState<Batalha | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: batalhas } = useQuery<Batalha[]>({
    queryKey: ["batalhas"],
    queryFn: () => api.get("/batalhas"),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const criar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      api.post("/batalhas", {
        nome: values.nome,
        local: values.local || null,
        data: values.data ? new Date(values.data).toISOString() : null,
        descricao: values.descricao || null,
      }),
    onSuccess: () => {
      toast.success("Batalha criada!");
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["batalhas"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editar = useMutation({
    mutationFn: ({ id, values }: { id: string; values: z.infer<typeof schema> }) =>
      api.put(`/batalhas/${id}`, {
        nome: values.nome,
        local: values.local || null,
        data: values.data ? new Date(values.data).toISOString() : null,
        descricao: values.descricao || null,
      }),
    onSuccess: () => {
      toast.success("Batalha atualizada!");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["batalhas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletar = useMutation({
    mutationFn: (id: string) => api.delete(`/batalhas/${id}`),
    onSuccess: () => {
      toast.success("Batalha deletada.");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["batalhas"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    criar.mutate(parsed.data);
  }, [form, criar]);

  const handleChange = useCallback((field: keyof typeof EMPTY_FORM) => (v: string) => {
    setForm(prev => ({ ...prev, [field]: v }));
  }, []);

  const badgeColor: Record<string, string> = {
    criada: "bg-violet-500/20 text-violet-300",
    em_andamento: "bg-primary/20 text-primary",
    finalizada: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs font-display tracking-widest text-primary">AGENDA</p>
      <h1 className="font-display text-5xl md:text-6xl">BATALHAS</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Crie uma batalha, adicione MCs e gerencie o chaveamento.</p>

      <div className="mt-12 grid gap-12 md:grid-cols-[1fr_1.2fr]">
        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-sm border border-border bg-card p-6">
          <h2 className="font-display text-2xl tracking-widest">NOVA BATALHA</h2>
          <FieldInput label="Nome da batalha *" value={form.nome} onChange={handleChange("nome")} placeholder="Final da temporada" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Local" value={form.local} onChange={handleChange("local")} placeholder="Praça XV" />
            <div>
              <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DATA</label>
              <input
                type="datetime-local"
                value={form.data}
                onChange={(e) => setForm(prev => ({ ...prev, data: e.target.value }))}
                className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DESCRIÇÃO</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
              maxLength={500} rows={3}
              className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            disabled={criar.isPending}
            className="w-full rounded-sm bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground shadow-neon disabled:opacity-60"
          >
            {criar.isPending ? "CRIANDO..." : "CRIAR BATALHA"}
          </button>
        </form>

        {/* LISTA */}
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-widest">BATALHAS</h2>
            <span className="text-xs text-muted-foreground">{batalhas?.length ?? 0}</span>
          </div>
          <div className="space-y-3">
            {batalhas?.map((b) => (
              <div key={b._id} className="group relative rounded-sm border border-border bg-card transition hover:border-primary">
                <Link
                  to="/batalhas/$id"
                  params={{ id: b._id }}
                  className="block p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {b.data && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(b.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                      {b.local && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {b.local}
                        </span>
                      )}
                    </div>
                    <span className={`rounded-sm px-2 py-0.5 text-xs font-display tracking-widest ${badgeColor[b.status] ?? ""}`}>
                      {b.status}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-xl group-hover:text-primary">{b.nome}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.participantes?.length ?? 0} participante{(b.participantes?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </Link>

                {/* Botões de ação */}
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.preventDefault(); setEditando(b); }}
                    title="Editar batalha"
                    className="rounded-sm border border-border bg-card p-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setConfirmDelete(b._id); }}
                    title="Deletar batalha"
                    className="rounded-sm border border-border bg-card p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {batalhas && batalhas.length === 0 && (
              <div className="rounded-sm border border-dashed border-border p-10 text-center text-muted-foreground">
                Nenhuma batalha criada ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edição */}
      {editando && (
        <EditModal
          batalha={editando}
          onClose={() => setEditando(null)}
          onSave={(values) => editar.mutate({ id: editando._id, values })}
          isPending={editar.isPending}
        />
      )}

      {/* Confirmação de delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-sm border border-destructive/50 bg-card p-6 shadow-xl">
            <h2 className="font-display text-xl tracking-widest text-destructive">DELETAR BATALHA</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Essa ação é permanente. Todos os confrontos e dados da batalha serão removidos.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-sm border border-border py-2 font-display text-sm tracking-widest hover:border-foreground transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={() => deletar.mutate(confirmDelete)}
                disabled={deletar.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-destructive py-2 font-display text-sm tracking-widest text-destructive-foreground disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletar.isPending ? "DELETANDO..." : "CONFIRMAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FieldInput = ({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) => (
  <div>
    <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
    />
  </div>
);