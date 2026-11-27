import type { Metadata } from "next";
import { BotaoSair } from "@/components/botao-sair";
import { BotaoLink, Cartao, Selo } from "@/components/ui";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NOME_PAPEL } from "@/lib/tipos";
import { exibirTelefone } from "@/lib/formatar";
import { Preferencias, ZonaLgpd, EditarNome } from "./componentes";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function Perfil() {
  const s = (await obterSessao())!;
  const p = s.perfil!;
  const supabase = await criarClienteServidor();
  const { data: consent } = await supabase
    .from("consentimentos")
    .select("finalidade, aceito, created_at")
    .eq("usuario_id", s.userId)
    .order("created_at", { ascending: false });
  const atual = (f: string) => consent?.find((c) => c.finalidade === f)?.aceito ?? false;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-marca-900">Meu perfil</h1>

      <Cartao className="flex flex-col gap-4">
        <EditarNome nome={p.nome} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
          <dt className="text-suave">Bloco / apto</dt>
          <dd>{s.unidade ? `${s.unidade.bloco} / ${s.unidade.apartamento}` : "—"}</dd>
          <dt className="text-suave">Vínculo</dt>
          <dd>{p.tipo_vinculo === "titular" ? "Titular" : "Dependente"}</dd>
          {p.telefone ? (<><dt className="text-suave">Celular</dt><dd>{exibirTelefone(p.telefone)}</dd></>) : null}
          {p.email ? (<><dt className="text-suave">E-mail</dt><dd className="break-all">{p.email}</dd></>) : null}
        </dl>
        <div className="flex flex-wrap gap-2">
          {s.papeis.map((papel) => <Selo key={papel}>{NOME_PAPEL[papel]}</Selo>)}
        </div>
        <p className="text-sm text-suave">Para mudar de apartamento, fale com a administração.</p>
        {p.email ? (
          <BotaoLink href="/auth/nova-senha" variante="secundario">Trocar minha senha</BotaoLink>
        ) : null}
      </Cartao>

      <Preferencias
        fonteGrande={p.fonte_grande}
        notificacoes={atual("notificacoes")}
        parceiros={atual("ofertas_parceiros")}
      />

      <ZonaLgpd />
      <BotaoSair />
    </div>
  );
}
