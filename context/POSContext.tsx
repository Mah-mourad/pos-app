import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Product,
  CartItem,
  Transaction,
  ViewState,
  ReceiptSettings,
  ReceiptItemConfig,
  PaymentMethod,
  Customer,
  Expense,
  Service,
  PaymentRecord,
  AppSettings,
  User,
  Permission,
  UserRole,
  Machine,
  MachineReading,
  Supplier,
  AIConfig,
  Category
} from '../types';

import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, DEFAULT_RECEIPT_SETTINGS, DEFAULT_RECEIPT_LAYOUT, INITIAL_CUSTOMERS, INITIAL_EXPENSES, DEFAULT_APP_SETTINGS, APP_THEMES, INITIAL_USERS, INITIAL_TRANSACTIONS, DEFAULT_AI_CONFIG } from '../constants';
import { translations, TranslationKey } from '../translations';
import QRCode from 'qrcode';
import { supabase, isConfigured } from '../supabaseConfig';


// const normalizeTransaction = (row: any): Transaction => {
//   if (!row) return row;
//   // خليه دايمًا يملك id عشان باقي الكود يشتغل
//   return {
//     ...row,
//     id: row.id ?? row.id_uuid,   // ✅ هنا السر
//   } as Transaction;
// };

// const normalizeTransaction = (row: any): Transaction => {
//   if (!row) return row;

//   return {
//     ...row,
//     id: row.id_uuid,   // 🔒 قراءة فقط – مصدر الحقيقة
//   } as Transaction;
// };

const normalizeTransaction = (row: any): Transaction => {
  if (!row) return row;
  return {
    ...row,
    id: row.id ?? row.id_uuid,
  } as Transaction;
};


// --- Helper: Safe JSON Stringify ---
const safeStringify = (obj: any): string => {
    try {
        const cache = new Set();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                    return; // Duplicate reference found, discard key
                }
                cache.add(value);
            }
            return value;
        });
    } catch (e) {
        console.error("Error stringifying object:", e);
        return "";
    }
};

// --- Helper: Sanitize Data for Supabase ---
const sanitize = (data: any): any => {
    if (data === undefined) return null;
    if (typeof data === 'function') return null;
    
    if (Array.isArray(data)) {
        return data.map(sanitize);
    }
    
    if (data instanceof Date) return data.toISOString();

    if (typeof data === 'object' && data !== null) {
        const sanitized: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                sanitized[key] = sanitize(value);
            }
        }
        return sanitized;
    }
    
    return data;
};

interface POSContextType {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  transactions: Transaction[];
  customers: Customer[];
  expenses: Expense[];
  machines: Machine[];
  machineReadings: MachineReading[];
  users: User[];
  suppliers: Supplier[]; // New
    currentUser: User | null;
    
    selectedCustomer: Customer | null;
setSelectedCustomer: (customer: Customer | null) => void;

  
  currentView: ViewState;
  setView: (view: ViewState) => void;
  
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, cartIndex: number) => void;
  updateQuantity: (cartIndex: number, delta: number) => void;
  setQuantity: (cartIndex: number, quantity: number) => void;
  updateCartItemDimensions: (cartIndex: number, width: number, height: number) => void;
  toggleServiceForCartItem: (cartIndex: number, service: Service) => void;
  clearCart: () => void;
  
    // completeTransaction: (method: PaymentMethod, customer?: Customer, paidAmount?: number) => Transaction | undefined;
    completeTransaction: (method: PaymentMethod, customer: Customer, paidAmount?: number) => Promise<Transaction>;

  markTransactionAsPaid: (transactionId: string) => void;
  addPaymentToTransaction: (transactionId: string, amount: number, method: PaymentMethod) => void;
  collectDebtFromCustomer: (customerId: string, amount: number, method: PaymentMethod) => void;
  deleteTransaction: (transactionId: string) => void;
  
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  reorderProducts: (newOrder: Product[]) => void;
  deleteProduct: (id: string) => void;
  
  addCategory: (category: string) => void;
  updateCategory: (oldCategory: string, newCategory: string) => void;
  deleteCategory: (category: string) => void;
  reorderCategories: (newOrder: string[]) => void;
  
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  addMachine: (machine: Omit<Machine, 'id'>) => void;
  updateMachine: (id: string, data: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  
  addMachineReading: (reading: Omit<MachineReading, 'id'>) => void;
  deleteMachineReading: (id: string) => void;
  
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  login: (username: string, pin: string) => boolean;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;

  totalAmount: number;
  
  receiptSettings: ReceiptSettings;
  updateReceiptSettings: (settings: ReceiptSettings) => void;
  printReceipt: (transaction: Transaction) => Promise<void>;
  
  appSettings: AppSettings;
  updateAppSettings: (settings: AppSettings) => void;

  aiSettings: AIConfig;
  updateAiSettings: (settings: AIConfig) => void;
  
  exportData: () => Promise<Blob | null>;
  importData: (jsonData: string) => Promise<boolean>;
  clearAllData: () => Promise<void>;
  
  t: (key: string, params?: any) => string;
  
  serverStatus: boolean;
  connectionError: string | null;
}

