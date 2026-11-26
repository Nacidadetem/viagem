"use server";
import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel } from "@/lib/tipos";

// Aprovar/recusar não revalidam a página: o cartão troca por uma confirmação
// e a lista se atualiza na próxima visita (páginas são dinâmicas).
type Resultado = { ok: true } | { erro: string };

export async function aprovar(usuarioId: string, bloco: string, apto: string): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data: unidadeId } = await supabase.rpc("buscar_unidade", { p_bloco: bloco, p_numero: apto });
  if (!unidadeId) return { erro: `Não existe o apartamento ${apto} no bloco ${bloco}. Corrija antes de aprovar.` };
  const { error } = await supabase.rpc("aprovar_cadastro", { p_usuario: usuarioId, p_unidade: unidadeId });
  return error ? { erro: error.message } : { ok: true };
}

export async function rejeitar(usuarioId: string, motivo: string): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("rejeitar_cadastro", { p_usuario: usuarioId, p_motivo: motivo });
  return error ? { erro: error.message } : { ok: true };
}

export async function salvarPapeis(usuarioId: string, papeis: Papel[]): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_papeis", { p_usuario: usuarioId, p_papeis: papeis });
  revalidatePath("/admin/usuarios");
  return error ? { erro: error.message } : { ok: true };
}

export async function suspender(usuarioId: string, motivo: string): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("suspender_usuario", { p_usuario: usuarioId, p_motivo: motivo });
  revalidatePath("/admin/usuarios");
  return error ? { erro: error.message } : { ok: true };
}

export async function reativar(usuarioId: string): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("reativar_usuario", { p_usuario: usuarioId });
  revalidatePath("/admin/usuarios");
  return error ? { erro: error.message } : { ok: true };
}
