"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, Campo, Cartao } from "@/components/ui";
import { alterarConsentimento, alternarFonteGrande, excluirConta, exportarDados, salvarNome } from "./acoes";

function Interruptor({ id, rotulo, desc, valor, aoMudar }: {
  id: string; rotulo: string; desc?: string; valor: boolean; aoMudar: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="flex-1">
        <span className="block font-bold">{rotulo}</span>
        {desc ? <span className="block text-sm text-suave">{desc}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={valor}
        onClick={() => aoMudar(!valor)}
        className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${valor ? "bg-marca-700" : "bg-linha"}`}
      >
        <span className={`absolute top-1 size-7 rounded-full bg-white shadow transition-all ${valor ? "left-8" : "left-1"}`} />
        <span className="sr-only">{valor ? "Ligado" : "Desligado"}</span>
      </button>
    </div>
  );
}

export function EditarNome({ nome }: { nome: string }) {
  const [editando, setEditando] = useState(false);
  const [pendente, iniciar] = useTransition();
  if (!editando)
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xl font-bold">{nome}</p>
        <Botao variante="texto" onClick={() => setEditando(true)}>Editar</Botao>
      </div>
    );
  return (
    <form
      action={(fd) => iniciar(async () => { await salvarNome(fd); setEditando(false); })}
      className="flex flex-col gap-3"
    >
      <Campo id="nome" name="nome" rotulo="Nome completo" defaultValue={nome} required />
      <div className="flex gap-3">
        <Botao type="submit" carregando={pendente}>Salvar</Botao>
        <Botao type="button" variante="secundario" onClick={() => setEditando(false)}>Cancelar</Botao>
      </div>
    </form>
  );
}

export function Preferencias(props: { fonteGrande: boolean; notificacoes: boolean; parceiros: boolean }) {
  const [fonte, setFonte] = useState(props.fonteGrande);
  const [notif, setNotif] = useState(props.notificacoes);
  const [parc, setParc] = useState(props.parceiros);
  return (
    <Cartao>
      <h2 className="mb-2 text-lg font-bold">Preferências</h2>
      <div className="divide-y divide-linha">
        <Interruptor id="pref-fonte" rotulo="Letras maiores" desc="Aumenta o tamanho do texto no app"
          valor={fonte} aoMudar={(v) => { setFonte(v); document.documentElement.classList.toggle("fonte-grande", v); alternarFonteGrande(v); }} />
        <Interruptor id="pref-notif" rotulo="Avisos no celular" desc="Comunicados, encomendas e seus chamados"
          valor={notif} aoMudar={(v) => { setNotif(v); alterarConsentimento("notificacoes", v); }} />
        <Interruptor id="pref-parc" rotulo="Ofertas de parceiros" desc="Clube de vantagens e descontos (opcional)"
          valor={parc} aoMudar={(v) => { setParc(v); alterarConsentimento("ofertas_parceiros", v); }} />
      </div>
    </Cartao>
  );
}

export function ZonaLgpd() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function baixar() {
    iniciar(async () => {
      const r = await exportarDados();
      if ("erro" in r) return setErro(r.erro ?? null);
      const blob = new Blob([JSON.stringify(r.dados, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "meus-dados-ignez-andreazza.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  return (
    <Cartao className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Meus dados (LGPD)</h2>
      <p className="text-sm text-suave">Você pode baixar uma cópia de tudo que o app guarda sobre você, ou excluir sua conta.</p>
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      <Botao variante="secundario" onClick={baixar} carregando={pendente && !confirmando}>Baixar meus dados</Botao>
      {!confirmando ? (
        <Botao variante="texto" className="text-perigo!" onClick={() => setConfirmando(true)}>Excluir minha conta</Botao>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-perigo bg-perigo-50 p-4">
          <p className="font-bold text-perigo">Tem certeza? Isto não pode ser desfeito.</p>
          <p className="text-sm">Seu login e seus dados pessoais serão apagados. O que você publicou (chamados, votos) fica anônimo.</p>
          <Campo id="confirma-excluir" rotulo="Digite EXCLUIR para confirmar" value={texto}
            onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
          <Botao variante="perigo" carregando={pendente}
            onClick={() => iniciar(async () => {
              const r = await excluirConta(texto);
              if ("erro" in r && r.erro) return setErro(r.erro);
              router.replace("/entrar");
            })}>
            Excluir definitivamente
          </Botao>
          <Botao variante="secundario" onClick={() => { setConfirmando(false); setTexto(""); }}>Cancelar</Botao>
        </div>
      )}
    </Cartao>
  );
}
