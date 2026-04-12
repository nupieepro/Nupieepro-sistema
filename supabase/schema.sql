-- ============================================================
-- NUPIEEPRO FASE 1 — Schema Supabase (alinhado c/ plataforma real)
-- 16 tabelas · RLS · JWT auth · Selo ABJ 2026
-- ============================================================

-- 1. COORDENADORIAS (as 6 reais do NUPIEEPRO)
create table public.coordenadorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  sigla text not null unique,
  icone text default '◈',
  cor text default '#F07820',
  descricao text,
  created_at timestamptz default now()
);

-- 2. USERS (perfil estendido do auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  role text not null default 'membro' check (role in ('admin','coordenador','assessor','membro')),
  cargo text,
  coordenadoria_id uuid references public.coordenadorias(id),
  iniciais text,
  avatar_url text,
  aniversario date,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CONVITES (registro via token)
create table public.convites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  role text not null default 'membro' check (role in ('admin','coordenador','assessor','membro')),
  cargo text,
  coordenadoria_id uuid references public.coordenadorias(id),
  usado boolean default false,
  criado_por uuid references public.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days'
);

-- 4. ATIVIDADES_ABJ (18 atividades do Selo ABJ 2026)
create table public.atividades_abj (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  nome text not null,
  descricao text,
  tipo text not null check (tipo in ('mensal','semestral','unico','escalonado','categorizado','percentual')),
  coord_responsavel text,
  pontos_por_entrada integer default 0,
  pontos_max integer,
  prazo text,
  prazo_cor text default 'gray',
  checklist jsonb default '[]',
  regras jsonb,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- 5. PROGRESSO_ABJ (pontuação por atividade)
create table public.progresso_abj (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades_abj(id) on delete cascade,
  pontos integer default 0,
  status text default 'pendente' check (status in ('pendente','em_andamento','concluido')),
  mes_ref text,
  registrado_por uuid references public.users(id),
  observacao text,
  concluido_em timestamptz,
  created_at timestamptz default now()
);

-- 6. EVIDENCIAS_ABJ
create table public.evidencias_abj (
  id uuid primary key default gen_random_uuid(),
  progresso_id uuid not null references public.progresso_abj(id) on delete cascade,
  tipo text not null check (tipo in ('foto','video','documento','link','print')),
  url text not null,
  descricao text,
  aprovado boolean default false,
  aprovado_por uuid references public.users(id),
  created_at timestamptz default now()
);

-- 7. EVENTOS
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  local text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  tipo text default 'evento' check (tipo in ('evento','reuniao','visita','treinamento','podcast')),
  coordenadoria_id uuid references public.coordenadorias(id),
  criado_por uuid references public.users(id),
  vagas integer,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- 8. INSCRITOS_EVENTO
create table public.inscritos_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text default 'inscrito' check (status in ('inscrito','confirmado','cancelado')),
  created_at timestamptz default now(),
  unique(evento_id, user_id)
);

-- 9. VENDAS (lojinha NUPIEEPRO)
create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  produto text,
  valor numeric(10,2) not null,
  quantidade integer default 1,
  categoria text default 'Lojinha',
  coordenadoria_id uuid references public.coordenadorias(id),
  registrado_por uuid references public.users(id),
  data_venda date default current_date,
  created_at timestamptz default now()
);

-- 10. DESPESAS
create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(10,2) not null,
  categoria text,
  coordenadoria_id uuid references public.coordenadorias(id),
  registrado_por uuid references public.users(id),
  comprovante_url text,
  data_despesa date default current_date,
  created_at timestamptz default now()
);

-- 11. FREQUENCIA
create table public.frequencia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  evento_id uuid references public.eventos(id),
  tipo text default 'reuniao' check (tipo in ('reuniao','evento','treinamento','visita')),
  data date not null default current_date,
  presente boolean default true,
  observacao text,
  created_at timestamptz default now()
);

