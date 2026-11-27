import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LayoutPublico } from "@/components/layout-publico";
import { Aviso } from "@/components/ui";
import { obterSessao } from "@/lib/sessao";
import { FormCadastro } from "../form-cadastro";
import { BotaoSair } from "@/components/botao-sair";

export const metadata: Metadata = { title: "Complete seu cadastro" };

export default async function CompletarCadastro() {
  const s = await obterSessao();
  if (!s) redirect("/entrar");
  const p = s.perfil;
  if (p && (p.status === "aprovado" || p.status === "pendente" || p.status === "suspenso")) redirect("/");

  return (
    <LayoutPublico
      titulo={p ? "Corrija seu cadastro" : "Complete seu cadastro"}
      subtitulo="Informe seus dados para a administração liberar seu acesso."
    >
      {p?.status === "rejeitado" && p.motivo_status ? (
        <Aviso tipo="atencao" titulo="Mensagem da administração">{p.motivo_status}</Aviso>
      ) : null}
      <FormCadastro
        modo="completar"
        inicial={p ? { nome: p.nome, bloco: p.bloco_informado, predio: p.predio_informado ?? "", apartamento: p.apto_informado, tipo: p.tipo_vinculo } : undefined}
      />
      <BotaoSair />
    </LayoutPublico>
  );
}
