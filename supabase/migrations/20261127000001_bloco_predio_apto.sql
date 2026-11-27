-- =====================================================================
-- Condomínio Ignez Andreazza — estrutura real: Bloco → Prédio → Apartamento
-- 23 blocos, 176 prédios, 2.464 apartamentos.
--
-- Enquanto a lista oficial de apartamentos não for importada, a
-- administração confirma o endereço na aprovação e o apartamento é
-- cadastrado nesse momento. Depois de importada a lista (tela
-- Administração > Estrutura), só valem os apartamentos da lista.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configurações gerais do condomínio
-- ---------------------------------------------------------------------
create table public.configuracoes (
  chave      text primary key,
  valor      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.configuracoes (chave, valor) values
  ('estrutura', '{"blocos": 23, "predios": 176, "apartamentos": 2464}'),
  ('lista_oficial_importada', 'false');

alter table public.configuracoes enable row level security;
create policy configuracoes_leitura on public.configuracoes for select to authenticated using (true);
create policy configuracoes_admin   on public.configuracoes for all    to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- Remove a numeração provisória (gerada por fórmula, não é a real)
-- ---------------------------------------------------------------------
update public.perfis set unidade_id = null where unidade_id is not null;
delete from public.unidades;
delete from public.blocos;
drop function if exists public.gerar_unidades(int, int, int, int);
drop function if exists public.unidade_existe(text, text);
drop function if exists public.buscar_unidade(text, text);
drop function if exists public.aprovar_cadastro(uuid, integer);
drop function if exists public.completar_cadastro(text, text, text, public.tipo_vinculo, boolean, boolean, boolean, text);
drop function if exists public.fila_aprovacao(public.status_cadastro);

-- ---------------------------------------------------------------------
-- Prédios e novo vínculo dos apartamentos
-- ---------------------------------------------------------------------
create table public.predios (
  id         integer generated always as identity primary key,
  bloco_id   smallint not null references public.blocos(id) on delete restrict,
  nome       text not null,
  -- posição no mapa do condomínio (0–100%), usada pelos chamados
  mapa_x     numeric(5,2),
  mapa_y     numeric(5,2),
  created_at timestamptz not null default now(),
  unique (bloco_id, nome)
);
create index predios_bloco_idx on public.predios (bloco_id);

alter table public.unidades drop column bloco_id;
alter table public.unidades add column predio_id integer not null references public.predios(id) on delete restrict;
alter table public.unidades add constraint unidades_predio_numero_key unique (predio_id, numero);
create index unidades_predio_idx on public.unidades (predio_id);

alter table public.perfis add column predio_informado text;

alter table public.predios enable row level security;
create policy predios_leitura on public.predios for select to authenticated using (true);
create policy predios_admin   on public.predios for all    to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- Comparação de endereços: "Bloco 05" = "5", "Prédio 03" = "3", "Apto 0102" = "102"
-- ---------------------------------------------------------------------
create or replace function public.normalizar_ref(txt text)
returns text language sql immutable as $$
  select upper(regexp_replace(trim(coalesce(txt, '')),
    '^(bloco|bl\.?|pr[eé]dio|pr\.?|edif[ií]cio|ed\.?|apartamento|apto?\.?)\s*', '', 'i'))
$$;

create or replace function public.chave_ref(txt text)
returns text language sql immutable as $$
  select nullif(regexp_replace(public.normalizar_ref(txt), '^0+(?=.)', ''), '')
$$;

create or replace function public.buscar_unidade(p_bloco text, p_predio text, p_numero text)
returns integer
language sql stable security definer set search_path = public as $$
  select u.id
  from unidades u
  join predios p on p.id = u.predio_id
  join blocos b on b.id = p.bloco_id
  where u.ativa
    and public.chave_ref(b.nome) = public.chave_ref(p_bloco)
    and public.chave_ref(p.nome) = public.chave_ref(p_predio)
    and public.chave_ref(u.numero) = public.chave_ref(p_numero)
  limit 1
$$;

-- Usado no cadastro (antes do login). Devolve null enquanto a lista
-- oficial não foi importada (não dá para saber se o endereço existe).
create or replace function public.unidade_existe(p_bloco text, p_predio text, p_numero text)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not coalesce((select (valor)::text::boolean from configuracoes where chave = 'lista_oficial_importada'), false)
      then null
    else public.buscar_unidade(p_bloco, p_predio, p_numero) is not null
  end
$$;

-- Encontra o apartamento; se a lista oficial ainda não foi importada,
-- cadastra bloco/prédio/apartamento confirmados pela administração.
create or replace function public.garantir_unidade(p_bloco text, p_predio text, p_numero text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_unidade integer; v_bloco smallint; v_predio integer;
  -- grava sempre no formato canônico: "Bloco 05" → "5"
  b text := coalesce(public.chave_ref(p_bloco), '');
  p text := coalesce(public.chave_ref(p_predio), '');
  n text := coalesce(public.chave_ref(p_numero), '');
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  if b = '' or p = '' or n = '' then
    raise exception 'Informe bloco, prédio e apartamento';
  end if;

  v_unidade := public.buscar_unidade(b, p, n);
  if v_unidade is not null then return v_unidade; end if;

  if coalesce((select (valor)::text::boolean from configuracoes where chave = 'lista_oficial_importada'), false) then
    raise exception 'Bloco %, prédio %, apto % não está na lista oficial de apartamentos', b, p, n;
  end if;

  select id into v_bloco from blocos where public.chave_ref(nome) = public.chave_ref(b);
  if v_bloco is null then
    insert into blocos (nome) values (b) returning id into v_bloco;
  end if;
  select id into v_predio from predios where bloco_id = v_bloco and public.chave_ref(nome) = public.chave_ref(p);
  if v_predio is null then
    insert into predios (bloco_id, nome) values (v_bloco, p) returning id into v_predio;
  end if;
  insert into unidades (predio_id, numero) values (v_predio, n) returning id into v_unidade;
  return v_unidade;
end $$;

-- ---------------------------------------------------------------------
-- Cadastro: gatilho e "completar cadastro" passam a ter o prédio
-- ---------------------------------------------------------------------
create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_versao text := coalesce(m->>'versao_termos', '1.0');
begin
  if m->>'nome' is null or m->>'bloco' is null or m->>'apartamento' is null then
    return new;
  end if;

  insert into perfis (id, nome, email, telefone, bloco_informado, predio_informado, apto_informado,
                      unidade_id, tipo_vinculo)
  values (
    new.id,
    left(trim(m->>'nome'), 120),
    new.email,
    coalesce(new.phone, m->>'telefone'),
    trim(m->>'bloco'),
    nullif(trim(m->>'predio'), ''),
    trim(m->>'apartamento'),
    public.buscar_unidade(m->>'bloco', m->>'predio', m->>'apartamento'),
    coalesce(nullif(m->>'tipo_vinculo', '')::public.tipo_vinculo, 'titular')
  );

  if coalesce((m->>'aceite_termos')::boolean, false) then
    insert into consentimentos (usuario_id, finalidade, versao, aceito) values
      (new.id, 'termos_uso', v_versao, true),
      (new.id, 'politica_privacidade', v_versao, true);
  end if;
  insert into consentimentos (usuario_id, finalidade, versao, aceito) values
    (new.id, 'notificacoes', v_versao, coalesce((m->>'aceite_notificacoes')::boolean, false)),
    (new.id, 'ofertas_parceiros', v_versao, coalesce((m->>'aceite_parceiros')::boolean, false));
  return new;
end $$;

create or replace function public.completar_cadastro(
  p_nome text, p_bloco text, p_predio text, p_apartamento text, p_tipo public.tipo_vinculo,
  p_aceite_termos boolean, p_aceite_notificacoes boolean, p_aceite_parceiros boolean,
  p_versao text default '1.0'
) returns void
language plpgsql security definer set search_path = public as $$
declare u auth.users;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if not p_aceite_termos then raise exception 'É preciso aceitar os termos de uso e a política de privacidade'; end if;
  select * into u from auth.users where id = auth.uid();

  insert into perfis (id, nome, email, telefone, bloco_informado, predio_informado, apto_informado,
                      unidade_id, tipo_vinculo)
  values (u.id, left(trim(p_nome), 120), u.email, u.phone, trim(p_bloco), trim(p_predio), trim(p_apartamento),
          public.buscar_unidade(p_bloco, p_predio, p_apartamento), p_tipo)
  on conflict (id) do update
    set nome = excluded.nome, bloco_informado = excluded.bloco_informado,
        predio_informado = excluded.predio_informado,
        apto_informado = excluded.apto_informado, unidade_id = excluded.unidade_id,
        tipo_vinculo = excluded.tipo_vinculo, status = 'pendente', motivo_status = null
    where perfis.status in ('pendente', 'rejeitado');

  insert into consentimentos (usuario_id, finalidade, versao, aceito) values
    (u.id, 'termos_uso', p_versao, true),
    (u.id, 'politica_privacidade', p_versao, true),
    (u.id, 'notificacoes', p_versao, p_aceite_notificacoes),
    (u.id, 'ofertas_parceiros', p_versao, p_aceite_parceiros);
end $$;

-- ---------------------------------------------------------------------
-- Aprovação e correção de endereço pela administração
-- ---------------------------------------------------------------------
create or replace function public.aprovar_cadastro(p_usuario uuid, p_bloco text, p_predio text, p_apto text)
returns void language plpgsql security definer set search_path = public as $$
declare v_unidade integer;
begin
  if not public.eh_admin() then raise exception 'Apenas a administração pode aprovar cadastros'; end if;
  v_unidade := public.garantir_unidade(p_bloco, p_predio, p_apto);

  update perfis
     set status = 'aprovado', unidade_id = v_unidade, motivo_status = null,
         analisado_por = auth.uid(), analisado_em = now()
   where id = p_usuario;
  if not found then raise exception 'Cadastro não encontrado'; end if;

  insert into papeis_usuario (usuario_id, papel, concedido_por)
  values (p_usuario, 'morador', auth.uid())
  on conflict do nothing;

  insert into auditoria (ator_id, acao, alvo_id, detalhes)
  values (auth.uid(), 'cadastro_aprovado', p_usuario, jsonb_build_object('unidade_id', v_unidade));
end $$;

create or replace function public.definir_endereco(p_usuario uuid, p_bloco text, p_predio text, p_apto text)
returns void language plpgsql security definer set search_path = public as $$
declare v_unidade integer;
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  v_unidade := public.garantir_unidade(p_bloco, p_predio, p_apto);
  update perfis
     set unidade_id = v_unidade,
         bloco_informado = public.chave_ref(p_bloco),
         predio_informado = public.chave_ref(p_predio),
         apto_informado = public.chave_ref(p_apto)
   where id = p_usuario;
  if not found then raise exception 'Usuário não encontrado'; end if;
  insert into auditoria (ator_id, acao, alvo_id, detalhes)
  values (auth.uid(), 'endereco_alterado', p_usuario, jsonb_build_object('unidade_id', v_unidade));
end $$;

-- ---------------------------------------------------------------------
-- Importação da lista oficial: [{"bloco":"5","predio":"3","apto":"102"}, ...]
-- ---------------------------------------------------------------------
create or replace function public.importar_unidades(p_linhas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb; b text; p text; n text;
  v_bloco smallint; v_predio integer;
  novos int := 0; ignoradas int := 0; vinculados int;
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) = 0 then
    raise exception 'Nenhuma linha para importar';
  end if;
  if jsonb_array_length(p_linhas) > 5000 then raise exception 'Máximo de 5.000 linhas por vez'; end if;

  for r in select * from jsonb_array_elements(p_linhas) loop
    b := coalesce(public.chave_ref(r->>'bloco'), '');
    p := coalesce(public.chave_ref(r->>'predio'), '');
    n := coalesce(public.chave_ref(r->>'apto'), '');
    if b = '' or p = '' or n = '' then ignoradas := ignoradas + 1; continue; end if;

    select id into v_bloco from blocos where public.chave_ref(nome) = public.chave_ref(b);
    if v_bloco is null then insert into blocos (nome) values (b) returning id into v_bloco; end if;
    select id into v_predio from predios where bloco_id = v_bloco and public.chave_ref(nome) = public.chave_ref(p);
    if v_predio is null then insert into predios (bloco_id, nome) values (v_bloco, p) returning id into v_predio; end if;
    if not exists (select 1 from unidades where predio_id = v_predio and public.chave_ref(numero) = public.chave_ref(n)) then
      insert into unidades (predio_id, numero) values (v_predio, n);
      novos := novos + 1;
    end if;
  end loop;

  update configuracoes set valor = 'true', updated_at = now() where chave = 'lista_oficial_importada';

  -- vincula cadastros que ainda estavam sem apartamento
  update perfis set unidade_id = public.buscar_unidade(bloco_informado, predio_informado, apto_informado)
   where unidade_id is null and predio_informado is not null
     and public.buscar_unidade(bloco_informado, predio_informado, apto_informado) is not null;
  get diagnostics vinculados = row_count;

  insert into auditoria (ator_id, acao, detalhes)
  values (auth.uid(), 'lista_unidades_importada', jsonb_build_object('novos', novos, 'ignoradas', ignoradas));

  return jsonb_build_object(
    'apartamentos_novos', novos, 'linhas_ignoradas', ignoradas, 'cadastros_vinculados', vinculados,
    'blocos', (select count(*) from blocos), 'predios', (select count(*) from predios),
    'apartamentos', (select count(*) from unidades));
end $$;

-- ---------------------------------------------------------------------
-- Fila de aprovação, resumo e exportação com o prédio
-- ---------------------------------------------------------------------
create or replace function public.fila_aprovacao(p_status public.status_cadastro default 'pendente')
returns table (
  id uuid, nome text, email text, telefone text, tipo_vinculo public.tipo_vinculo,
  bloco_informado text, predio_informado text, apto_informado text,
  unidade_id integer, bloco text, predio text, apartamento text,
  moradores_na_unidade bigint, titular_existente text,
  status public.status_cadastro, motivo_status text, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  return query
  select p.id, p.nome, p.email, p.telefone, p.tipo_vinculo,
         p.bloco_informado, p.predio_informado, p.apto_informado,
         p.unidade_id, b.nome, pr.nome, u.numero,
         (select count(*) from perfis o where o.unidade_id = p.unidade_id and o.status = 'aprovado' and o.id <> p.id),
         (select o.nome from perfis o where o.unidade_id = p.unidade_id and o.status = 'aprovado'
              and o.tipo_vinculo = 'titular' and o.id <> p.id limit 1),
         p.status, p.motivo_status, p.created_at
  from perfis p
  left join unidades u on u.id = p.unidade_id
  left join predios pr on pr.id = u.predio_id
  left join blocos b on b.id = pr.bloco_id
  where p.status = p_status
  order by p.created_at
  limit 500;
end $$;

create or replace function public.resumo_cadastros()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e jsonb := (select valor from configuracoes where chave = 'estrutura');
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  return (select jsonb_build_object(
    'pendentes',  count(*) filter (where status = 'pendente'),
    'aprovados',  count(*) filter (where status = 'aprovado'),
    'rejeitados', count(*) filter (where status = 'rejeitado'),
    'suspensos',  count(*) filter (where status = 'suspenso'),
    'unidades_com_morador', (select count(distinct unidade_id) from perfis where status = 'aprovado'),
    'total_unidades', coalesce((e->>'apartamentos')::int, 2464),
    'total_blocos', coalesce((e->>'blocos')::int, 23),
    'total_predios', coalesce((e->>'predios')::int, 176),
    'cadastrados_blocos', (select count(*) from blocos),
    'cadastrados_predios', (select count(*) from predios),
    'cadastrados_unidades', (select count(*) from unidades),
    'lista_oficial_importada', coalesce((select (valor)::text::boolean from configuracoes where chave = 'lista_oficial_importada'), false)
  ) from perfis);
end $$;

create or replace function public.exportar_meus_dados()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gerado_em', now(),
    'perfil', (select to_jsonb(p) - 'analisado_por' from perfis p where p.id = auth.uid()),
    'unidade', (select jsonb_build_object('bloco', b.nome, 'predio', pr.nome, 'apartamento', u.numero)
                  from perfis p join unidades u on u.id = p.unidade_id
                  join predios pr on pr.id = u.predio_id join blocos b on b.id = pr.bloco_id
                 where p.id = auth.uid()),
    'papeis', (select coalesce(jsonb_agg(papel), '[]'::jsonb) from papeis_usuario where usuario_id = auth.uid()),
    'consentimentos', (select coalesce(jsonb_agg(jsonb_build_object(
                          'finalidade', finalidade, 'versao', versao, 'aceito', aceito, 'data', created_at)
                          order by created_at), '[]'::jsonb)
                       from consentimentos where usuario_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------------
-- Permissões de execução (funções novas nascem executáveis por todos)
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.unidade_existe(text, text, text) to anon, authenticated;
grant execute on function public.normalizar_ref(text), public.chave_ref(text) to anon, authenticated;
grant execute on function
  public.tem_papel(public.papel_usuario), public.eh_admin(), public.eh_equipe(), public.eh_aprovado(),
  public.minha_unidade(), public.buscar_unidade(text, text, text),
  public.completar_cadastro(text, text, text, text, public.tipo_vinculo, boolean, boolean, boolean, text),
  public.registrar_consentimento(text, boolean, text),
  public.aprovar_cadastro(uuid, text, text, text), public.rejeitar_cadastro(uuid, text),
  public.definir_endereco(uuid, text, text, text), public.importar_unidades(jsonb),
  public.suspender_usuario(uuid, text), public.reativar_usuario(uuid),
  public.definir_papeis(uuid, public.papel_usuario[]),
  public.exportar_meus_dados(), public.excluir_minha_conta(),
  public.fila_aprovacao(public.status_cadastro), public.resumo_cadastros()
to authenticated;
revoke execute on function public.garantir_unidade(text, text, text) from authenticated;