type SettingsRow = {
  key: 'app' | 'receipt' | 'ai';
  value: any;
};

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- State Definitions ---
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineReadings, setMachineReadings] = useState<MachineReading[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // New Supplier State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  
  const [currentView, setView] = useState<ViewState>(ViewState.LOGIN);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(DEFAULT_RECEIPT_SETTINGS);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [aiSettings, setAiSettings] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  
  const [serverStatus, setServerStatus] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);


  // --- Initialization & Data Fetching (Supabase) ---
  useEffect(() => {
    // 1. Initial Load from LocalStorage (Offline fallback / Cache)
    const loadLocalData = () => {
        try {
            setProducts(JSON.parse(localStorage.getItem('pos_products') || JSON.stringify(INITIAL_PRODUCTS)));
            setCategories(JSON.parse(localStorage.getItem('pos_categories') || JSON.stringify(INITIAL_CATEGORIES)).sort((a: Category, b: Category) => a.order_index - b.order_index));
            // setTransactions(JSON.parse(localStorage.getItem('pos_transactions') || JSON.stringify(INITIAL_TRANSACTIONS)));
//             const localTransactions = localStorage.getItem('pos_transactions');

// if (localTransactions && !isConfigured) {
//   setTransactions(JSON.parse(localTransactions));
// }

            setCustomers(JSON.parse(localStorage.getItem('pos_customers') || JSON.stringify(INITIAL_CUSTOMERS)));
            setExpenses(JSON.parse(localStorage.getItem('pos_expenses') || JSON.stringify(INITIAL_EXPENSES)));
            setMachines(JSON.parse(localStorage.getItem('pos_machines') || '[]'));
            setMachineReadings(JSON.parse(localStorage.getItem('pos_machine_readings') || '[]'));
            setUsers(JSON.parse(localStorage.getItem('pos_users') || JSON.stringify(INITIAL_USERS)));
            setSuppliers(JSON.parse(localStorage.getItem('pos_suppliers') || '[]')); // Load suppliers locally
            setReceiptSettings(JSON.parse(localStorage.getItem('pos_receipt_settings') || JSON.stringify(DEFAULT_RECEIPT_SETTINGS)));
            setAppSettings(JSON.parse(localStorage.getItem('pos_app_settings') || JSON.stringify(DEFAULT_APP_SETTINGS)));
            setAiSettings(JSON.parse(localStorage.getItem('pos_ai_settings') || JSON.stringify(DEFAULT_AI_CONFIG)));
        } catch (e) {
            console.error("Local load error", e);
        }
    };
    loadLocalData();

    // 2. Connect to Supabase if configured
    if (isConfigured && supabase) {
        setServerStatus(true);
        setConnectionError(null);

        // Fetch Function helper
        const fetchData = async (table: string, setter: (data: any) => void) => {
            const { data, error } = await supabase.from(table).select('*');
            if (error) {
                console.error(`Error fetching ${table}:`, error);
                setConnectionError(error.message);
            } else if (data) {
                setter(data);
            }
        };

        // Fetch All Data
        const fetchProducts = async () => {
            const { data, error } = await supabase.from('products').select('*').order('order_index', { ascending: true });
            if (error) {
                console.error(`Error fetching products:`, error);
                setConnectionError(error.message);
            } else if (data) {
                setProducts(data);
            }
        };
        fetchProducts();
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('categories').select('*').order('order_index', { ascending: true });
            if (error) {
                console.error(`Error fetching categories:`, error);
                setConnectionError(error.message);
            } else if (data) {
                setCategories(data);
            }
        };
        fetchCategories();
        // fetchData('transactions', setTransactions);
// const fetchTransactions = async () => {
//   const { data, error } = await supabase
//     .from('transactions')
//     .select('*')
//     // .order('date', { ascending: false });
//     // .order('created_at', { ascending: false });
//     .order('date', { ascending: false, nullsFirst: false });


//   if (error) {
//     console.error('Fetch transactions failed', error);
//     return;
//   }

//   if (data) {
//       // setTransactions(data);
//       setTransactions(data.map(normalizeTransaction));
//     setHydrated(true); // ✅ دي أهم سطر
//   }
        // };
        
        const fetchTransactions = async () => {
  if (!supabase) return;

  const pageSize = 1000;
  let from = 0;
  let all: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false, nullsFirst: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Fetch transactions failed', error);
      setConnectionError(error.message);
      break;
    }

    if (!data || data.length === 0) break;

    all = all.concat(data);

    // لو رجع أقل من pageSize يبقى خلصنا
    if (data.length < pageSize) break;

    from += pageSize;
  }

  setTransactions(all.map(normalizeTransaction));
  setHydrated(true);
};


