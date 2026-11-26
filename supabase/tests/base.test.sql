\set ON_ERROR_STOP 1
-- Cenário: síndico, morador pendente, morador mal informado
select public.gerar_unidades(3, 4, 4, 2) as unidades_criadas;

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001', 'sindico@x.com',
  '{"nome":"Sônia Síndica","bloco":"01","apartamento":"101","aceite_termos":true}'),
 ('00000000-0000-0000-0000-000000000002', 'maria@x.com',
  '{"nome":"Maria","bloco":"Bloco 2","apartamento":"203","aceite_termos":true,"aceite_notificacoes":true}'),
 ('00000000-0000-0000-0000-000000000003', 'joao@x.com',
  '{"nome":"João","bloco":"99","apartamento":"101","aceite_termos":true,"tipo_vinculo":"dependente"}');
insert into auth.users (id, phone) values ('00000000-0000-0000-0000-000000000004', '+5581999990000');

-- usuário 4 (SMS sem cadastro) não ganha perfil; usuário 2 foi casado com a unidade 02/203
select (select count(*) from perfis) = 3 as tres_perfis,
       (select unidade_id is not null from perfis where email='maria@x.com') as maria_casou_unidade,
       (select unidade_id is null from perfis where email='joao@x.com') as joao_sem_unidade,
       (select count(*) from consentimentos where usuario_id='00000000-0000-0000-0000-000000000002') = 4 as consent_ok;

-- promove o síndico (como faria o seed manual)
update perfis set status='aprovado', unidade_id=public.buscar_unidade('01','101') where email='sindico@x.com';
insert into papeis_usuario values ('00000000-0000-0000-0000-000000000001','sindico'), ('00000000-0000-0000-0000-000000000001','morador');

-- ---------- como Maria (pendente) ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select count(*) = 1 as maria_ve_so_o_proprio_perfil from perfis;
select public.eh_admin() = false as maria_nao_admin;
do $$ begin
  perform public.aprovar_cadastro('00000000-0000-0000-0000-000000000002', 1);
  raise exception 'FALHOU: Maria se aprovou';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok: bloqueado (%).', sqlerrm;
end $$;
do $$ begin
  update perfis set status='aprovado' where id = auth.uid();
  raise exception 'FALHOU: Maria mudou o status';
exception when insufficient_privilege then raise notice 'ok: status protegido';
end $$;
update perfis set nome = 'Maria das Graças' where id = auth.uid();
select jsonb_typeof(public.exportar_meus_dados()->'consentimentos') = 'array' as exporta_dados;

-- ---------- como síndico ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select count(*) = 2 as fila_tem_2 from public.fila_aprovacao();
select public.aprovar_cadastro('00000000-0000-0000-0000-000000000002',
        (select unidade_id from public.fila_aprovacao() where email='maria@x.com'));
select public.rejeitar_cadastro('00000000-0000-0000-0000-000000000003', 'Bloco 99 não existe. Confira e cadastre de novo.');
select public.definir_papeis('00000000-0000-0000-0000-000000000002', array['morador','prestador']::papel_usuario[]);
select public.resumo_cadastros();
do $$ begin
  perform public.definir_papeis('00000000-0000-0000-0000-000000000001', array['morador']::papel_usuario[]);
  raise exception 'FALHOU: síndico removeu o próprio acesso';
exception when others then
  if sqlerrm like 'FALHOU%' then raise; end if;
  raise notice 'ok: %', sqlerrm;
end $$;

-- ---------- João corrige o cadastro ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select public.completar_cadastro('João', '03', '101', 'dependente', true, false, false);
select status = 'pendente' and unidade_id is not null as joao_reenviado from perfis where id = auth.uid();

-- ---------- Maria aprovada vê papéis e exclui a conta ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select public.eh_aprovado() and public.tem_papel('prestador') as maria_aprovada_prestadora;
select public.excluir_minha_conta();
reset role;
select not exists (select 1 from perfis where email like 'maria%') as maria_apagada,
       (select count(*) from auditoria where acao = 'conta_excluida_pelo_titular') = 1 as auditoria_ok;
select 'TODOS OS TESTES PASSARAM' as resultado;
