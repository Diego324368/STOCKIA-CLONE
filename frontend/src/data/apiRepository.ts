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

type ApiOptions = {
  baseUrl?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `Erro HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export class ApiRepository implements Repository {
  private readonly baseUrl: string;

  constructor(options: ApiOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') ?? '';
  }

  private path(pathname: string): string {
    return `${this.baseUrl}${pathname}`;
  }

  async getUsers(): Promise<AppUser[]> {
    const { users } = await request<{ users: AppUser[] }>(this.path('/api/users'));
    return users;
  }

  async saveUsers(users: AppUser[]): Promise<void> {
    await request<void>(this.path('/api/users'), {
      method: 'PUT',
      body: JSON.stringify({ users }),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await request<void>(this.path(`/api/users/${encodeURIComponent(userId)}`), {
      method: 'DELETE',
    });
  }

  async getProducts(): Promise<Product[]> {
    const { products } = await request<{ products: Product[] }>(this.path('/api/products'));
    return products;
  }

  async saveProducts(products: Product[]): Promise<void> {
    await request<void>(this.path('/api/products'), {
      method: 'PUT',
      body: JSON.stringify({ products }),
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    await request<void>(this.path(`/api/products/${encodeURIComponent(productId)}`), {
      method: 'DELETE',
    });
  }

  async getAccessLogs(): Promise<AccessLog[]> {
    const { logs } = await request<{ logs: AccessLog[] }>(this.path('/api/access-logs'));
    return logs;
  }

  async saveAccessLogs(logs: AccessLog[]): Promise<void> {
    await request<void>(this.path('/api/access-logs'), {
      method: 'PUT',
      body: JSON.stringify({ logs }),
    });
  }

  async getBatches(companyId: string): Promise<ProductBatch[]> {
    const { batches } = await request<{ batches: ProductBatch[] }>(this.path(`/api/batches?companyId=${encodeURIComponent(companyId)}`));
    return batches;
  }

  async getMovements(companyId: string): Promise<StockMovement[]> {
    const { movements } = await request<{ movements: StockMovement[] }>(this.path(`/api/stock-movements?companyId=${encodeURIComponent(companyId)}`));
    return movements;
  }

  async getSales(companyId: string): Promise<Sale[]> {
    const { sales } = await request<{ sales: Sale[] }>(this.path(`/api/sales?companyId=${encodeURIComponent(companyId)}`));
    return sales;
  }

  async getSaleItems(companyId: string): Promise<SaleItem[]> {
    const { saleItems } = await request<{ saleItems: SaleItem[] }>(this.path(`/api/sale-items?companyId=${encodeURIComponent(companyId)}`));
    return saleItems;
  }

  async getSuppliers(companyId: string): Promise<Supplier[]> {
    const { suppliers } = await request<{ suppliers: Supplier[] }>(this.path(`/api/suppliers?companyId=${encodeURIComponent(companyId)}`));
    return suppliers;
  }

  async getProductSuppliers(companyId: string): Promise<ProductSupplier[]> {
    const { productSuppliers } = await request<{ productSuppliers: ProductSupplier[] }>(this.path(`/api/product-suppliers?companyId=${encodeURIComponent(companyId)}`));
    return productSuppliers;
  }

  async getAlerts(companyId: string): Promise<StockAlert[]> {
    const { alerts } = await request<{ alerts: StockAlert[] }>(this.path(`/api/alerts?companyId=${encodeURIComponent(companyId)}`));
    return alerts;
  }

  async getRecommendations(companyId: string): Promise<Recommendation[]> {
    const { recommendations } = await request<{ recommendations: Recommendation[] }>(this.path(`/api/recommendations?companyId=${encodeURIComponent(companyId)}`));
    return recommendations;
  }

  async getReports(companyId: string): Promise<ManagementReport[]> {
    const { reports } = await request<{ reports: ManagementReport[] }>(this.path(`/api/reports?companyId=${encodeURIComponent(companyId)}`));
    return reports;
  }

  async getDashboard(companyId: string): Promise<DashboardIntelligence> {
    const { dashboard } = await request<{ dashboard: DashboardIntelligence }>(this.path(`/api/dashboard?companyId=${encodeURIComponent(companyId)}`));
    return dashboard;
  }

  async getExpirationRisks(companyId: string): Promise<ExpirationRiskItem[]> {
    const { risks } = await request<{ risks: ExpirationRiskItem[] }>(this.path(`/api/expiration-risks?companyId=${encodeURIComponent(companyId)}`));
    return risks;
  }

  async getForecasts(companyId: string): Promise<DemandForecastResult[]> {
    const { forecasts } = await request<{ forecasts: DemandForecastResult[] }>(this.path(`/api/demand-forecasts?companyId=${encodeURIComponent(companyId)}`));
    return forecasts;
  }

  async getReplenishments(companyId: string): Promise<ReplenishmentRecommendation[]> {
    const { replenishments } = await request<{ replenishments: ReplenishmentRecommendation[] }>(this.path(`/api/replenishments?companyId=${encodeURIComponent(companyId)}`));
    return replenishments;
  }

  async getPromotions(companyId: string): Promise<PromotionSuggestion[]> {
    const { promotions } = await request<{ promotions: PromotionSuggestion[] }>(this.path(`/api/promotions?companyId=${encodeURIComponent(companyId)}`));
    return promotions;
  }

  async askAssistant(
    companyId: string,
    message: string,
    conversation?: Array<{ from: 'user' | 'assistant'; text: string }>
  ): Promise<AssistantResponse> {
    const { response } = await request<{ response: AssistantResponse }>(this.path('/api/assistant/messages'), {
      method: 'POST',
      body: JSON.stringify({ companyId, message, conversation: conversation ?? [] }),
    });
    return response;
  }

  async moveStock(input: {
    companyId: string;
    productId: string;
    batchId?: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    userId: string;
  }): Promise<void> {
    await request<void>(this.path('/api/stock-movements'), {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async decideRecommendation(input: {
    companyId: string;
    recommendationId: string;
    userId: string;
    action: string;
    originalValue: number;
    adjustedValue?: number;
    justification?: string;
  }): Promise<void> {
    await request<void>(this.path('/api/recommendations/decision'), {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
