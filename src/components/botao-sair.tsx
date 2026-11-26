export function BotaoSair({ className = "" }: { className?: string }) {
  return (
    <form action="/auth/sair" method="post" className={className}>
      <button type="submit" className="min-h-12 w-full rounded-xl px-5 text-base font-bold text-suave underline underline-offset-4">
        Sair da conta
      </button>
    </form>
  );
}
