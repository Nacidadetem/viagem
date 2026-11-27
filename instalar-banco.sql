-- Instalação completa do banco do app Ignez Andreazza (projeto NOVO, vazio).
-- Cole tudo no SQL Editor do Supabase e clique em Run.

-- =====================================================================
-- Condomínio Ignez Andreazza — Etapa 1: núcleo do banco de dados
-- Blocos, apartamentos, perfis, papéis, aprovação de cadastro,
-- consentimentos (LGPD), exportação e exclusão de conta, auditoria.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum (
  'morador',        -- titular ou dependente aprovado
  'prestador',      -- morador que oferece serviços na vitrine
  'zelador',        -- zeladoria
  'manutencao',     -- equipe de manutenção
  'portaria',       -- porteiros (portaria digital)
  'administracao',  -- administração / conselho
  'sindico'         -- síndico(a)
);

create type public.status_cadastro as enum ('pendente', 'aprovado', 'rejeitado', 'suspenso');
create type public.tipo_vinculo as enum ('titular', 'dependente');

-- ---------------------------------------------------------------------
-- Estrutura física do condomínio
-- ---------------------------------------------------------------------
create table public.blocos (
  id         smallint generated always as identity primary key,
  nome       text not null unique,          -- ex.: "01", "A", "Bloco 12"
  ordem      smallint not null default 0,
  -- posição aproximada no mapa do condomínio (0–100%), usada pelo mapa de chamados
  mapa_x     numeric(5,2),
  mapa_y     numeric(5,2),
  created_at timestamptz not null default now()
);

create table public.unidades (
  id         integer generated always as identity primary key,
  bloco_id   smallint not null references public.blocos(id) on delete restrict,
  numero     text not null,                 -- ex.: "101"
  andar      smallint,
  ativa      boolean not null default true,
  created_at timestamptz not null default now(),
  unique (bloco_id, numero)
);
create index unidades_bloco_idx on public.unidades (bloco_id);

-- Normaliza o texto digitado pelo morador ("bloco 07" → "07", " 101 " → "101")
create or replace function public.normalizar_ref(txt text)
returns text language sql immutable as $$
  select upper(regexp_replace(trim(coalesce(txt, '')), '^(bloco|bl\.?|apto?\.?|apartamento)\s*', '', 'i'))
$$;

create or replace function public.buscar_unidade(p_bloco text, p_numero text)
returns integer
language sql stable security definer set search_path = public as $$
  select u.id
  from unidades u
  join blocos b on b.id = u.bloco_id
  where u.ativa
    and (public.normalizar_ref(b.nome) = public.normalizar_ref(p_bloco)
         or ltrim(public.normalizar_ref(b.nome), '0') = ltrim(public.normalizar_ref(p_bloco), '0'))
    and public.normalizar_ref(u.numero) = public.normalizar_ref(p_numero)
  limit 1
$$;

-- Usado no formulário de cadastro (antes do login) para avisar se o
-- bloco/apartamento não existe. Não revela nenhum dado pessoal.
create or replace function public.unidade_existe(p_bloco text, p_numero text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.buscar_unidade(p_bloco, p_numero) is not null
$$;

-- Gera os apartamentos de forma padronizada: andar*100 + posição (101, 102 … 404)
create or replace function public.gerar_unidades(
  p_qtd_blocos int, p_andares int, p_aptos_por_andar int, p_digitos_bloco int default 2
) returns int
language plpgsql as $$
declare
  b int; a int; p int; v_bloco smallint; total int := 0;
begin
  for b in 1..p_qtd_blocos loop
    insert into public.blocos (nome, ordem)
    -- greatest(): lpad corta textos maiores ("100" com 2 dígitos viraria "10")
    values (lpad(b::text, greatest(p_digitos_bloco, length(b::text)), '0'), b)
    on conflict (nome) do update set ordem = excluded.ordem
    returning id into v_bloco;
    for a in 1..p_andares loop
      for p in 1..p_aptos_por_andar loop
        insert into public.unidades (bloco_id, numero, andar)
        values (v_bloco, (a * 100 + p)::text, a)
        on conflict (bloco_id, numero) do nothing;
        if found then total := total + 1; end if;
      end loop;
    end loop;
  end loop;
  return total;
end $$;

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users). Dados mínimos: nada de CPF, RG ou
-- data de nascimento — só o necessário para identificar o morador.
-- ---------------------------------------------------------------------
create table public.perfis (
  id               uuid primary key references auth.users(id) on delete cascade,
  nome             text not null check (char_length(nome) between 2 and 120),
  email            text,
  telefone         text,
  -- o que a pessoa digitou no cadastro (a administração confere)
  bloco_informado  text not null,
  apto_informado   text not null,
  unidade_id       integer references public.unidades(id) on delete set null,
  tipo_vinculo     public.tipo_vinculo not null default 'titular',
  status           public.status_cadastro not null default 'pendente',
  motivo_status    text,                    -- motivo de rejeição/suspensão
  analisado_por    uuid references auth.users(id) on delete set null,
  analisado_em     timestamptz,
  -- acessibilidade: preferência por letras maiores
  fonte_grande     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index perfis_status_idx  on public.perfis (status);
create index perfis_unidade_idx on public.perfis (unidade_id);
create index perfis_nome_idx    on public.perfis using gin (to_tsvector('portuguese', nome));

create table public.papeis_usuario (
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  papel         public.papel_usuario not null,
  concedido_por uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  primary key (usuario_id, papel)
);

-- Registro de consentimentos (LGPD art. 8º): cada aceite fica guardado
create table public.consentimentos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  finalidade  text not null check (finalidade in
                ('termos_uso', 'politica_privacidade', 'notificacoes', 'ofertas_parceiros')),
  versao      text not null,
  aceito      boolean not null,
  created_at  timestamptz not null default now()
);
create index consentimentos_usuario_idx on public.consentimentos (usuario_id, finalidade, created_at desc);

