# App do Condomínio Ignez Andreazza

Aplicativo web instalável (PWA) para os moradores do Condomínio Ignez Andreazza — Areias, Recife (PE).
2.464 apartamentos, ~7 mil usuários.

**Stack:** Next.js 15 (App Router) + React 19 + Tailwind 4 · Supabase (Postgres, Auth por e-mail e SMS, RLS).

## Status das etapas

- [x] **Etapa 1 — Banco de dados e login com aprovação** ← aguardando validação
- [ ] Melhorias e manutenção · Comunicados · Ocorrências · Reservas · Vitrine · Mural · Portaria digital ·
      Assistente IA · Pontos · Consumo de água e gás · Rede de apoio · Clube iGreen

Telas da etapa 1: [`docs/telas/`](docs/telas) · Modelo de dados: [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md)

## Rodar localmente

Requisitos: Node 20+, Docker.

```bash
npm install
npx supabase start          # sobe Postgres + Auth locais e aplica migrações + seed
cp .env.example .env.local  # cole a URL e a ANON_KEY mostradas pelo comando acima
npm run dev                 # http://localhost:3000
```

Localmente, os celulares de teste `(81) 99999-0001` e `(81) 99999-0002` recebem sempre o código `123456`
(ver `supabase/config.toml`).

Testes:
```bash
npm run db:test   # migrações + regras de segurança num Postgres comum
npm run e2e       # fluxo completo no navegador (precisa de supabase start + npm run build && npm start)
```

## Colocar em produção

1. Crie o projeto no Supabase (região São Paulo) e rode `npx supabase link` + `npx supabase db push`.
2. **Ajuste a numeração real** dos blocos/apartamentos em `supabase/seed.sql` (hoje é provisória) e rode no SQL Editor.
3. Auth > Providers: ative **Phone** com um provedor de SMS (Twilio, Zenvia via Twilio Verify etc.)
   e **Email** com confirmação ligada. Configure Site URL e Redirect URL `https://SEU-DOMINIO/auth/callback`.
4. Publique o Next.js (Vercel ou similar) com as variáveis de `.env.example`.
5. O(a) síndico(a) se cadastra pelo app e é liberado(a) uma única vez pelo SQL indicado em `supabase/seed.sql`.
   A partir daí, todas as aprovações são feitas pelo próprio app.
