import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ItemFila, StatusCadastro } from "@/lib/tipos";
import { ListaAprovacoes } from "./lista-aprovacoes";

export const metadata: Metadata = { title: "Aprovar cadastros" };

const ABAS: { valor: StatusCadastro; texto: string }[] = [
  { valor: "pendente", texto: "Pendentes" },
  { valor: "rejeitado", texto: "Rejeitados" },
];

export default async function Aprovacoes({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: st } = await searchParams;
  const status: StatusCadastro = st === "rejeitado" ? "rejeitado" : "pendente";
  const supabase = await criarClienteServidor();
  const [{ data, error }, { data: cfg }] = await Promise.all([
    supabase.rpc("fila_aprovacao", { p_status: status }),
    supabase.from("configuracoes").select("valor").eq("chave", "lista_oficial_importada").maybeSingle(),
  ]);
  const listaOficial = cfg?.valor === true;
  const fila = (data ?? []) as ItemFila[];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-base font-bold text-marca-800 underline">← Administração</Link>
        <h1 className="mt-2 text-2xl font-bold text-marca-900">Aprovar cadastros</h1>
      </div>
      <nav className="grid grid-cols-2 gap-1 rounded-xl bg-linha/50 p-1" aria-label="Filtrar">
        {ABAS.map((a) => (
          <Link key={a.valor} href={`/admin/aprovacoes?status=${a.valor}`} aria-current={status === a.valor ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-lg font-bold ${status === a.valor ? "bg-white text-marca-800 shadow" : "text-suave"}`}>
            {a.texto}
          </Link>
        ))}
      </nav>
      {error ? <Aviso tipo="erro">{error.message}</Aviso> : null}
      {fila.length === 0 ? (
        <Aviso tipo="sucesso">{status === "pendente" ? "Nenhum cadastro esperando. Tudo em dia! 🎉" : "Nenhum cadastro rejeitado."}</Aviso>
      ) : (
        <ListaAprovacoes key={status} itens={fila} listaOficial={listaOficial} />
      )}
    </div>
  );
}
