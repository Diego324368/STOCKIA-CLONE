import { generateAssistantAnswer } from './assistant.mjs';

function mapUser(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id ?? '00000000-0000-4000-8000-000000000001'),
    name: row.nome,
    email: row.email,
    password: row.senha,
    role: row.role === 'admin' ? 'admin' : 'staff',
    active: row.ativo !== false,
    createdAt: row.criado_as.toISOString(),
    lastLoginAt: row.ultimo_login_as ? row.ultimo_login_as.toISOString() : undefined,
  };
}

function mapProduct(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id ?? '00000000-0000-4000-8000-000000000001'),
    name: row.nome,
    quantity: Number(row.quantidade),
    minQuantity: Number(row.min_quantidade),
    maxQuantity: row.max_quantidade === null || row.max_quantidade === undefined ? undefined : Number(row.max_quantidade),
    costPrice: Number(row.preco_custo ?? row.preco),
    price: Number(row.preco),
    createdBy: String(row.criado_por),
    createdAt: row.criado_em.toISOString(),
    updatedAt: row.atualizado_em.toISOString(),
    active: row.ativo !== false,
    category: row.categoria ?? undefined,
    unit: row.unidade ?? undefined,
    barcode: row.codigo ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

function mapLog(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id ?? '00000000-0000-4000-8000-000000000001'),
    userId: String(row.id_usuario),
    userName: row.nome_usuario,
    action: row.acao,
    timestamp: row.timestamp.toISOString(),
    details: row.detalhes ?? undefined,
  };
}

function mapBatch(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id),
    productId: String(row.produto_id),
    batchNumber: row.numero_lote,
    initialQuantity: Number(row.quantidade_inicial),
    availableQuantity: Number(row.quantidade_disponivel),
    entryDate: new Date(row.data_entrada).toISOString(),
    expirationDate: new Date(row.data_validade).toISOString(),
    unitCost: Number(row.custo_unitario),
    status: row.status,
    createdAt: row.criado_em.toISOString(),
    updatedAt: row.atualizado_em.toISOString(),
  };
}

function mapMovement(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id),
    productId: String(row.produto_id),
    batchId: row.lote_id ? String(row.lote_id) : undefined,
    type: row.tipo,
    quantity: Number(row.quantidade),
    reason: row.motivo,
    origin: row.origem,
    userId: String(row.usuario_id),
    movementDate: row.data_movimentacao.toISOString(),
    createdAt: row.criado_em.toISOString(),
  };
}

function mapSale(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id),
    totalValue: Number(row.valor_total),
    saleDate: row.data_venda.toISOString(),
    status: row.status,
  };
}

function mapSaleItem(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id),
    saleId: String(row.venda_id),
    productId: String(row.produto_id),
    batchId: row.lote_id ? String(row.lote_id) : undefined,
    quantity: Number(row.quantidade),
    unitPrice: Number(row.preco_unitario),
    unitCost: Number(row.custo_unitario),
  };
}

function mapSupplier(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id),
    name: row.nome,
    document: row.documento ?? undefined,
    contact: row.contato ?? undefined,
    averageLeadTimeDays: Number(row.prazo_medio_entrega),
    active: row.ativo !== false,
  };
}

function mapProductSupplier(row) {
  return {
    productId: String(row.produto_id),
    supplierId: String(row.fornecedor_id),
    currentCost: Number(row.custo_atual),
    minimumPurchaseQuantity: Number(row.quantidade_minima_compra),
    leadTimeDays: Number(row.prazo_entrega),
    preferred: row.preferencial === true,
  };
}

function mapAlert(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id),
    productId: row.produto_id ? String(row.produto_id) : undefined,
    batchId: row.lote_id ? String(row.lote_id) : undefined,
    type: row.tipo,
    title: row.titulo,
    message: row.mensagem,
    priority: row.prioridade,
    status: row.status,
    logicalKey: row.chave_logica,
    createdAt: row.criado_em.toISOString(),
    resolvedAt: row.resolvido_em ? row.resolvido_em.toISOString() : undefined,
  };
}

