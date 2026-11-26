"use client";

export function Abas<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
}: {
  opcoes: { valor: T; texto: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className="grid grid-flow-col gap-1 rounded-xl bg-linha/50 p-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={valor === o.valor}
          onClick={() => aoMudar(o.valor)}
          className={`min-h-12 rounded-lg px-3 text-base font-bold ${
            valor === o.valor ? "bg-white text-marca-800 shadow" : "text-suave"
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
