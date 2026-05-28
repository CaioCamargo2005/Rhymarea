import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarDays, MapPin } from "lucide-react";

export const Route = createFileRoute("/batalhas/")({
  component: BatalhasPage,
});

interface MC { _id: string; nomeArtistico: string; }
interface Batalha {
  _id: string; nome: string; data?: string; local?: string;
  status: string; participantes: MC[];
}

const schema = z.object({
  nome:      z.string().trim().min(1, "Nome é obrigatório").max(120),
  local:     z.string().trim().max(120).optional().or(z.literal("")),
  data:      z.string().optional().or(z.literal("")),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
});

function BatalhasPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", local: "", data: "", descricao: "" });

  const { data: batalhas } = useQuery<Batalha[]>({
    queryKey: ["batalhas"],
    queryFn: () => api.get("/batalhas"),
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
      setForm({ nome: "", local: "", data: "", descricao: "" });
      qc.invalidateQueries({ queryKey: ["batalhas"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    criar.mutate(parsed.data);
  }

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
        <form onSubmit={submit} className="space-y-4 rounded-sm border border-border bg-card p-6">
          <h2 className="font-display text-2xl tracking-widest">NOVA BATALHA</h2>
          <Input label="Nome da batalha *" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Final da temporada" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Local" value={form.local} onChange={(v) => setForm({ ...form, local: v })} placeholder="Praça XV" />
            <div>
              <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DATA</label>
              <input
                type="datetime-local" value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">DESCRIÇÃO</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
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

        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-widest">BATALHAS</h2>
            <span className="text-xs text-muted-foreground">{batalhas?.length ?? 0}</span>
          </div>
          <div className="space-y-3">
            {batalhas?.map((b) => (
              <Link
                key={b._id}
                to="/batalhas/$id"
                params={{ id: b._id }}
                className="group block rounded-sm border border-border bg-card p-5 transition hover:border-primary"
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
            ))}
            {batalhas && batalhas.length === 0 && (
              <div className="rounded-sm border border-dashed border-border p-10 text-center text-muted-foreground">
                Nenhuma batalha criada ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">{label}</label>
      <input
        type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}