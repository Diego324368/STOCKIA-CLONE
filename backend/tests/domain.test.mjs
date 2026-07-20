import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExpirationRisks,
  calculateForecasts,
  calculatePromotions,
  calculateReplenishments,
  daysBetween,
} from '../server/repository.mjs';

const companyId = '00000000-0000-4000-8000-000000000001';
const product = {
  id: '10000000-0000-4000-8000-000000000001',
  companyId,
  name: 'Arroz 5kg',
  quantity: 8,
  minQuantity: 10,
  maxQuantity: 40,
  costPrice: 18,
  price: 28,
  createdBy: '20000000-0000-4000-8000-000000000001',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  active: true,
  unit: 'un',
};

test('calcula dias ate o vencimento de forma deterministica', () => {
  assert.equal(daysBetween('2026-07-13T12:00:00.000Z', '2026-07-20T00:00:00.000Z'), 7);
});

test('classifica risco critico e valor financeiro em risco', () => {
  const risks = calculateExpirationRisks(
    [product],
    [{
      id: '30000000-0000-4000-8000-000000000001',
      companyId,
      productId: product.id,
      batchNumber: 'L-001',
      initialQuantity: 10,
      availableQuantity: 10,
      entryDate: '2026-07-01T00:00:00.000Z',
      expirationDate: '2026-07-18T00:00:00.000Z',
      unitCost: 18,
      status: 'available',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }],
    [],
    [],
    '2026-07-13T00:00:00.000Z',
  );

  assert.equal(risks[0].riskLevel, 'critico');
  assert.equal(risks[0].valueAtRisk, 180);
  assert.equal(risks[0].confidenceLevel, 'baixa');
});

test('previsao sem historico informa tendencia indefinida', () => {
  const [forecast] = calculateForecasts([product], [], [], '2026-07-13T00:00:00.000Z');

  assert.equal(forecast.demandaPrevista7Dias, 0);
  assert.equal(forecast.tendencia, 'indefinida');
  assert.equal(forecast.nivelConfianca, 'baixa');
});

test('previsao com alta recente identifica tendencia de alta', () => {
  const sales = Array.from({ length: 10 }, (_, index) => ({
    id: `40000000-0000-4000-8000-0000000000${String(index).padStart(2, '0')}`,
    companyId,
    totalValue: 28,
    saleDate: `2026-07-${String(4 + index).padStart(2, '0')}T10:00:00.000Z`,
    status: 'concluida',
  }));
  const saleItems = sales.map((sale, index) => ({
    id: `50000000-0000-4000-8000-0000000000${String(index).padStart(2, '0')}`,
    companyId,
    saleId: sale.id,
    productId: product.id,
    quantity: index >= 3 ? 4 : 1,
    unitPrice: 28,
    unitCost: 18,
  }));

  const [forecast] = calculateForecasts([product], sales, saleItems, '2026-07-13T00:00:00.000Z');

  assert.equal(forecast.tendencia, 'alta');
  assert.ok(forecast.demandaPrevista7Dias > 0);
});

test('reposicao respeita estoque minimo e bloqueia produto com lote em risco', () => {
  const forecast = {
    product,
    demandaPrevista7Dias: 14,
    demandaPrevista30Dias: 60,
    mediaDiaria: 2,
    tendencia: 'estavel',
    variacaoPercentual: 0,
    nivelConfianca: 'media',
    quantidadeRegistros: 8,
    metodoUtilizado: 'teste',
    observacoes: [],
  };

  const [normal] = calculateReplenishments([product], [forecast], [], [], []);
  assert.ok(normal.suggestedQuantity > 0);

  const blocked = calculateReplenishments([product], [forecast], [], [], [{ product, riskLevel: 'critico' }]);
  assert.equal(blocked[0].suggestedQuantity, 0);
});

test('promocao calcula desconto e alerta margem abaixo do custo', () => {
  const [promotion] = calculatePromotions([{
    product: { ...product, price: 20 },
    batch: { id: 'b1', expirationDate: '2026-07-18T00:00:00.000Z' },
    riskLevel: 'critico',
    potentialLossQuantity: 5,
    valueAtRisk: 90,
    unitCost: 18,
    confidenceLevel: 'baixa',
  }]);

  assert.equal(promotion.suggestedDiscountPercentage, 28);
  assert.ok(promotion.promotionalPrice >= 0);
  assert.equal(promotion.warnings.length, 1);
});
