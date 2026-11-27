"use client";
import { useState, type ComponentProps } from "react";

/** Campo de senha com botão de olho para mostrar/ocultar o que foi digitado. */
export function CampoSenha({
  rotulo,
  ajuda,
  id,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { rotulo: string; ajuda?: string; id: string }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-bold">{rotulo}</label>
      {ajuda ? <p id={`${id}-ajuda`} className="text-sm text-suave">{ajuda}</p> : null}
      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          aria-describedby={ajuda ? `${id}-ajuda` : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-12 w-full rounded-xl border-2 border-linha bg-white py-3 pr-28 pl-4 text-lg outline-none focus:border-marca-600"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-pressed={visivel}
          aria-controls={id}
          className="absolute inset-y-1 right-1 flex items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-marca-800 hover:bg-marca-50"
        >
          {visivel ? <OlhoFechado /> : <Olho />}
          {visivel ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}

function Olho() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OlhoFechado() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}
