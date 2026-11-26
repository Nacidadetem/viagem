"use client";
import { useState, useTransition } from "react";
import { Aviso, Botao, Cartao, Selo } from "@/components/ui";
import { NOME_PAPEL, type Papel, type StatusCadastro } from "@/lib/tipos";
import { reativar, salvarPapeis, suspender } from "../acoes";

const EDITAVEIS: Papel[] = ["morador", "prestador", "zelador", "manutencao", "portaria", "administracao", "sindico"];

export function CartaoUsuario({ usuario }: {
  usuario: { id: string; nome: string; contato: string; unidade: string; status: StatusCadastro; papeis: Papel[]; motivo: string | null };
}) {
  const [aberto, setAberto] = useState(false);
  const [papeis, setPapeis] = useState<Papel[]>(usuario.papeis);
  const [msg, setMsg] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const rodar = (fn: () => Promise<{ ok: true } | { erro: string }>, ok: string) =>
    iniciar(async () => {
      const r = await fn();
      setMsg("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "sucesso", texto: ok });
    });

  return (
    <Cartao className="flex flex-col gap-3">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="flex items-start justify-between gap-3 text-left">
        <span>
          <span className="block text-lg font-bold">{usuario.nome}</span>
          <span className="block text-sm text-suave">{usuario.unidade} · {usuario.contato}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {usuario.status === "suspenso" ? <Selo cor="vermelho">Suspenso</Selo> : null}
            {usuario.papeis.filter((p) => p !== "morador").map((p) => <Selo key={p} cor="sol">{NOME_PAPEL[p]}</Selo>)}
          </span>
        </span>
        <span aria-hidden className="text-2xl text-suave">{aberto ? "−" : "+"}</span>
      </button>

      {aberto ? (
        <div className="flex flex-col gap-3 border-t border-linha pt-3">
          {msg ? <Aviso tipo={msg.tipo}>{msg.texto}</Aviso> : null}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-bold">Funções no app</legend>
            {EDITAVEIS.map((p) => (
              <label key={p} className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-6 accent-marca-700" checked={papeis.includes(p)}
                  onChange={(e) => setPapeis(e.target.checked ? [...papeis, p] : papeis.filter((x) => x !== p))} />
                {NOME_PAPEL[p]}
              </label>
            ))}
          </fieldset>
          <Botao carregando={pendente} onClick={() => rodar(() => salvarPapeis(usuario.id, papeis), "Funções atualizadas.")}>
            Salvar funções
          </Botao>
          {usuario.status === "suspenso" ? (
            <Botao variante="secundario" onClick={() => rodar(() => reativar(usuario.id), "Acesso reativado.")}>Reativar acesso</Botao>
          ) : (
            <Botao variante="texto" className="text-perigo!"
              onClick={() => {
                const motivo = window.prompt("Motivo da suspensão (o morador verá esta mensagem):");
                if (motivo?.trim()) rodar(() => suspender(usuario.id, motivo.trim()), "Acesso suspenso.");
              }}>
              Suspender acesso
            </Botao>
          )}
        </div>
      ) : null}
    </Cartao>
  );
}