fetchTransactions();

        fetchData('customers', setCustomers);
        fetchData('expenses', setExpenses);
        fetchData('machines', setMachines);
        fetchData('machine_readings', setMachineReadings);
        fetchData('suppliers', setSuppliers); // Fetch Suppliers from DB

        // Special for Users (Seed default if empty)
        const fetchUsers = async () => {
            const { data, error } = await supabase.from('users').select('*');
            if (data && data.length > 0) {
                setUsers(data);
            } else {
                // Auto seed handled by SQL script, but if not:
                // setUsers(INITIAL_USERS);
            }
        };
        fetchUsers();

        // Special for Settings (Key-Value)
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*');
            if (data) {
                data.forEach((row: any) => {
                    if (row.key === 'app') setAppSettings(row.value);
                    if (row.key === 'receipt') setReceiptSettings(row.value);
                    if (row.key === 'ai') setAiSettings(row.value);
                });
            }
        };
        fetchSettings();

        // 3. Realtime Subscriptions
        const channel = supabase.channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                const { table, eventType, new: newRow, old: oldRow } = payload;
                
                // Helper to update state arrays
                const updateState = (setter: any, idKey: string = 'id') => {
                    setter((prev: any[]) => {
                        if (eventType === 'INSERT') {
                            // Check if item already exists to prevent duplication from optimistic update
                            const exists = prev.some((item) => item[idKey] === newRow[idKey]);
                            if (exists) return prev;
                            return [...prev, newRow];
                        }
                        if (eventType === 'UPDATE') return prev.map((item) => item[idKey] === newRow[idKey] ? newRow : item);
                        if (eventType === 'DELETE') return prev.filter((item) => item[idKey] !== oldRow[idKey]);
                        return prev;
                    });
                };

                switch(table) {
                    case 'products': updateState(setProducts); break;
                    // case 'transactions': updateState(setTransactions); break;
                    case 'transactions': {
  // استخدم id_uuid كـ identity أو normalize
  const normalizedNew = normalizeTransaction(newRow);
  const normalizedOld = normalizeTransaction(oldRow);

  setTransactions((prev) => {
    if (eventType === 'INSERT') {
      const exists = prev.some(t => (t.id ?? (t as any).id_uuid) === normalizedNew.id);
      if (exists) return prev;
      return [...prev, normalizedNew];
    }
    if (eventType === 'UPDATE') {
      return prev.map(t => (t.id === normalizedNew.id ? normalizedNew : t));
    }
    if (eventType === 'DELETE') {
      return prev.filter(t => t.id !== normalizedOld.id);
    }
    return prev;
  });
  break;
}

                    case 'customers': updateState(setCustomers); break;
                    case 'expenses': updateState(setExpenses); break;
                    case 'machines': updateState(setMachines); break;
                    case 'machine_readings': updateState(setMachineReadings); break;
                    case 'suppliers': updateState(setSuppliers); break; // Suppliers Realtime
                    case 'users': updateState(setUsers); break;
                                        case 'categories':
                                            if (eventType === 'INSERT') {
                                                setCategories(prev => {
                                                    // Check if item already exists to prevent duplication from optimistic update
                                                    const exists = prev.some((item) => item.name === newRow.name);
                                                    if (exists) return prev;
                                                    // Assign order_index if not present, or use existing from newRow
                                                    const newCategory = { name: newRow.name, order_index: newRow.order_index ?? prev.length };
                                                    return [...prev, newCategory].sort((a, b) => a.order_index - b.order_index);
                                                });
                                            }
                                            if (eventType === 'UPDATE') {
                                                setCategories(prev => prev.map((item) => item.name === newRow.name ? newRow : item).sort((a, b) => a.order_index - b.order_index));
                                            }
                                            if (eventType === 'DELETE') setCategories(prev => prev.filter((item) => item.name !== oldRow.name).sort((a, b) => a.order_index - b.order_index));
                        break;
                  case 'settings': {
  const row = newRow as SettingsRow;

  if (row.key === 'app') setAppSettings(row.value);
  if (row.key === 'receipt') setReceiptSettings(row.value);
  if (row.key === 'ai') setAiSettings(row.value);

  break;
}

                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    } else {
        setServerStatus(false);
    }
  }, []);

  // --- Persistence (Local Storage Fallback) ---
  useEffect(() => localStorage.setItem('pos_products', safeStringify(products)), [products]);
  useEffect(() => localStorage.setItem('pos_categories', safeStringify(categories)), [categories]);
