import type { FoodCategory, Screen } from '../types/app';

export const foodCategories: FoodCategory[] = [
  { value: 'Hortifrutis', unit: 'kg' },
  { value: 'Padaria', unit: 'un' },
  { value: 'Bebidas', unit: 'un' },
  { value: 'Mercearia', unit: 'un' },
  { value: 'Carnes e Frios', unit: 'kg' },
  { value: 'Laticínios', unit: 'un' },
  { value: 'Higiene e Limpeza', unit: 'un' },
  { value: 'Congelados', unit: 'un' },
  { value: 'Descartáveis', unit: 'un' },
  { value: 'Rotisseria', unit: 'kg' },
];

export const navItems: Array<{ id: Screen; label: string; adminOnly?: boolean; short: string }> = [
  { id: 'inicio', label: 'Painel', short: 'PI' },
  { id: 'produtos', label: 'Produtos', short: 'PR' },
  { id: 'lotes', label: 'Lotes e validade', short: 'LV' },
  { id: 'previsoes', label: 'Previsões', short: 'PV' },
  { id: 'recomendacoes', label: 'Reposição', short: 'RP' },
  { id: 'promocoes', label: 'Promoções', short: 'PM' },
  { id: 'relatorios', label: 'Relatórios', adminOnly: true, short: 'RE' },
  { id: 'assistente', label: 'Consulta', short: 'CO' },
  { id: 'alertas', label: 'Alertas', short: 'AL' },
  { id: 'historico', label: 'Histórico', short: 'HI' },
  { id: 'usuarios', label: 'Usuários', adminOnly: true, short: 'US' },
  { id: 'metricas', label: 'Métricas', adminOnly: true, short: 'ME' },
];