function mapRecommendation(row) {
  return {
    id: String(row.id),
    companyId: String(row.empresa_id),
    productId: row.produto_id ? String(row.produto_id) : undefined,
    batchId: row.lote_id ? String(row.lote_id) : undefined,
    type: row.tipo,
    description: row.descricao,
    justification: row.justificativa,
    calculationData: row.dados_calculo ?? {},
    estimatedImpact: Number(row.impacto_estimado),
    confidenceLevel: row.nivel_confianca,
    status: row.status,
    createdAt: row.criado_em.toISOString(),
    updatedAt: row.atualizado_em.toISOString(),
  };
}

export function daysBetween(referenceDate, targetDate) {
  const ref = new Date(referenceDate);
  const target = new Date(targetDate);
  const refUtc = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
  const targetUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.ceil((targetUtc - refUtc) / 86400000);
}

function salesQuantity(productId, sales, saleItems, referenceDate, days) {
  const from = new Date(referenceDate).getTime() - days * 86400000;
  const ids = new Set(sales.filter((sale) => sale.status === 'concluida' && new Date(sale.saleDate).getTime() >= from).map((sale) => sale.id));
  return saleItems.filter((item) => item.productId === productId && ids.has(item.saleId)).reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateExpirationRisks(products, batches, sales, saleItems, referenceDate) {
  return batches.filter((batch) => batch.availableQuantity > 0).map((batch) => {
    const product = products.find((item) => item.id === batch.productId);
    if (!product) return null;
    const daysRemaining = daysBetween(referenceDate, batch.expirationDate);
    const quantity30 = salesQuantity(product.id, sales, saleItems, referenceDate, 30);
    const dailySalesAverage = quantity30 / 30;
    const sellableBeforeExpiration = Math.max(0, dailySalesAverage * Math.max(0, daysRemaining));
    const potentialLossQuantity = Math.max(0, batch.availableQuantity - sellableBeforeExpiration);
    const valueAtRisk = potentialLossQuantity * batch.unitCost;
    const riskLevel = daysRemaining < 0 ? 'vencido' : daysRemaining <= 7 ? 'critico' : daysRemaining <= 15 ? 'alto' : daysRemaining <= 30 ? 'medio' : 'baixo';
    const confidenceLevel = quantity30 >= 30 ? 'alta' : quantity30 >= 8 ? 'media' : 'baixa';
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
      riskPercentage: batch.availableQuantity > 0 ? (potentialLossQuantity / batch.availableQuantity) * 100 : 0,
      confidenceLevel,
      method: 'Media diaria dos ultimos 30 dias com limites configuraveis por empresa.',
      observations: confidenceLevel === 'baixa' ? ['Historico insuficiente para uma estimativa precisa.'] : [],
    };
  }).filter(Boolean).sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function calculateForecasts(products, sales, saleItems, referenceDate) {
  return products.map((product) => {
    const last7 = salesQuantity(product.id, sales, saleItems, referenceDate, 7);
    const last14 = salesQuantity(product.id, sales, saleItems, referenceDate, 14);
    const last30 = salesQuantity(product.id, sales, saleItems, referenceDate, 30);
    const previous7 = Math.max(0, last14 - last7);
    const mediaDiaria = last30 > 0 ? (last7 / 7 * 0.5) + (last14 / 14 * 0.25) + (last30 / 30 * 0.25) : 0;
    const variacaoPercentual = previous7 > 0 ? ((last7 - previous7) / previous7) * 100 : null;
    const quantidadeRegistros = saleItems.filter((item) => item.productId === product.id).length;
    const tendencia = last30 === 0 ? 'indefinida' : variacaoPercentual !== null && variacaoPercentual > 15 ? 'alta' : variacaoPercentual !== null && variacaoPercentual < -15 ? 'queda' : 'estavel';
    const nivelConfianca = quantidadeRegistros >= 20 ? 'alta' : quantidadeRegistros >= 6 ? 'media' : 'baixa';
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
      observacoes: quantidadeRegistros === 0 ? ['Produto sem historico de vendas.'] : nivelConfianca === 'baixa' ? ['Poucos registros: use como referencia conservadora.'] : [],
    };
  });
}

