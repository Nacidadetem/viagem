"use server";
import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Papel } from "@/lib/tipos";

// Aprovar/recusar não revalidam a página: o cartão troca por uma confirmação
// e a lista se atualiza na próxima visita (páginas são dinâmicas).
type Resultado = { ok: true } | { erro: string };

export async function aprovar(usuarioId: string, bloco: string, predio: string, apto: string): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("aprovar_cadastro", {
    p_usuario: usuarioId, p_bloco: bloco, p_predio: predio, p_apto: apto,
  });
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

export async function definirEndereco(usuarioId: string, bloco: string, predio: string, apto: string): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_endereco", {
    p_usuario: usuarioId, p_bloco: bloco, p_predio: predio, p_apto: apto,
  });
  revalidatePath("/admin/usuarios");
  return error ? { erro: error.message } : { ok: true };
}

export interface ResultadoImportacao {
  apartamentos_novos: number; linhas_ignoradas: number; cadastros_vinculados: number;
  blocos: number; predios: number; apartamentos: number;
}

/** Importa a lista oficial: cada linha "bloco;prédio;apto" (aceita ; , ou tab). */
export async function importarLista(texto: string): Promise<{ ok: ResultadoImportacao } | { erro: string }> {
  await exigirAdmin();
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((c) => c.length >= 3 && !/^bloco$/i.test(c[0])) // ignora cabeçalho
    .map(([bloco, predio, apto]) => ({ bloco, predio, apto }));
  if (linhas.length === 0) return { erro: "Nenhuma linha válida. Use o formato: bloco;prédio;apartamento" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("importar_unidades", { p_linhas: linhas });
  revalidatePath("/admin", "layout");
  return error ? { erro: error.message } : { ok: data as ResultadoImportacao };
}