-- 12. CALENDARIO
create table public.calendario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  tipo text default 'evento' check (tipo in ('evento','reuniao','prazo','feriado','abj','podcast')),
  cor text default '#F07820',
  coordenadoria_id uuid references public.coordenadorias(id),
  criado_por uuid references public.users(id),
  created_at timestamptz default now()
);

-- 13. DEMANDAS (kanban: pendente → exec → realizada → evidencia → auditada)
create table public.demandas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  coluna text default 'pendente' check (coluna in ('pendente','exec','realizada','evidencia','auditada')),
  prioridade text default 'media' check (prioridade in ('baixa','media','alta')),
  coordenadoria_id uuid references public.coordenadorias(id),
  responsavel_id uuid references public.users(id),
  criado_por uuid references public.users(id),
  atividade_abj_id uuid references public.atividades_abj(id),
  prazo date,
  prazo_cor text default 'gray',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 14. HISTORICO_DEMANDAS
create table public.historico_demandas (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas(id) on delete cascade,
  user_id uuid not null references public.users(id),
  coluna_anterior text,
  coluna_nova text,
  acao text not null,
  detalhes text,
  created_at timestamptz default now()
);

-- 15. NOTIFICACOES
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  titulo text not null,
  mensagem text,
  tipo text default 'info' check (tipo in ('info','alerta','sucesso','erro')),
  lida boolean default false,
  link text,
  created_at timestamptz default now()
);

