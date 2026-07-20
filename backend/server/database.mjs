import { Pool } from 'pg';

export function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL nao foi configurada.');
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  async function query(text, params) {
    return pool.query(text, params);
  }

  async function close() {
    await pool.end();
  }

  async function transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await callback({
        query: (text, params) => client.query(text, params),
      });
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  return { query, transaction, close };
}

export async function ensureSchema(db) {
  await db.query(`
    create extension if not exists pgcrypto;

    create table if not exists empresas (
      id uuid primary key default gen_random_uuid(),
      nome text not null,
      configuracoes jsonb not null default '{}'::jsonb,
      fuso_horario text not null default 'America/Fortaleza',
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now()
    );

    insert into empresas (id, nome, configuracoes, fuso_horario)
    values (
      '00000000-0000-4000-8000-000000000001',
      'Unidade Matriz',
      '{"expirationRiskDays":{"critical":7,"high":15,"medium":30},"promotionDiscounts":{"medium":[5,10],"high":[10,20],"critical":[20,35]}}',
      'America/Fortaleza'
    )
    on conflict (id) do nothing;

    create table if not exists usuarios (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid null references empresas(id) on delete restrict,
      nome text not null,
      email text unique not null,
      senha text not null,
      role text not null check (role in ('admin', 'staff')),
      ativo boolean not null default true,
      criado_as timestamptz not null default now(),
      ultimo_login_as timestamptz null
    );

    alter table usuarios add column if not exists empresa_id uuid null references empresas(id) on delete restrict;
    alter table usuarios add column if not exists ativo boolean not null default true;
    update usuarios set empresa_id = '00000000-0000-4000-8000-000000000001' where empresa_id is null;

    create table if not exists produtos (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid null references empresas(id) on delete restrict,
      nome text not null,
      categoria text null,
      unidade text null,
      codigo text null,
      image_url text null,
      quantidade integer not null default 0,
      min_quantidade integer not null default 0,
      max_quantidade integer null,
      preco_custo numeric(12,2) not null default 0,
      preco numeric(12,2) not null default 0,
      ativo boolean not null default true,
      criado_por uuid not null references usuarios(id) on delete restrict,
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now()
    );

    alter table produtos add column if not exists empresa_id uuid null references empresas(id) on delete restrict;
    alter table produtos add column if not exists max_quantidade integer null;
    alter table produtos add column if not exists preco_custo numeric(12,2) not null default 0;
    alter table produtos add column if not exists ativo boolean not null default true;
    update produtos set empresa_id = '00000000-0000-4000-8000-000000000001' where empresa_id is null;
    update produtos set preco_custo = preco where preco_custo = 0;

    create table if not exists logs_acesso (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid null references empresas(id) on delete cascade,
      id_usuario uuid not null references usuarios(id) on delete cascade,
      nome_usuario text not null,
      acao text not null,
      timestamp timestamptz not null default now(),
      detalhes text null
    );

    alter table logs_acesso add column if not exists empresa_id uuid null references empresas(id) on delete cascade;
    update logs_acesso set empresa_id = '00000000-0000-4000-8000-000000000001' where empresa_id is null;

    create table if not exists lotes (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      produto_id uuid not null references produtos(id) on delete cascade,
      numero_lote text not null,
      quantidade_inicial integer not null check (quantidade_inicial >= 0),
      quantidade_disponivel integer not null check (quantidade_disponivel >= 0),
      data_entrada date not null,
      data_validade date not null,
      custo_unitario numeric(12,2) not null default 0,
      status text not null default 'available' check (status in ('available', 'expired', 'depleted', 'blocked')),
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now()
    );

    create table if not exists movimentacoes_estoque (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      produto_id uuid not null references produtos(id) on delete restrict,
      lote_id uuid null references lotes(id) on delete restrict,
      tipo text not null check (tipo in ('entrada', 'saida', 'ajuste', 'perda', 'devolucao', 'transferencia')),
      quantidade integer not null check (quantidade > 0),
      motivo text not null,
      origem text not null default 'api',
      usuario_id uuid not null references usuarios(id) on delete restrict,
      data_movimentacao timestamptz not null default now(),
      criado_em timestamptz not null default now()
    );

    create table if not exists vendas (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      valor_total numeric(12,2) not null default 0,
      data_venda timestamptz not null default now(),
      status text not null default 'concluida' check (status in ('concluida', 'cancelada', 'devolvida'))
    );

    create table if not exists itens_venda (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      venda_id uuid not null references vendas(id) on delete cascade,
      produto_id uuid not null references produtos(id) on delete restrict,
      lote_id uuid null references lotes(id) on delete restrict,
      quantidade integer not null check (quantidade > 0),
      preco_unitario numeric(12,2) not null default 0,
      custo_unitario numeric(12,2) not null default 0
    );

    create table if not exists fornecedores (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      nome text not null,
      documento text null,
      contato text null,
      prazo_medio_entrega integer not null default 7,
      ativo boolean not null default true
    );

    create table if not exists produto_fornecedor (
      produto_id uuid not null references produtos(id) on delete cascade,
      fornecedor_id uuid not null references fornecedores(id) on delete cascade,
      custo_atual numeric(12,2) not null default 0,
      quantidade_minima_compra integer not null default 1,
      prazo_entrega integer not null default 7,
      preferencial boolean not null default false,
      primary key (produto_id, fornecedor_id)
    );

    create table if not exists pedidos_compra (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      fornecedor_id uuid not null references fornecedores(id) on delete restrict,
      status text not null default 'pendente',
      valor_estimado numeric(12,2) not null default 0,
      data_prevista date null,
      criado_em timestamptz not null default now()
    );

    create table if not exists itens_pedido (
      pedido_id uuid not null references pedidos_compra(id) on delete cascade,
      produto_id uuid not null references produtos(id) on delete restrict,
      quantidade_solicitada integer not null check (quantidade_solicitada > 0),
      quantidade_recebida integer not null default 0,
      custo_unitario numeric(12,2) not null default 0,
      primary key (pedido_id, produto_id)
    );

    create table if not exists alertas (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      produto_id uuid null references produtos(id) on delete cascade,
      lote_id uuid null references lotes(id) on delete cascade,
      tipo text not null,
      titulo text not null,
      mensagem text not null,
      prioridade text not null check (prioridade in ('baixa', 'media', 'alta', 'critica')),
      status text not null default 'novo' check (status in ('novo', 'lido', 'resolvido', 'ignorado')),
      chave_logica text not null,
      criado_em timestamptz not null default now(),
      resolvido_em timestamptz null,
      unique (empresa_id, chave_logica)
    );

    create table if not exists recomendacoes (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      produto_id uuid null references produtos(id) on delete cascade,
      lote_id uuid null references lotes(id) on delete cascade,
      tipo text not null,
      descricao text not null,
      justificativa text not null,
      dados_calculo jsonb not null default '{}'::jsonb,
      impacto_estimado numeric(12,2) not null default 0,
      nivel_confianca text not null default 'baixa',
      status text not null default 'pendente',
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now()
    );

    create table if not exists decisoes_recomendacao (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      recomendacao_id uuid not null references recomendacoes(id) on delete cascade,
      usuario_id uuid not null references usuarios(id) on delete restrict,
      acao text not null,
      valor_original numeric(12,2) not null default 0,
      valor_ajustado numeric(12,2) null,
      justificativa text null,
      criado_em timestamptz not null default now()
    );

    create table if not exists relatorios (
      id uuid primary key default gen_random_uuid(),
      empresa_id uuid not null references empresas(id) on delete cascade,
      tipo text not null,
      periodo_inicial date not null,
      periodo_final date not null,
      conteudo jsonb not null default '{}'::jsonb,
      gerado_em timestamptz not null default now()
    );

    create index if not exists idx_usuarios_empresa on usuarios (empresa_id);
    create index if not exists idx_produtos_empresa on produtos (empresa_id);
    create index if not exists idx_produtos_atualizado_em on produtos (atualizado_em desc);
    create index if not exists idx_lotes_empresa_produto on lotes (empresa_id, produto_id);
    create index if not exists idx_lotes_validade on lotes (data_validade);
    create index if not exists idx_lotes_status on lotes (status);
    create index if not exists idx_movimentacoes_empresa_produto on movimentacoes_estoque (empresa_id, produto_id);
    create index if not exists idx_movimentacoes_data on movimentacoes_estoque (data_movimentacao desc);
    create index if not exists idx_vendas_empresa_data on vendas (empresa_id, data_venda desc);
    create index if not exists idx_alertas_empresa_status on alertas (empresa_id, status);
    create index if not exists idx_recomendacoes_empresa_status on recomendacoes (empresa_id, status);
    create index if not exists idx_acesso_logs_timestamp on logs_acesso (timestamp desc);
  `);
}
