# StockIA

Sistema web de gestão e inteligência de estoque voltado a operações de varejo. O StockIA reúne cadastro de produtos e usuários, controle de lotes e movimentações, alertas de validade, previsão de demanda, recomendações de reposição, sugestões de promoção, indicadores gerenciais e uma consulta assistida por IA.

> **Status:** MVP em desenvolvimento. A aplicação já possui frontend, API, persistência em PostgreSQL e testes das principais regras de negócio, mas ainda há pontos de segurança e operação que precisam ser concluídos antes do uso em produção.

## Sumário

- [Visão geral](#visão-geral)
- [Principais recursos](#principais-recursos)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Scripts disponíveis](#scripts-disponíveis)
- [Regras de inteligência](#regras-de-inteligência)
- [API HTTP](#api-http)
- [Testes](#testes)
- [Perfis e primeiro acesso](#perfis-e-primeiro-acesso)
- [Segurança e limitações atuais](#segurança-e-limitações-atuais)
- [Solução de problemas](#solução-de-problemas)
- [Próximos passos](#próximos-passos)

## Visão geral

O StockIA transforma dados operacionais de estoque em informações para tomada de decisão. Além das funções administrativas tradicionais, o sistema calcula risco financeiro associado a produtos próximos do vencimento, estima demanda com base no histórico de vendas e sugere ações de reposição ou promoção.

O frontend consulta exclusivamente a API HTTP. A API centraliza o acesso ao PostgreSQL, cria ou atualiza as estruturas essenciais do banco durante a inicialização e executa as regras de negócio.

## Principais recursos

- **Painel gerencial:** visão consolidada do estoque e dos indicadores calculados.
- **Produtos:** cadastro, edição, consulta, filtros e exclusão.
- **Lotes e validade:** acompanhamento das quantidades disponíveis e dos níveis de risco.
- **Movimentações de estoque:** entradas, saídas, ajustes, perdas, devoluções e transferências.
- **FEFO:** seleção prioritária do lote com vencimento mais próximo nas saídas sem lote informado.
- **Previsão de demanda:** estimativas para 7 e 30 dias e classificação da tendência.
- **Reposição:** cálculo de estoque de segurança, ponto de reposição e quantidade sugerida.
- **Promoções:** sugestões de desconto para reduzir perdas por vencimento.
- **Alertas:** acompanhamento de estoque baixo, estoque zerado e validade.
- **Relatórios e métricas:** informações gerenciais reservadas ao perfil administrador.
- **Histórico de acesso:** registro das principais ações realizadas no sistema.
- **Usuários e permissões:** perfis `admin` e `staff`.
- **Consulta com IA:** perguntas em linguagem natural respondidas pela Groq a partir dos dados atuais do StockIA.
- **Atualização periódica:** sincronização do frontend com a API a cada 3 segundos durante a sessão.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8 e CSS |
| Backend | Node.js, módulos ECMAScript e API HTTP nativa |
| Banco de dados | PostgreSQL e driver `pg` |
| IA | API da Groq |
| Testes | Test runner nativo do Node.js |
| Organização | npm workspaces |

O backend foi mantido sem framework web e sem ORM. As consultas usam SQL parametrizado, e as operações críticas de estoque utilizam transações do PostgreSQL.

## Arquitetura

```mermaid
flowchart LR
    U[Usuário] --> F[Frontend React + Vite]
    F -->|HTTP / JSON| A[API Node.js]
    A --> R[Repositório e regras de negócio]
    R --> P[(PostgreSQL)]
    A -->|Consulta contextual| G[API da Groq]
```

Fluxo principal:

1. O usuário interage com a interface React.
2. O `ApiRepository` do frontend envia solicitações à API.
3. A API valida a rota, executa as regras de negócio e consulta o PostgreSQL.
4. Os resultados são normalizados e retornados em JSON.
5. Nas consultas assistidas, somente o backend envia à Groq a pergunta e o contexto operacional preparado pelo sistema.

## Estrutura do projeto

```text
STOCKIA-CLONE/
├── backend/
│   ├── server/
│   │   ├── assistant.mjs       # Integração e resposta estruturada da Groq
│   │   ├── database.mjs        # Pool, transações e criação do schema
│   │   ├── env.mjs             # Carregamento do .env compartilhado
│   │   ├── index.mjs           # Servidor HTTP e rotas da API
│   │   └── repository.mjs      # Persistência e regras de inteligência
│   ├── supabase/               # Cópia dos schemas e migrações do backend
│   ├── tests/                  # Testes de domínio e do assistente
│   └── package.json
├── frontend/
│   ├── public/                 # Ícones e arquivos públicos
│   ├── src/
│   │   ├── components/         # Layout, autenticação e componentes reutilizáveis
│   │   ├── data/               # Repositórios de acesso a dados
│   │   ├── lib/                # Constantes, formatação e regras auxiliares
│   │   ├── pages/              # Páginas funcionais da aplicação
│   │   ├── types/              # Contratos e modelos TypeScript
│   │   ├── App.tsx             # Estado e composição da aplicação
│   │   └── main.tsx            # Entrada do frontend
│   ├── vite.config.ts
│   └── package.json
├── supabase/
│   ├── migrations/             # Evolução versionada do banco
│   ├── schema.sql              # Schema-base
│   └── upgrade.sql             # Atualização de instalações anteriores
├── docs/
│   └── technical.md            # Detalhamento das regras do MVP
├── .env.example
├── package.json                # Scripts e workspaces do monorepo
└── README.md
```

## Pré-requisitos

Antes de iniciar, instale:

- **Node.js 20.19+ ou 22.12+**, conforme as versões aceitas pelo Vite 8;
- **npm** compatível com a versão do Node.js;
- **PostgreSQL** local ou uma instância gerenciada, como Supabase ou Neon;
- uma chave da **Groq**, caso queira usar a tela de consulta com IA.

Também é necessário que o usuário do PostgreSQL tenha permissão para criar tabelas, índices e a extensão `pgcrypto`.

## Instalação e execução

### 1. Clone e acesse o projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd STOCKIA-CLONE
```

### 2. Instale as dependências

Execute na raiz do monorepo:

```bash
npm install
```

O npm instalará as dependências dos workspaces `frontend` e `backend`.

### 3. Configure o ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/stockia
DATABASE_SSL=false
API_PORT=3333
CORS_ORIGIN=http://localhost:5173

VITE_DATA_PROVIDER=postgres
VITE_API_URL=http://localhost:3333

GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

Substitua `DATABASE_URL` pela conexão real do seu PostgreSQL. Em provedores que exigem TLS, use `DATABASE_SSL=true`.

### 4. Inicie a API

Em um terminal:

```bash
npm run api
```

Na primeira inicialização, a API executa `ensureSchema`, cria as tabelas e índices ausentes e cadastra a empresa padrão do MVP.

Teste a disponibilidade:

```bash
curl http://localhost:3333/api/health
```

Resposta esperada:

```json
{
  "ok": true
}
```

### 5. Inicie o frontend

Em outro terminal:

```bash
npm run dev
```

Acesse o endereço informado pelo Vite, normalmente:

```text
http://localhost:5173
```

### 6. Crie o primeiro usuário

Na tela inicial, escolha a opção de cadastro. O primeiro usuário criado recebe automaticamente o perfil `admin`; os próximos recebem o perfil `staff`.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sim | — | String de conexão completa do PostgreSQL. |
| `DATABASE_SSL` | Não | `false` | Use `true` quando o provedor exigir conexão TLS. |
| `API_PORT` | Não | `3333` | Porta na qual a API será exposta. |
| `CORS_ORIGIN` | Não* | `http://localhost:5173` | Origem esperada do frontend. *A implementação atual ainda responde com CORS aberto. |
| `VITE_DATA_PROVIDER` | Não | `postgres` | Identifica o provedor de dados previsto para o frontend. |
| `VITE_API_URL` | Recomendável | URL relativa | Endereço-base da API consumida pelo frontend. |
| `GROQ_API_KEY` | Para a IA | — | Chave privada utilizada exclusivamente pelo backend. |
| `GROQ_MODEL` | Não | modelo definido no backend | Modelo solicitado à API da Groq. |

> Nunca exponha `DATABASE_URL`, `GROQ_API_KEY` ou o conteúdo do arquivo `.env` no repositório, no frontend ou em capturas de tela.

## Banco de dados

### Inicialização automática

Ao executar `npm run api`, o backend:

1. abre o pool de conexões;
2. habilita a extensão `pgcrypto`, se necessário;
3. cria tabelas e índices ausentes;
4. adiciona colunas compatíveis com versões anteriores;
5. cria a empresa padrão com o ID `00000000-0000-4000-8000-000000000001`;
6. inicia o servidor somente após o schema estar disponível.

Esse comportamento simplifica o desenvolvimento local. Para ambientes controlados, prefira aplicar e auditar as migrações SQL antes do deploy.

### Entidades principais

- `empresas`
- `usuarios`
- `produtos`
- `logs_acesso`
- `lotes`
- `movimentacoes_estoque`
- `vendas` e `itens_venda`
- `fornecedores` e `produto_fornecedor`
- `pedidos_compra` e `itens_pedido`
- `alertas`
- `recomendacoes` e `decisoes_recomendacao`
- `relatorios`

As novas consultas operacionais são segmentadas por `empresa_id`. A empresa padrão mantém compatibilidade com os dados legados do MVP.

### Migrações

Os arquivos versionados estão em `supabase/migrations/`. O arquivo principal do módulo de inteligência é:

```text
supabase/migrations/20260713160000_stockia_intelligence_mvp.sql
```

Se estiver usando o Supabase CLI, vincule o projeto e aplique as migrações de acordo com o fluxo do seu ambiente. Não execute scripts de upgrade em produção sem backup e revisão prévia.

## Scripts disponíveis

Execute os comandos abaixo na raiz do monorepo:

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o frontend com hot reload. |
| `npm run api` | Inicia a API Node.js. |
| `npm run build` | Verifica o TypeScript e gera o frontend de produção. |
| `npm run preview` | Serve localmente o build do frontend. |
| `npm test` | Executa os testes automatizados do backend. |

Também é possível direcionar comandos a um workspace:

```bash
npm run dev --workspace frontend
npm run api --workspace backend
npm run test --workspace backend
```

## Regras de inteligência

### FEFO

Nas saídas sem lote especificado, a API consome primeiro os lotes disponíveis com menor `data_validade`. A operação é transacional e impede que o estoque do produto ou do lote fique negativo.

### Risco de vencimento

| Nível | Prazo |
| --- | --- |
| Vencido | validade anterior à data de referência |
| Crítico | até 7 dias |
| Alto | de 8 a 15 dias |
| Médio | de 16 a 30 dias |
| Baixo | mais de 30 dias |

O valor financeiro em risco considera a quantidade que provavelmente não será vendida antes do vencimento:

```text
quantidade vendável = média diária de vendas × dias restantes
perda potencial = máximo(0, quantidade disponível − quantidade vendável)
valor em risco = perda potencial × custo unitário
```

### Previsão de demanda

A média diária pondera os históricos de 7, 14 e 30 dias:

```text
média diária = média7 × 0,50 + média14 × 0,25 + média30 × 0,25
previsão de 7 dias = média diária × 7
previsão de 30 dias = média diária × 30
```

A tendência é classificada como alta, queda, estável ou indefinida conforme a variação e a disponibilidade de histórico.

### Reposição

A recomendação considera:

- demanda prevista;
- prazo de entrega do fornecedor;
- estoque mínimo e máximo;
- estoque de segurança;
- quantidade mínima de compra;
- lotes com risco de vencimento.

Compras são bloqueadas quando há lotes do mesmo produto em risco alto, crítico ou vencido, evitando aumentar uma possível perda.

### Promoções

O sistema sugere percentuais de desconto conforme o risco de vencimento e sinaliza quando a margem pode ficar abaixo do custo. A promoção é apenas recomendada: nenhum preço é alterado automaticamente.

### Consulta com IA

O backend:

- limita a pergunta a 500 caracteres;
- inclui até oito mensagens recentes da conversa;
- prepara um contexto com dados reais do StockIA;
- solicita à Groq uma resposta JSON estruturada;
- valida escopo, intenção, período, cards e tela relacionada;
- não fornece à IA acesso direto ao banco nem permite execução de SQL livre.

Sem `GROQ_API_KEY`, somente essa funcionalidade fica indisponível.

## API HTTP

A API usa JSON e, por padrão, responde em `http://localhost:3333`.

Rotas de cadastro e auditoria:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Verifica a disponibilidade da API. |
| `GET` | `/api/users` | Lista usuários. |
| `PUT` | `/api/users` | Persiste a coleção de usuários enviada. |
| `DELETE` | `/api/users/:id` | Exclui um usuário. |
| `GET` | `/api/products` | Lista produtos. |
| `PUT` | `/api/products` | Persiste a coleção de produtos enviada. |
| `DELETE` | `/api/products/:id` | Exclui um produto. |
| `GET` | `/api/access-logs` | Lista os registros de acesso. |
| `PUT` | `/api/access-logs` | Persiste os registros de acesso enviados. |

Rotas operacionais e de inteligência:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/batches` | Lista lotes. |
| `GET` | `/api/stock-movements` | Lista movimentações. |
| `POST` | `/api/stock-movements` | Registra uma movimentação de estoque. |
| `GET` | `/api/sales` | Lista vendas. |
| `GET` | `/api/sale-items` | Lista itens de venda. |
| `GET` | `/api/suppliers` | Lista fornecedores. |
| `GET` | `/api/product-suppliers` | Lista vínculos entre produtos e fornecedores. |
| `GET` | `/api/alerts` | Lista alertas. |
| `GET` | `/api/recommendations` | Lista recomendações persistidas. |
| `POST` | `/api/recommendations/decision` | Registra uma decisão sobre uma recomendação. |
| `GET` | `/api/reports` | Lista relatórios. |
| `GET` | `/api/dashboard` | Retorna os indicadores do painel. |
| `GET` | `/api/expiration-risks` | Calcula riscos de vencimento. |
| `GET` | `/api/demand-forecasts` | Calcula previsões de demanda. |
| `GET` | `/api/replenishments` | Calcula recomendações de reposição. |
| `GET` | `/api/promotions` | Calcula sugestões de promoção. |
| `POST` | `/api/assistant/messages` | Envia uma consulta contextual à IA. |

As rotas operacionais `GET` aceitam `companyId` na query string:

```text
GET /api/dashboard?companyId=00000000-0000-4000-8000-000000000001
```

Quando o parâmetro não é informado, a API utiliza a empresa padrão do MVP.

## Testes

Execute:

```bash
npm test
```

A suíte atual cobre:

- cálculo determinístico de dias até o vencimento;
- classificação e valor financeiro do risco;
- previsão sem histórico e tendência de alta;
- estoque mínimo e bloqueio de reposição por risco;
- descontos e proteção de margem;
- extração e normalização do JSON retornado pela Groq;
- ausência de chave da Groq;
- envio de contexto real e histórico à API de IA;
- classificação de perguntas fora do escopo.

Os testes da integração com a Groq usam uma implementação simulada de `fetch`; nenhuma chamada externa real é necessária.

Antes de abrir uma alteração, execute:

```bash
npm test
npm run build
```

## Perfis e primeiro acesso

| Perfil | Acesso |
| --- | --- |
| `admin` | Todas as telas, incluindo relatórios, usuários e métricas. |
| `staff` | Operação de produtos, lotes, previsões, reposição, promoções, consulta, alertas e histórico. |

Regras atuais:

- o primeiro cadastro recebe `admin`;
- cadastros posteriores recebem `staff`;
- um administrador pode criar, editar e excluir usuários;
- o usuário conectado não pode excluir a própria conta;
- o último administrador não pode ser excluído.

## Segurança e limitações atuais

Antes de publicar o sistema, considere os seguintes pontos:

- **Senhas ainda são armazenadas sem hash** e comparadas no frontend.
- **A API não possui autenticação nem autorização próprias**; as restrições de tela não substituem controle de acesso no servidor.
- **O CORS está aberto (`*`)** na implementação atual, embora exista `CORS_ORIGIN` no ambiente.
- **Não há RLS efetiva por sessão**; `companyId` é recebido na solicitação em várias rotas.
- **As rotas `PUT` de usuários, produtos e logs trabalham com coleções completas**, o que exige controle de concorrência em uma evolução futura.
- **A criação automática do schema** é conveniente no desenvolvimento, mas migrações explícitas são mais seguras em produção.
- **Não há geração de PDF** sem uma biblioteca adicional.
- **Alertas e snapshots não são executados por jobs agendados**.

Não utilize o MVP com dados sensíveis ou acesso público antes de implementar hash de senhas, sessões seguras, autorização no backend, validação de payloads, limitação de requisições, CORS restrito e política de segredos.

## Solução de problemas

### `DATABASE_URL não foi configurada`

Confirme que o arquivo `.env` está na raiz do monorepo, no mesmo nível do `package.json` principal, e que contém uma URL válida.

### Erro de SSL no PostgreSQL

Provedores gerenciados normalmente exigem:

```env
DATABASE_SSL=true
```

No PostgreSQL local, normalmente use `false`.

### Erro ao criar `pgcrypto`

O usuário do banco precisa de permissão para executar:

```sql
create extension if not exists pgcrypto;
```

Peça essa permissão ao administrador do banco ou habilite a extensão antes de iniciar a API.

### Frontend exibe erro de conexão

Verifique:

1. se a API está ativa em `API_PORT`;
2. se `/api/health` responde;
3. se `VITE_API_URL` aponta para a API;
4. se o frontend foi reiniciado após alterar o `.env`.

### A consulta com IA não responde

Confirme `GROQ_API_KEY`, o modelo configurado em `GROQ_MODEL` e o acesso de rede do backend. A chave nunca deve usar o prefixo `VITE_`, pois isso a exporia no bundle do navegador.

### Porta já está em uso

Altere a API:

```env
API_PORT=3334
VITE_API_URL=http://localhost:3334
```

Depois reinicie backend e frontend.

## Próximos passos

- armazenar senhas com hash e autenticar por sessão ou token seguro;
- aplicar autorização e isolamento por empresa no backend;
- configurar RLS no Supabase quando aplicável;
- validar payloads de entrada com schemas;
- restringir CORS por ambiente;
- criar jobs para alertas, recomendações e snapshots;
- ampliar a cobertura de testes de integração da API e do banco;
- adicionar tratamento de sazonalidade e outliers às previsões;
- gerar relatórios exportáveis;
- preparar observabilidade, logs estruturados e pipeline de deploy.

Mais detalhes sobre fórmulas e decisões arquiteturais estão em [`docs/technical.md`](docs/technical.md).
