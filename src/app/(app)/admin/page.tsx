import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administração" };

interface Resumo { pendentes: number; aprovados: number; rejeitados: number; suspensos: number; unidades_com_morador: number; total_unidades: number }

export default async function Admin() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("resumo_cadastros");
  const r = (data ?? {}) as Resumo;
  const cobertura = r.total_unidades ? Math.round((r.unidades_com_morador / r.total_unidades) * 100) : 0;

  const numeros = [
    { rotulo: "Aguardando aprovação", valor: r.pendentes ?? 0, destaque: (r.pendentes ?? 0) > 0 },
    { rotulo: "Moradores aprovados", valor: r.aprovados ?? 0 },
    { rotulo: "Apartamentos no app", valor: `${r.unidades_com_morador ?? 0} de ${r.total_unidades ?? 0}`, extra: `${cobertura}%` },
    { rotulo: "Suspensos", valor: r.suspensos ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-marca-900">Administração</h1>
      <ul className="grid grid-cols-2 gap-3">
        {numeros.map((n) => (
          <li key={n.rotulo} className={`rounded-2xl border p-4 ${n.destaque ? "border-sol-500 bg-sol-100" : "border-linha bg-white"}`}>
            <p className="text-sm text-suave">{n.rotulo}</p>
            <p className="text-2xl font-bold tabular-nums">{n.valor}</p>
            {n.extra ? <p className="text-sm font-bold text-marca-700">{n.extra}</p> : null}
          </li>
        ))}
      </ul>
      <nav aria-label="Seções da administração" className="flex flex-col gap-3">
        {[
          { href: "/admin/aprovacoes", t: "Aprovar cadastros", d: "Conferir bloco e apartamento de quem se cadastrou", i: "✅" },
          { href: "/admin/usuarios", t: "Usuários e permissões", d: "Definir síndico, zelador, portaria, prestador…", i: "👥" },
        ].map((l) => (
          <Link key={l.href} href={l.href}>
            <Cartao className="flex items-center gap-4 hover:border-marca-500">
              <span aria-hidden className="text-3xl">{l.i}</span>
              <span>
                <span className="block text-lg font-bold">{l.t}</span>
                <span className="block text-sm text-suave">{l.d}</span>
              </span>
            </Cartao>
          </Link>
        ))}
      </nav>
      <p className="text-sm text-suave">Relatórios e exportação em PDF/Excel chegam junto com os módulos de chamados, enquetes e reservas.</p>
    </div>
  );
}
