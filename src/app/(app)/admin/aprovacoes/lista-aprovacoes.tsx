"use client";
import { useEffect, useState } from "react";
import type { ItemFila } from "@/lib/tipos";
import { CartaoAprovacao } from "./cartao-aprovacao";

/**
 * Mantém na tela os cadastros já analisados (com a confirmação),
 * mesmo quando o servidor atualiza a página, e acrescenta os novos que chegarem.
 */
export function ListaAprovacoes({ itens, listaOficial }: { itens: ItemFila[]; listaOficial: boolean }) {
  const [lista, setLista] = useState(itens);
  useEffect(() => {
    setLista((atual) => {
      const ids = new Set(atual.map((i) => i.id));
      const novos = itens.filter((i) => !ids.has(i.id));
      return novos.length ? [...atual, ...novos] : atual;
    });
  }, [itens]);
  return (
    <ul className="flex flex-col gap-4">
      {lista.map((item) => <li key={item.id}><CartaoAprovacao item={item} listaOficial={listaOficial} /></li>)}
    </ul>
  );
}
