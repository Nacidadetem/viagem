import { redirect } from "next/navigation";
import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel, Perfil } from "@/lib/tipos";

export interface Sessao {
  userId: string;
  perfil: Perfil | null;
  papeis: Papel[];
  unidade: { bloco: string; predio: string; apartamento: string } | null;
  ehAdmin: boolean;
  ehEquipe: boolean;
}

/** Carrega usuário, perfil e papéis uma vez por requisição. */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: papeis }] = await Promise.all([
    supabase.from("perfis").select("*").eq("id", user.id).maybeSingle<Perfil>(),
    supabase.from("papeis_usuario").select("papel").eq("usuario_id", user.id),
  ]);

  let unidade: Sessao["unidade"] = null;
  if (perfil?.unidade_id) {
    const { data } = await supabase
      .from("unidades")
      .select("numero, predios(nome, blocos(nome))")
      .eq("id", perfil.unidade_id)
      .maybeSingle<{ numero: string; predios: { nome: string; blocos: { nome: string } | null } | null }>();
    if (data)
      unidade = { bloco: data.predios?.blocos?.nome ?? "", predio: data.predios?.nome ?? "", apartamento: data.numero };
  }

  const lista = (papeis ?? []).map((p) => p.papel as Papel);
  const aprovado = perfil?.status === "aprovado";
  return {
    userId: user.id,
    perfil: perfil ?? null,
    papeis: aprovado ? lista : [],
    unidade,
    ehAdmin: aprovado && lista.some((p) => p === "administracao" || p === "sindico"),
    ehEquipe:
      aprovado &&
      lista.some((p) => ["administracao", "sindico", "zelador", "manutencao", "portaria"].includes(p)),
  };
});

/** Exige login E cadastro aprovado; senão manda para a tela certa. */
export async function exigirAprovado(): Promise<Sessao> {
  const s = await obterSessao();
  if (!s) redirect("/entrar");
  if (!s.perfil) redirect("/cadastro/completar");
  if (s.perfil.status !== "aprovado") redirect("/aguardando");
  return s;
}

export async function exigirAdmin(): Promise<Sessao> {
  const s = await exigirAprovado();
  if (!s.ehAdmin) redirect("/inicio");
  return s;
}
