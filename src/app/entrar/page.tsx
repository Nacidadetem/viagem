import type { Metadata } from "next";
import Link from "next/link";
import { LayoutPublico } from "@/components/layout-publico";
import { FormEntrar } from "./form-entrar";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaEntrar() {
  return (
    <LayoutPublico titulo="Entrar" subtitulo="Bem-vindo(a)! Use seu celular ou e-mail para acessar.">
      <FormEntrar />
      <p className="text-center text-base">
        Ainda não tem cadastro?{" "}
        <Link href="/cadastro" className="font-bold text-marca-800 underline underline-offset-4">
          Cadastre-se aqui
        </Link>
      </p>
      <p className="mt-auto text-center text-sm text-suave">
        <Link href="/privacidade" className="underline">Política de privacidade</Link> ·{" "}
        <Link href="/termos" className="underline">Termos de uso</Link>
      </p>
    </LayoutPublico>
  );
}
