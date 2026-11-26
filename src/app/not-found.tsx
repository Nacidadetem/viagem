import { LayoutPublico } from "@/components/layout-publico";
import { BotaoLink } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <LayoutPublico titulo="Página não encontrada" subtitulo="O endereço pode estar errado ou a página ainda não existe.">
      <BotaoLink href="/">Voltar ao início</BotaoLink>
    </LayoutPublico>
  );
}
