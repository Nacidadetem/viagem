import { Marca } from "@/components/logo";

export function LayoutPublico({ children, titulo, subtitulo }: { children: React.ReactNode; titulo: string; subtitulo?: string }) {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-8 pt-seguro">
      <Marca />
      <header>
        <h1 className="text-3xl font-bold text-marca-900">{titulo}</h1>
        {subtitulo ? <p className="mt-2 text-lg text-suave">{subtitulo}</p> : null}
      </header>
      {children}
    </main>
  );
}
