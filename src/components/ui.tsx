import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primario" | "secundario" | "perigo" | "texto";

const estilos: Record<Variante, string> = {
  primario: "bg-marca-700 text-white hover:bg-marca-800 active:bg-marca-900 disabled:bg-marca-700/50",
  secundario:
    "bg-white text-marca-800 border-2 border-marca-700 hover:bg-marca-50 disabled:opacity-50",
  perigo: "bg-perigo text-white hover:brightness-95 disabled:opacity-50",
  texto: "text-marca-800 underline underline-offset-4 hover:text-marca-900",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold transition-colors disabled:cursor-not-allowed";

export function Botao({
  variante = "primario",
  className = "",
  carregando,
  children,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; carregando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || carregando}
      aria-busy={carregando || undefined}
      className={`${base} ${estilos[variante]} ${className}`}
    >
      {carregando ? <Girando /> : null}
      {children}
    </button>
  );
}

export function BotaoLink({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link {...props} className={`${base} ${estilos[variante]} ${className}`} />;
}

function Girando() {
  return (
    <span
      aria-hidden
      className="size-5 animate-spin rounded-full border-[3px] border-current border-r-transparent"
    />
  );
}

export function Campo({
  rotulo,
  ajuda,
  erro,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { rotulo: string; ajuda?: string; erro?: string; id: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-base font-bold">
        {rotulo}
      </label>
      {ajuda ? (
        <p id={`${id}-ajuda`} className="text-sm text-suave">
          {ajuda}
        </p>
      ) : null}
      <input
        id={id}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        aria-invalid={erro ? true : undefined}
        className="min-h-12 w-full rounded-xl border-2 border-linha bg-white px-4 py-3 text-lg outline-none placeholder:text-suave/60 focus:border-marca-600 aria-invalid:border-perigo"
        {...props}
      />
      {erro ? <p className="text-sm font-bold text-perigo">{erro}</p> : null}
    </div>
  );
}

export function Aviso({
  tipo = "info",
  titulo,
  children,
}: {
  tipo?: "info" | "sucesso" | "erro" | "atencao";
  titulo?: string;
  children: ReactNode;
}) {
  const cores = {
    info: "bg-marca-50 border-marca-200 text-marca-900",
    sucesso: "bg-marca-100 border-marca-500 text-marca-900",
    erro: "bg-perigo-50 border-perigo text-perigo",
    atencao: "bg-sol-100 border-sol-500 text-sol-700",
  }[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-xl border-2 p-4 ${cores}`}>
      {titulo ? <p className="font-bold">{titulo}</p> : null}
      <div className="text-base">{children}</div>
    </div>
  );
}

export function Cartao({ className = "", ...props }: ComponentProps<"section">) {
  return (
    <section
      {...props}
      className={`rounded-2xl border border-linha bg-white p-5 shadow-sm ${className}`}
    />
  );
}

export function Selo({ children, cor = "verde" }: { children: ReactNode; cor?: "verde" | "sol" | "cinza" | "vermelho" }) {
  const c = {
    verde: "bg-marca-100 text-marca-800",
    sol: "bg-sol-100 text-sol-700",
    cinza: "bg-linha/60 text-suave",
    vermelho: "bg-perigo-50 text-perigo",
  }[cor];
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${c}`}>{children}</span>;
}
