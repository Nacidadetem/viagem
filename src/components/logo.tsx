export function Logo({ tamanho = 48 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden focusable="false">
      <rect width="64" height="64" rx="16" fill="#0f663b" />
      <path d="M12 30 32 14l20 16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="19" y="30" width="10" height="20" rx="2" fill="#fff" />
      <rect x="35" y="30" width="10" height="20" rx="2" fill="#fff" />
      <circle cx="48" cy="16" r="6" fill="#f08a1c" />
    </svg>
  );
}

export function Marca() {
  return (
    <div className="flex items-center gap-3">
      <Logo tamanho={44} />
      <div className="leading-tight">
        <p className="text-lg font-bold text-marca-900">Ignez Andreazza</p>
        <p className="text-sm text-suave">Condomínio · Areias, Recife</p>
      </div>
    </div>
  );
}
