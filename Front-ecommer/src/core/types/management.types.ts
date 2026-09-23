export interface CategoryItem {
  id: string;
  name: string;
  code: string;
  description: string;
  parentId?: string;
  isActive: boolean;
}

export interface SeasonItem {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ProviderItem {
  id: string;
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

export interface PromotionItem {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface DashboardKpiSummary {
  todayRevenue: number;
  todaySalesCount: number;
  activeReservationsCount: number;
  lowStockItemsCount: number;
  totalProductsCount: number;
  salesByBranch: Array<{
    branchId?: string;
    branchName: string;
    branchCode?: string;
    totalRevenue: number;
    salesCount: number;
    percentage?: number;
  }>;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    branchName: string;
    cashierName: string;
    totalAmount: number;
    paymentMethod: string;
    issuedAt: string;
  }>;
  recentReservations: Array<{
    id: string;
    code: string;
    clientName: string;
    branchName: string;
    status: string;
    scheduledTime: string;
  }>;
}
