import type { FoodCategory, Screen } from '../types/app';

export const foodCategories: FoodCategory[] = [
  { value: 'Hortifrutis', unit: 'kg' },
  { value: 'Padaria', unit: 'un' },
  { value: 'Bebidas', unit: 'un' },
  { value: 'Mercearia', unit: 'un' },
  { value: 'Carnes e Frios', unit: 'kg' },
  { value: 'Laticinios', unit: 'un' },
  { value: 'Higiene e Limpeza', unit: 'un' },
  { value: 'Congelados', unit: 'un' },
  { value: 'Descartaveis', unit: 'un' },
  { value: 'Rotisseria', unit: 'kg' },
];

export const navItems: Array<{ id: Screen; label: string; adminOnly?: boolean; short: string }> = [
  { id: 'inicio', label: 'Painel', short: 'PI' },
  { id: 'produtos', label: 'Produtos', short: 'PR' },
  { id: 'lotes', label: 'Lotes e validade', short: 'LV' },
  { id: 'previsoes', label: 'Previsoes', short: 'PV' },
  { id: 'recomendacoes', label: 'Reposicao', short: 'RP' },
  { id: 'promocoes', label: 'Promocoes', short: 'PM' },
  { id: 'relatorios', label: 'Relatorios', adminOnly: true, short: 'RE' },
  { id: 'assistente', label: 'Assistente', short: 'AS' },
  { id: 'alertas', label: 'Alertas', short: 'AL' },
  { id: 'historico', label: 'Historico', short: 'HI' },
  { id: 'usuarios', label: 'Usuarios', adminOnly: true, short: 'US' },
  { id: 'metricas', label: 'Metricas', adminOnly: true, short: 'ME' },
];
