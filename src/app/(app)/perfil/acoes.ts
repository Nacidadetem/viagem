"use server";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { VERSAO_TERMOS } from "@/lib/tipos";

export async function salvarNome(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 2) return { erro: "Digite seu nome." };
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("perfis").update({ nome }).eq("id", user!.id);
  revalidatePath("/", "layout");
  return error ? { erro: error.message } : { ok: true };
}

export async function alternarFonteGrande(ativo: boolean) {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("perfis").update({ fonte_grande: ativo }).eq("id", user!.id);
  revalidatePath("/", "layout");
}

export async function alterarConsentimento(finalidade: "notificacoes" | "ofertas_parceiros", aceito: boolean) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_consentimento", {
    p_finalidade: finalidade,
    p_aceito: aceito,
    p_versao: VERSAO_TERMOS,
  });
  revalidatePath("/perfil");
  return error ? { erro: error.message } : { ok: true };
}

export async function exportarDados() {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("exportar_meus_dados");
  if (error) return { erro: error.message };
  return { dados: data };
}

export async function excluirConta(confirmacao: string) {
  if (confirmacao.trim().toUpperCase() !== "EXCLUIR") return { erro: "Digite EXCLUIR para confirmar." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("excluir_minha_conta");
  if (error) return { erro: error.message };
  await supabase.auth.signOut();
  return { ok: true };
}
