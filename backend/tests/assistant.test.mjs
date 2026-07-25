import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAssistantAnswer,
  normalizeResponse,
  safeJsonParse,
} from '../server/assistant.mjs';

const baseDashboard = {
  totalStockValue: 1000,
  totalProducts: 2,
  belowMinimum: 1,
  excessStock: 0,
  expiringBatches: 0,
  expiredBatches: 0,
  financialValueAtRisk: 0,
  monthLosses: 0,
  pendingRecommendations: 0,
  updatedAt: '2026-07-24T12:00:00.000Z',
  priorityAlerts: [],
  replenishments: [],
  expirationRisks: [],
  promotionSuggestions: [],
};

const products = [
  {
    id: 'p1',
    name: 'Arroz',
    category: 'Mercearia',
    quantity: 10,
    minQuantity: 3,
    unit: 'un',
    price: 8,
    costPrice: 5,
  },
];

test('safeJsonParse extrai JSON mesmo com cercas de markdown', () => {
  const parsed = safeJsonParse('```json\n{"answer":"ok"}\n```');
  assert.deepEqual(parsed, { answer: 'ok' });
});

test('normalizeResponse valida escopo do sistema', () => {
  const response = normalizeResponse({
    scope: 'sistema',
    intent: 'consultar_produtos',
    answer: 'Há um produto.',
    period: 'Estoque atual',
    cards: [{ title: 'Arroz', description: 'Mercearia', value: '10 un' }],
    relatedScreen: 'inicio',
  });
  assert.equal(response.scope, 'sistema');
  assert.equal(response.cards.length, 1);
});

test('normalizeResponse remove cards de perguntas fora do escopo', () => {
  const response = normalizeResponse({
    scope: 'fora_do_escopo',
    intent: 'fora_do_escopo',
    answer: 'Atendo apenas questões do StockIA.',
    period: 'Fora do escopo',
    cards: [{ title: 'Não deve aparecer', description: '' }],
    relatedScreen: 'inicio',
  });
  assert.equal(response.scope, 'fora_do_escopo');
  assert.deepEqual(response.cards, []);
});

test('generateAssistantAnswer exige GROQ_API_KEY e não usa resposta automatizada', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    await assert.rejects(
      () => generateAssistantAnswer({
        message: 'Qual produto vendeu mais?',
        dashboard: baseDashboard,
        products,
      }),
      /GROQ_API_KEY não configurada/,
    );
  } finally {
    if (previousKey !== undefined) process.env.GROQ_API_KEY = previousKey;
  }
});

test('generateAssistantAnswer envia pergunta e dados reais para a API da Groq', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousFetch = global.fetch;
  process.env.GROQ_API_KEY = 'test-key';
  let capturedRequest;
  global.fetch = async (url, options) => {
    capturedRequest = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      async json() {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                scope: 'sistema',
                intent: 'consultar_produto',
                answer: 'O Arroz possui 10 unidades em estoque.',
                period: 'Estoque atual',
                cards: [{ title: 'Arroz', description: 'Mercearia', value: '10 un' }],
                relatedScreen: 'inicio',
              }),
            },
          }],
        };
      },
    };
  };

  try {
    const response = await generateAssistantAnswer({
      message: 'Quanto arroz há no estoque?',
      dashboard: baseDashboard,
      products,
    });
    assert.equal(capturedRequest.url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(capturedRequest.options.headers.Authorization, 'Bearer test-key');
    assert.match(capturedRequest.body.messages.at(-1).content, /Quanto arroz há no estoque/);
    assert.match(capturedRequest.body.messages.at(-1).content, /"nome":"Arroz"/);
    assert.equal(response.scope, 'sistema');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});

test('generateAssistantAnswer aceita classificação fora do escopo feita pela Groq', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousFetch = global.fetch;
  process.env.GROQ_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              scope: 'fora_do_escopo',
              intent: 'fora_do_escopo',
              answer: 'Atendo apenas questões relacionadas ao StockIA e à gestão do estoque.',
              period: 'Fora do escopo',
              cards: [],
              relatedScreen: 'inicio',
            }),
          },
        }],
      };
    },
  });

  try {
    const response = await generateAssistantAnswer({
      message: 'Qual é a capital da França?',
      dashboard: baseDashboard,
      products,
    });
    assert.equal(response.scope, 'fora_do_escopo');
    assert.equal(response.intent, 'fora_do_escopo');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});
