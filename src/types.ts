export type Branch = "Imus" | "Quezon City";

export type Role = "Super Admin" | "Branch Staff";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  branch?: Branch;
  permissions: string[];
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  costPrice: number;
  stockQty: number;
  lowStockThreshold: number;
  branch: Branch;
  imageUrl: string;
  status: "IN STOCK" | "LOW STOCK" | "RESERVED";
  inclusions?: string[];
  isSale?: boolean;
  salePrice?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  inclusions: string[];
}

export interface Transaction {
  id: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerEmail?: string;
  staffName: string;
  branch: Branch;
  timestamp: any;
}

export interface Booking {
  id: string;
  customerName: string;
  contact: string;
  email: string;
  instrumentType: string;
  instrumentModel: string;
  serviceType: string;
  description: string;
  preferredDate: string;
  branch: Branch;
  status: "Pending" | "Ongoing" | "Completed" | "Claimed";
  technician?: string;
  progress: number;
  createdAt: any;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  type: "IN" | "OUT";
  personInCharge: string;
  branch: Branch;
  timestamp: any;
}
