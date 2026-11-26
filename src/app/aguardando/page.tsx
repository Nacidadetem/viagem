import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BotaoSair } from "@/components/botao-sair";
import { LayoutPublico } from "@/components/layout-publico";
import { Aviso, BotaoLink, Cartao } from "@/components/ui";
import { dataHora } from "@/lib/formatar";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Cadastro em análise" };
export const dynamic = "force-dynamic";

export default async function Aguardando() {
  const s = await obterSessao();
  if (!s) redirect("/entrar");
  if (!s.perfil) redirect("/cadastro/completar");
  const p = s.perfil;
  if (p.status === "aprovado") redirect("/inicio");

  return (
    <LayoutPublico titulo={`Olá, ${p.nome.split(" ")[0]}!`}>
      {p.status === "pendente" ? (
        <Aviso tipo="info" titulo="⏳ Seu cadastro está em análise">
          A administração vai conferir se você mora no <strong>bloco {p.bloco_informado}, apartamento{" "}
          {p.apto_informado}</strong>. Isso costuma levar até 2 dias úteis. Você pode fechar o aplicativo: quando for
          liberado, é só entrar de novo.
        </Aviso>
      ) : null}
      {p.status === "rejeitado" ? (
        <>
          <Aviso tipo="atencao" titulo="Seu cadastro precisa de correção">
            {p.motivo_status ?? "A administração não conseguiu confirmar seus dados."}
          </Aviso>
          <BotaoLink href="/cadastro/completar">Corrigir e enviar de novo</BotaoLink>
        </>
      ) : null}
      {p.status === "suspenso" ? (
        <Aviso tipo="erro" titulo="Seu acesso está suspenso">
          {p.motivo_status ?? "Procure a administração do condomínio para mais informações."}
        </Aviso>
      ) : null}

      <Cartao>
        <h2 className="mb-2 text-lg font-bold">Dados enviados</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
          <dt className="text-suave">Nome</dt><dd>{p.nome}</dd>
          <dt className="text-suave">Bloco</dt><dd>{p.bloco_informado}</dd>
          <dt className="text-suave">Apartamento</dt><dd>{p.apto_informado}</dd>
          <dt className="text-suave">Vínculo</dt><dd>{p.tipo_vinculo === "titular" ? "Titular" : "Dependente"}</dd>
          <dt className="text-suave">Enviado em</dt><dd>{dataHora(p.created_at)}</dd>
        </dl>
      </Cartao>
      <p className="text-base text-suave">
        Dúvidas? Procure a administração na portaria principal.
      </p>
      <BotaoSair />
    </LayoutPublico>
  );
}