-- Auditoria das ações administrativas. Guarda o mínimo; quando a conta
-- de alguém é excluída, o vínculo vira nulo e os detalhes são apagados.
create table public.auditoria (
  id          bigint generated always as identity primary key,
  ator_id     uuid references auth.users(id) on delete set null,
  acao        text not null,
  alvo_id     uuid references auth.users(id) on delete set null,
  detalhes    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index auditoria_created_idx on public.auditoria (created_at desc);

-- ---------------------------------------------------------------------
-- Funções auxiliares de permissão (usadas nas políticas RLS)
-- ---------------------------------------------------------------------
create or replace function public.tem_papel(p public.papel_usuario)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from papeis_usuario pu
    join perfis pf on pf.id = pu.usuario_id
    where pu.usuario_id = auth.uid() and pu.papel = p and pf.status = 'aprovado'
  )
$$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from papeis_usuario pu
    join perfis pf on pf.id = pu.usuario_id
    where pu.usuario_id = auth.uid()
      and pu.papel in ('administracao', 'sindico')
      and pf.status = 'aprovado'
  )
$$;

create or replace function public.eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from papeis_usuario pu
    join perfis pf on pf.id = pu.usuario_id
    where pu.usuario_id = auth.uid()
      and pu.papel in ('administracao', 'sindico', 'zelador', 'manutencao', 'portaria')
      and pf.status = 'aprovado'
  )
$$;

create or replace function public.eh_aprovado()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and status = 'aprovado')
$$;

create or replace function public.minha_unidade()
returns integer language sql stable security definer set search_path = public as $$
  select unidade_id from perfis where id = auth.uid() and status = 'aprovado'
$$;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger perfis_updated_at before update on public.perfis
for each row execute function public.tocar_updated_at();

