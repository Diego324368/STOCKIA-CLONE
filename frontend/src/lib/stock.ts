import type {
  AccessLog,
  AlertPriority,
  AppUser,
  CompanySettings,
  DashboardIntelligence,
  DemandForecastResult,
  ExpirationRiskItem,
  Product,
  ProductBatch,
  ProductSupplier,
  PromotionSuggestion,
  ReplenishmentRecommendation,
  ReportSummary,
  Sale,
  SaleItem,
  StockAlert,
  StockMovement,
  Supplier,
} from '../types/models';
import type { AccessMetrics, DashboardMetrics, ReportMetrics, Screen } from '../types/app';
import { foodCategories } from './constants';

export function defaultUnitForCategory(category: string): string {
  return foodCategories.find((item) => item.value === category)?.unit ?? 'un';
}

export function isAdmin(user: AppUser | null): user is AppUser {
  return !!user && user.role === 'admin';
}

export function isRestrictedScreen(screen: Screen): boolean {
  return screen === 'usuarios' || screen === 'metricas' || screen === 'relatorios';
}

export function productStatus(product: Product): { label: string; className: string } {
  if (product.quantity === 0) {
    return { label: 'Zerado', className: 'danger' };
  }

  if (product.quantity <= product.minQuantity) {
    return { label: 'Critico', className: 'warning' };
  }

  if (product.quantity <= product.minQuantity * 2) {
    return { label: 'Baixo', className: 'low' };
  }

  return { label: 'Estavel', className: 'ok' };
}

export function getDashboardMetrics(products: Product[]): DashboardMetrics {
  const totalProdutos = products.length;
  const estoqueTotal = products.reduce((sum, product) => sum + product.quantity, 0);
  const valorTotal = products.reduce((sum, product) => sum + product.price * product.quantity, 0);
  const itensCriticos = products.filter((product) => product.quantity <= product.minQuantity).length;

  return { totalProdutos, estoqueTotal, valorTotal, itensCriticos };
}

export const defaultCompanySettings: CompanySettings = {
  expirationRiskDays: {
    critical: 7,
    high: 15,
    medium: 30,
  },
  promotionDiscounts: {
    medium: [5, 10],
    high: [10, 20],
    critical: [20, 35],
  },
};

const dayMs = 24 * 60 * 60 * 1000;

