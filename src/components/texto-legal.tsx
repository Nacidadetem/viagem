export function TextoLegal({ children }: { children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-4 text-base [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-marca-900 [&_li]:ml-5 [&_li]:list-disc">
      {children}
    </article>
  );
}
