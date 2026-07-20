# StockIA - Documento tecnico do MVP

## Decisoes arquiteturais

- A stack existente foi preservada: React, Vite, TypeScript, Node.js ESM, PostgreSQL e `pg`.
- Nao foi introduzido ORM para evitar reescrita do projeto.
- O backend ganhou transacoes via `Pool.connect()` para operacoes criticas de estoque.
- Os endpoints usam SQL parametrizado e nao aceitam SQL livre.
- Os calculos principais foram colocados em funcoes deterministicas e testaveis.
- Dados sao filtrados por `empresa_id` nas novas consultas.

## Modelo de dados

O MVP adiciona:

- empresas;
- lotes;
- movimentacoes de estoque;
- vendas e itens de venda;
- fornecedores e produto-fornecedor;
- pedidos de compra e itens;
- alertas;
- recomendacoes;
- decisoes sobre recomendacoes;
- relatorios.

Produtos, usuarios e logs receberam `empresa_id`.

## FEFO

Saidas sem lote informado selecionam lotes disponiveis do produto ordenados por `data_validade asc`.

Regras:

- quantidade deve ser positiva;
- produto deve pertencer a empresa informada;
- estoque do produto nao pode ficar negativo;
- lote nao pode ficar com quantidade negativa;
- cada baixa gera movimentacao;
- tudo ocorre em transacao.

## Risco de vencimento

Classificacao:

- vencido: validade anterior a data de referencia;
- critico: ate 7 dias;
- alto: 8 a 15 dias;
- medio: 16 a 30 dias;
- baixo: mais de 30 dias.

Formulas:

```text
quantidadeVendavelAntesDoVencimento = mediaDiariaDeVendas * diasRestantes
quantidadePotencialmentePerdida = max(0, quantidadeDisponivel - quantidadeVendavelAntesDoVencimento)
valorEmRisco = quantidadePotencialmentePerdida * custoUnitario
percentualDeRisco = quantidadePotencialmentePerdida / quantidadeDisponivel * 100
```

Divisoes por zero retornam risco percentual `0`.

## Previsao de demanda

Metodo inicial:

```text
mediaDiaria = media7 * 0.5 + media14 * 0.25 + media30 * 0.25
demandaPrevista7Dias = round(mediaDiaria * 7)
demandaPrevista30Dias = round(mediaDiaria * 30)
```

Tendencia:

- alta: variacao maior que 15%;
- queda: variacao menor que -15%;
- estavel: dentro da faixa;
- indefinida: sem historico.

## Reposicao

Formulas:

```text
estoqueSeguranca = max(estoqueMinimo * 0.4, mediaDiaria * 3)
demandaDurantePrazo = mediaDiaria * prazoEntrega
pontoDeReposicao = demandaDurantePrazo + estoqueSeguranca
quantidadeSugerida = demandaPrevista30Dias + estoqueSeguranca - estoqueDisponivel
```

Regras:

- nunca sugerir quantidade negativa;
- respeitar minimo de compra do fornecedor;
- limitar ao estoque maximo quando configurado;
- bloquear compra quando ha lote do produto em risco alto, critico ou vencido.

## Promocoes

Faixas iniciais:

- medio: 8%;
- alto: 15%;
- critico/vencido: 28%.

O sistema apenas recomenda. Ele nao aplica desconto automaticamente.

## Alertas

Alertas sao deduplicados por `empresa_id + chave_logica`.

Exemplos:

- `estoque_zerado:{produtoId}`;
- `estoque_baixo:{produtoId}`;
- `validade:{loteId}:{nivel}`;
- `reposicao:{produtoId}`.

## Assistente

O assistente usa regras de palavras-chave e intencoes controladas. Ele consulta servicos internos e retorna respostas baseadas nos dados carregados.

Nao executa SQL livre, nao usa LLM e limita a mensagem de entrada a 500 caracteres no backend.

## Hipoteses adotadas

- A empresa padrao legado usa o id `00000000-0000-4000-8000-000000000001`.
- Sem historico suficiente, a confianca fica baixa.
- Produto com estoque zerado pode indicar demanda reprimida, por isso a interface informa limitação.
- PDF nao foi implementado sem biblioteca existente.

## Evolucao futura

- Hash de senhas e sessao autenticada.
- RLS real no Supabase com claims de empresa.
- Jobs agendados para gerar alertas e snapshots.
- Forecast provider com sazonalidade por dia da semana.
- Modelo estatistico mais robusto com tratamento de outliers.
- Futuro provider de ML mantendo a interface `DemandForecastProvider`.
