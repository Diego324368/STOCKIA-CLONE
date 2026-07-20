import { randomUUID } from 'node:crypto';

// const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const REQUEST_TIMEOUT_MS = 20000;

const VALID_SCREENS = ['inicio', 'lotes', 'recomendacoes', 'promocoes', 'previsoes', 'alertas'];

function currency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Reduz os dados completos do dashboard para um contexto compacto o suficiente
 * para caber no prompt, mas com todos os numeros que a IA precisa para responder
 * sem inventar valores.
 */
function buildContext(dashboard, forecasts) {
  return {
    resumo: {
      valorTotalEstoque: dashboard.totalStockValue,
      totalProdutos: dashboard.totalProducts,
      produtosAbaixoMinimo: dashboard.belowMinimum,
      produtosComExcesso: dashboard.excessStock,
      lotesProximosVencimento: dashboard.expiringBatches,
      lotesVencidos: dashboard.expiredBatches,
      valorFinanceiroEmRisco: dashboard.financialValueAtRisk,
      perdasNoMes: dashboard.monthLosses,
      recomendacoesPendentes: dashboard.pendingRecommendations,
      atualizadoEm: dashboard.updatedAt,
    },
    alertasPrioritarios: dashboard.priorityAlerts.slice(0, 8).map((alert) => ({
      titulo: alert.title,
      mensagem: alert.message,
      prioridade: alert.priority,
    })),
    lotesEmRisco: dashboard.expirationRisks.slice(0, 10).map((risk) => ({
      produto: risk.product.name,
      lote: risk.batch.batchNumber,
      diasRestantes: risk.daysRemaining,
      risco: risk.riskLevel,
      quantidade: risk.availableQuantity,
      valorEmRisco: risk.valueAtRisk,
    })),
    reposicoesSugeridas: dashboard.replenishments.slice(0, 10).map((item) => ({
      produto: item.product.name,
      estoqueAtual: item.currentStock,
      pontoDeReposicao: item.reorderPoint,
      quantidadeSugerida: item.suggestedQuantity,
      custoEstimado: item.estimatedCost,
      prioridade: item.priority,
      motivo: item.reason,
      fornecedor: item.supplier?.name ?? null,
      prazoFornecedorDias: item.supplierLeadTimeDays,
    })),
    promocoesSugeridas: dashboard.promotionSuggestions.slice(0, 10).map((item) => ({
      produto: item.product.name,
      precoAtual: item.currentPrice,
      precoPromocional: item.promotionalPrice,
      descontoSugerido: item.suggestedDiscountPercentage,
      quantidadeEmRisco: item.quantityAtRisk,
      perdaEvitavel: item.avoidableLossValue,
      justificativa: item.justification,
    })),
    previsoesDemanda: (forecasts ?? []).slice(0, 10).map((forecast) => ({
      produto: forecast.product.name,
      demandaPrevista7Dias: forecast.demandaPrevista7Dias,
      demandaPrevista30Dias: forecast.demandaPrevista30Dias,
      mediaDiaria: forecast.mediaDiaria,
      tendencia: forecast.tendencia,
      confianca: forecast.nivelConfianca,
    })),
    topProdutosGiro: dashboard.topTurnoverProducts.slice(0, 5).map((product) => product.name),
    produtosBaixoGiro: dashboard.lowTurnoverProducts.slice(0, 5).map((product) => product.name),
  };
}

const SYSTEM_PROMPT = `Voce e o assistente de estoque do StockIA, um sistema de gestao de estoque para pequenos mercados, mercearias e supermercados.

Regras obrigatorias:
1. Responda SEMPRE em portugues do Brasil, de forma direta e util para um lojista sem conhecimento tecnico.
2. Use APENAS os dados fornecidos no bloco "Dados atuais do estoque". Nunca invente numeros, produtos ou fornecedores que nao estejam nesses dados.
3. Se os dados nao tiverem informacao suficiente para responder, diga isso claramente em vez de supor.
4. Sua resposta final deve ser SOMENTE um objeto JSON valido, sem markdown, sem crases e sem texto antes ou depois, no seguinte formato:
{
  "intent": "identificador_curto_em_snake_case",
  "answer": "resposta em texto corrido, em portugues, citando os numeros relevantes",
  "period": "descricao curta do periodo/base de dados usada, ex: 'Estoque atual' ou 'Ultimos 30 dias'",
  "cards": [ { "title": "string", "description": "string", "value": "string opcional" } ],
  "relatedScreen": "uma das opcoes: inicio, lotes, recomendacoes, promocoes, previsoes, alertas"
}
5. Preencha "cards" com no maximo 5 itens, cada um resumindo um produto/lote/recomendacao relevante para a pergunta. Se nao houver itens relevantes, retorne uma lista vazia.
6. Nunca inclua chaves alem das listadas acima.`;