-- 16. RELATORIOS_MENSAIS
create table public.relatorios_mensais (
  id uuid primary key default gen_random_uuid(),
  coordenadoria_id uuid references public.coordenadorias(id),
  mes integer not null check (mes between 1 and 12),
  ano integer not null,
  total_vendas numeric(10,2) default 0,
  total_despesas numeric(10,2) default 0,
  total_eventos integer default 0,
  total_participantes integer default 0,
  pontos_abj integer default 0,
  observacoes text,
  gerado_por uuid references public.users(id),
  created_at timestamptz default now(),
  unique(coordenadoria_id, mes, ano)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_users_coord on public.users(coordenadoria_id);
create index idx_users_role on public.users(role);
create index idx_convites_token on public.convites(token);
create index idx_convites_email on public.convites(email);
create index idx_atividades_numero on public.atividades_abj(numero);
create index idx_progresso_atividade on public.progresso_abj(atividade_id);
create index idx_progresso_mes on public.progresso_abj(mes_ref);
create index idx_eventos_coord on public.eventos(coordenadoria_id);
create index idx_eventos_data on public.eventos(data_inicio);
create index idx_inscritos_evento on public.inscritos_evento(evento_id);
create index idx_vendas_coord on public.vendas(coordenadoria_id);
create index idx_vendas_data on public.vendas(data_venda);
create index idx_despesas_coord on public.despesas(coordenadoria_id);
create index idx_frequencia_user on public.frequencia(user_id);
create index idx_demandas_coord on public.demandas(coordenadoria_id);
create index idx_demandas_coluna on public.demandas(coluna);
create index idx_demandas_resp on public.demandas(responsavel_id);
create index idx_historico_demanda on public.historico_demandas(demanda_id);
create index idx_notif_user on public.notificacoes(user_id, lida);
create index idx_relatorios_coord on public.relatorios_mensais(coordenadoria_id, ano, mes);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.users enable row level security;
alter table public.coordenadorias enable row level security;
alter table public.convites enable row level security;
alter table public.atividades_abj enable row level security;
alter table public.progresso_abj enable row level security;
alter table public.evidencias_abj enable row level security;
alter table public.eventos enable row level security;
alter table public.inscritos_evento enable row level security;
alter table public.vendas enable row level security;
alter table public.despesas enable row level security;
alter table public.frequencia enable row level security;
alter table public.calendario enable row level security;
alter table public.demandas enable row level security;
alter table public.historico_demandas enable row level security;
alter table public.notificacoes enable row level security;
alter table public.relatorios_mensais enable row level security;

-- Helpers
create or replace function public.get_my_role()
returns text language sql stable security definer as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.get_my_coord()
returns uuid language sql stable security definer as $$
  select coordenadoria_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_coord_or_admin()
returns boolean language sql stable security definer as $$
  select exists(select 1 from public.users where id = auth.uid() and role in ('admin','coordenador'));
$$;

-- COORDENADORIAS: all read, admin write
create policy "coord_read" on public.coordenadorias for select using (true);
create policy "coord_write" on public.coordenadorias for all using (public.is_admin());

-- USERS: see own coord + admin sees all
create policy "users_read" on public.users for select using (
  id = auth.uid() or coordenadoria_id = public.get_my_coord() or public.is_admin()
);
create policy "users_update_self" on public.users for update using (id = auth.uid());
create policy "users_admin" on public.users for all using (public.is_admin());

-- CONVITES: anon can read (for token validation), coord+ can insert
create policy "convites_anon_read" on public.convites for select to anon using (true);
create policy "convites_auth_read" on public.convites for select using (public.is_coord_or_admin());
create policy "convites_insert" on public.convites for insert with check (public.is_coord_or_admin());

-- ATIVIDADES_ABJ: everyone reads, coord+ writes
create policy "abj_read" on public.atividades_abj for select using (true);
create policy "abj_write" on public.atividades_abj for all using (public.is_coord_or_admin());

-- PROGRESSO_ABJ: everyone reads, coord+ writes
create policy "prog_read" on public.progresso_abj for select using (true);
create policy "prog_write" on public.progresso_abj for insert with check (public.is_coord_or_admin());
create policy "prog_update" on public.progresso_abj for update using (public.is_coord_or_admin());

-- EVIDENCIAS_ABJ: everyone reads, auth inserts own
create policy "evid_read" on public.evidencias_abj for select using (true);
create policy "evid_insert" on public.evidencias_abj for insert with check (auth.uid() is not null);
create policy "evid_approve" on public.evidencias_abj for update using (public.is_coord_or_admin());

-- EVENTOS: everyone reads, coord+ writes
create policy "eventos_read" on public.eventos for select using (true);
create policy "eventos_write" on public.eventos for all using (public.is_coord_or_admin());

-- INSCRITOS: own or coord+
create policy "inscritos_read" on public.inscritos_evento for select using (
  user_id = auth.uid() or public.is_coord_or_admin()
);
create policy "inscritos_self" on public.inscritos_evento for insert with check (user_id = auth.uid());
create policy "inscritos_manage" on public.inscritos_evento for update using (public.is_coord_or_admin());

-- VENDAS: same coord or admin
create policy "vendas_read" on public.vendas for select using (
  coordenadoria_id = public.get_my_coord() or public.is_admin()
);
create policy "vendas_write" on public.vendas for all using (public.is_coord_or_admin());

-- DESPESAS: same coord or admin
create policy "despesas_read" on public.despesas for select using (
  coordenadoria_id = public.get_my_coord() or public.is_admin()
);
create policy "despesas_write" on public.despesas for all using (public.is_coord_or_admin());

-- FREQUENCIA: own or coord+
create policy "freq_read" on public.frequencia for select using (
  user_id = auth.uid() or public.is_coord_or_admin()
);
create policy "freq_write" on public.frequencia for all using (public.is_coord_or_admin());

-- CALENDARIO: everyone reads, coord+ writes
create policy "cal_read" on public.calendario for select using (true);
create policy "cal_write" on public.calendario for all using (public.is_coord_or_admin());

-- DEMANDAS: same coord + responsavel or admin
create policy "demandas_read" on public.demandas for select using (
  coordenadoria_id = public.get_my_coord() or responsavel_id = auth.uid() or public.is_admin()
);
create policy "demandas_insert" on public.demandas for insert with check (auth.uid() is not null);
create policy "demandas_update" on public.demandas for update using (
  responsavel_id = auth.uid() or public.is_coord_or_admin()
);

-- HISTORICO_DEMANDAS: via demanda access
create policy "hist_read" on public.historico_demandas for select using (
  exists(select 1 from public.demandas d where d.id = demanda_id
    and (d.coordenadoria_id = public.get_my_coord() or public.is_admin()))
);
create policy "hist_insert" on public.historico_demandas for insert with check (user_id = auth.uid());

-- NOTIFICACOES: own only
create policy "notif_read" on public.notificacoes for select using (user_id = auth.uid());
create policy "notif_update" on public.notificacoes for update using (user_id = auth.uid());
create policy "notif_insert" on public.notificacoes for insert with check (public.is_coord_or_admin());

-- RELATORIOS_MENSAIS: same coord or admin
create policy "rel_read" on public.relatorios_mensais for select using (
  coordenadoria_id = public.get_my_coord() or public.is_admin()
);
create policy "rel_write" on public.relatorios_mensais for all using (public.is_coord_or_admin());

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_users_updated before update on public.users
  for each row execute function public.handle_updated_at();
create trigger set_demandas_updated before update on public.demandas
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, nome, email, role, cargo, coordenadoria_id, iniciais, aniversario)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'membro'),
    new.raw_user_meta_data->>'cargo',
    (new.raw_user_meta_data->>'coordenadoria_id')::uuid,
    new.raw_user_meta_data->>'iniciais',
    (new.raw_user_meta_data->>'aniversario')::date
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SEED: Coordenadorias do NUPIEEPRO
-- ============================================================
insert into public.coordenadorias (nome, sigla, icone, cor, descricao) values
  ('Geral',          'GER', '⬡', '#F07820', 'Coordenadoria Geral — presidência e vice'),
  ('Operações',      'OPS', '◈', '#5B9CF6', 'Coordenadoria de Operações — reuniões, documentos, processos, auditoria kanban'),
  ('G. Pessoas',     'GP',  '◉', '#F5C518', 'Gestão de Pessoas — equipe, engajamento, treinamentos internos, frequência'),
  ('Marketing',      'MKT', '◬', '#F07070', 'Marketing — posts, identidade visual, redes sociais'),
  ('Projetos',       'PRJ', '◫', '#F07820', 'Projetos — podcast NUPICAST, treinamentos externos, visitas técnicas'),
  ('Finanças',       'FIN', '◎', '#2DD4A0', 'Financeiro — caixa, lojinha, associação ABEPRO');

