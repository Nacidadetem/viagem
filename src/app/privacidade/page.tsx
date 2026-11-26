import type { Metadata } from "next";
import Link from "next/link";
import { LayoutPublico } from "@/components/layout-publico";
import { TextoLegal } from "@/components/texto-legal";
import { VERSAO_TERMOS } from "@/lib/tipos";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <LayoutPublico titulo="Política de privacidade" subtitulo={`Versão ${VERSAO_TERMOS} · em linguagem simples`}>
      <TextoLegal>
        <p>
          Este aplicativo é do <strong>Condomínio Residencial Ignez Andreazza</strong> (Areias, Recife/PE), que é o
          controlador dos seus dados, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 – LGPD).
        </p>
        <h2>Quais dados coletamos</h2>
        <ul>
          <li>Nome, celular e/ou e-mail — para você entrar e receber avisos.</li>
          <li>Bloco, apartamento e se você é titular ou dependente — para confirmar que você mora aqui.</li>
          <li>O que você publicar no app (chamados, fotos, mensagens, votos, reservas).</li>
        </ul>
        <p><strong>Não pedimos</strong> CPF, RG, data de nascimento nem documentos.</p>
        <h2>Para que usamos</h2>
        <ul>
          <li>Liberar seu acesso e garantir que só moradores participem.</li>
          <li>Garantir um voto por apartamento nas enquetes.</li>
          <li>Enviar comunicados, avisos de encomenda e andamento dos seus pedidos.</li>
          <li>Prestar contas aos condôminos (relatórios sem dados pessoais desnecessários).</li>
        </ul>
        <h2>Com quem compartilhamos</h2>
        <p>
          Apenas com a administração e a equipe do condomínio, conforme a função de cada um, e com os serviços de
          tecnologia que mantêm o app no ar. Ofertas de parceiros (como o Clube de Vantagens) só chegam a você se
          você autorizar, e seus dados só vão para o parceiro se você mesmo preencher o formulário de interesse.
        </p>
        <h2>Seus direitos</h2>
        <ul>
          <li>Ver e baixar todos os seus dados (em “Meu perfil” &gt; “Baixar meus dados”).</li>
          <li>Corrigir seus dados.</li>
          <li>Mudar suas autorizações de avisos e ofertas a qualquer momento.</li>
          <li>Excluir sua conta (em “Meu perfil” &gt; “Excluir minha conta”). O que você publicou fica anônimo.</li>
        </ul>
        <h2>Contato</h2>
        <p>Fale com a administração do condomínio para qualquer dúvida sobre seus dados.</p>
        <p><Link href="/entrar" className="font-bold underline">Voltar</Link></p>
      </TextoLegal>
    </LayoutPublico>
  );
}
