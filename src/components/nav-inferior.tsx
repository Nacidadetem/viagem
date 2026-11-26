"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const itens = [
  { href: "/inicio", texto: "Início", icone: "🏠" },
  { href: "/perfil", texto: "Meu perfil", icone: "👤" },
];

export function NavInferior({ ehAdmin }: { ehAdmin: boolean }) {
  const caminho = usePathname();
  const lista = ehAdmin ? [...itens.slice(0, 1), { href: "/admin", texto: "Administração", icone: "🛠️" }, ...itens.slice(1)] : itens;
  return (
    <nav aria-label="Menu principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-white pb-seguro">
      <ul className="mx-auto grid max-w-3xl" style={{ gridTemplateColumns: `repeat(${lista.length}, 1fr)` }}>
        {lista.map((i) => {
          const ativo = caminho === i.href || caminho.startsWith(i.href + "/");
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-bold ${ativo ? "text-marca-800" : "text-suave"}`}
              >
                <span aria-hidden className="text-2xl leading-none">{i.icone}</span>
                {i.texto}
                {ativo ? <span aria-hidden className="mt-0.5 h-1 w-8 rounded-full bg-marca-700" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
