export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'staff' | 'customer' | 'system';
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  isActive: boolean;
}

export interface InventoryEntry {
  id: string;
  variantId: string;
  branch: Branch;
  variant?: Pick<Variant, 'id' | 'sku' | 'size' | 'color' | 'isActive'> | null;
  product?: Pick<Product, 'id' | 'sku' | 'name' | 'category' | 'imageUrl' | 'imageDocumentId'> | null;
  quantity: number;
  reorderLevel: number;
  updatedAt: string;
}

export interface Variant {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  priceOverride: number | null;
  isActive: boolean;
  stock: InventoryEntry[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  currency: string;
  imageUrl: string | null;
  imageDocumentId: string | null;
  isActive: boolean;
  variants: Variant[];
  createdAt: string;
}

export interface SaleItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  branch: Branch;
  items: SaleItem[];
  confirmedAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  code: string;
  status: 'placed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  sale: Sale;
  notes: string | null;
  createdAt: string;
}

export interface MonthlySalePoint {
  month: string;
  totalSales: number;
  saleCount: number;
}

export interface PopularProductRow {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
}

export interface DashboardSummary {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  lowStockCount: number;
  activeProducts: number;
  activeBranches: number;
}

export interface AuthPayload {
  accessToken: string;
  expiresAt: string;
  user: User;
}

export interface DocumentRecord {
  id: string;
  title: string;
  description: string | null;
  category: 'word' | 'excel' | 'pdf' | 'image' | 'other';
  storage_key: string;
  mime_type: string;
  size_bytes: string;
  sha256: string | null;
  status: 'pending' | 'active' | 'deleted';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  document_id: string | null;
  action: 'upload' | 'read' | 'download' | 'edit' | 'delete' | 'verify';
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
