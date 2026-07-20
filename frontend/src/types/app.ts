import type { AccessLog, AppUser, Product } from './models';

export type Screen =
  | 'inicio'
  | 'produtos'
  | 'lotes'
  | 'previsoes'
  | 'recomendacoes'
  | 'promocoes'
  | 'relatorios'
  | 'assistente'
  | 'alertas'
  | 'historico'
  | 'usuarios'
  | 'metricas';
export type AuthMode = 'login' | 'register';
export type ProductFilter = 'all' | 'critical' | 'low' | 'out';

export type FoodCategory = {
  value: string;
  unit: string;
};

export type DashboardMetrics = {
  totalProdutos: number;
  estoqueTotal: number;
  valorTotal: number;
  itensCriticos: number;
};

export type AccessMetrics = {
  recentLogins: number;
  activeUsers: number;
  totalPageViews: number;
  topPages: Array<[string, number]>;
};

export type ReportMetrics = {
  orderedCategories: Array<[string, number]>;
  byCategoryValue: Array<[string, number]>;
  byUnit: Array<[string, number]>;
  criticalProducts: Product[];
  totalItems: number;
  stockValue: number;
  averageTicket: number;
};

export type AppStateSnapshot = {
  users: AppUser[];
  products: Product[];
  accessLogs: AccessLog[];
  currentUser: AppUser;
  syncStatus: string;
  lastSyncedAt: string | null;
  isPostgresProvider: boolean;
};
