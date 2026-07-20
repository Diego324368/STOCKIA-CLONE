import type {
  AccessLog,
  AppUser,
  AssistantResponse,
  DashboardIntelligence,
  DemandForecastResult,
  ExpirationRiskItem,
  ManagementReport,
  Product,
  ProductBatch,
  ProductSupplier,
  PromotionSuggestion,
  Recommendation,
  ReplenishmentRecommendation,
  Repository,
  Sale,
  SaleItem,
  StockAlert,
  StockMovement,
  StockMovementType,
  Supplier,
} from '../types/models';
import {
  buildDashboardIntelligence,
  calculateDemandForecasts,
  calculateExpirationRisks,
  calculatePromotionSuggestions,
  calculateReplenishments,
  generateAlerts,
} from '../lib/stock';

const STORAGE_KEYS = {
  usuarios: 'stockia.usuarios',
  produtos: 'stockia.produtos',
  logs_acesso: 'stockia.logs_acesso',
  batches: 'stockia.batches',
  movements: 'stockia.movements',
  sales: 'stockia.sales',
  saleItems: 'stockia.saleItems',
  suppliers: 'stockia.suppliers',
  productSuppliers: 'stockia.productSuppliers',
  recommendations: 'stockia.recommendations',
  reports: 'stockia.reports',
};

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export class LocalRepository implements Repository {
  async getUsers(): Promise<AppUser[]> {
    return readJson<AppUser[]>(STORAGE_KEYS.usuarios, []);
  }

  async saveUsers(usuarios: AppUser[]): Promise<void> {
    writeJson(STORAGE_KEYS.usuarios, usuarios);
  }

  async deleteUser(userId: string): Promise<void> {
    const usuarios = readJson<AppUser[]>(STORAGE_KEYS.usuarios, []);
    writeJson(
      STORAGE_KEYS.usuarios,
      usuarios.filter((usuario) => usuario.id !== userId),
    );
  }

  async getProducts(): Promise<Product[]> {
    return readJson<Product[]>(STORAGE_KEYS.produtos, []);
  }

  async saveProducts(produtos: Product[]): Promise<void> {
    writeJson(STORAGE_KEYS.produtos, produtos);
  }

  async deleteProduct(productId: string): Promise<void> {
    const produtos = readJson<Product[]>(STORAGE_KEYS.produtos, []);
    writeJson(
      STORAGE_KEYS.produtos,
      produtos.filter((produto) => produto.id !== productId),
    );
  }

  async getAccessLogs(): Promise<AccessLog[]> {
    return readJson<AccessLog[]>(STORAGE_KEYS.logs_acesso, []);
  }

  async saveAccessLogs(logs: AccessLog[]): Promise<void> {
    writeJson(STORAGE_KEYS.logs_acesso, logs);
  }

  async getBatches(companyId: string): Promise<ProductBatch[]> {
    return readJson<ProductBatch[]>(STORAGE_KEYS.batches, []).filter((item) => item.companyId === companyId);
  }

  async getMovements(companyId: string): Promise<StockMovement[]> {
    return readJson<StockMovement[]>(STORAGE_KEYS.movements, []).filter((item) => item.companyId === companyId);
  }

  async getSales(companyId: string): Promise<Sale[]> {
    return readJson<Sale[]>(STORAGE_KEYS.sales, []).filter((item) => item.companyId === companyId);
  }

  async getSaleItems(companyId: string): Promise<SaleItem[]> {
    return readJson<SaleItem[]>(STORAGE_KEYS.saleItems, []).filter((item) => item.companyId === companyId);
  }

  async getSuppliers(companyId: string): Promise<Supplier[]> {
    return readJson<Supplier[]>(STORAGE_KEYS.suppliers, []).filter((item) => item.companyId === companyId);
  }

  async getProductSuppliers(_companyId: string): Promise<ProductSupplier[]> {
    return readJson<ProductSupplier[]>(STORAGE_KEYS.productSuppliers, []);
  }

  async getAlerts(companyId: string): Promise<StockAlert[]> {
    const products = (await this.getProducts()).filter((item) => item.companyId === companyId);
    const risks = await this.getExpirationRisks(companyId);
    const replenishments = await this.getReplenishments(companyId);
    return generateAlerts({ products, expirationRisks: risks, replenishments, referenceDate: new Date().toISOString(), companyId });
  }

  async getRecommendations(companyId: string): Promise<Recommendation[]> {
    return readJson<Recommendation[]>(STORAGE_KEYS.recommendations, []).filter((item) => item.companyId === companyId);
  }

  async getReports(companyId: string): Promise<ManagementReport[]> {
    return readJson<ManagementReport[]>(STORAGE_KEYS.reports, []).filter((item) => item.companyId === companyId);
  }

  async getDashboard(companyId: string): Promise<DashboardIntelligence> {
    const products = (await this.getProducts()).filter((item) => item.companyId === companyId);
    const batches = await this.getBatches(companyId);
    const sales = await this.getSales(companyId);
    const saleItems = await this.getSaleItems(companyId);
    const movements = await this.getMovements(companyId);
    const suppliers = await this.getSuppliers(companyId);
    const productSuppliers = await this.getProductSuppliers(companyId);
    return buildDashboardIntelligence({ companyId, products, batches, sales, saleItems, movements, suppliers, productSuppliers, referenceDate: new Date().toISOString() });
  }

  async getExpirationRisks(companyId: string): Promise<ExpirationRiskItem[]> {
    const products = (await this.getProducts()).filter((item) => item.companyId === companyId);
    return calculateExpirationRisks({ products, batches: await this.getBatches(companyId), sales: await this.getSales(companyId), saleItems: await this.getSaleItems(companyId), referenceDate: new Date().toISOString() });
  }

  async getForecasts(companyId: string): Promise<DemandForecastResult[]> {
    const products = (await this.getProducts()).filter((item) => item.companyId === companyId);
    return calculateDemandForecasts({ products, sales: await this.getSales(companyId), saleItems: await this.getSaleItems(companyId), referenceDate: new Date().toISOString() });
  }

  async getReplenishments(companyId: string): Promise<ReplenishmentRecommendation[]> {
    const products = (await this.getProducts()).filter((item) => item.companyId === companyId);
    const forecasts = await this.getForecasts(companyId);
    const risks = await this.getExpirationRisks(companyId);
    return calculateReplenishments({ products, forecasts, suppliers: await this.getSuppliers(companyId), productSuppliers: await this.getProductSuppliers(companyId), expirationRisks: risks });
  }

  async getPromotions(companyId: string): Promise<PromotionSuggestion[]> {
    return calculatePromotionSuggestions({ expirationRisks: await this.getExpirationRisks(companyId) });
  }

  async askAssistant(
    companyId: string,
    message: string,
    _conversation?: Array<{ from: 'user' | 'assistant'; text: string }>
  ): Promise<AssistantResponse> {
    const dashboard = await this.getDashboard(companyId);
    const normalized = message.toLowerCase();
    if (normalized.includes('risco') || normalized.includes('dinheiro')) {
      return { intent: 'consultar_valor_em_risco', answer: `O valor financeiro em risco e ${dashboard.financialValueAtRisk.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`, period: 'Dados atuais do estoque', cards: [], relatedScreen: 'lotes' };
    }
    return { intent: 'ajuda', answer: 'Posso consultar estoque baixo, vencimentos, valor em risco, reposicoes e promocoes recomendadas.', period: 'Dados atuais do estoque', cards: [], relatedScreen: 'inicio' };
  }

  async moveStock(input: { companyId: string; productId: string; batchId?: string; type: StockMovementType; quantity: number; reason: string; userId: string }): Promise<void> {
    const movements = readJson<StockMovement[]>(STORAGE_KEYS.movements, []);
    movements.unshift({ id: crypto.randomUUID(), origin: 'local', movementDate: new Date().toISOString(), createdAt: new Date().toISOString(), ...input });
    writeJson(STORAGE_KEYS.movements, movements);
  }

  async decideRecommendation(): Promise<void> {
    return undefined;
  }
}
