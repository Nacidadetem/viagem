# Ligar o banco de dados (Supabase) ao site publicado

O site já está no ar em **https://condominioignezandreazza.vercel.app** e é publicado sozinho a cada
atualização do branch `master`. Falta só o banco. São 5 passos pelo navegador, sem copiar nenhuma chave:

1. **Criar o projeto** — em supabase.com/dashboard → *New project*.
   Nome: `ignez-andreazza` · Região: **South America (São Paulo)** · crie uma senha forte e guarde-a.
2. **Criar as tabelas** — no projeto, menu *SQL Editor* → *New query*. Abra o arquivo
   [`instalar-banco.sql`](../instalar-banco.sql), copie tudo, cole e clique em **Run**.
   No fim deve aparecer `2464` (apartamentos criados).
3. **Endereços de login** — *Authentication* → *URL Configuration*:
   - Site URL: `https://condominioignezandreazza.vercel.app`
   - Redirect URLs: `https://condominioignezandreazza.vercel.app/auth/callback`
4. **Ligar à Vercel** — *Project Settings* → *Integrations* → **Vercel** → *Connect project* →
   escolha `condominioignezandreazza`. As variáveis `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` passam a ficar guardadas na Vercel automaticamente.
   Depois, na Vercel: *Deployments* → último deploy → **Redeploy**.
5. **Liberar o(a) síndico(a)** — faça o cadastro pelo app com e-mail e senha e rode no *SQL Editor*
   o trecho comentado no fim de [`supabase/seed.sql`](../supabase/seed.sql), trocando o e-mail.
   A partir daí todas as aprovações são feitas dentro do app.

**Login por SMS:** precisa de um provedor de SMS (ex.: Twilio) em *Authentication* → *Providers* → *Phone*.
Até lá, os moradores usam e-mail e senha.
