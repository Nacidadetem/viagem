"use client";
import { useState, useTransition } from "react";
import { Aviso, Botao, Cartao } from "@/components/ui";
import { importarLista, type ResultadoImportacao } from "../acoes";

export function FormImportar() {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [pendente, iniciar] = useTransition();
  const qtd = texto.split(/\r?\n/).filter((l) => l.trim()).length;

  async function lerArquivo(arquivo: File) {
    setTexto(await arquivo.text());
  }

  return (
    <Cartao className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Importar lista de apartamentos</h2>
      <p className="text-base">
        Uma linha por apartamento, no formato <strong>bloco;prédio;apartamento</strong>. Dá para copiar as três colunas
        de uma planilha (Excel ou Google Planilhas) e colar aqui, ou escolher um arquivo .csv.
      </p>
      <pre className="rounded-xl bg-fundo p-3 text-sm">{"bloco;predio;apto\n1;1;101\n1;1;102\n5;3;201"}</pre>
      <label htmlFor="arquivo-csv" className="font-bold">Arquivo .csv (opcional)</label>
      <input id="arquivo-csv" type="file" accept=".csv,.txt,text/csv,text/plain"
        onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])}
        className="text-base file:mr-3 file:min-h-12 file:rounded-xl file:border-0 file:bg-marca-100 file:px-4 file:font-bold file:text-marca-800" />
      <label htmlFor="lista" className="font-bold">Lista</label>
      <textarea id="lista" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="Cole aqui"
        className="rounded-xl border-2 border-linha bg-white p-3 font-mono text-base focus:border-marca-600" />
      <p className="text-sm text-suave">{qtd.toLocaleString("pt-BR")} linha(s). Linhas repetidas ou já cadastradas são ignoradas.</p>
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {resultado ? (
        <Aviso tipo="sucesso" titulo="Importação concluída">
          {resultado.apartamentos_novos.toLocaleString("pt-BR")} apartamento(s) novo(s)
          {resultado.linhas_ignoradas ? `, ${resultado.linhas_ignoradas} linha(s) incompleta(s) ignorada(s)` : ""}
          {resultado.cadastros_vinculados ? `, ${resultado.cadastros_vinculados} cadastro(s) vinculado(s) ao apartamento` : ""}.
          Agora são {resultado.blocos} blocos, {resultado.predios} prédios e {resultado.apartamentos.toLocaleString("pt-BR")} apartamentos.
        </Aviso>
      ) : null}
      <Botao disabled={qtd === 0} carregando={pendente}
        onClick={() => iniciar(async () => {
          setErro(null); setResultado(null);
          const r = await importarLista(texto);
          if ("erro" in r) setErro(r.erro);
          else { setResultado(r.ok); setTexto(""); }
        })}>
        Importar
      </Botao>
    </Cartao>
  );
}