//   useEffect(() => localStorage.setItem('pos_transactions', safeStringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('pos_customers', safeStringify(customers)), [customers]);
  useEffect(() => localStorage.setItem('pos_expenses', safeStringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('pos_machines', safeStringify(machines)), [machines]);
  useEffect(() => localStorage.setItem('pos_machine_readings', safeStringify(machineReadings)), [machineReadings]);
  useEffect(() => localStorage.setItem('pos_users', safeStringify(users)), [users]);
  useEffect(() => localStorage.setItem('pos_suppliers', safeStringify(suppliers)), [suppliers]); // Persist Suppliers
  useEffect(() => localStorage.setItem('pos_receipt_settings', safeStringify(receiptSettings)), [receiptSettings]);
  useEffect(() => localStorage.setItem('pos_app_settings', safeStringify(appSettings)), [appSettings]);
  useEffect(() => localStorage.setItem('pos_ai_settings', safeStringify(aiSettings)), [aiSettings]);

  // --- Helper: Async DB Write ---
  const dbWrite = async (table: string, action: 'insert' | 'update' | 'delete' | 'upsert', data: any, id?: string) => {
      if (!isConfigured || !supabase) return;
      try {
          if (action === 'insert') await supabase.from(table).insert(sanitize(data));
          if (action === 'update' && id) await supabase.from(table).update(sanitize(data)).eq(table === 'categories' ? 'name' : 'id', id);
          if (action === 'upsert') await supabase.from(table).upsert(sanitize(data));
          if (action === 'delete' && id) await supabase.from(table).delete().eq(table === 'categories' ? 'name' : 'id', id);
      } catch (e) {
          console.error("DB Write Error", e);
      }
  };

  // --- Auth ---
  const login = (username: string, pin: string) => {
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin);
      if (user) {
          setCurrentUser(user);
          setView(ViewState.POS);
          return true;
      }
      return false;
  };

  const logout = () => {
      setCurrentUser(null);
      setView(ViewState.LOGIN);
  };

  const hasPermission = (permission: Permission): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      return currentUser.permissions.includes(permission);
  };

  // --- Cart Logic (Main POS) ---
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(i => 
          i.id === item.id && 
          JSON.stringify(i.selectedServices) === JSON.stringify(item.selectedServices) &&
          JSON.stringify(i.dimensions) === JSON.stringify(item.dimensions) &&
          i.name === item.name &&
          i.price === item.price
      );

      if (existingIdx > -1) {
        const newCart = [...prev];
        newCart[existingIdx].quantity += item.quantity;
        return newCart;
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (productId: string, cartIndex: number) => {
    setCart(prev => prev.filter((_, index) => index !== cartIndex));
  };

  const updateQuantity = (cartIndex: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[cartIndex];
      const newQuantity = Math.max(1, item.quantity + delta);
      newCart[cartIndex] = { ...item, quantity: newQuantity };
      return newCart;
    });
  };

  const setQuantity = (cartIndex: number, quantity: number) => {
      setCart(prev => {
          const newCart = [...prev];
          if (quantity > 0) {
              newCart[cartIndex] = { ...newCart[cartIndex], quantity };
          }
          return newCart;
      });
  };

  const updateCartItemDimensions = (cartIndex: number, width: number, height: number) => {
      setCart(prev => {
          const newCart = [...prev];
          const item = newCart[cartIndex];
          if (item.pricingMethod === 'area') {
              const area = width * height;
              const basePrice = item.price * area; 
              
              // Standard Area Calculation for Services
              const servicesPrice = item.selectedServices.reduce((sum, s) => {
                  return sum + (s.price * area);
              }, 0);

              newCart[cartIndex] = {
                  ...item,
                  dimensions: { width, height },
                  finalPrice: basePrice + servicesPrice
              };
          }
          return newCart;
      });
  };

  const toggleServiceForCartItem = (cartIndex: number, service: Service) => {
      setCart(prev => {
          const newCart = [...prev];
          const item = newCart[cartIndex];
          const hasService = item.selectedServices.find(s => s.id === service.id);
          let newServices = item.selectedServices;
          
          if (hasService) {
              newServices = newServices.filter(s => s.id !== service.id);
          } else {
              newServices = [...newServices, service];
          }

          let area = 1;
          if (item.pricingMethod === 'area' && item.dimensions) {
              area = item.dimensions.width * item.dimensions.height;
          }
          
          const basePrice = item.pricingMethod === 'area' ? item.price * area : item.price;
          
          // Standard Calculation
          const servicesTotal = newServices.reduce((sum, s) => {
              return sum + (item.pricingMethod === 'area' ? s.price * area : s.price);
          }, 0);

          newCart[cartIndex] = {
              ...item,
              selectedServices: newServices,
              finalPrice: basePrice + servicesTotal
          };
          return newCart;
      });
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

   // --- Transactions ---
    
    // ✅ REPLACE WITH THIS
// const completeTransaction = async (
//   method: PaymentMethod,
//   customer?: Customer,
//   paidAmount?: number
// ): Promise<Transaction> => {

//   if (!customer) {
//     throw new Error('CUSTOMER_REQUIRED');
//   }

//   if (!isConfigured || !supabase) {
//     throw new Error('DATABASE_NOT_CONNECTED');
//   }

//   const baseTransaction = {
//     type: 'sale',
//     itemsCount: cart.reduce((acc, item) => acc + item.quantity, 0),
//     total: totalAmount,
//     date: new Date().toISOString(),
//     paymentMethod: method,
//     customerId: customer.id,
//     customerName: customer.name,
//     items: cart,
//     isPaid: method !== 'credit',
//     payments:
//       method === 'credit'
//         ? paidAmount && paidAmount > 0
//           ? [{
//               amount: paidAmount,
//               date: new Date().toISOString(),
//               method: 'cash'
//             }]
//           : []
//         : [{
//             amount: totalAmount,
//             date: new Date().toISOString(),
//             method
//           }]
//   };

//   // 1️⃣ INSERT INTO DB
//   const { data, error } = await supabase
//     .from('transactions')
//     .insert(baseTransaction)
//     .select()
//     .single();

//   if (error || !data) {
//     console.error('Transaction insert failed:', error);
//     throw new Error('TRANSACTION_SAVE_FAILED');
//   }

//   // 2️⃣ Update local state ONLY after DB success
//   setTransactions(prev => [...prev, data]);

//   // 3️⃣ Clear UI
//   clearCart();
//   setSelectedCustomer(null);

//   // 4️⃣ Return REAL DB ROW (with id_uuid)
//   return data as Transaction;
    // };
    
const completeTransaction = async (
  method: PaymentMethod,
  customer: Customer,
  paidAmount?: number
): Promise<Transaction> => {

  if (!customer) throw new Error('CUSTOMER_REQUIRED');
  if (!isConfigured || !supabase) throw new Error('DATABASE_NOT_CONNECTED');

  const payload = {
    type: 'sale',
    itemsCount: cart.reduce((acc, item) => acc + item.quantity, 0),
      total: totalAmount,
    date: new Date().toISOString(),
    paymentMethod: method,
    customerId: customer.id,
    customerName: customer.name,
    items: cart,
    isPaid: method !== 'credit',
    payments:
      method === 'credit'
        ? paidAmount && paidAmount > 0
          ? [{ amount: paidAmount, method, date: new Date().toISOString() }]
          : []
        : [{ amount: totalAmount, method, date: new Date().toISOString() }]
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    console.error(error);
    throw new Error('TRANSACTION_SAVE_FAILED');
  }

  clearCart();
  setSelectedCustomer(null);

  // ❗ مفيش setTransactions هنا
  // realtime هيعمل كل حاجة

  return normalizeTransaction(data);
};



  const markTransactionAsPaid = (transactionId: string) => {
      // Logic handled via addPaymentToTransaction mainly
  };

  const addPaymentToTransaction = (transactionId: string, amount: number, method: PaymentMethod) => {
      // Optimistic update
      let updatedTransaction: Transaction | null = null;
      setTransactions(prev => prev.map(t => {
          if (t.id === transactionId) {
              const newPayment: PaymentRecord = {
                  id: Date.now().toString(),
                  amount,
                  date: new Date().toISOString(),
                  method
              };
              const newPayments = [...(t.payments || []), newPayment];
              const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
              
              updatedTransaction = {
                  ...t,
                  payments: newPayments,
                  isPaid: totalPaid >= t.total - 0.01
              };
              return updatedTransaction;
          }
          return t;
      }));

      // DB Update
      if (updatedTransaction) {
          dbWrite('transactions', 'update', updatedTransaction, transactionId);
      }
  };

//   const collectDebtFromCustomer = (customerId: string, amount: number, method: PaymentMethod) => {
//       // Just record collection receipt logic here
//       // For detailed distribution logic, we'd need to update multiple rows.
//       // Keeping it simple: Add collection receipt + Logic to update oldest debts?
//       // In this simplified version, we just create a collection receipt and assume manual allocation or future enhancement.
//       // Ideally: iterate transactions for customer and update them.
//       let remainingToCollect = amount;
      
//       // Update local state and DB for relevant transactions
//       const customerTrans = transactions.filter(t => t.customerId === customerId && t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection')
//                                     .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
//       customerTrans.forEach(t => {
//           if (remainingToCollect <= 0) return;
//           const paid = t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
//           const debt = t.total - paid;
//           const payAmount = Math.min(debt, remainingToCollect);
          
//           if (payAmount > 0) {
//               const newPayment = { id: Date.now().toString() + Math.random(), amount: payAmount, date: new Date().toISOString(), method };
//               const newPayments = [...(t.payments || []), newPayment];
//               const updatedT = {
//                   ...t,
//                   payments: newPayments,
//                   isPaid: (paid + payAmount) >= t.total - 0.01
//               };
              
//               // Update State
//               setTransactions(prev => prev.map(pt => pt.id === t.id ? updatedT : pt));
//               // Update DB
//               dbWrite('transactions', 'update', updatedT, t.id);
              
//               remainingToCollect -= payAmount;
//           }
//       });

//       // Create Collection Receipt
//     //   const collectionTrans: Transaction = {
//     //       id: 'col_' + Date.now().toString(),
//     //       type: 'collection',
//     //       date: new Date().toISOString(),
//     //       itemsCount: 0,
//     //       total: amount,
//     //       paymentMethod: method,
//     //       customerId: customerId,
//     //       customerName: customers.find(c => c.id === customerId)?.name,
//     //       isPaid: true,
//     //       items: [],
//     //       payments: [] // Removed payment array here to prevent double counting in reports
//     //     };
      
//     //   setTransactions(prev => [...prev, collectionTrans]);
//       //   dbWrite('transactions', 'insert', collectionTrans);

//   };
    // setTransactions(prev => [...prev, normalizeTransaction(data)]);


    const collectDebtFromCustomer = (
  customerId: string,
  amount: number,
  method: PaymentMethod
) => {
  let remaining = amount;

  const customerTrans = transactions
    .filter(t =>
      t.customerId === customerId &&
      t.paymentMethod === 'credit' &&
      !t.isPaid &&
      t.type !== 'collection'
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  customerTrans.forEach(t => {
    if (remaining <= 0) return;

    const paid = t.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const debt = t.total - paid;
    const pay = Math.min(debt, remaining);

    if (pay > 0) {
      const newPayment: PaymentRecord = {
        id: Date.now().toString(),
        amount: pay,
        date: new Date().toISOString(),
        method
      };

      const updated: Transaction = {
        ...t,
        payments: [...(t.payments || []), newPayment],
        isPaid: paid + pay >= t.total - 0.01
      };

      // ✅ update local
      setTransactions(prev =>
        prev.map(x => x.id === t.id ? updated : x)
      );

      // ✅ update DB
      dbWrite('transactions', 'update', updated, t.id);

      remaining -= pay;
    }
  });
};

    
  const deleteTransaction = (transactionId: string) => {
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      dbWrite('transactions', 'delete', null, transactionId);
  };

  // --- Products ---
  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);
    dbWrite('products', 'insert', newProduct);
  };
  const updateProduct = (id: string, data: Partial<Product>) => {
    const updated = { ...products.find(p => p.id === id), ...data, id } as Product;
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
    dbWrite('products', 'update', updated, id);
  };
  const reorderProducts = (newOrder: Product[]) => {
      const productsWithOrder = newOrder.map((p, index) => ({
          ...p,
          order_index: index, // Assign new order index
      }));
      setProducts(productsWithOrder);
      // Update Supabase for each product's order_index
      productsWithOrder.forEach(p => {
          dbWrite('products', 'update', { id: p.id, order_index: p.order_index }, p.id);
      });
  };
  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    dbWrite('products', 'delete', null, id);
  };

  // --- Categories ---
  const addCategory = (categoryName: string) => {
    const existingCategory = categories.find(c => c.name === categoryName);
    if (!existingCategory) {
        const newCategory: Category = { name: categoryName, order_index: categories.length }; // Assign order_index
        setCategories(prev => [...prev, newCategory].sort((a, b) => a.order_index - b.order_index));
        dbWrite('categories', 'insert', newCategory);
    }
  };
  const updateCategory = (oldCategoryName: string, newCategoryName: string) => {
      let updatedOrderIndex = -1;
      setCategories(prev => prev.map(c => {
          if (c.name === oldCategoryName) {
              updatedOrderIndex = c.order_index; // Keep the same order_index
              return { ...c, name: newCategoryName };
          }
          return c;
      }).sort((a, b) => a.order_index - b.order_index));

      // Update in DB: Delete old category record and insert new one with updated name but same order_index
      const oldCat = categories.find(c => c.name === oldCategoryName);
      if (oldCat) {
        dbWrite('categories', 'delete', null, oldCat.name); // Delete by old name
        dbWrite('categories', 'insert', { name: newCategoryName, order_index: oldCat.order_index }); // Insert new with old index
      }
      
      // Update products linked to this category
      const affectedProducts = products.filter(p => p.category === oldCategoryName);
      affectedProducts.forEach(p => {
          const updated = { ...p, category: newCategoryName };
          dbWrite('products', 'update', updated, p.id);
      });
      setProducts(prev => prev.map(p => p.category === oldCategoryName ? { ...p, category: newCategoryName } : p));
  };
  const deleteCategory = (categoryName: string) => {
      const newCategories = categories.filter(c => c.name !== categoryName);
      const reindexedCategories = newCategories.map((c, idx) => ({ ...c, order_index: idx }));
      setCategories(reindexedCategories);
      
      dbWrite('categories', 'delete', null, categoryName); // Delete from DB
      
      // Update order_index for remaining categories in DB
      reindexedCategories.forEach(c => {
          dbWrite('categories', 'update', { name: c.name, order_index: c.order_index }, c.name);
      });
  };

  const reorderCategories = (newOrder: Category[]) => {
      console.log("DEBUG: Reordering categories with new order:", newOrder);
      const categoriesWithOrder = newOrder.map((c, index) => ({
          ...c,
          order_index: index, // Assign new order index
      }));
      setCategories(categoriesWithOrder);
      // Update Supabase for each category's order_index
      categoriesWithOrder.forEach(c => {
          dbWrite('categories', 'update', { name: c.name, order_index: c.order_index }, c.name);
      });
  };

  // --- Customers ---
  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    const newCustomer = { ...customer, id: Date.now().toString() };
    setCustomers(prev => [...prev, newCustomer]);
    dbWrite('customers', 'insert', newCustomer);
    return newCustomer;
  };
  const updateCustomer = (id: string, data: Partial<Customer>) => {
    const updated = { ...customers.find(c => c.id === id), ...data, id } as Customer;
    setCustomers(prev => prev.map(c => c.id === id ? updated : c));
    dbWrite('customers', 'update', updated, id);
  };
  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    dbWrite('customers', 'delete', null, id);
  };

  // --- Expenses ---
  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    setExpenses(prev => [...prev, newExpense]);
    dbWrite('expenses', 'insert', newExpense);
  };
  const updateExpense = (id: string, data: Partial<Expense>) => {
    const updated = { ...expenses.find(e => e.id === id), ...data, id } as Expense;
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    dbWrite('expenses', 'update', updated, id);
  };
  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    dbWrite('expenses', 'delete', null, id);
  };

  // --- Machines ---
  const addMachine = (machine: Omit<Machine, 'id'>) => {
      const newMachine = { ...machine, id: Date.now().toString() };
      setMachines(prev => [...prev, newMachine]);
      dbWrite('machines', 'insert', newMachine);
  };
  const updateMachine = (id: string, data: Partial<Machine>) => {
      const updated = { ...machines.find(m => m.id === id), ...data, id } as Machine;
      setMachines(prev => prev.map(m => m.id === id ? updated : m));
      dbWrite('machines', 'update', updated, id);
  };
  const deleteMachine = (id: string) => {
      setMachines(prev => prev.filter(m => m.id !== id));
      dbWrite('machines', 'delete', null, id);
      // Readings cascade? Usually handled by DB or manually:
      const readingsToDelete = machineReadings.filter(r => r.machineId === id);
      readingsToDelete.forEach(r => dbWrite('machine_readings', 'delete', null, r.id));
      setMachineReadings(prev => prev.filter(r => r.machineId !== id));
  };

  const addMachineReading = (reading: Omit<MachineReading, 'id'>) => {
      const newReading = { ...reading, id: Date.now().toString() };
      setMachineReadings(prev => [...prev, newReading]);
      dbWrite('machine_readings', 'insert', newReading);
  };
  const deleteMachineReading = (id: string) => {
      setMachineReadings(prev => prev.filter(r => r.id !== id));
      dbWrite('machine_readings', 'delete', null, id);
  };

  // --- Users ---
  const addUser = (user: Omit<User, 'id'>) => {
      const newUser = { ...user, id: Date.now().toString() };
      setUsers(prev => [...prev, newUser]);
      dbWrite('users', 'insert', newUser);
  };
  const updateUser = (id: string, data: Partial<User>) => {
      const updated = { ...users.find(u => u.id === id), ...data, id } as User;
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      dbWrite('users', 'update', updated, id);
  };
  const deleteUser = (id: string) => {
      setUsers(prev => prev.filter(u => u.id !== id));
      dbWrite('users', 'delete', null, id);
  };

  // --- Suppliers (New) ---
  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
      const newSupplier = { ...supplier, id: Date.now().toString() };
      setSuppliers(prev => [...prev, newSupplier]);
      dbWrite('suppliers', 'insert', newSupplier);
  };
  const updateSupplier = (id: string, data: Partial<Supplier>) => {
      const updated = { ...suppliers.find(s => s.id === id), ...data, id } as Supplier;
      setSuppliers(prev => prev.map(s => s.id === id ? updated : s));
      dbWrite('suppliers', 'update', updated, id);
  };
  const deleteSupplier = (id: string) => {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      dbWrite('suppliers', 'delete', null, id);
  };

  // --- Settings ---
  const updateReceiptSettings = (settings: ReceiptSettings) => {
    setReceiptSettings(settings);
    dbWrite('settings', 'upsert', { key: 'receipt', value: settings });
  };
  
  const updateAppSettings = (settings: AppSettings) => {
      setAppSettings(settings);
      dbWrite('settings', 'upsert', { key: 'app', value: settings });
  };

  const updateAiSettings = (settings: AIConfig) => {
      setAiSettings(settings);
      dbWrite('settings', 'upsert', { key: 'ai', value: settings });
  };

  // --- Printing (Same as before) ---
  const printReceipt = async (transaction: Transaction) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const date = new Date(transaction.date).toLocaleString('ar-EG');
      const receiptId = transaction.id.slice(-6);
      const total = transaction.total;

      let qrImageBase64 = '';
      if (receiptSettings.showQr) {
          const qrData = `Store:${receiptSettings.storeName}|Date:${date}|Total:${total}`;
          try {
              qrImageBase64 = await QRCode.toDataURL(qrData, { width: 150, margin: 1 });
          } catch (err) { console.error(err); }
      }

      // ... existing print HTML generation logic ...
      // (Simplified for brevity, assuming full logic is preserved)
      const getSize = (size: string) => { switch(size) { case 'xs': return '10px'; case 'sm': return '12px'; case 'base': return '14px'; case 'lg': return '18px'; case 'xl': return '24px'; case '2xl': return '30px'; default: return '14px'; } };
      const getImageSize = (size: string) => { switch(size) { case 'xs': return '40px'; case 'sm': return '60px'; case 'base': return '80px'; case 'lg': return '100px'; case 'xl': return '120px'; case '2xl': return '150px'; default: return '80px'; } };
      const getAlign = (align: string) => { if (align === 'right') return 'right'; if (align === 'left') return 'left'; return 'center'; };

      const contentHtml = receiptSettings.layout.map(item => {
        if (!item.visible) return '';
        const style = `text-align: ${getAlign(item.align)}; font-size: ${getSize(item.fontSize)}; margin-bottom: 5px;`;
        switch(item.id) {
            case 'logo': return receiptSettings.logo ? `<div style="${style}"><img src="${receiptSettings.logo}" alt="Logo" style="max-height: ${getImageSize(item.fontSize)}; max-width: 100%; object-fit: contain; filter: grayscale(100%);" /></div>` : '';
            case 'storeName': return `<div style="${style} font-weight: bold;">${receiptSettings.storeName}</div>`;
            case 'address': return receiptSettings.address ? `<div style="${style}">${receiptSettings.address}</div>` : '';
            case 'contact': return receiptSettings.phone ? `<div style="${style}">${receiptSettings.phone}</div>` : '';
            case 'separator': return `<div style="border-bottom: 2px dashed #000; margin: 10px 0;"></div>`;
            case 'meta': return `<div style="${style} margin-bottom: 15px; color: #333;"><div>${date}</div><div>فاتورة #${receiptId}</div></div>`;
            case 'items':
                const itemsRows = transaction.items?.map(c => {
                    let details = '';
                    if (c.pricingMethod === 'area' && c.dimensions) { details += `<div> صافي: ${c.dimensions.width}x${c.dimensions.height}م</div>`; }
                    if (c.wasted) {
                        details += `<div style="color: #D97706;">هادر: ${c.wasted.width}x${c.wasted.height}م</div>`;
                    }
                    if (c.selectedServices && c.selectedServices.length > 0) { 
                        details += `<div>+ ${c.selectedServices.map(s => s.name).join(', ')}</div>`; 
                    }
                    return `
                    <tr>
                        <td style="text-align: right; padding: 5px 0; width: 35%;">${c.name}${details ? `<div style="font-size: 0.8em; color: #555;">${details}</div>` : ''}</td>
                        <td style="text-align: center; padding: 5px 0; width: 20%;">${c.finalPrice.toFixed(2)}</td>
                        <td style="text-align: center; padding: 5px 0; width: 15%;">${c.quantity}</td>
                        <td style="text-align: left; padding: 5px 0; width: 30%;">${(c.finalPrice * c.quantity).toFixed(2)}</td>
                    </tr>`;
                }).join('');
                return `<div style="${style}"><table style="width: 100%; border-collapse: collapse; font-size: inherit;"><thead><tr style="border-bottom: 1px solid #000;"><th style="text-align: right; padding-bottom: 5px; width: 35%;">الصنف</th><th style="text-align: center; padding-bottom: 5px; width: 20%;">سعر</th><th style="text-align: center; padding-bottom: 5px; width: 15%;">العدد</th><th style="text-align: left; padding-bottom: 5px; width: 30%;">اجمالي</th></tr></thead><tbody>${itemsRows}</tbody></table></div>`;
            case 'totals': return `<div style="${style} font-weight: bold; border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px;"><div style="display: flex; justify-content: space-between;"><span>الإجمالي:</span><span>${total.toFixed(2)} ج.م</span></div></div>`;
            case 'qr': if (!receiptSettings.showQr || !qrImageBase64) return ''; return `<div style="${style} margin-top: 10px; margin-bottom: 10px;"><img src="${qrImageBase64}" alt="QR Code" style="width: 80px; height: 80px;" /></div>`;
            case 'footer': return receiptSettings.footerMessage ? `<div style="${style} margin-top: 20px;">${receiptSettings.footerMessage}</div>` : '';
            default: return '';
        }
      }).join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head><meta charset="utf-8" /><title>إيصال دفع #${receiptId}</title>
          <style>body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; background: #fff; color: #000; } @media print { body { width: 100%; padding: 0; margin: 0; } @page { margin: 0; } }</style></head>
          <body>${contentHtml}<script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }</script></body>
        </html>`;
      printWindow.document.write(fullHtml);
      printWindow.document.close();
  };

  // --- Data Management ---
  const exportData = async (): Promise<Blob | null> => {
      const data = { products, categories, transactions, customers, expenses, machines, machineReadings, users, suppliers, appSettings, receiptSettings, aiSettings };
      const json = JSON.stringify(data, null, 2);
      return new Blob([json], { type: 'application/json' });
  };

  const importData = async (jsonData: string): Promise<boolean> => {
      try {
          const data = JSON.parse(jsonData);
          if (data.products) setProducts(data.products);
          if (data.categories) setCategories(data.categories);
          if (data.transactions) setTransactions(data.transactions);
          if (data.customers) setCustomers(data.customers);
          if (data.expenses) setExpenses(data.expenses);
          if (data.machines) setMachines(data.machines);
          if (data.machineReadings) setMachineReadings(data.machineReadings);
          if (data.users) setUsers(data.users);
          if (data.suppliers) setSuppliers(data.suppliers);
          if (data.appSettings) setAppSettings(data.appSettings);
          if (data.receiptSettings) setReceiptSettings(data.receiptSettings);
          if (data.aiSettings) setAiSettings(data.aiSettings);
          return true;
      } catch (e) {
          console.error('Import failed', e);
          return false;
      }
  };

  const clearAllData = async () => {
      setProducts([]);
      setCategories(INITIAL_CATEGORIES);
      setTransactions([]);
      setCustomers(INITIAL_CUSTOMERS);
      setExpenses(INITIAL_EXPENSES);
      setMachines([]);
      setMachineReadings([]);
      setSuppliers([]);
      // We do NOT clear Users or Settings to avoid lockout
  };

  const t = (key: string, params?: any): string => {
      const lang = appSettings.language || 'ar';
      const text = translations[lang]?.[key as TranslationKey] || translations['ar']?.[key as TranslationKey] || key;
      if (params) {
          return Object.keys(params).reduce((str, k) => str.replace(`{${k}}`, params[k]), text);
      }
      return text;
  };

  return (
    <POSContext.Provider value={{
      products, categories, cart, transactions, customers, expenses, machines, machineReadings, users, suppliers, currentUser,
      currentView, setView,
      addToCart, removeFromCart, updateQuantity, setQuantity, updateCartItemDimensions, toggleServiceForCartItem, clearCart,
      completeTransaction, markTransactionAsPaid, addPaymentToTransaction, collectDebtFromCustomer, deleteTransaction,
      addProduct, updateProduct, reorderProducts, deleteProduct,
      addCategory, updateCategory, deleteCategory, reorderCategories,
      addCustomer, updateCustomer, deleteCustomer,
      addExpense, updateExpense, deleteExpense,
      addMachine, updateMachine, deleteMachine,
      addMachineReading, deleteMachineReading,
      addUser, updateUser, deleteUser,
      addSupplier, updateSupplier, deleteSupplier,
      login, logout, hasPermission,
      totalAmount,
      receiptSettings, updateReceiptSettings, printReceipt,
      appSettings, updateAppSettings,
      aiSettings, updateAiSettings,
      exportData, importData, clearAllData,
      t,
      serverStatus, connectionError, selectedCustomer,
setSelectedCustomer,

    }}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};