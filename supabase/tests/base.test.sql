\set ON_ERROR_STOP 1
-- Falha o teste se a condição for falsa
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok: %', msg;
end $$;

select pg_temp.ok((select (valor->>'apartamentos')::int from configuracoes where chave='estrutura') = 2464, 'estrutura 2464 configurada');
select pg_temp.ok(not exists (select 1 from unidades), 'sem apartamentos provisórios');
select pg_temp.ok(public.chave_ref('Bloco 05') = '5' and public.chave_ref('Prédio 03') = '3'
                  and public.chave_ref('apto 0102') = '102' and public.chave_ref('Ed. A') = 'A', 'normalização de endereço');

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001', 'sindico@x.com',
  '{"nome":"Sônia Síndica","bloco":"1","predio":"1","apartamento":"101","aceite_termos":true}'),
 ('00000000-0000-0000-0000-000000000002', 'maria@x.com',
  '{"nome":"Maria","bloco":"Bloco 5","predio":"Prédio 3","apartamento":"102","aceite_termos":true,"aceite_notificacoes":true}'),
 ('00000000-0000-0000-0000-000000000003', 'joao@x.com',
  '{"nome":"João","bloco":"5","predio":"3","apartamento":"102","aceite_termos":true,"tipo_vinculo":"dependente"}');
insert into auth.users (id, phone) values ('00000000-0000-0000-0000-000000000004', '+5581999990000');

select pg_temp.ok((select count(*) from perfis) = 3, 'perfis criados (SMS sem dados não cria)');
select pg_temp.ok((select predio_informado from perfis where email='maria@x.com') = 'Prédio 3', 'prédio informado guardado');
select pg_temp.ok((select count(*) from consentimentos where usuario_id='00000000-0000-0000-0000-000000000002') = 4, 'consentimentos');

update perfis set status='aprovado' where email='sindico@x.com';
insert into papeis_usuario values ('00000000-0000-0000-0000-000000000001','sindico'), ('00000000-0000-0000-0000-000000000001','morador');

-- ---------- anônimo ----------
set role anon;
select pg_temp.ok(public.unidade_existe('5','3','102') is null, 'sem lista oficial: existência desconhecida');
reset role;

-- ---------- Maria (pendente) ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select pg_temp.ok((select count(*) from perfis) = 1, 'Maria vê só o próprio perfil');
do $$ begin
  perform public.aprovar_cadastro('00000000-0000-0000-0000-000000000002', '5', '3', '102');
  raise exception 'FALHOU: Maria se aprovou';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok: auto-aprovação bloqueada';
end $$;
do $$ begin
  perform public.importar_unidades('[{"bloco":"9","predio":"9","apto":"999"}]');
  raise exception 'FALHOU: Maria importou lista';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok: importação bloqueada para morador';
end $$;

-- ---------- síndica: aprova sem lista oficial (cria o apartamento) ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select pg_temp.ok((select count(*) from public.fila_aprovacao()) = 2, 'fila com 2 pendentes');
select public.aprovar_cadastro('00000000-0000-0000-0000-000000000002', 'Bloco 5', 'Prédio 03', '102');
select public.aprovar_cadastro('00000000-0000-0000-0000-000000000003', '05', '3', 'apto 102');
select pg_temp.ok((select count(*) from unidades) = 1 and (select count(*) from predios) = 1 and (select count(*) from blocos) = 1,
                  'mesmo endereço escrito de formas diferentes = 1 apartamento');
select pg_temp.ok((select moradores_na_unidade from public.fila_aprovacao('aprovado') where email='joao@x.com') = 1,
                  'fila mostra quem já mora no apto');
select public.definir_endereco('00000000-0000-0000-0000-000000000001', '1', '1', '101');
select pg_temp.ok((select unidade_id is not null from perfis where email='sindico@x.com'), 'síndica com endereço definido');

-- ---------- importação da lista oficial ----------
select public.importar_unidades('[{"bloco":"5","predio":"3","apto":"102"},{"bloco":"5","predio":"3","apto":"201"},
                                  {"bloco":"1","predio":"1","apto":"101"},{"bloco":"23","predio":"8","apto":"404"},
                                  {"bloco":"","predio":"1","apto":"1"}]') ->> 'apartamentos_novos' as novos;
select pg_temp.ok((select count(*) from unidades) = 4, 'importação sem duplicar existentes');
select pg_temp.ok(public.unidade_existe('Bloco 23', '08', '404') and not public.unidade_existe('23', '8', '999'),
                  'com lista: existência conhecida');
do $$ begin
  perform public.definir_endereco('00000000-0000-0000-0000-000000000003', '99', '1', '101');
  raise exception 'FALHOU: aceitou endereço fora da lista';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok: %', sqlerrm;
end $$;
select pg_temp.ok((public.resumo_cadastros()->>'lista_oficial_importada')::boolean, 'resumo indica lista importada');
select public.definir_papeis('00000000-0000-0000-0000-000000000002', array['morador','prestador']::papel_usuario[]);

-- ---------- Maria exporta e exclui a conta ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select pg_temp.ok(public.exportar_meus_dados()->'unidade'->>'predio' = '3', 'exportação inclui prédio');
select pg_temp.ok(public.tem_papel('prestador'), 'Maria prestadora');
select public.excluir_minha_conta();
reset role;
select pg_temp.ok(not exists (select 1 from perfis where email like 'maria%'), 'conta excluída');
select 'TODOS OS TESTES PASSARAM' as resultado;
