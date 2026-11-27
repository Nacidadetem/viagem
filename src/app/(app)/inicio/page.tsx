import type { Metadata } from "next";
import Link from "next/link";
import { BotaoInstalar } from "@/components/botao-instalar";
import { Aviso } from "@/components/ui";
import { MODULOS, MODULOS_ATIVOS } from "@/lib/modulos";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Início" };

function saudacao() {
  const h = Number(new Date().toLocaleString("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Recife" }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function Inicio() {
  const s = (await obterSessao())!;
  let pendentes = 0;
  if (s.ehAdmin) {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.rpc("resumo_cadastros");
    pendentes = (data as { pendentes?: number } | null)?.pendentes ?? 0;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-marca-900">
        {saudacao()}, {s.perfil!.nome.split(" ")[0]}!
      </h1>

      {s.ehAdmin && pendentes > 0 ? (
        <Link href="/admin/aprovacoes" className="block">
          <Aviso tipo="atencao" titulo={`${pendentes} cadastro${pendentes > 1 ? "s" : ""} aguardando aprovação`}>
            Toque aqui para conferir bloco, prédio e apartamento.
          </Aviso>
        </Link>
      ) : null}

      <BotaoInstalar />

      <section aria-labelledby="titulo-servicos">
        <h2 id="titulo-servicos" className="mb-3 text-xl font-bold">O que você quer fazer?</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MODULOS.map((m) => {
            const ativo = MODULOS_ATIVOS.has(m.id);
            const conteudo = (
              <>
                <span aria-hidden className="text-3xl">{m.icone}</span>
                <span className="text-base leading-tight font-bold">{m.nome}</span>
                <span className="text-sm leading-snug text-suave">{m.desc}</span>
                {!ativo ? (
                  <span className="mt-auto self-start rounded-full bg-linha/60 px-2 py-0.5 text-xs font-bold text-suave">Em breve</span>
                ) : null}
              </>
            );
            const cls = "flex h-full min-h-36 flex-col gap-1.5 rounded-2xl border border-linha bg-white p-4 shadow-sm";
            return (
              <li key={m.id}>
                {ativo ? (
                  <Link href={m.href} className={`${cls} hover:border-marca-500`}>{conteudo}</Link>
                ) : (
                  <div className={`${cls} opacity-70`} aria-disabled>{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
