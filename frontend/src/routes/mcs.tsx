import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { MapPin, Mic2 } from "lucide-react";

export const Route = createFileRoute("/mcs")({
  head: () => ({
    meta: [
      { title: "MCs cadastrados — RhymArea" },
      { name: "description", content: "Lista de MCs cadastrados na plataforma e formulário pra entrar na cena." },
      { property: "og:title", content: "MCs cadastrados — RhymArea" },
    ],
  }),
  component: McsRouter,
});

interface MC {
  _id: string; nomeArtistico: string; nomeReal?: string;
  bairro?: string; cidade?: string; estilo?: string; bio?: string;
  vitorias: number; derrotas: number;
}

const schema = z.object({
  nomeArtistico: z.string().trim().min(1, "Nome artístico é obrigatório").max(60),
  nomeReal:      z.string().trim().max(80).optional().or(z.literal("")),
  bairro:        z.string().trim().max(60).optional().or(z.literal("")),
  cidade:        z.string().trim().max(60).optional().or(z.literal("")),
  estilo:        z.string().trim().max(40).optional().or(z.literal("")),
  bio:           z.string().trim().max(400).optional().or(z.literal("")),
});

// Componente roteador — sem hooks de dados, só decide o que renderizar
function McsRouter() {
  const matchRoute = useMatchRoute();
  const isChild = matchRoute({ to: "/mcs/$id" });
  if (isChild) return <Outlet />;
  return <McsPage />;
}

// Componente de listagem — todos os hooks aqui, sem condicionais antes deles
function McsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nomeArtistico: "", nomeReal: "", bairro: "", cidade: "", estilo: "", bio: "",
  });

  const { data: mcs, isLoading } = useQuery<MC[]>({
    queryKey: ["mcs"],
    queryFn: () => api.get("/mcs"),
  });

  const cadastrar = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api.post("/mcs", values),
    onSuccess: () => {
      toast.success("MC na área! Cadastro feito.");
      setForm({ nomeArtistico: "", nomeReal: "", bairro: "", cidade: "", estilo: "", bio: "" });
      qc.invalidateQueries({ queryKey: ["mcs"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    cadastrar.mutate(parsed.data);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs font-display tracking-widest text-primary">CADASTRO</p>
      <h1 className="font-display text-5xl md:text-6xl">SOBE NO PALCO</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Coloca teu nome na área. MCs cadastrados podem ser escalados pra batalhas.
      </p>

      <div className="mt-12 grid gap-12 md:grid-cols-[1fr_1.2fr]">
        <form onSubmit={submit} className="space-y-4 rounded-sm border border-border bg-card p-6">
          <h2 className="font-display text-2xl tracking-widest">ENTRAR NA ÁREA</h2>
          <Field label="Nome artístico *" value={form.nomeArtistico} onChange={(v) => setForm({ ...form, nomeArtistico: v })} placeholder="MC Exemplo" />
          <Field label="Nome real" value={form.nomeReal} onChange={(v) => setForm({ ...form, nomeReal: v })} placeholder="Opcional" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bairro" value={form.bairro} onChange={(v) => setForm({ ...form, bairro: v })} placeholder="Centro" />
            <Field label="Cidade" value={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} placeholder="São Paulo" />
          </div>
          <Field label="Estilo" value={form.estilo} onChange={(v) => setForm({ ...form, estilo: v })} placeholder="Punchline, knockout..." />
          <div>
            <label className="mb-1 block text-xs font-display tracking-widest text-muted-foreground">BIO</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={400} rows={4}
              placeholder="Conta tua história em poucas linhas..."
              className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit" disabled={cadastrar.isPending}
            className="w-full rounded-sm bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground shadow-neon disabled:opacity-60"
          >
            {cadastrar.isPending ? "ENVIANDO..." : "ENTRAR NA ÁREA"}
          </button>
        </form>

        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl tracking-widest">NA ÁREA</h2>
            <span className="text-xs text-muted-foreground">{mcs?.length ?? 0} MCs</span>
          </div>
          {isLoading && <p className="text-muted-foreground">Carregando...</p>}
          <div className="space-y-3">
            {mcs?.map((mc) => (
              <Link
                key={mc._id}
                to="/mcs/$id"
                params={{ id: mc._id }}
                className="group relative overflow-hidden rounded-sm border border-border bg-card p-4 transition hover:border-primary block"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <Mic2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl group-hover:text-primary">{mc.nomeArtistico}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {(mc.bairro || mc.cidade) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[mc.bairro, mc.cidade].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {mc.estilo && <span className="rounded-sm bg-secondary px-2 py-0.5">{mc.estilo}</span>}
                      <span className="rounded-sm bg-secondary px-2 py-0.5">{mc.vitorias}V · {mc.derrotas}D</span>
                    </div>
                    {mc.bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{mc.bio}</p>}
                  </div>
                </div>
              </Link>
            ))}
            {mcs && mcs.length === 0 && (
              <div className="rounded-sm border border-dashed border-border p-10 text-center text-muted-foreground">
                Nenhum MC ainda. Seja o primeiro.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
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
