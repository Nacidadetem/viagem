"use client";
import { useState, useTransition } from "react";
import { Aviso, Botao, Campo, Cartao, Selo } from "@/components/ui";
import { dataHora, endereco, exibirTelefone, limparRef } from "@/lib/formatar";
import type { ItemFila } from "@/lib/tipos";
import { aprovar, rejeitar } from "../acoes";

const MOTIVOS = [
  "Não conseguimos confirmar que você mora neste apartamento. Procure a administração.",
  "O bloco ou apartamento informado não existe. Confira e envie de novo.",
  "Cadastro duplicado.",
];

export function CartaoAprovacao({ item, listaOficial }: { item: ItemFila; listaOficial: boolean }) {
  const [bloco, setBloco] = useState(item.bloco ?? limparRef(item.bloco_informado));
  const [predio, setPredio] = useState(item.predio ?? limparRef(item.predio_informado));
  const [apto, setApto] = useState(item.apartamento ?? limparRef(item.apto_informado));
  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (feito) return <Aviso tipo="sucesso">{feito}</Aviso>;

  const executar = (fn: () => Promise<{ ok: true } | { erro: string }>, msg: string) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if ("erro" in r) setErro(r.erro);
      else setFeito(msg);
    });

  return (
    <Cartao className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{item.nome}</p>
          <p className="text-sm text-suave">Enviado em {dataHora(item.created_at)}</p>
        </div>
        <Selo cor={item.tipo_vinculo === "titular" ? "verde" : "cinza"}>
          {item.tipo_vinculo === "titular" ? "Titular" : "Dependente"}
        </Selo>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
        <dt className="text-suave">Informou</dt>
        <dd><strong>{endereco(item.bloco_informado, item.predio_informado ?? "?", item.apto_informado)}</strong></dd>
        {item.telefone ? (<><dt className="text-suave">Celular</dt><dd>{exibirTelefone(item.telefone)}</dd></>) : null}
        {item.email ? (<><dt className="text-suave">E-mail</dt><dd className="break-all">{item.email}</dd></>) : null}
      </dl>

      {item.unidade_id ? (
        <p className="text-sm">
          ✅ Apartamento encontrado.{" "}
          {item.moradores_na_unidade > 0
            ? <>Já há <strong>{item.moradores_na_unidade}</strong> morador(es) aprovado(s) nele{item.titular_existente ? <> (titular: {item.titular_existente})</> : null}.</>
            : "Ninguém cadastrado nele ainda."}
        </p>
      ) : listaOficial ? (
        <Aviso tipo="atencao">Endereço fora da lista oficial. Corrija bloco, prédio e apartamento abaixo.</Aviso>
      ) : (
        <p className="text-sm">
          ℹ️ A lista oficial de apartamentos ainda não foi importada. <strong>Confira o endereço</strong> antes de
          aprovar: ao aprovar, este apartamento passa a existir no app.
        </p>
      )}

      {item.status === "rejeitado" && item.motivo_status ? (
        <p className="text-sm text-suave">Motivo da rejeição: {item.motivo_status}</p>
      ) : null}

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      {!rejeitando ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Campo id={`b-${item.id}`} rotulo="Bloco" value={bloco} onChange={(e) => setBloco(e.target.value)} />
            <Campo id={`p-${item.id}`} rotulo="Prédio" value={predio} onChange={(e) => setPredio(e.target.value)} />
            <Campo id={`a-${item.id}`} rotulo="Apto" value={apto} onChange={(e) => setApto(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Botao carregando={pendente} onClick={() => executar(() => aprovar(item.id, bloco, predio, apto), `${item.nome} foi aprovado(a).`)}>
              Aprovar
            </Botao>
            <Botao variante="secundario" onClick={() => setRejeitando(true)}>Recusar</Botao>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-bold">Por que recusar? O morador verá esta mensagem.</p>
          <div className="flex flex-col gap-2">
            {MOTIVOS.map((m) => (
              <button key={m} type="button" onClick={() => setMotivo(m)}
                className={`rounded-xl border-2 p-3 text-left text-sm ${motivo === m ? "border-marca-700 bg-marca-50" : "border-linha"}`}>
                {m}
              </button>
            ))}
          </div>
          <label htmlFor={`m-${item.id}`} className="font-bold">Ou escreva outro motivo</label>
          <textarea id={`m-${item.id}`} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            className="rounded-xl border-2 border-linha p-3 text-base focus:border-marca-600" />
          <div className="grid grid-cols-2 gap-3">
            <Botao variante="perigo" carregando={pendente} disabled={!motivo.trim()}
              onClick={() => executar(() => rejeitar(item.id, motivo), `Cadastro de ${item.nome} recusado.`)}>
              Confirmar recusa
            </Botao>
            <Botao variante="secundario" onClick={() => setRejeitando(false)}>Voltar</Botao>
          </div>
        </div>
      )}
    </Cartao>
  );
}