-- Cria o perfil automaticamente quando alguém se cadastra (e-mail ou SMS).
-- Os dados vêm de options.data no signUp / signInWithOtp.
create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_versao text := coalesce(m->>'versao_termos', '1.0');
begin
  -- login sem cadastro prévio (ex.: alguém tentou entrar pelo SMS sem conta):
  -- não cria perfil; a tela "Complete seu cadastro" cuida disso.
  if m->>'nome' is null or m->>'bloco' is null or m->>'apartamento' is null then
    return new;
  end if;

  insert into perfis (id, nome, email, telefone, bloco_informado, apto_informado,
                      unidade_id, tipo_vinculo)
  values (
    new.id,
    left(trim(m->>'nome'), 120),
    new.email,
    coalesce(new.phone, m->>'telefone'),
    trim(m->>'bloco'),
    trim(m->>'apartamento'),
    public.buscar_unidade(m->>'bloco', m->>'apartamento'),
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

create trigger ao_criar_usuario after insert on auth.users
for each row execute function public.criar_perfil_novo_usuario();

-- Mantém e-mail/telefone do perfil em sincronia com a autenticação
create or replace function public.sincronizar_contato_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update perfis set email = new.email, telefone = coalesce(new.phone, telefone)
  where id = new.id and (email is distinct from new.email or telefone is distinct from coalesce(new.phone, telefone));
  return new;
end $$;

create trigger ao_atualizar_usuario after update of email, phone on auth.users
for each row execute function public.sincronizar_contato_usuario();

-- ---------------------------------------------------------------------
-- Funções de negócio (RPC)
-- ---------------------------------------------------------------------

-- Para quem entrou por SMS sem ter feito o cadastro antes
create or replace function public.completar_cadastro(
  p_nome text, p_bloco text, p_apartamento text, p_tipo public.tipo_vinculo,
  p_aceite_termos boolean, p_aceite_notificacoes boolean, p_aceite_parceiros boolean,
  p_versao text default '1.0'
) returns void
language plpgsql security definer set search_path = public as $$
declare u auth.users;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if not p_aceite_termos then raise exception 'É preciso aceitar os termos de uso e a política de privacidade'; end if;
  select * into u from auth.users where id = auth.uid();

  insert into perfis (id, nome, email, telefone, bloco_informado, apto_informado, unidade_id, tipo_vinculo)
  values (u.id, left(trim(p_nome), 120), u.email, u.phone, trim(p_bloco), trim(p_apartamento),
          public.buscar_unidade(p_bloco, p_apartamento), p_tipo)
  on conflict (id) do update
    set nome = excluded.nome, bloco_informado = excluded.bloco_informado,
        apto_informado = excluded.apto_informado, unidade_id = excluded.unidade_id,
        tipo_vinculo = excluded.tipo_vinculo, status = 'pendente', motivo_status = null
    where perfis.status in ('pendente', 'rejeitado');

  insert into consentimentos (usuario_id, finalidade, versao, aceito) values
    (u.id, 'termos_uso', p_versao, true),
    (u.id, 'politica_privacidade', p_versao, true),
    (u.id, 'notificacoes', p_versao, p_aceite_notificacoes),
    (u.id, 'ofertas_parceiros', p_versao, p_aceite_parceiros);
end $$;

-- Morador altera um consentimento opcional (notificações, ofertas)
create or replace function public.registrar_consentimento(p_finalidade text, p_aceito boolean, p_versao text default '1.0')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if p_finalidade not in ('notificacoes', 'ofertas_parceiros') then
    raise exception 'Finalidade inválida';
  end if;
  insert into consentimentos (usuario_id, finalidade, versao, aceito)
  values (auth.uid(), p_finalidade, p_versao, p_aceito);
end $$;

-- Aprovação pela administração: confere bloco/apto e libera o acesso
create or replace function public.aprovar_cadastro(p_usuario uuid, p_unidade integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Apenas a administração pode aprovar cadastros'; end if;
  if p_unidade is null or not exists (select 1 from unidades where id = p_unidade and ativa) then
    raise exception 'Escolha um apartamento válido antes de aprovar';
  end if;

  update perfis
     set status = 'aprovado', unidade_id = p_unidade, motivo_status = null,
         analisado_por = auth.uid(), analisado_em = now()
   where id = p_usuario;
  if not found then raise exception 'Cadastro não encontrado'; end if;

  insert into papeis_usuario (usuario_id, papel, concedido_por)
  values (p_usuario, 'morador', auth.uid())
  on conflict do nothing;

  insert into auditoria (ator_id, acao, alvo_id, detalhes)
  values (auth.uid(), 'cadastro_aprovado', p_usuario, jsonb_build_object('unidade_id', p_unidade));
end $$;

create or replace function public.rejeitar_cadastro(p_usuario uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Apenas a administração pode rejeitar cadastros'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo para o morador'; end if;
  update perfis
     set status = 'rejeitado', motivo_status = trim(p_motivo),
         analisado_por = auth.uid(), analisado_em = now()
   where id = p_usuario;
  if not found then raise exception 'Cadastro não encontrado'; end if;
  insert into auditoria (ator_id, acao, alvo_id, detalhes)
  values (auth.uid(), 'cadastro_rejeitado', p_usuario, '{}'::jsonb);
end $$;

create or replace function public.suspender_usuario(p_usuario uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  if p_usuario = auth.uid() then raise exception 'Você não pode suspender a própria conta'; end if;
  update perfis set status = 'suspenso', motivo_status = p_motivo,
                    analisado_por = auth.uid(), analisado_em = now()
   where id = p_usuario;
  insert into auditoria (ator_id, acao, alvo_id) values (auth.uid(), 'usuario_suspenso', p_usuario);
end $$;

create or replace function public.reativar_usuario(p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  update perfis set status = 'aprovado', motivo_status = null,
                    analisado_por = auth.uid(), analisado_em = now()
   where id = p_usuario and status = 'suspenso' and unidade_id is not null;
  insert into auditoria (ator_id, acao, alvo_id) values (auth.uid(), 'usuario_reativado', p_usuario);
end $$;

-- Define o conjunto de papéis de um usuário (substitui os atuais)
create or replace function public.definir_papeis(p_usuario uuid, p_papeis public.papel_usuario[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  -- só o síndico concede/retira o papel de síndico
  if not public.tem_papel('sindico') and (
       ('sindico' = any(p_papeis))
         is distinct from exists (select 1 from papeis_usuario where usuario_id = p_usuario and papel = 'sindico')
     ) then
    raise exception 'Apenas o síndico pode alterar o papel de síndico';
  end if;
  -- evita que a administração fique sem ninguém por engano
  if p_usuario = auth.uid() and not (p_papeis && array['administracao', 'sindico']::public.papel_usuario[]) then
    raise exception 'Você não pode remover o seu próprio acesso administrativo';
  end if;

  delete from papeis_usuario where usuario_id = p_usuario and papel <> all(p_papeis);
  insert into papeis_usuario (usuario_id, papel, concedido_por)
  select p_usuario, unnest(p_papeis), auth.uid()
  on conflict do nothing;

  insert into auditoria (ator_id, acao, alvo_id, detalhes)
  values (auth.uid(), 'papeis_alterados', p_usuario, jsonb_build_object('papeis', to_jsonb(p_papeis)));
end $$;

-- LGPD art. 18: acesso e portabilidade dos próprios dados
create or replace function public.exportar_meus_dados()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gerado_em', now(),
    'perfil', (select to_jsonb(p) - 'analisado_por' from perfis p where p.id = auth.uid()),
    'unidade', (select jsonb_build_object('bloco', b.nome, 'apartamento', u.numero)
                  from perfis p join unidades u on u.id = p.unidade_id join blocos b on b.id = u.bloco_id
                 where p.id = auth.uid()),
    'papeis', (select coalesce(jsonb_agg(papel), '[]'::jsonb) from papeis_usuario where usuario_id = auth.uid()),
    'consentimentos', (select coalesce(jsonb_agg(jsonb_build_object(
                          'finalidade', finalidade, 'versao', versao, 'aceito', aceito, 'data', created_at)
                          order by created_at), '[]'::jsonb)
                       from consentimentos where usuario_id = auth.uid())
  )
$$;

-- LGPD art. 18, VI: exclusão da conta. Apaga o login e, em cascata, o
-- perfil, papéis e consentimentos. Conteúdos dos próximos módulos
-- (chamados, votos etc.) ficam anonimizados (on delete set null).
create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from papeis_usuario where usuario_id = v_id and papel = 'sindico')
     and (select count(*) from papeis_usuario where papel = 'sindico') = 1 then
    raise exception 'Transfira o papel de síndico para outra pessoa antes de excluir a conta';
  end if;
  insert into auditoria (ator_id, acao, detalhes) values (null, 'conta_excluida_pelo_titular', '{}'::jsonb);
  delete from auth.users where id = v_id;
end $$;

-- ---------------------------------------------------------------------
-- Visão para a fila de aprovação (somente administração)
-- ---------------------------------------------------------------------
create or replace function public.fila_aprovacao(p_status public.status_cadastro default 'pendente')
returns table (
  id uuid, nome text, email text, telefone text, tipo_vinculo public.tipo_vinculo,
  bloco_informado text, apto_informado text,
  unidade_id integer, bloco text, apartamento text,
  moradores_na_unidade bigint, titular_existente text,
  status public.status_cadastro, motivo_status text, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  return query
  select p.id, p.nome, p.email, p.telefone, p.tipo_vinculo,
         p.bloco_informado, p.apto_informado,
         p.unidade_id, b.nome, u.numero,
         (select count(*) from perfis o where o.unidade_id = p.unidade_id and o.status = 'aprovado' and o.id <> p.id),
         (select o.nome from perfis o where o.unidade_id = p.unidade_id and o.status = 'aprovado'
              and o.tipo_vinculo = 'titular' and o.id <> p.id limit 1),
         p.status, p.motivo_status, p.created_at
  from perfis p
  left join unidades u on u.id = p.unidade_id
  left join blocos b on b.id = u.bloco_id
  where p.status = p_status
  order by p.created_at
  limit 500;
end $$;

-- Totais para o painel administrativo
create or replace function public.resumo_cadastros()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Sem permissão'; end if;
  return (select jsonb_build_object(
    'pendentes',  count(*) filter (where status = 'pendente'),
    'aprovados',  count(*) filter (where status = 'aprovado'),
    'rejeitados', count(*) filter (where status = 'rejeitado'),
    'suspensos',  count(*) filter (where status = 'suspenso'),
    'unidades_com_morador', (select count(distinct unidade_id) from perfis where status = 'aprovado'),
    'total_unidades', (select count(*) from unidades where ativa)
  ) from perfis);
end $$;

-- ---------------------------------------------------------------------
-- Segurança em nível de linha (RLS)
-- ---------------------------------------------------------------------
alter table public.blocos          enable row level security;
alter table public.unidades        enable row level security;
alter table public.perfis          enable row level security;
alter table public.papeis_usuario  enable row level security;
alter table public.consentimentos  enable row level security;
alter table public.auditoria       enable row level security;

-- blocos e unidades: leitura para quem está logado; escrita só administração
create policy blocos_leitura   on public.blocos   for select to authenticated using (true);
create policy blocos_admin     on public.blocos   for all    to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy unidades_leitura on public.unidades for select to authenticated using (true);
create policy unidades_admin   on public.unidades for all    to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- perfis: cada um vê o seu; administração e equipe veem todos
create policy perfis_proprio   on public.perfis for select to authenticated using (id = auth.uid());
create policy perfis_equipe    on public.perfis for select to authenticated using (public.eh_equipe());
create policy perfis_editar    on public.perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- O morador só pode mudar estes campos; status/unidade mudam via RPC da administração
revoke update on public.perfis from authenticated, anon;
grant  update (nome, fonte_grande) on public.perfis to authenticated;
revoke insert, delete on public.perfis from authenticated, anon;

create policy papeis_proprio on public.papeis_usuario for select to authenticated
  using (usuario_id = auth.uid() or public.eh_admin());
revoke insert, update, delete on public.papeis_usuario from authenticated, anon;

create policy consentimentos_proprio on public.consentimentos for select to authenticated
  using (usuario_id = auth.uid() or public.eh_admin());
revoke insert, update, delete on public.consentimentos from authenticated, anon;

create policy auditoria_admin on public.auditoria for select to authenticated using (public.eh_admin());
revoke insert, update, delete on public.auditoria from authenticated, anon;

-- Permissões de execução das funções
revoke execute on all functions in schema public from public, anon;
grant execute on function public.unidade_existe(text, text) to anon, authenticated;
grant execute on function public.normalizar_ref(text) to anon, authenticated;
grant execute on function public.buscar_unidade(text, text) to authenticated;
grant execute on function
  public.tem_papel(public.papel_usuario), public.eh_admin(), public.eh_equipe(), public.eh_aprovado(),
  public.minha_unidade(),
  public.completar_cadastro(text, text, text, public.tipo_vinculo, boolean, boolean, boolean, text),
  public.registrar_consentimento(text, boolean, text),
  public.aprovar_cadastro(uuid, integer), public.rejeitar_cadastro(uuid, text),
  public.suspender_usuario(uuid, text), public.reativar_usuario(uuid),
  public.definir_papeis(uuid, public.papel_usuario[]),
  public.exportar_meus_dados(), public.excluir_minha_conta(),
  public.fila_aprovacao(public.status_cadastro), public.resumo_cadastros()
to authenticated;
revoke execute on function public.gerar_unidades(int, int, int, int) from authenticated;

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

-- =====================================================================
-- Dados iniciais
-- A estrutura real (23 blocos, 176 prédios, 2.464 apartamentos) fica em
-- public.configuracoes. Os apartamentos NÃO são gerados por fórmula:
--   - até a lista oficial chegar, cada apartamento é cadastrado quando a
--     administração aprova um morador (confirmando bloco, prédio e apto);
--   - com a lista em mãos, importe em Administração > Estrutura.
--
-- Liberar o(a) primeiro(a) síndico(a): depois do cadastro pelo app,
-- rode no SQL Editor do Supabase (trocando o e-mail):
--
-- update public.perfis set status = 'aprovado' where email = 'sindico@exemplo.com';
-- insert into public.papeis_usuario (usuario_id, papel)
-- select id, p from public.perfis, unnest(array['morador','sindico','administracao']::public.papel_usuario[]) p
--  where email = 'sindico@exemplo.com' on conflict do nothing;
--
-- Depois, no app, use Administração > Usuários para definir o endereço dele(a).
-- =====================================================================
select 1;