export function calculateReplenishments(products, forecasts, suppliers, productSuppliers, risks) {
  return products.map((product) => {
    const forecast = forecasts.find((item) => item.product.id === product.id);
    const productSupplier = productSuppliers.filter((item) => item.productId === product.id).sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.leadTimeDays - b.leadTimeDays)[0];
    const supplier = suppliers.find((item) => item.id === productSupplier?.supplierId);
    const leadTime = productSupplier?.leadTimeDays ?? supplier?.averageLeadTimeDays ?? 7;
    const mediaDiaria = forecast?.mediaDiaria ?? 0;
    const safetyStock = Math.ceil(Math.max(product.minQuantity * 0.4, mediaDiaria * 3));
    const reorderPoint = Math.ceil(mediaDiaria * leadTime + safetyStock);
    const hasRisk = risks.some((risk) => risk.product.id === product.id && ['vencido', 'critico', 'alto'].includes(risk.riskLevel));
    let suggestedQuantity = Math.max(0, Math.ceil((forecast?.demandaPrevista30Dias ?? product.minQuantity) + safetyStock - product.quantity));
    if (product.maxQuantity !== undefined) suggestedQuantity = Math.min(suggestedQuantity, Math.max(0, product.maxQuantity - product.quantity));
    if (productSupplier && suggestedQuantity > 0) suggestedQuantity = Math.max(suggestedQuantity, productSupplier.minimumPurchaseQuantity);
    if (hasRisk) suggestedQuantity = 0;
    if (product.quantity > reorderPoint && suggestedQuantity === 0) return null;
    return {
      product,
      currentStock: product.quantity,
      reorderPoint,
      suggestedQuantity,
      supplier,
      supplierLeadTimeDays: leadTime,
      estimatedCost: suggestedQuantity * (productSupplier?.currentCost ?? product.costPrice),
      priority: product.quantity === 0 ? 'critica' : product.quantity <= product.minQuantity ? 'alta' : 'media',
      confidenceLevel: forecast?.nivelConfianca ?? 'baixa',
      reason: hasRisk ? 'Compra bloqueada porque existem lotes do produto com risco de vencimento.' : 'Estoque atual abaixo do ponto de reposicao calculado.',
      calculationData: { mediaDiaria, leadTime, safetyStock, reorderPoint },
      risks: hasRisk ? ['Ha lotes em risco de vencimento; priorize venda ou promocao antes de comprar.'] : [],
    };
  }).filter(Boolean);
}

export function calculatePromotions(risks) {
  return risks.filter((risk) => ['vencido', 'critico', 'alto', 'medio'].includes(risk.riskLevel) && risk.potentialLossQuantity > 0).map((risk) => {
    const discount = risk.riskLevel === 'vencido' || risk.riskLevel === 'critico' ? 28 : risk.riskLevel === 'alto' ? 15 : 8;
    const promotionalPrice = Math.max(0, risk.product.price * (1 - discount / 100));
    return {
      product: risk.product,
      batch: risk.batch,
      expirationDate: risk.batch.expirationDate,
      quantityAtRisk: risk.potentialLossQuantity,
      currentPrice: risk.product.price,
      suggestedDiscountPercentage: discount,
      promotionalPrice,
      currentMargin: risk.product.price > 0 ? ((risk.product.price - risk.unitCost) / risk.product.price) * 100 : 0,
      estimatedMargin: promotionalPrice > 0 ? ((promotionalPrice - risk.unitCost) / promotionalPrice) * 100 : 0,
      potentialLossValue: risk.valueAtRisk,
      avoidableLossValue: risk.valueAtRisk * 0.75,
      justification: 'Sugestao baseada em dias ate o vencimento, quantidade em risco e historico de venda.',
      confidenceLevel: risk.confidenceLevel,
      warnings: promotionalPrice < risk.unitCost ? ['Preco sugerido fica abaixo do custo; confirme antes de aplicar.'] : [],
    };
  });
}

