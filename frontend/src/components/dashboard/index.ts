/**
 * Export centralisé des composants du dashboard.
 */

export { default as StatCard } from './StatCard';
export { default as MonthlyChart } from './MonthlyChart';
export { default as TagPieChart } from './TagPieChart';
export { default as BudgetProgress } from './BudgetProgress';
export { default as TopExpenses } from './TopExpenses';
export { default as TopItems } from './TopItems';

// Types
export type { MonthlyData } from './MonthlyChart';
export type { TagSpendingData } from './TagPieChart';
export type { BudgetData } from './BudgetProgress';
export type { ExpenseData } from './TopExpenses';
export type { TopItemData } from './TopItems';