function startOfDay(value: string | Date): Date {
  const date = typeof value === 'string' ? new Date(value) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function daysBetween(referenceDate: string | Date, targetDate: string | Date): number {
  return Math.ceil((startOfDay(targetDate).getTime() - startOfDay(referenceDate).getTime()) / dayMs);
}

export function salesQuantityForProduct(
  productId: string,
  sales: Sale[],
  saleItems: SaleItem[],
  referenceDate: string | Date,
  days: number,
): number {
  const from = startOfDay(referenceDate).getTime() - days * dayMs;
  const validSaleIds = new Set(
    sales
      .filter((sale) => sale.status === 'concluida')
      .filter((sale) => {
        const time = new Date(sale.saleDate).getTime();
        return time >= from && time <= new Date(referenceDate).getTime();
      })
      .map((sale) => sale.id),
  );

  return saleItems
    .filter((item) => item.productId === productId && validSaleIds.has(item.saleId))
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateExpirationRisks(input: {
  products: Product[];
  batches: ProductBatch[];
  sales: Sale[];
  saleItems: SaleItem[];
  referenceDate: string | Date;
  settings?: CompanySettings;
}): ExpirationRiskItem[] {
  const settings = input.settings ?? defaultCompanySettings;

  return input.batches
    .filter((batch) => batch.availableQuantity > 0)
    .map((batch) => {
      const product = input.products.find((item) => item.id === batch.productId);
      if (!product) {
        return null;
      }

      const daysRemaining = daysBetween(input.referenceDate, batch.expirationDate);
      const quantity30 = salesQuantityForProduct(product.id, input.sales, input.saleItems, input.referenceDate, 30);
      const dailySalesAverage = quantity30 / 30;
      const sellableBeforeExpiration = Math.max(0, dailySalesAverage * Math.max(0, daysRemaining));
      const potentialLossQuantity = Math.max(0, batch.availableQuantity - sellableBeforeExpiration);
      const valueAtRisk = potentialLossQuantity * batch.unitCost;
      const riskPercentage = batch.availableQuantity > 0 ? (potentialLossQuantity / batch.availableQuantity) * 100 : 0;
      const confidenceLevel = quantity30 >= 30 ? 'alta' : quantity30 >= 8 ? 'media' : 'baixa';
      const observations = confidenceLevel === 'baixa' ? ['Historico insuficiente para uma estimativa precisa.'] : [];
      const riskLevel =
        daysRemaining < 0
          ? 'vencido'
          : daysRemaining <= settings.expirationRiskDays.critical
            ? 'critico'
            : daysRemaining <= settings.expirationRiskDays.high
              ? 'alto'
              : daysRemaining <= settings.expirationRiskDays.medium
                ? 'medio'
                : 'baixo';

      return {
        batch,
        product,
        daysRemaining,
        riskLevel,
        availableQuantity: batch.availableQuantity,
        unitCost: batch.unitCost,
        valueAtRisk,
        dailySalesAverage,
        sellableBeforeExpiration,
        potentialLossQuantity,
        riskPercentage,
        confidenceLevel,
        method: 'Media diaria dos ultimos 30 dias com limites configuraveis por empresa.',
        observations,
      } satisfies ExpirationRiskItem;
    })
    .filter((item): item is ExpirationRiskItem => item !== null)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function calculateDemandForecasts(input: {
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  referenceDate: string | Date;
}): DemandForecastResult[] {
  return input.products.map((product) => {
    const last7 = salesQuantityForProduct(product.id, input.sales, input.saleItems, input.referenceDate, 7);
    const last14 = salesQuantityForProduct(product.id, input.sales, input.saleItems, input.referenceDate, 14);
    const last30 = salesQuantityForProduct(product.id, input.sales, input.saleItems, input.referenceDate, 30);
    const previous7 = Math.max(0, last14 - last7);
    const media7 = last7 / 7;
    const media14 = last14 / 14;
    const media30 = last30 / 30;
    const mediaDiaria = last30 > 0 ? (media7 * 0.5 + media14 * 0.25 + media30 * 0.25) : 0;
    const variacaoPercentual = previous7 > 0 ? ((last7 - previous7) / previous7) * 100 : last7 > 0 ? null : null;
    const tendencia =
      last30 === 0
        ? 'indefinida'
        : variacaoPercentual === null
          ? 'estavel'
          : variacaoPercentual > 15
            ? 'alta'
            : variacaoPercentual < -15
              ? 'queda'
              : 'estavel';
    const quantidadeRegistros = input.saleItems.filter((item) => item.productId === product.id).length;
    const nivelConfianca = quantidadeRegistros >= 20 ? 'alta' : quantidadeRegistros >= 6 ? 'media' : 'baixa';
    const observacoes = [
      ...(quantidadeRegistros === 0 ? ['Produto sem historico de vendas.'] : []),
      ...(product.quantity === 0 ? ['Estoque zerado pode limitar a leitura da demanda real.'] : []),
      ...(nivelConfianca === 'baixa' ? ['Poucos registros: use como referencia conservadora.'] : []),
    ];

    return {
      product,
      demandaPrevista7Dias: Math.max(0, Math.round(mediaDiaria * 7)),
      demandaPrevista30Dias: Math.max(0, Math.round(mediaDiaria * 30)),
      mediaDiaria,
      tendencia,
      variacaoPercentual,
      nivelConfianca,
      quantidadeRegistros,
      metodoUtilizado: 'Medias moveis ponderadas de 7, 14 e 30 dias.',
      observacoes,
    };
  });
}

function priorityFromGap(gap: number, product: Product): AlertPriority {
  if (product.quantity === 0 || gap >= product.minQuantity) {
    return 'critica';
  }
  if (gap > product.minQuantity * 0.5) {
    return 'alta';
  }
  return 'media';
}

export function calculateReplenishments(input: {
  products: Product[];
  forecasts: DemandForecastResult[];
  suppliers: Supplier[];
  productSuppliers: ProductSupplier[];
  expirationRisks: ExpirationRiskItem[];
}): ReplenishmentRecommendation[] {
  return input.products
    .map((product) => {
      const forecast = input.forecasts.find((item) => item.product.id === product.id);
      const productSupplier = input.productSuppliers
        .filter((item) => item.productId === product.id)
        .sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.leadTimeDays - b.leadTimeDays)[0];
      const supplier = input.suppliers.find((item) => item.id === productSupplier?.supplierId);
      const leadTime = productSupplier?.leadTimeDays ?? supplier?.averageLeadTimeDays ?? 7;
      const mediaDiaria = forecast?.mediaDiaria ?? 0;
      const safetyStock = Math.ceil(Math.max(product.minQuantity * 0.4, mediaDiaria * 3));
      const demandDuringLeadTime = mediaDiaria * leadTime;
      const reorderPoint = Math.ceil(demandDuringLeadTime + safetyStock);
      const hasRisk = input.expirationRisks.some((risk) => risk.product.id === product.id && ['vencido', 'critico', 'alto'].includes(risk.riskLevel));
      let suggestedQuantity = Math.max(0, Math.ceil((forecast?.demandaPrevista30Dias ?? product.minQuantity) + safetyStock - product.quantity));
      if (product.maxQuantity !== undefined) {
        suggestedQuantity = Math.min(suggestedQuantity, Math.max(0, product.maxQuantity - product.quantity));
      }
      if (productSupplier) {
        suggestedQuantity = suggestedQuantity > 0 ? Math.max(suggestedQuantity, productSupplier.minimumPurchaseQuantity) : 0;
      }
      if (hasRisk) {
        suggestedQuantity = 0;
      }

      if (product.quantity > reorderPoint && suggestedQuantity === 0) {
        return null;
      }

      const recommendation: ReplenishmentRecommendation = {
        product,
        currentStock: product.quantity,
        reorderPoint,
        suggestedQuantity,
        supplierLeadTimeDays: leadTime,
        estimatedCost: suggestedQuantity * (productSupplier?.currentCost ?? product.costPrice),
        priority: priorityFromGap(Math.max(0, reorderPoint - product.quantity), product),
        confidenceLevel: forecast?.nivelConfianca ?? 'baixa',
        reason: hasRisk
          ? 'Compra bloqueada porque existem lotes do produto com risco de vencimento.'
          : product.quantity <= reorderPoint
            ? 'Estoque atual abaixo do ponto de reposicao calculado.'
            : 'Sugestao conservadora baseada no historico disponivel.',
        calculationData: {
          mediaDiaria,
          leadTime,
          safetyStock,
          demandDuringLeadTime,
          reorderPoint,
        },
        risks: [
          ...(hasRisk ? ['Ha lotes em risco de vencimento; priorize venda ou promocao antes de comprar.'] : []),
          ...((forecast?.nivelConfianca ?? 'baixa') === 'baixa' ? ['Historico limitado reduz a confianca da sugestao.'] : []),
        ],
      };

      if (supplier) {
        recommendation.supplier = supplier;
      }

      return recommendation;
    })
    .filter((item): item is ReplenishmentRecommendation => item !== null)
    .sort((a, b) => b.suggestedQuantity - a.suggestedQuantity);
}

export function calculatePromotionSuggestions(input: {
  expirationRisks: ExpirationRiskItem[];
  settings?: CompanySettings;
}): PromotionSuggestion[] {
  const settings = input.settings ?? defaultCompanySettings;

  return input.expirationRisks
    .filter((risk) => ['critico', 'alto', 'medio', 'vencido'].includes(risk.riskLevel) && risk.potentialLossQuantity > 0)
    .map((risk) => {
      const level = risk.riskLevel === 'vencido' ? 'critical' : risk.riskLevel === 'critico' ? 'critical' : risk.riskLevel === 'alto' ? 'high' : 'medium';
      const range = settings.promotionDiscounts[level];
      const suggestedDiscountPercentage = Math.round((range[0] + range[1]) / 2);
      const promotionalPrice = Math.max(0, risk.product.price * (1 - suggestedDiscountPercentage / 100));
      const currentMargin = risk.product.price > 0 ? ((risk.product.price - risk.unitCost) / risk.product.price) * 100 : 0;
      const estimatedMargin = promotionalPrice > 0 ? ((promotionalPrice - risk.unitCost) / promotionalPrice) * 100 : 0;
      const belowCost = promotionalPrice < risk.unitCost;

      return {
        product: risk.product,
        batch: risk.batch,
        expirationDate: risk.batch.expirationDate,
        quantityAtRisk: risk.potentialLossQuantity,
        currentPrice: risk.product.price,
        suggestedDiscountPercentage,
        promotionalPrice,
        currentMargin,
        estimatedMargin,
        potentialLossValue: risk.valueAtRisk,
        avoidableLossValue: risk.valueAtRisk * 0.75,
        justification: 'Sugestao baseada em dias ate o vencimento, quantidade em risco e historico de venda.',
        confidenceLevel: risk.confidenceLevel,
        warnings: belowCost ? ['Preco sugerido fica abaixo do custo; confirme antes de aplicar.'] : [],
      };
    });
}

export function generateAlerts(input: {
  products: Product[];
  expirationRisks: ExpirationRiskItem[];
  replenishments: ReplenishmentRecommendation[];
  referenceDate: string;
  companyId: string;
}): StockAlert[] {
  const alerts: StockAlert[] = [];
  const add = (alert: Omit<StockAlert, 'id' | 'createdAt' | 'status' | 'companyId'>) => {
    if (alerts.some((item) => item.logicalKey === alert.logicalKey)) {
      return;
    }
    alerts.push({
      id: alert.logicalKey,
      companyId: input.companyId,
      createdAt: input.referenceDate,
      status: 'novo',
      ...alert,
    });
  };

  input.products.forEach((product) => {
    if (product.quantity === 0) {
      add({
        productId: product.id,
        type: 'estoque_zerado',
        title: 'Produto zerado',
        message: `${product.name} esta sem estoque disponivel.`,
        priority: 'critica',
        logicalKey: `estoque_zerado:${product.id}`,
      });
    } else if (product.quantity <= product.minQuantity) {
      add({
        productId: product.id,
        type: 'estoque_baixo',
        title: 'Estoque abaixo do minimo',
        message: `${product.name} esta com ${product.quantity} unidades, abaixo do minimo ${product.minQuantity}.`,
        priority: 'alta',
        logicalKey: `estoque_baixo:${product.id}`,
      });
    }
  });

  input.expirationRisks.forEach((risk) => {
    if (risk.riskLevel === 'vencido' || risk.riskLevel === 'critico') {
      add({
        productId: risk.product.id,
        batchId: risk.batch.id,
        type: risk.riskLevel === 'vencido' ? 'lote_vencido' : 'lote_risco_critico',
        title: risk.riskLevel === 'vencido' ? 'Lote vencido' : 'Lote com risco critico',
        message: `${risk.product.name} lote ${risk.batch.batchNumber} tem ${risk.availableQuantity} unidades em risco.`,
        priority: risk.riskLevel === 'vencido' ? 'critica' : 'alta',
        logicalKey: `validade:${risk.batch.id}:${risk.riskLevel}`,
      });
    }
  });

  input.replenishments.forEach((recommendation) => {
    add({
      productId: recommendation.product.id,
      type: 'necessidade_reposicao',
      title: 'Reposicao recomendada',
      message: `${recommendation.product.name}: comprar ${recommendation.suggestedQuantity} ${recommendation.product.unit ?? 'un'}.`,
      priority: recommendation.priority,
      logicalKey: `reposicao:${recommendation.product.id}`,
    });
  });

  return alerts;
}

export function buildDashboardIntelligence(input: {
  companyId: string;
  products: Product[];
  batches: ProductBatch[];
  sales: Sale[];
  saleItems: SaleItem[];
  movements: StockMovement[];
  suppliers: Supplier[];
  productSuppliers: ProductSupplier[];
  referenceDate: string;
  alerts?: StockAlert[];
}): DashboardIntelligence {
  const risks = calculateExpirationRisks(input);
  const forecasts = calculateDemandForecasts(input);
  const replenishments = calculateReplenishments({ ...input, forecasts, expirationRisks: risks });
  const promotionSuggestions = calculatePromotionSuggestions({ expirationRisks: risks });
  const generatedAlerts = input.alerts ?? generateAlerts({ ...input, expirationRisks: risks, replenishments });
  const totalStockValue = input.products.reduce((sum, product) => sum + product.quantity * product.costPrice, 0);
  const monthStart = new Date(input.referenceDate);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthLosses = input.movements
    .filter((movement) => movement.type === 'perda' && new Date(movement.movementDate).getTime() >= monthStart.getTime())
    .reduce((sum, movement) => {
      const product = input.products.find((item) => item.id === movement.productId);
      return sum + movement.quantity * (product?.costPrice ?? 0);
    }, 0);

  return {
    totalStockValue,
    totalProducts: input.products.length,
    belowMinimum: input.products.filter((product) => product.quantity <= product.minQuantity).length,
    excessStock: input.products.filter((product) => product.maxQuantity !== undefined && product.quantity > product.maxQuantity).length,
    expiringBatches: risks.filter((risk) => ['critico', 'alto', 'medio'].includes(risk.riskLevel)).length,
    expiredBatches: risks.filter((risk) => risk.riskLevel === 'vencido').length,
    financialValueAtRisk: risks.reduce((sum, risk) => sum + risk.valueAtRisk, 0),
    monthLosses,
    pendingRecommendations: replenishments.length + promotionSuggestions.length,
    pendingPurchaseOrders: 0,
    topTurnoverProducts: [...input.products].sort((a, b) => salesQuantityForProduct(b.id, input.sales, input.saleItems, input.referenceDate, 30) - salesQuantityForProduct(a.id, input.sales, input.saleItems, input.referenceDate, 30)).slice(0, 5),
    lowTurnoverProducts: [...input.products].sort((a, b) => salesQuantityForProduct(a.id, input.sales, input.saleItems, input.referenceDate, 30) - salesQuantityForProduct(b.id, input.sales, input.saleItems, input.referenceDate, 30)).slice(0, 5),
    priorityAlerts: generatedAlerts.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority)).slice(0, 6),
    replenishments,
    expirationRisks: risks,
    promotionSuggestions,
    updatedAt: input.referenceDate,
  };
}