export function createRepository(db) {
  return {
    async getUsers() {
      const result = await db.query('select * from usuarios order by criado_as desc');
      return result.rows.map(mapUser);
    },

    async saveUsers(users) {
      for (const user of users) {
        await db.query(
          `insert into usuarios (id, empresa_id, nome, email, senha, role, ativo, criado_as, ultimo_login_as)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           on conflict (id) do update set
             empresa_id = excluded.empresa_id,
             nome = excluded.nome,
             email = excluded.email,
             senha = excluded.senha,
             role = excluded.role,
             ativo = excluded.ativo,
             criado_as = excluded.criado_as,
             ultimo_login_as = excluded.ultimo_login_as`,
          [
            user.id,
            user.companyId ?? '00000000-0000-4000-8000-000000000001',
            user.name,
            user.email,
            user.password,
            user.role,
            user.active !== false,
            user.createdAt,
            user.lastLoginAt ?? null,
          ],
        );
      }
    },

    async deleteUser(userId) {
      await db.query('delete from usuarios where id = $1', [userId]);
    },

    async getProducts() {
      const result = await db.query('select * from produtos order by atualizado_em desc');
      return result.rows.map(mapProduct);
    },

    async saveProducts(products) {
      for (const product of products) {
        await db.query(
          `insert into produtos (
             id, empresa_id, nome, categoria, unidade, codigo, image_url, quantidade,
             min_quantidade, max_quantidade, preco_custo, preco, ativo, criado_por, criado_em, atualizado_em
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           on conflict (id) do update set
             empresa_id = excluded.empresa_id,
             nome = excluded.nome,
             categoria = excluded.categoria,
             unidade = excluded.unidade,
             codigo = excluded.codigo,
             image_url = excluded.image_url,
             quantidade = excluded.quantidade,
             min_quantidade = excluded.min_quantidade,
             max_quantidade = excluded.max_quantidade,
             preco_custo = excluded.preco_custo,
             preco = excluded.preco,
             ativo = excluded.ativo,
             criado_por = excluded.criado_por,
             criado_em = excluded.criado_em,
             atualizado_em = excluded.atualizado_em`,
          [
            product.id,
            product.companyId ?? '00000000-0000-4000-8000-000000000001',
            product.name,
            product.category ?? null,
            product.unit ?? null,
            product.barcode ?? null,
            product.imageUrl ?? null,
            product.quantity,
            product.minQuantity,
            product.maxQuantity ?? null,
            product.costPrice ?? product.price,
            product.price,
            product.active !== false,
            product.createdBy,
            product.createdAt,
            product.updatedAt,
          ],
        );
      }
    },

    async deleteProduct(productId) {
      await db.query('delete from produtos where id = $1', [productId]);
    },

    async getAccessLogs() {
      const result = await db.query('select * from logs_acesso order by timestamp desc');
      return result.rows.map(mapLog);
    },

    async saveAccessLogs(logs) {
      for (const log of logs) {
        await db.query(
          `insert into logs_acesso (id, empresa_id, id_usuario, nome_usuario, acao, timestamp, detalhes)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (id) do update set
             empresa_id = excluded.empresa_id,
             id_usuario = excluded.id_usuario,
             nome_usuario = excluded.nome_usuario,
             acao = excluded.acao,
             timestamp = excluded.timestamp,
             detalhes = excluded.detalhes`,
          [log.id, log.companyId ?? '00000000-0000-4000-8000-000000000001', log.userId, log.userName, log.action, log.timestamp, log.details ?? null],
        );
      }
    },

    async getBatches(companyId) {
      const result = await db.query('select * from lotes where empresa_id = $1 order by data_validade asc', [companyId]);
      return result.rows.map(mapBatch);
    },

    async getMovements(companyId) {
      const result = await db.query('select * from movimentacoes_estoque where empresa_id = $1 order by data_movimentacao desc', [companyId]);
      return result.rows.map(mapMovement);
    },

    async getSales(companyId) {
      const result = await db.query('select * from vendas where empresa_id = $1 order by data_venda desc', [companyId]);
      return result.rows.map(mapSale);
    },

    async getSaleItems(companyId) {
      const result = await db.query('select * from itens_venda where empresa_id = $1', [companyId]);
      return result.rows.map(mapSaleItem);
    },

    async getSuppliers(companyId) {
      const result = await db.query('select * from fornecedores where empresa_id = $1 order by nome asc', [companyId]);
      return result.rows.map(mapSupplier);
    },

    async getProductSuppliers(companyId) {
      const result = await db.query(
        `select pf.*
         from produto_fornecedor pf
         join fornecedores f on f.id = pf.fornecedor_id
         where f.empresa_id = $1`,
        [companyId],
      );
      return result.rows.map(mapProductSupplier);
    },

    async getAlerts(companyId) {
      const persisted = await db.query('select * from alertas where empresa_id = $1 order by criado_em desc', [companyId]);
      if (persisted.rows.length > 0) {
        return persisted.rows.map(mapAlert);
      }
      return this.generateCurrentAlerts(companyId);
    },

    async getRecommendations(companyId) {
      const result = await db.query('select * from recomendacoes where empresa_id = $1 order by criado_em desc', [companyId]);
      return result.rows.map(mapRecommendation);
    },

    async getReports(companyId) {
      const result = await db.query('select * from relatorios where empresa_id = $1 order by gerado_em desc', [companyId]);
      return result.rows.map((row) => ({
        id: String(row.id),
        companyId: String(row.empresa_id),
        type: row.tipo,
        periodStart: new Date(row.periodo_inicial).toISOString(),
        periodEnd: new Date(row.periodo_final).toISOString(),
        content: row.conteudo ?? {},
        generatedAt: row.gerado_em.toISOString(),
      }));
    },

    async getIntelligence(companyId) {
      const products = (await this.getProducts()).filter((product) => product.companyId === companyId);
      const batches = await this.getBatches(companyId);
      const sales = await this.getSales(companyId);
      const saleItems = await this.getSaleItems(companyId);
      const suppliers = await this.getSuppliers(companyId);
      const productSuppliers = await this.getProductSuppliers(companyId);
      const referenceDate = new Date().toISOString();
      const expirationRisks = calculateExpirationRisks(products, batches, sales, saleItems, referenceDate);
      const forecasts = calculateForecasts(products, sales, saleItems, referenceDate);
      const replenishments = calculateReplenishments(products, forecasts, suppliers, productSuppliers, expirationRisks);
      const promotions = calculatePromotions(expirationRisks);
      return { products, batches, sales, saleItems, suppliers, productSuppliers, referenceDate, expirationRisks, forecasts, replenishments, promotions };
    },

    async getExpirationRisks(companyId) {
      return (await this.getIntelligence(companyId)).expirationRisks;
    },

    async getForecasts(companyId) {
      return (await this.getIntelligence(companyId)).forecasts;
    },

    async getReplenishments(companyId) {
      return (await this.getIntelligence(companyId)).replenishments;
    },

    async getPromotions(companyId) {
      return (await this.getIntelligence(companyId)).promotions;
    },

    async generateCurrentAlerts(companyId) {
      const { products, expirationRisks, replenishments, referenceDate } = await this.getIntelligence(companyId);
      const alerts = [];
      const add = (alert) => {
        if (!alerts.some((item) => item.logicalKey === alert.logicalKey)) {
          alerts.push({ id: alert.logicalKey, companyId, status: 'novo', createdAt: referenceDate, ...alert });
        }
      };
      for (const product of products) {
        if (product.quantity === 0) {
          add({ productId: product.id, type: 'estoque_zerado', title: 'Produto zerado', message: `${product.name} esta sem estoque disponivel.`, priority: 'critica', logicalKey: `estoque_zerado:${product.id}` });
        } else if (product.quantity <= product.minQuantity) {
          add({ productId: product.id, type: 'estoque_baixo', title: 'Estoque abaixo do minimo', message: `${product.name} esta com ${product.quantity} unidades, abaixo do minimo ${product.minQuantity}.`, priority: 'alta', logicalKey: `estoque_baixo:${product.id}` });
        }
      }
      for (const risk of expirationRisks) {
        if (risk.riskLevel === 'vencido' || risk.riskLevel === 'critico') {
          add({ productId: risk.product.id, batchId: risk.batch.id, type: risk.riskLevel === 'vencido' ? 'lote_vencido' : 'lote_risco_critico', title: risk.riskLevel === 'vencido' ? 'Lote vencido' : 'Lote com risco critico', message: `${risk.product.name} lote ${risk.batch.batchNumber} tem ${risk.availableQuantity} unidades em risco.`, priority: risk.riskLevel === 'vencido' ? 'critica' : 'alta', logicalKey: `validade:${risk.batch.id}:${risk.riskLevel}` });
        }
      }
      for (const recommendation of replenishments) {
        add({ productId: recommendation.product.id, type: 'necessidade_reposicao', title: 'Reposicao recomendada', message: `${recommendation.product.name}: comprar ${recommendation.suggestedQuantity} ${recommendation.product.unit ?? 'un'}.`, priority: recommendation.priority, logicalKey: `reposicao:${recommendation.product.id}` });
      }
      return alerts;
    },

    async getDashboard(companyId) {
      const { products, expirationRisks, replenishments, promotions, sales, saleItems, referenceDate } = await this.getIntelligence(companyId);
      const movements = await this.getMovements(companyId);
      const alerts = await this.generateCurrentAlerts(companyId);
      const monthStart = new Date(referenceDate);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      return {
        totalStockValue: products.reduce((sum, product) => sum + product.quantity * product.costPrice, 0),
        totalProducts: products.length,
        belowMinimum: products.filter((product) => product.quantity <= product.minQuantity).length,
        excessStock: products.filter((product) => product.maxQuantity !== undefined && product.quantity > product.maxQuantity).length,
        expiringBatches: expirationRisks.filter((risk) => ['critico', 'alto', 'medio'].includes(risk.riskLevel)).length,
        expiredBatches: expirationRisks.filter((risk) => risk.riskLevel === 'vencido').length,
        financialValueAtRisk: expirationRisks.reduce((sum, risk) => sum + risk.valueAtRisk, 0),
        monthLosses: movements.filter((movement) => movement.type === 'perda' && new Date(movement.movementDate).getTime() >= monthStart.getTime()).reduce((sum, movement) => {
          const product = products.find((item) => item.id === movement.productId);
          return sum + movement.quantity * (product?.costPrice ?? 0);
        }, 0),
        pendingRecommendations: replenishments.length + promotions.length,
        pendingPurchaseOrders: 0,
        topTurnoverProducts: [...products].sort((a, b) => salesQuantity(b.id, sales, saleItems, referenceDate, 30) - salesQuantity(a.id, sales, saleItems, referenceDate, 30)).slice(0, 5),
        lowTurnoverProducts: [...products].sort((a, b) => salesQuantity(a.id, sales, saleItems, referenceDate, 30) - salesQuantity(b.id, sales, saleItems, referenceDate, 30)).slice(0, 5),
        priorityAlerts: alerts.slice(0, 6),
        replenishments,
        expirationRisks,
        promotionSuggestions: promotions,
        updatedAt: referenceDate,
      };
    },

    async moveStock(input) {
      if (!input.companyId || !input.productId || !input.userId) throw new Error('Parametros obrigatorios ausentes.');
      if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) throw new Error('Quantidade deve ser positiva.');
      await db.transaction(async (tx) => {
        const productResult = await tx.query('select * from produtos where id = $1 and empresa_id = $2 for update', [input.productId, input.companyId]);
        if (productResult.rows.length === 0) throw new Error('Produto nao encontrado para esta empresa.');
        let remaining = Number(input.quantity);
        const sign = ['entrada', 'devolucao'].includes(input.type) ? 1 : -1;
        if (sign < 0 && Number(productResult.rows[0].quantidade) < remaining) throw new Error('Estoque insuficiente.');

        if (sign < 0) {
          const batches = input.batchId
            ? await tx.query('select * from lotes where id = $1 and empresa_id = $2 and produto_id = $3 for update', [input.batchId, input.companyId, input.productId])
            : await tx.query(`select * from lotes where empresa_id = $1 and produto_id = $2 and quantidade_disponivel > 0 and status = 'available' order by data_validade asc for update`, [input.companyId, input.productId]);
          for (const row of batches.rows) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, Number(row.quantidade_disponivel));
            await tx.query('update lotes set quantidade_disponivel = quantidade_disponivel - $1, status = case when quantidade_disponivel - $1 = 0 then $2 else status end, atualizado_em = now() where id = $3', [take, 'depleted', row.id]);
            await tx.query(`insert into movimentacoes_estoque (empresa_id, produto_id, lote_id, tipo, quantidade, motivo, origem, usuario_id) values ($1,$2,$3,$4,$5,$6,$7,$8)`, [input.companyId, input.productId, row.id, input.type, take, input.reason, 'api', input.userId]);
            remaining -= take;
          }
          if (remaining > 0) throw new Error('Quantidade indisponivel nos lotes.');
        } else {
          await tx.query(`insert into movimentacoes_estoque (empresa_id, produto_id, lote_id, tipo, quantidade, motivo, origem, usuario_id) values ($1,$2,$3,$4,$5,$6,$7,$8)`, [input.companyId, input.productId, input.batchId ?? null, input.type, remaining, input.reason, 'api', input.userId]);
          if (input.batchId) {
            await tx.query('update lotes set quantidade_disponivel = quantidade_disponivel + $1, atualizado_em = now() where id = $2 and empresa_id = $3', [remaining, input.batchId, input.companyId]);
          }
        }
        await tx.query('update produtos set quantidade = quantidade + $1, atualizado_em = now() where id = $2 and empresa_id = $3', [Number(input.quantity) * sign, input.productId, input.companyId]);
      });
    },

    async decideRecommendation(input) {
      await db.query(
        `insert into recomendacoes (id, empresa_id, produto_id, tipo, descricao, justificativa, dados_calculo, impacto_estimado, nivel_confianca, status)
         values ($1, $2, $1, 'reposicao', 'Recomendacao calculada de reposicao', $3, '{}'::jsonb, $4, 'baixa', 'pendente')
         on conflict (id) do nothing`,
        [input.recommendationId, input.companyId, input.justification ?? 'Decisao registrada pelo usuario.', input.originalValue],
      );
      await db.query(
        `insert into decisoes_recomendacao (empresa_id, recomendacao_id, usuario_id, acao, valor_original, valor_ajustado, justificativa)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [input.companyId, input.recommendationId, input.userId, input.action, input.originalValue, input.adjustedValue ?? null, input.justification ?? null],
      );
      await db.query('update recomendacoes set status = $1, atualizado_em = now() where id = $2 and empresa_id = $3', [input.action === 'rejeitar' ? 'rejeitada' : input.action === 'ajustar' ? 'ajustada' : 'aceita', input.recommendationId, input.companyId]);
    },

    async askAssistant(companyId, message, conversation) {
      const [dashboard, forecasts] = await Promise.all([
        this.getDashboard(companyId),
        this.getForecasts(companyId),
      ]);

      return generateAssistantAnswer({ message, dashboard, forecasts, conversation });
    },
  };
}
