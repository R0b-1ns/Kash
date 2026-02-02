/**
 * Export centralisé des composants du dashboard.
 */

export { default as StatCard } from './StatCard';
export { default as MonthlyChart } from './MonthlyChart';
export { default as TagPieChart } from './TagPieChart';
export { default as BudgetProgress } from './BudgetProgress';
export { default as TopExpenses } from './TopExpenses';
export { default as TopItems } from './TopItems';
export { default as TopMerchants } from './TopMerchants';
export { default as RecurringBreakdown } from './RecurringBreakdown';
export { default as TagEvolutionChart } from './TagEvolutionChart';
export { default as DayOfWeekChart } from './DayOfWeekChart';
export { default as TopTransactions } from './TopTransactions';

// Types
export type { MonthlyData } from './MonthlyChart';
export type { TagSpendingData } from './TagPieChart';
export type { BudgetData } from './BudgetProgress';
export type { ExpenseData } from './TopExpenses';
export type { TopItemData } from './TopItems';
export type { TopMerchantData } from './TopMerchants';
export type { RecurringBreakdownData } from './RecurringBreakdown';
export type { TagEvolutionData, TagEvolutionEntry } from './TagEvolutionChart';
export type { DayOfWeekData } from './DayOfWeekChart';
export type { TopTransactionData } from './TopTransactions';