function priorityWeight(priority: AlertPriority): number {
  return { baixa: 1, media: 2, alta: 3, critica: 4 }[priority];
}

export function buildReportSummary(input: {
  dashboard: DashboardIntelligence;
  movements: StockMovement[];
  referenceDate: string;
}): ReportSummary {
  const entries = input.movements.filter((movement) => movement.type === 'entrada').reduce((sum, movement) => sum + movement.quantity, 0);
  const outputs = input.movements.filter((movement) => movement.type === 'saida').reduce((sum, movement) => sum + movement.quantity, 0);
  const losses = input.movements.filter((movement) => movement.type === 'perda').reduce((sum, movement) => sum + movement.quantity, 0);
  const direction = outputs >= entries ? 'aumento' : 'reducao';
  const variation = entries > 0 ? Math.round(((outputs - entries) / entries) * 100) : null;

  return {
    totalStockValue: input.dashboard.totalStockValue,
    stockEvolution: outputs - entries,
    entries,
    outputs,
    losses,
    topSellingProducts: input.dashboard.topTurnoverProducts.map((product) => ({ productName: product.name, quantity: product.quantity })),
    lowTurnoverProducts: input.dashboard.lowTurnoverProducts.map((product) => ({ productName: product.name, quantity: product.quantity })),
    belowMinimum: input.dashboard.belowMinimum,
    excessStock: input.dashboard.excessStock,
    expiringBatches: input.dashboard.expiringBatches,
    financialValueAtRisk: input.dashboard.financialValueAtRisk,
    replenishmentRecommendations: input.dashboard.replenishments.length,
    promotionSuggestions: input.dashboard.promotionSuggestions.length,
    previousPeriodComparison: variation,
    executiveSummary: `No periodo analisado, a loja registrou ${direction} nas saidas${variation === null ? '' : ` de ${Math.abs(variation)}%`}. ${input.dashboard.belowMinimum} produtos estao abaixo do estoque minimo e ${input.dashboard.expiringBatches} lotes apresentam risco de vencimento, representando ${input.dashboard.financialValueAtRisk.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em mercadorias.`,
  };
}

