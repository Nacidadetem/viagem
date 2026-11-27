import { AplicarFonteGrande } from "@/components/fonte-grande";
import { Logo } from "@/components/logo";
import { NavInferior } from "@/components/nav-inferior";
import { exigirAprovado } from "@/lib/sessao";
import Link from "next/link";
import { endereco } from "@/lib/formatar";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const s = await exigirAprovado();
  const p = s.perfil!;
  return (
    <div className="flex min-h-dvh flex-col">
      <AplicarFonteGrande ativo={p.fonte_grande} />
      <header className="sticky top-0 z-20 border-b border-linha bg-white/95 pt-seguro backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/inicio" aria-label="Início"><Logo tamanho={40} /></Link>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-base font-bold">{p.nome.split(" ")[0]}</p>
            <p className="truncate text-sm text-suave">
              {s.unidade ? endereco(s.unidade.bloco, s.unidade.predio, s.unidade.apartamento) : "Ignez Andreazza"}
            </p>
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28">
        {children}
      </main>
      <NavInferior ehAdmin={s.ehAdmin} />
    </div>
  );
}
