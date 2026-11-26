import type { Metadata } from "next";
import { LayoutPublico } from "@/components/layout-publico";
import { Aviso } from "@/components/ui";

export const metadata: Metadata = { title: "Em configuração" };

export default function EmConfiguracao() {
  return (
    <LayoutPublico titulo="Estamos quase prontos" subtitulo="O aplicativo do condomínio está sendo configurado.">
      <Aviso tipo="info" titulo="Volte em breve">
        Os cadastros de moradores serão abertos assim que a administração concluir a configuração.
      </Aviso>
    </LayoutPublico>
  );
}
