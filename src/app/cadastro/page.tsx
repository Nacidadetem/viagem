import type { Metadata } from "next";
import Link from "next/link";
import { LayoutPublico } from "@/components/layout-publico";
import { FormCadastro } from "./form-cadastro";

export const metadata: Metadata = { title: "Cadastro" };

export default function PaginaCadastro() {
  return (
    <LayoutPublico titulo="Cadastro de morador" subtitulo="Leva uns 2 minutos. Depois a administração libera seu acesso.">
      <FormCadastro modo="novo" />
      <p className="text-center text-base">
        Já tem cadastro?{" "}
        <Link href="/entrar" className="font-bold text-marca-800 underline underline-offset-4">Entrar</Link>
      </p>
    </LayoutPublico>
  );
}
