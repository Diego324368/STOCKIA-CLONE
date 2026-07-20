import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAssistantAnswer,
  ruleBasedFallback,
  safeJsonParse,
  normalizeResponse,
} from '../server/assistant.mjs';

const baseDashboard = {
  totalStockValue: 1000,
  totalProducts: 10,
  belowMinimum: 2,
  excessStock: 0,
  expiringBatches: 3,
  expiredBatches: 1,
  financialValueAtRisk: 450.5,
  monthLosses: 120,
  pendingRecommendations: 4,
  updatedAt: '2026-07-13T00:00:00.000Z',
  priorityAlerts: [],
  replenishments: [
    { product: { id: '1', name: 'Arroz 5kg', unit: 'un' }, currentStock: 2, reorderPoint: 5, suggestedQuantity: 20, estimatedCost: 100, priority: 'critica', reason: 'Abaixo do minimo', supplier: null, supplierLeadTimeDays: 3, confidenceLevel: 'alta', risks: [] },
  ],
  expirationRisks: [
    { product: { id: '2', name: 'Leite 1L' }, batch: { id: 'b1', batchNumber: 'L-01' }, daysRemaining: 4, riskLevel: 'critico', availableQuantity: 10, valueAtRisk: 40, confidenceLevel: 'alta' },
  ],
  promotionSuggestions: [
    { product: { id: '3', name: 'Iogurte' }, batch: { id: 'b2' }, currentPrice: 5, promotionalPrice: 3.5, suggestedDiscountPercentage: 30, quantityAtRisk: 12, avoidableLossValue: 18, justification: 'Vencimento proximo', currentMargin: 20, estimatedMargin: 10, confidenceLevel: 'media', warnings: [] },
  ],
  topTurnoverProducts: [],
  lowTurnoverProducts: [],
};

test('safeJsonParse extrai JSON mesmo com cercas de markdown', () => {
  const parsed = safeJsonParse('```json\n{"answer": "ok"}\n```');
  assert.deepEqual(parsed, { answer: 'ok' });
});

test('safeJsonParse retorna null para texto invalido', () => {
  assert.equal(safeJsonParse('isso nao e json'), null);
});

test('normalizeResponse aplica valores padrao para campos ausentes', () => {
  const normalized = normalizeResponse({ answer: 'Resposta da IA' }, baseDashboard);
  assert.equal(normalized.answer, 'Resposta da IA');
  assert.equal(normalized.intent, 'consulta_geral');
  assert.equal(normalized.relatedScreen, 'inicio');
  assert.deepEqual(normalized.cards, []);
});

test('normalizeResponse rejeita relatedScreen invalido', () => {
  const normalized = normalizeResponse({ answer: 'x', relatedScreen: 'pagina_inexistente' }, baseDashboard);
  assert.equal(normalized.relatedScreen, 'inicio');
});

test('ruleBasedFallback responde sobre estoque baixo', () => {
  const response = ruleBasedFallback('quais produtos estao acabando?', baseDashboard);
  assert.equal(response.intent, 'consultar_estoque_baixo');
  assert.match(response.answer, /2 produtos/);
});

test('ruleBasedFallback responde sobre valor em risco', () => {
  const response = ruleBasedFallback('quanto dinheiro esta em risco?', baseDashboard);
  assert.equal(response.intent, 'consultar_valor_em_risco');
  assert.match(response.answer, /R\$/);
});

test('generateAssistantAnswer usa fallback quando GROQ_API_KEY nao esta definida', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const response = await generateAssistantAnswer({
      message: 'o que vence essa semana?',
      dashboard: baseDashboard,
      forecasts: [],
    });
    assert.equal(response.intent, 'consultar_vencimentos');
  } finally {
    if (previousKey !== undefined) process.env.GROQ_API_KEY = previousKey;
  }
});

test('generateAssistantAnswer trata mensagem vazia sem chamar IA', async () => {
  const response = await generateAssistantAnswer({ message: '   ', dashboard: baseDashboard, forecasts: [] });
  assert.equal(response.intent, 'ajuda');
});
