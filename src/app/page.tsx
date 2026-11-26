import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";

export default async function Raiz() {
  const s = await obterSessao();
  if (!s) redirect("/entrar");
  if (!s.perfil) redirect("/cadastro/completar");
  if (s.perfil.status !== "aprovado") redirect("/aguardando");
  redirect("/inicio");
}
