
export type PricingMethod = 'fixed' | 'area';

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number; // Represents Fixed Price OR Price Per Meter based on method
  category: string;
  pricingMethod: PricingMethod;
  services?: Service[];
  isVariable?: boolean; // New: Allows custom name/price at checkout
  order_index?: number; // New: For persisting display order
}

export interface Category {
  name: string;
  order_index: number;
}

export interface CartItem extends Product {
  quantity: number;
  selectedServices: Service[];
  dimensions?: {
    width: number;
    height: number;
  };
  wasted?: {
    width: number;
    height: number;
  };
  finalPrice: number; // Price of one unit including services/area calc
}

export type PaymentMethod = 'cash' | 'vodafone_cash' | 'credit';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: PaymentMethod;
}

export type TransactionType = 'sale' | 'collection';

export interface Transaction {
  id: string;
  type?: TransactionType; // 'sale' for normal invoices, 'collection' for debt payments
  date: string;
  itemsCount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  items?: CartItem[];
  isPaid?: boolean;
  payments?: PaymentRecord[]; // History of payments
  relatedTransactionId?: string; // Link between collection receipt and original invoice
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Machine {
  id: string;
  name: string;
  initialReading: number;
}

export interface MachineReading {
  id: string;
  machineId: string;
  value: number;
  date: string;
  notes?: string;
}

// --- Suppliers & Debts Types ---
export interface SupplierItem {
    id: string;
    name: string;
    price: number;
}

export interface DebtCartItem extends SupplierItem {
    quantity: number;
}

export interface Supplier {
    id: string;
    name: string;
    items: SupplierItem[];
    draftCart?: DebtCartItem[]; // Stores the unsaved draft online
}

export type ReceiptElementId = 'logo' | 'storeName' | 'address' | 'contact' | 'separator' | 'meta' | 'items' | 'totals' | 'footer' | 'qr';

export interface ReceiptItemConfig {
  id: ReceiptElementId;
  label: string;
  visible: boolean;
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  align: 'left' | 'center' | 'right';
}

export interface ReceiptTableConfig {
    showPrice: boolean;
    showQuantity: boolean;
    labelName: string;
    labelPrice: string;
    labelQuantity: string;
    labelTotal: string;
}

export interface ReceiptSettings {
  storeName: string;
  address: string;
  phone: string;
  footerMessage: string;
  logo?: string;
  layout: ReceiptItemConfig[];
  
  // New Customizations
  paperSize: '80mm' | '58mm' | 'A4';
  currency: string;
  taxNumber?: string;
  showQr: boolean;
  tableConfig: ReceiptTableConfig;
  
  // Social Links
  facebook?: string;
  instagram?: string;
  website?: string;
}

export interface AppTheme {
  id: string;
  name: string;
  primaryColor: string; // RGB values like '227 30 36'
  sidebarColor: string; // RGB values
}

export enum ViewState {
  LOGIN = 'LOGIN',
  POS = 'POS',
  REPORTS = 'REPORTS',
  PRODUCTS = 'PRODUCTS',
  CUSTOMERS = 'CUSTOMERS',
  EXPENSES = 'EXPENSES',
  CREDITS = 'CREDITS',
  MACHINES = 'MACHINES',
  SETTINGS = 'SETTINGS',
  USERS = 'USERS',
  AI = 'AI'
}

export interface AppSettings {
  appName: string;
  appLogo?: string;
  theme: string; // Theme ID
  fontScale: number; // 0.8 to 1.2
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  layoutMode: 'sidebar' | 'topbar';
  language: 'ar' | 'en';
  menuOrder?: ViewState[]; // Optional for backward compatibility
}

export interface AIConfig {
    apiKey: string;
}

// --- Auth Types ---
export type UserRole = 'admin' | 'user';

export type Permission = 
  // POS
  | 'pos.view' 
  | 'pos.variable_product'
  // Products
  | 'products.view'
  | 'products.add'
  | 'products.edit'
  | 'products.delete'
  | 'products.manage_categories'
  // Customers
  | 'customers.view'
  | 'customers.add'
  | 'customers.edit'
  | 'customers.delete'
  // Reports & Credits
  | 'reports.view' 
  | 'reports.delete_transaction'
  | 'credits.view' 
  // Expenses
  | 'expenses.view' 
  | 'expenses.add' 
  | 'expenses.edit' 
  | 'expenses.delete' 
  // Machines
  | 'machines.view'
  | 'machines.manage'
  // Admin
  | 'settings.manage'
  | 'users.manage'
  // AI
  | 'ai.chat';

export interface User {
  id: string;
  username: string;
  pin: string; // Simple PIN/Password
  role: UserRole;
  permissions: Permission[];
  name: string;
  allowedCategories?: string[]; // If empty/undefined, access to all
}