import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Cartao } from "@/components/ui";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormImportar } from "./form-importar";

export const metadata: Metadata = { title: "Estrutura do condomínio" };

interface Resumo {
  total_blocos: number; total_predios: number; total_unidades: number;
  cadastrados_blocos: number; cadastrados_predios: number; cadastrados_unidades: number;
  lista_oficial_importada: boolean;
}

export default async function Estrutura() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("resumo_cadastros");
  const r = (data ?? {}) as Resumo;
  const linhas = [
    { t: "Blocos", no: r.cadastrados_blocos ?? 0, total: r.total_blocos ?? 23 },
    { t: "Prédios", no: r.cadastrados_predios ?? 0, total: r.total_predios ?? 176 },
    { t: "Apartamentos", no: r.cadastrados_unidades ?? 0, total: r.total_unidades ?? 2464 },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-base font-bold text-marca-800 underline">← Administração</Link>
        <h1 className="mt-2 text-2xl font-bold text-marca-900">Estrutura do condomínio</h1>
      </div>

      <Cartao>
        <h2 className="mb-3 text-lg font-bold">Cadastrados no app</h2>
        <ul className="flex flex-col gap-3">
          {linhas.map((l) => (
            <li key={l.t}>
              <div className="flex justify-between text-base">
                <span>{l.t}</span>
                <span className="font-bold tabular-nums">
                  {l.no.toLocaleString("pt-BR")} de {l.total.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-linha" aria-hidden>
                <div className="h-full rounded-full bg-marca-600" style={{ width: `${Math.min(100, (l.no / l.total) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Cartao>

      {r.lista_oficial_importada ? (
        <Aviso tipo="sucesso" titulo="Lista oficial importada">
          O cadastro já avisa o morador quando o endereço não existe, e só apartamentos da lista podem ser aprovados.
          Se faltar algum, importe as linhas que faltam abaixo.
        </Aviso>
      ) : (
        <Aviso tipo="atencao" titulo="Lista oficial ainda não importada">
          Por enquanto, cada apartamento é cadastrado quando você aprova um morador, por isso confira o endereço antes de
          aprovar. Importe a lista assim que tiver a relação de unidades.
        </Aviso>
      )}

      <FormImportar />
    </div>
  );
}