export function getAccessMetrics(accessLogs: AccessLog[]): AccessMetrics {
  const now = Date.now();
  const sevenDays = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = now - 30 * 24 * 60 * 60 * 1000;

  const recentLogins = accessLogs.filter(
    (log) => log.action === 'login' && new Date(log.timestamp).getTime() >= sevenDays,
  ).length;

  const activeUsers = new Set(
    accessLogs.filter((log) => new Date(log.timestamp).getTime() >= thirtyDays).map((log) => log.userId),
  ).size;

  const pageCounter = accessLogs
    .filter((log) => log.action === 'page_view')
    .reduce<Record<string, number>>((acc, log) => {
      const key = log.details ?? 'inicio';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  return {
    recentLogins,
    activeUsers,
    totalPageViews: accessLogs.filter((log) => log.action === 'page_view').length,
    topPages: Object.entries(pageCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4),
  };
}

export function getReportMetrics(products: Product[]): ReportMetrics {
  const byCategory = products.reduce<Record<string, number>>((acc, product) => {
    const key = product.category ?? 'Sem categoria';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const byCategoryValue = products.reduce<Record<string, number>>((acc, product) => {
    const key = product.category ?? 'Sem categoria';
    acc[key] = (acc[key] ?? 0) + product.quantity;
    return acc;
  }, {});

  const byUnit = products.reduce<Record<string, number>>((acc, product) => {
    const key = product.unit ?? 'un';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const criticalProducts = products
    .filter((product) => product.quantity <= product.minQuantity)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 6);
  const stockValue = products.reduce((sum, product) => sum + product.quantity * product.price, 0);

  return {
    orderedCategories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    byCategoryValue: Object.entries(byCategoryValue).sort((a, b) => b[1] - a[1]),
    byUnit: Object.entries(byUnit).sort((a, b) => b[1] - a[1]),
    criticalProducts,
    totalItems: products.reduce((sum, product) => sum + product.quantity, 0),
    stockValue,
    averageTicket: products.length > 0 ? stockValue / products.length : 0,
  };
}

export function screenTitle(screen: Screen): string {
  const titles: Record<Screen, string> = {
    inicio: 'Painel',
    produtos: 'Produtos',
    lotes: 'Lotes e validade',
    previsoes: 'Previsoes',
    recomendacoes: 'Reposicao',
    promocoes: 'Promocoes',
    relatorios: 'Relatorios',
    assistente: 'Assistente',
    alertas: 'Alertas',
    historico: 'Historico',
    usuarios: 'Usuarios',
    metricas: 'Metricas',
  };

  return titles[screen];
}

export function screenSubtitle(screen: Screen, user: AppUser): string {
  if (isAdmin(user)) {
    const subtitles: Record<Screen, string> = {
      inicio: 'Controle executivo do estoque, equipe e saude operacional.',
      produtos: 'Cadastro completo, busca rapida e leitura de criticidade por item.',
      lotes: 'Acompanhe validade, valor em risco e lotes que precisam de acao.',
      previsoes: 'Previsoes explicaveis com medias moveis e nivel de confianca.',
      recomendacoes: 'Sugestoes de compra com fornecedor, prazo e riscos considerados.',
      promocoes: 'Sugestoes para reduzir perdas sem aplicar descontos automaticamente.',
      relatorios: 'Visao consolidada por valor, categoria e unidades mais sensiveis.',
      assistente: 'Consultas guiadas ao estoque em linguagem natural controlada.',
      alertas: 'Reposicoes urgentes e gargalos com impacto direto na operacao.',
      historico: 'Rastro das acoes da equipe e trilha recente do sistema.',
      usuarios: 'Gestao de acessos, perfis e atividade dos colaboradores.',
      metricas: 'Engajamento da plataforma e intensidade de uso por paginas.',
    };
    return subtitles[screen];
  }

  const subtitles: Record<Screen, string> = {
    inicio: 'Painel do turno com foco em reposicao e rotina operacional.',
    produtos: 'Atualize saldo, categorias e consulta rapida do catalogo.',
    lotes: 'Veja vencimentos e priorize a saida dos lotes certos.',
    previsoes: 'Entenda a demanda prevista com base no historico registrado.',
    recomendacoes: 'Confira o que precisa de reposicao e por que.',
    promocoes: 'Produtos com risco de perda e sugestoes de desconto.',
    relatorios: 'Acesso restrito.',
    assistente: 'Pergunte sobre estoque, vencimentos e compras recomendadas.',
    alertas: 'Itens que precisam de reposicao ou revisao imediata.',
    historico: 'Acompanhe os eventos recentes registrados na loja.',
    usuarios: 'Acesso restrito.',
    metricas: 'Acesso restrito.',
  };

  return subtitles[screen];
}