-- ============================================================
-- SEED: 18 Atividades ABJ 2026
-- ============================================================
insert into public.atividades_abj (numero, nome, descricao, tipo, coord_responsavel, pontos_por_entrada, pontos_max, prazo, prazo_cor, checklist, regras) values
  (1,  'Nome e Logomarca',           'Fixo — 3 pts/mês',              'mensal',       'Geral',    3,  null,  'Mensal', 'green',  '["Logo aprovada","Nome registrado ABJ","Inserido no relatório"]', null),
  (2,  'Missão, Visão e Valores',    'Fixo — 5 pts/mês',              'mensal',       'Geral',    5,  null,  'Mensal', 'green',  '["MVV redigido","Publicado nas redes","Inserido no relatório"]', null),
  (3,  'Apresentação Institucional', 'Fixo — 3 pts/mês',              'mensal',       'Geral',    3,  null,  'Mensal', 'green',  '["Deck atualizado","Enviado para ABJ","No repositório"]', null),
  (4,  'Regimento / PCD',           'Fixo — 3 pts/mês',              'mensal',       'Geral',    3,  null,  'Mensal', 'green',  '["Votado em assembleia","Assinado","Enviado ABJ"]', null),
  (5,  'Apresentação ABJ / Núcleo', '1ª-3ª: 4 pts · 4ª+: 2 pts',    'escalonado',   'Núcleo',   4,  null,  'Mensal', 'yellow', '["Confirmação da ABJ","Data e horário registrados","Print ou gravação","Relatório enviado"]', '{"faixas":[{"ate":3,"pts":4},{"de":4,"pts":2}]}'),
  (6,  'Planejamento 1º Semestre',  '4 pts — jan a jun',             'semestral',    'Geral',    4,  4,     'Jun',    'yellow', '["Documento redigido","Aprovado em reunião","Enviado ABJ até prazo"]', null),
  (7,  'Planejamento 2º Semestre',  '4 pts — jul a nov',             'semestral',    'Geral',    4,  4,     'Nov',    'gray',   '["Documento redigido","Aprovado em reunião","Enviado ABJ até prazo"]', null),
  (8,  'Reunião Geral de Núcleos',  '5 pts por reunião — mensal',    'mensal',       'Núcleo',   5,  null,  'Mensal', 'green',  '["Lista de presença assinada","ATA da reunião","Foto da reunião","Quórum >= 80%"]', null),
  (9,  'Rede Social Ativa',         '3 pts por mês ativo',           'mensal',       'Marketing', 3, null,  'Mensal', 'green',  '["Post publicado no mês","Print do post","Link da publicação"]', null),
  (10, 'Núcleo associado à ABEPRO', '2–10 pts por faixa de adesão',  'percentual',   'Finanças', 0,  10,    'Jul',    'yellow', '["Comprovante de filiação dos membros","Lista de associados","Recibo de pagamento ABEPRO"]', '{"faixas":[{"de":1,"ate":20,"pts":2},{"de":21,"ate":40,"pts":4},{"de":41,"ate":60,"pts":6},{"de":61,"ate":80,"pts":8},{"de":81,"ate":100,"pts":10}]}'),
  (11, 'Treinamentos internos/ext.','1º-2º: 5 pts · 3º+: 2 pts',    'escalonado',   'Projetos e G. Pessoas', 5, null, 'Mensal', 'yellow', '["Lista de presença","Material ou certificado","Foto do evento","Relatório enviado"]', '{"faixas":[{"ate":2,"pts":5},{"de":3,"pts":2}]}'),
  (12, 'Visitas Técnicas',          'Organizada: 5 pts · Participação: 2 pts', 'categorizado', 'Núcleo', 2, null, 'Mensal', 'yellow', '["Relatório de visita","Lista de presença","Fotos","Nome da empresa/instituição"]', '{"categorias":[{"id":"organizada","label":"Organizada pelo núcleo","pts":5},{"id":"participacao","label":"Participação de membro","pts":2}]}'),
  (13, 'Evento Estadual',           '20 pts — agosto',               'unico',        'Projetos', 20, 20,    'Ago',    'yellow', '["Data e local definidos","Inscrições abertas","Realização","Fotos enviadas","ATA ABJ"]', null),
  (14, 'Momento ENEGEP',            '30 pts — agosto',               'unico',        'Geral',    30, 30,    'Ago',    'gray',   '["Inscrição feita","Presença confirmada","Relatório enviado"]', null),
  (15, 'Evento Regional',           '40 pts — maio',                 'unico',        'Geral',    40, 40,    'Mai',    'yellow', '["Confirmação","Relatório de presença","Fotos"]', null),
  (16, 'Atividade Inovadora',       '40 pts — agosto',               'unico',        'Geral',    40, 40,    'Ago',    'yellow', '["Proposta aprovada","Execução","Evidências","Enviado ABJ"]', null),
  (17, 'Produção Científica',       'Trabalho: 5 · Artigo: 10 · ENEGEP: 25', 'categorizado', 'Núcleo', 5, null, 'Set', 'yellow', '["Documento ou prova de submissão","Link ou comprovante de publicação","Comprovante de apresentação (se ENEGEP)"]', '{"categorias":[{"id":"trabalho","label":"Trabalho publicado","pts":5},{"id":"artigo_abepro","label":"Artigo em periódico/revista ABEPRO","pts":10},{"id":"enegep","label":"Artigo ENEGEP 2026","pts":25}]}'),
  (18, 'Relatório Mensal',          '10 pts por relatório — mensal', 'mensal',       'Operações', 10, null, 'Mensal', 'red',    '["Relatório (.pdf)","E-mail de envio para ABJ","Protocolo de recebimento"]', null);
