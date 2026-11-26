import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel, StatusCadastro } from "@/lib/tipos";
import { exibirTelefone } from "@/lib/formatar";
import { CartaoUsuario } from "./cartao-usuario";

export const metadata: Metadata = { title: "Usuários e permissões" };

const POR_PAGINA = 30;

interface Linha {
  id: string; nome: string; telefone: string | null; email: string | null; status: StatusCadastro;
  tipo_vinculo: string; motivo_status: string | null;
  unidades: { numero: string; blocos: { nome: string } | null } | null;
  papeis_usuario: { papel: Papel }[];
}

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string; bloco?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
  const bloco = (sp.bloco ?? "").trim().slice(0, 10);
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("perfis")
    .select(
      `id, nome, telefone, email, status, tipo_vinculo, motivo_status,
       unidades${bloco ? "!inner" : ""}(numero, blocos${bloco ? "!inner" : ""}(nome)),
       papeis_usuario(papel)`,
      { count: "exact" },
    )
    .in("status", ["aprovado", "suspenso"])
    .order("nome")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (q) consulta = consulta.ilike("nome", `%${q}%`);
  if (bloco) consulta = consulta.eq("unidades.blocos.nome", bloco);
  const { data, error, count } = await consulta.returns<Linha[]>();
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => `/admin/usuarios?${new URLSearchParams({ q, bloco, pagina: String(p) })}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-base font-bold text-marca-800 underline">← Administração</Link>
        <h1 className="mt-2 text-2xl font-bold text-marca-900">Usuários e permissões</h1>
      </div>
      <form className="grid grid-cols-[1fr_6rem] gap-3" role="search">
        <label className="sr-only" htmlFor="q">Buscar por nome</label>
        <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome"
          className="min-h-12 rounded-xl border-2 border-linha bg-white px-4 text-lg" />
        <label className="sr-only" htmlFor="bloco">Bloco</label>
        <input id="bloco" name="bloco" defaultValue={bloco} placeholder="Bloco"
          className="min-h-12 rounded-xl border-2 border-linha bg-white px-4 text-lg" />
        <button className="col-span-2 min-h-12 rounded-xl bg-marca-700 font-bold text-white">Buscar</button>
      </form>
      {error ? <Aviso tipo="erro">{error.message}</Aviso> : null}
      <p className="text-sm text-suave">{total} pessoa(s) encontrada(s)</p>
      <ul className="flex flex-col gap-3">
        {(data ?? []).map((u) => (
          <li key={u.id}>
            <CartaoUsuario
              usuario={{
                id: u.id, nome: u.nome, contato: u.telefone ? exibirTelefone(u.telefone) : u.email ?? "", status: u.status,
                unidade: u.unidades ? `Bloco ${u.unidades.blocos?.nome} · Apto ${u.unidades.numero}` : "Sem apartamento",
                papeis: u.papeis_usuario.map((p) => p.papel), motivo: u.motivo_status,
              }}
            />
          </li>
        ))}
      </ul>
      {paginas > 1 ? (
        <nav className="flex items-center justify-between" aria-label="Páginas">
          {pagina > 1 ? <Link className="font-bold underline" href={link(pagina - 1)}>← Anterior</Link> : <span />}
          <span className="text-sm text-suave">Página {pagina} de {paginas}</span>
          {pagina < paginas ? <Link className="font-bold underline" href={link(pagina + 1)}>Próxima →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
