-- =====================================================================
-- Dados iniciais
-- ATENÇÃO: a distribuição abaixo (154 blocos × 4 andares × 4 aptos =
-- 2.464 unidades, numeradas 101–404) é provisória. Ajuste para a
-- numeração real do condomínio antes de abrir os cadastros.
-- =====================================================================
select public.gerar_unidades(154, 4, 4, 2);

-- Depois que o(a) síndico(a) fizer o próprio cadastro pelo aplicativo,
-- rode no SQL Editor do Supabase (trocando o e-mail) para liberá-lo:
--
-- with u as (select id from auth.users where email = 'sindico@exemplo.com')
-- update public.perfis set status = 'aprovado',
--        unidade_id = coalesce(unidade_id, public.buscar_unidade(bloco_informado, apto_informado))
--  where id = (select id from u);
-- insert into public.papeis_usuario (usuario_id, papel)
-- select id, p from auth.users, unnest(array['morador','sindico']::public.papel_usuario[]) p
--  where email = 'sindico@exemplo.com' on conflict do nothing;