export function safeJsonParse(rawText) {
  if (!rawText) return null;

  let text = rawText.trim();

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    text = fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function normalizeCards(cards) {
  if (!Array.isArray(cards)) return [];

  return cards
    .filter((card) => card && typeof card === 'object' && typeof card.title === 'string')
    .slice(0, 5)
    .map((card) => ({
      title: String(card.title),
      description: typeof card.description === 'string' ? card.description : '',
      value: card.value === undefined || card.value === null ? undefined : String(card.value),
    }));
}

export function normalizeResponse(parsed, fallbackDashboard) {
  if (!parsed || typeof parsed !== 'object' || typeof parsed.answer !== 'string' || !parsed.answer.trim()) {
    return ruleBasedFallback('', fallbackDashboard);
  }

  return {
    intent: typeof parsed.intent === 'string' && parsed.intent.trim() ? parsed.intent.trim() : 'consulta_geral',
    answer: parsed.answer.trim(),
    period: typeof parsed.period === 'string' && parsed.period.trim() ? parsed.period.trim() : 'Estoque atual',
    cards: normalizeCards(parsed.cards),
    relatedScreen: VALID_SCREENS.includes(parsed.relatedScreen) ? parsed.relatedScreen : 'inicio',
  };
}

/**
 * Assistente por regras, usado como rede de seguranca quando a IA generativa
 * nao esta configurada (sem ANTHROPIC_API_KEY) ou quando a chamada falha.
 * Garante que o assistente continue funcional mesmo sem IA disponivel.
 */
export function ruleBasedFallback(message, dashboard) {
  const text = String(message ?? '').slice(0, 500).toLowerCase();

  if (text.includes('acabando') || text.includes('baixo')) {
    return {
      intent: 'consultar_estoque_baixo',
      answer: `${dashboard.belowMinimum} produtos estao abaixo do estoque minimo.`,
      period: 'Estoque atual',
      cards: dashboard.replenishments.slice(0, 5).map((item) => ({ title: item.product.name, description: item.reason, value: `${item.suggestedQuantity} ${item.product.unit ?? 'un'}` })),
      relatedScreen: 'recomendacoes',
    };
  }
  if (text.includes('vence') || text.includes('validade')) {
    return {
      intent: 'consultar_vencimentos',
      answer: `${dashboard.expiringBatches} lotes vencem nos proximos 30 dias e ${dashboard.expiredBatches} ja estao vencidos.`,
      period: 'Estoque atual',
      cards: dashboard.expirationRisks.slice(0, 5).map((item) => ({ title: item.product.name, description: `Lote ${item.batch.batchNumber}`, value: `${item.daysRemaining} dias` })),
      relatedScreen: 'lotes',
    };
  }
  if (text.includes('risco') || text.includes('dinheiro')) {
    return {
      intent: 'consultar_valor_em_risco',
      answer: `O valor financeiro em risco e ${currency(dashboard.financialValueAtRisk)}.`,
      period: 'Estoque atual',
      cards: [],
      relatedScreen: 'lotes',
    };
  }
  if (text.includes('comprar') || text.includes('reposi')) {
    return {
      intent: 'consultar_reposicoes',
      answer: `Ha ${dashboard.replenishments.length} recomendacoes de reposicao.`,
      period: 'Baseado no historico registrado',
      cards: dashboard.replenishments.slice(0, 5).map((item) => ({ title: item.product.name, description: item.reason, value: `${item.suggestedQuantity} ${item.product.unit ?? 'un'}` })),
      relatedScreen: 'recomendacoes',
    };
  }
  if (text.includes('promoc')) {
    return {
      intent: 'consultar_promocoes',
      answer: `Ha ${dashboard.promotionSuggestions.length} sugestoes de promocao.`,
      period: 'Estoque atual',
      cards: dashboard.promotionSuggestions.slice(0, 5).map((item) => ({ title: item.product.name, description: item.justification, value: `${item.suggestedDiscountPercentage}%` })),
      relatedScreen: 'promocoes',
    };
  }

  return {
    intent: 'ajuda',
    answer: 'Posso consultar produtos acabando, vencimentos, valor em risco, reposicoes, promocoes e valor total do estoque.',
    period: 'Estoque atual',
    cards: [],
    relatedScreen: 'inicio',
  };
}

async function callAnthropic({ apiKey, model, message, context, conversation }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const history = (conversation ?? []).slice(-6).map((turn) => ({
      role: turn.from === 'user' ? 'user' : 'assistant',
      content: turn.text,
    }));

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          ...history,
          {
            role: 'user',
            content: `Pergunta do usuario: """${message}"""\n\nDados atuais do estoque (JSON, unica fonte de verdade):\n${JSON.stringify(context)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Anthropic API respondeu ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const data = await response.json();
    const textBlock = Array.isArray(data.content) ? data.content.find((block) => block.type === 'text') : null;

    return textBlock?.text ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Gera a resposta do assistente de estoque.
 *
 * Quando ANTHROPIC_API_KEY esta configurada, usa a API de mensagens da Anthropic
 * com os dados reais do estoque no prompt (contexto), para produzir respostas
 * livres em linguagem natural sem permitir que o modelo invente numeros.
 *
 * Sem a chave configurada, ou se a chamada falhar por qualquer motivo, cai para
 * um assistente por regras deterministico, para que o recurso nunca fique
 * totalmente indisponivel.
 */
export async function generateAssistantAnswer({ message, dashboard, forecasts, conversation }) {
  const cleanMessage = String(message ?? '').trim().slice(0, 500);

  if (!cleanMessage) {
    return {
      intent: 'ajuda',
      answer: 'Faca uma pergunta sobre estoque, validade, reposicao ou promocoes para eu poder ajudar.',
      period: 'Estoque atual',
      cards: [],
      relatedScreen: 'inicio',
    };
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return ruleBasedFallback(cleanMessage, dashboard);
  }

  try {
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const context = buildContext(dashboard, forecasts);
    const rawText = await callAnthropic({ apiKey, model, message: cleanMessage, context, conversation });
    const parsed = safeJsonParse(rawText);

    if (!parsed) {
      console.error('Assistente IA: resposta sem JSON valido, usando fallback por regras.');
      return ruleBasedFallback(cleanMessage, dashboard);
    }

    return normalizeResponse(parsed, dashboard);
  } catch (error) {
    console.error('Assistente IA: falha ao consultar a Anthropic, usando fallback por regras.', error);
    return ruleBasedFallback(cleanMessage, dashboard);
  }
}

export function newConversationId() {
  return randomUUID();
}
