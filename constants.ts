import { Product, ReceiptSettings, ReceiptItemConfig, Customer, Expense, AppTheme, AppSettings, ViewState, User, Transaction, AIConfig } from './types';

export const APP_VERSION = 'V 1.0.0';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'قهوة عربي',
    price: 15.00,
    category: 'مشروبات ساخنة',
    pricingMethod: 'fixed',
    services: [
        { id: 's1_1', name: 'سكر زيادة', price: 0 },
        { id: 's1_2', name: 'مكسرات', price: 5 },
        { id: 's1_3', name: 'حليب', price: 3 }
    ]
  },
  {
    id: '2',
    name: 'كعك شوكولاتة',
    price: 25.00,
    category: 'حلويات',
    pricingMethod: 'fixed',
    services: [
        { id: 's2_1', name: 'صوص إضافي', price: 5 },
        { id: 's2_2', name: 'تغليف هدية', price: 2 }
    ]
  },
  // New Variable Product
  {
    id: 'var_1',
    name: 'منتج متنوع / خدمة',
    price: 0,
    category: 'خدمات',
    pricingMethod: 'fixed',
    isVariable: true
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { name: 'مشروبات ساخنة', order_index: 0 },
  { name: 'مشروبات باردة', order_index: 1 },
  { name: 'حلويات', order_index: 2 },
  { name: 'مأكولات', order_index: 3 },
  { name: 'مخبوزات', order_index: 4 },
  { name: 'خدمات', order_index: 5 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'عميل نقدي', phone: '' },
  { id: '2', name: 'شركة الأمل', phone: '01012345678' },
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: '1', title: 'كهرباء', amount: 150.00, date: new Date().toISOString(), notes: 'فاتورة شهرية' },
];

export const DEFAULT_RECEIPT_LAYOUT: ReceiptItemConfig[] = [
  { id: 'logo', label: 'الشعار', visible: true, fontSize: 'base', align: 'center' },
  { id: 'storeName', label: 'اسم المتجر', visible: true, fontSize: 'xl', align: 'center' },
  { id: 'address', label: 'العنوان', visible: true, fontSize: 'sm', align: 'center' },
  { id: 'contact', label: 'رقم الهاتف', visible: true, fontSize: 'sm', align: 'center' },
  { id: 'meta', label: 'التاريخ ورقم الفاتورة', visible: true, fontSize: 'xs', align: 'center' },
  { id: 'items', label: 'قائمة المنتجات', visible: true, fontSize: 'sm', align: 'right' },
  { id: 'totals', label: 'ملخص الحساب', visible: true, fontSize: 'lg', align: 'left' },
  { id: 'qr', label: 'QR Code', visible: true, fontSize: 'base', align: 'center' },
  { id: 'footer', label: 'رسالة التذييل', visible: true, fontSize: 'xs', align: 'center' },
];

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  storeName: 'شركة...',
  address: 'القاهرة، مصر',
  phone: '01000000000',
  footerMessage: 'شكراً لزيارتكم، يرجى الاحتفاظ بالإيصال',
  logo: '',
  layout: DEFAULT_RECEIPT_LAYOUT,
  paperSize: '80mm',
  currency: 'ج.م',
  showQr: true,
  taxNumber: '',
  tableConfig: {
      showPrice: true,
      showQuantity: true,
      labelName: 'الصنف',
      labelPrice: 'سعر',
      labelQuantity: 'العدد',
      labelTotal: 'اجمالي'
  },
  facebook: '',
  instagram: '',
  website: ''
};

export const APP_THEMES: AppTheme[] = [
  { id: 'red', name: 'أحمر كلاسيكي', primaryColor: '227 30 36', sidebarColor: '104 8 8' },
  { id: 'blue', name: 'أزرق مؤسسي', primaryColor: '37 99 235', sidebarColor: '30 58 138' },
  { id: 'green', name: 'أخضر طبيعي', primaryColor: '22 163 74', sidebarColor: '20 83 45' },
  { id: 'purple', name: 'بنفسجي عصري', primaryColor: '147 51 234', sidebarColor: '88 28 135' },
  { id: 'dark', name: 'ليلي', primaryColor: '75 85 99', sidebarColor: '17 24 39' },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'POS App',
  theme: 'red',
  appLogo: '',
  fontScale: 1,
  borderRadius: 'lg',
  layoutMode: 'sidebar',
  language: 'ar',
  menuOrder: [
      ViewState.POS,
      ViewState.REPORTS,
      ViewState.EXPENSES,
      ViewState.CREDITS,
      ViewState.MACHINES,
      ViewState.CUSTOMERS,
      // ViewState.USERS, // Default hidden, access via Settings
      ViewState.AI,
      ViewState.SETTINGS
  ]
};

export const DEFAULT_AI_CONFIG: AIConfig = {
    apiKey: ''
};

export const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'المدير العام',
    username: 'admin',
    pin: '1234',
    role: 'admin',
    permissions: [
      // Full Access
      'pos.view', 'pos.variable_product',
      'products.view', 'products.add', 'products.edit', 'products.delete', 'products.manage_categories',
      'customers.view', 'customers.add', 'customers.edit', 'customers.delete',
      'reports.view', 'reports.delete_transaction',
      'credits.view',
      'expenses.view', 'expenses.add', 'expenses.edit', 'expenses.delete',
      'machines.view', 'machines.manage',
      'settings.manage', 'users.manage',
      'ai.chat'
    ]
  }
];

// Generate fake invoice for yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'inv_demo_yesterday',
    type: 'sale',
    date: yesterday.toISOString(),
    itemsCount: 2,
    total: 1250.00,
    paymentMethod: 'credit',
    customerId: '2', // شركة الأمل
    customerName: 'شركة الأمل',
    isPaid: false,
    payments: [],
    items: [
        {
            id: 'd1',
            name: 'توريد خامات (آجل)',
            price: 1000.00,
            quantity: 1,
            category: 'خدمات',
            pricingMethod: 'fixed',
            selectedServices: [],
            finalPrice: 1000.00
        },
        {
            id: 'd2',
            name: 'كعك شوكولاتة',
            price: 25.00,
            quantity: 10,
            category: 'حلويات',
            pricingMethod: 'fixed',
            selectedServices: [],
            finalPrice: 25.00
        }
    ]
  }
];