export type UserRole = 'admin' | 'staff';

export interface AppUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  costPrice: number;
  price: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  // Campos opcionais para contexto de supermercado
  category?: string;
  unit?: string; // e.g., "kg", "un", "ltr"
  barcode?: string;
  imageUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  timezone: string;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  expirationRiskDays: {
    critical: number;
    high: number;
    medium: number;
  };
  promotionDiscounts: {
    medium: [number, number];
    high: [number, number];
    critical: [number, number];
  };
}

export type BatchStatus = 'available' | 'expired' | 'depleted' | 'blocked';

export interface ProductBatch {
  id: string;
  companyId: string;
  productId: string;
  batchNumber: string;
  initialQuantity: number;
  availableQuantity: number;
  entryDate: string;
  expirationDate: string;
  unitCost: number;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'entrada' | 'saida' | 'ajuste' | 'perda' | 'devolucao' | 'transferencia';

export interface StockMovement {
  id: string;
  companyId: string;
  productId: string;
  batchId?: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  origin: string;
  userId: string;
  movementDate: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  companyId: string;
  totalValue: number;
  saleDate: string;
  status: 'concluida' | 'cancelada' | 'devolvida';
}

export interface SaleItem {
  id: string;
  companyId: string;
  saleId: string;
  productId: string;
  batchId?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  document?: string;
  contact?: string;
  averageLeadTimeDays: number;
  active: boolean;
}

export interface ProductSupplier {
  productId: string;
  supplierId: string;
  currentCost: number;
  minimumPurchaseQuantity: number;
  leadTimeDays: number;
  preferred: boolean;
}

export type AlertStatus = 'novo' | 'lido' | 'resolvido' | 'ignorado';
export type AlertPriority = 'baixa' | 'media' | 'alta' | 'critica';

export interface StockAlert {
  id: string;
  companyId: string;
  productId?: string;
  batchId?: string;
  type: string;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  logicalKey: string;
  createdAt: string;
  resolvedAt?: string;
}

export type RecommendationStatus = 'pendente' | 'aceita' | 'ajustada' | 'rejeitada' | 'concluida';

export interface Recommendation {
  id: string;
  companyId: string;
  productId?: string;
  batchId?: string;
  type: 'reposicao' | 'promocao';
  description: string;
  justification: string;
  calculationData: Record<string, unknown>;
  estimatedImpact: number;
  confidenceLevel: 'alta' | 'media' | 'baixa';
  status: RecommendationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationDecision {
  id: string;
  companyId: string;
  recommendationId: string;
  userId: string;
  action: string;
  originalValue: number;
  adjustedValue?: number;
  justification?: string;
  createdAt: string;
}

export interface ManagementReport {
  id: string;
  companyId: string;
  type: 'semanal' | 'mensal';
  periodStart: string;
  periodEnd: string;
  content: ReportSummary;
  generatedAt: string;
}

export interface ExpirationRiskItem {
  batch: ProductBatch;
  product: Product;
  daysRemaining: number;
  riskLevel: 'vencido' | 'critico' | 'alto' | 'medio' | 'baixo';
  availableQuantity: number;
  unitCost: number;
  valueAtRisk: number;
  dailySalesAverage: number;
  sellableBeforeExpiration: number;
  potentialLossQuantity: number;
  riskPercentage: number;
  confidenceLevel: 'alta' | 'media' | 'baixa';
  method: string;
  observations: string[];
}

export interface DemandForecastResult {
  product: Product;
  demandaPrevista7Dias: number;
  demandaPrevista30Dias: number;
  mediaDiaria: number;
  tendencia: 'alta' | 'estavel' | 'queda' | 'indefinida';
  variacaoPercentual: number | null;
  nivelConfianca: 'alta' | 'media' | 'baixa';
  quantidadeRegistros: number;
  metodoUtilizado: string;
  observacoes: string[];
}

export interface ReplenishmentRecommendation {
  product: Product;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  supplier?: Supplier;
  supplierLeadTimeDays: number;
  estimatedCost: number;
  priority: AlertPriority;
  confidenceLevel: 'alta' | 'media' | 'baixa';
  reason: string;
  calculationData: Record<string, unknown>;
  risks: string[];
}

export interface PromotionSuggestion {
  product: Product;
  batch: ProductBatch;
  expirationDate: string;
  quantityAtRisk: number;
  currentPrice: number;
  suggestedDiscountPercentage: number;
  promotionalPrice: number;
  currentMargin: number;
  estimatedMargin: number;
  potentialLossValue: number;
  avoidableLossValue: number;
  justification: string;
  confidenceLevel: 'alta' | 'media' | 'baixa';
  warnings: string[];
}

export interface DashboardIntelligence {
  totalStockValue: number;
  totalProducts: number;
  belowMinimum: number;
  excessStock: number;
  expiringBatches: number;
  expiredBatches: number;
  financialValueAtRisk: number;
  monthLosses: number;
  pendingRecommendations: number;
  pendingPurchaseOrders: number;
  topTurnoverProducts: Product[];
  lowTurnoverProducts: Product[];
  priorityAlerts: StockAlert[];
  replenishments: ReplenishmentRecommendation[];
  expirationRisks: ExpirationRiskItem[];
  promotionSuggestions: PromotionSuggestion[];
  updatedAt: string;
}

export interface ReportSummary {
  totalStockValue: number;
  stockEvolution: number;
  entries: number;
  outputs: number;
  losses: number;
  topSellingProducts: Array<{ productName: string; quantity: number }>;
  lowTurnoverProducts: Array<{ productName: string; quantity: number }>;
  belowMinimum: number;
  excessStock: number;
  expiringBatches: number;
  financialValueAtRisk: number;
  replenishmentRecommendations: number;
  promotionSuggestions: number;
  previousPeriodComparison: number | null;
  executiveSummary: string;
}

export interface AssistantResponse {
  intent: string;
  answer: string;
  period: string;
  cards: Array<{ title: string; description: string; value?: string }>;
  relatedScreen?: string;
}

export type AccessAction =
  | 'login'
  | 'logout'
  | 'page_view'
  | 'create_product'
  | 'update_product'
  | 'delete_product'
  | 'create_user'
  | 'delete_user';

export interface AccessLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: AccessAction;
  timestamp: string;
  details?: string;
}

export interface Repository {
  getUsers(): Promise<AppUser[]>;
  saveUsers(users: AppUser[]): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getProducts(): Promise<Product[]>;
  saveProducts(products: Product[]): Promise<void>;
  deleteProduct(productId: string): Promise<void>;
  getAccessLogs(): Promise<AccessLog[]>;
  saveAccessLogs(logs: AccessLog[]): Promise<void>;
  getBatches(companyId: string): Promise<ProductBatch[]>;
  getMovements(companyId: string): Promise<StockMovement[]>;
  getSales(companyId: string): Promise<Sale[]>;
  getSaleItems(companyId: string): Promise<SaleItem[]>;
  getSuppliers(companyId: string): Promise<Supplier[]>;
  getProductSuppliers(companyId: string): Promise<ProductSupplier[]>;
  getAlerts(companyId: string): Promise<StockAlert[]>;
  getRecommendations(companyId: string): Promise<Recommendation[]>;
  getReports(companyId: string): Promise<ManagementReport[]>;
  getDashboard(companyId: string): Promise<DashboardIntelligence>;
  getExpirationRisks(companyId: string): Promise<ExpirationRiskItem[]>;
  getForecasts(companyId: string): Promise<DemandForecastResult[]>;
  getReplenishments(companyId: string): Promise<ReplenishmentRecommendation[]>;
  getPromotions(companyId: string): Promise<PromotionSuggestion[]>;
  askAssistant(
    companyId: string,
    message: string,
    conversation?: Array<{ from: 'user' | 'assistant'; text: string }>
  ): Promise<AssistantResponse>;
  moveStock(input: {
    companyId: string;
    productId: string;
    batchId?: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    userId: string;
  }): Promise<void>;
  decideRecommendation(input: {
    companyId: string;
    recommendationId: string;
    userId: string;
    action: string;
    originalValue: number;
    adjustedValue?: number;
    justification?: string;
  }): Promise<void>;
}
