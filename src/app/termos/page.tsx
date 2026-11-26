import type { Metadata } from "next";
import Link from "next/link";
import { LayoutPublico } from "@/components/layout-publico";
import { TextoLegal } from "@/components/texto-legal";
import { VERSAO_TERMOS } from "@/lib/tipos";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <LayoutPublico titulo="Termos de uso" subtitulo={`Versão ${VERSAO_TERMOS}`}>
      <TextoLegal>
        <p>Ao usar o aplicativo do Condomínio Ignez Andreazza, você concorda com estas regras de convivência:</p>
        <ul>
          <li>O app é só para moradores aprovados pela administração.</li>
          <li>Cada pessoa tem o próprio cadastro. Não compartilhe seu acesso.</li>
          <li>Trate todos com respeito. Ofensas, discriminação e exposição de vizinhos não são permitidas.</li>
          <li>Publicações podem ser moderadas ou removidas pela administração, e qualquer morador pode denunciar conteúdo impróprio.</li>
          <li>Nas enquetes vale um voto por apartamento.</li>
          <li>As regras do regimento interno e da convenção do condomínio continuam valendo.</li>
          <li>Serviços e ofertas de prestadores e parceiros são de responsabilidade de quem oferece. A adesão é sempre opcional.</li>
        </ul>
        <p><Link href="/entrar" className="font-bold underline">Voltar</Link></p>
      </TextoLegal>
    </LayoutPublico>
  );
}
