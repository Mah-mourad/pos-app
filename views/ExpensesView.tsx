
import React, { useState, useMemo, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { Plus, Trash2, Calendar, FileText, DollarSign, X, Edit3, Save, ArrowUpDown, ArrowUp, ArrowDown, Calculator, User, ListPlus, CheckCircle, Package, ShoppingBag, PlusCircle, ArrowRight, Grid, Minus, FileClock, AlertTriangle } from 'lucide-react';
import { Expense, Supplier, SupplierItem, DebtCartItem } from '../types';

type SortConfig = {
  key: keyof Expense;
  direction: 'asc' | 'desc';
};

type DateFilterType = 'all' | 'today' | 'range';

const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, updateExpense, suppliers, addSupplier, updateSupplier, deleteSupplier, hasPermission, t } = usePOS();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'list' | 'debts'>('list');

  // --- Expenses List State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete States
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [supplierItemToDelete, setSupplierItemToDelete] = useState<string | null>(null);

  // Sorting & Filtering
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Debts POS State ---
  // Local active cart state for UI responsiveness, synced with Supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // Supplier Forms
  const [isAddSupplierMode, setIsAddSupplierMode] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  
  // Product Forms
  const [isAddProductMode, setIsAddProductMode] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');

  // Derived Selected Supplier
  const selectedSupplier = useMemo(() => suppliers.find(s => s.id === selectedSupplierId) || null, [suppliers, selectedSupplierId]);
  
  // Derived Debt Cart (from Supplier Draft)
  const debtCart = useMemo(() => selectedSupplier?.draftCart || [], [selectedSupplier]);

  const resetForm = () => {
      setNewExpense({ title: '', amount: '', notes: '' });
      setEditingId(null);
      setIsFormOpen(false);
  };

  // ... (Expense Handlers remain same) ...
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    if (editingId) {
        updateExpense(editingId, {
            title: newExpense.title,
            amount: parseFloat(newExpense.amount),
            notes: newExpense.notes
        });
    } else {
        addExpense({
          title: newExpense.title,
          amount: parseFloat(newExpense.amount),
          notes: newExpense.notes,
          date: new Date().toISOString()
        });
    }
    resetForm();
  };

  const handleEditClick = (expense: Expense) => {
      if (!hasPermission('expenses.edit')) {
          alert(t('permissionDeniedAction'));
          return;
      }
      setNewExpense({
          title: expense.title,
          amount: expense.amount.toString(),
          notes: expense.notes || ''
      });
      setEditingId(expense.id);
      setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
      if (!hasPermission('expenses.delete')) {
          alert(t('permissionDeniedAction'));
          return;
      }
      setExpenseToDelete(id);
  };

  const confirmDeleteExpense = () => {
      if (expenseToDelete) {
          deleteExpense(expenseToDelete);
          setExpenseToDelete(null);
      }
  };

  // ... (Sort logic remains same) ...
  const requestSort = (key: keyof Expense) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Expense }) => {
      if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />;
  };

  const filteredAndSortedExpenses = useMemo(() => {
      let data = [...expenses];
      if (dateFilterType !== 'all') {
          const start = dateFilterType === 'today' 
              ? new Date(new Date().setHours(0,0,0,0)) 
              : new Date(new Date(startDate).setHours(0,0,0,0));
          
          const end = dateFilterType === 'today'
              ? new Date(new Date().setHours(23,59,59,999))
              : new Date(new Date(endDate).setHours(23,59,59,999));

          data = data.filter(e => {
              const d = new Date(e.date);
              return d >= start && d <= end;
          });
      }
      return data.sort((a, b) => {
          let aValue: any = a[sortConfig.key];
          let bValue: any = b[sortConfig.key];
          if (sortConfig.key === 'date') {
              aValue = new Date(aValue).getTime();
              bValue = new Date(bValue).getTime();
          } else if (sortConfig.key === 'title' || sortConfig.key === 'notes') {
              aValue = (aValue || '').toLowerCase();
              bValue = (bValue || '').toLowerCase();
          }
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [expenses, sortConfig, dateFilterType, startDate, endDate]);

  const totalFilteredAmount = useMemo(() => filteredAndSortedExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredAndSortedExpenses]);


  // --- DEBT POS LOGIC (GLOBAL STATE) ---

  const handleAddSupplier = () => {
      if (!newSupplierName.trim()) return;
      addSupplier({
          name: newSupplierName,
          items: [],
          draftCart: []
      });
      setNewSupplierName('');
      setIsAddSupplierMode(false);
  };

  const handleDeleteSupplierClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSupplierToDelete(id);
  };

  const confirmDeleteSupplier = () => {
      if (supplierToDelete) {
        deleteSupplier(supplierToDelete);
        if (selectedSupplierId === supplierToDelete) setSelectedSupplierId(null);
        setSupplierToDelete(null);
      }
  };

  const handleAddProductToSupplier = () => {
      if (!selectedSupplier || !newProductName.trim() || !newProductPrice) return;
      const price = parseFloat(newProductPrice);
      if (isNaN(price)) return;

      const newItem: SupplierItem = {
          id: Date.now().toString(),
          name: newProductName,
          price
      };

      // Updates global state -> Supabase
      updateSupplier(selectedSupplier.id, {
          items: [...selectedSupplier.items, newItem]
      });

      setNewProductName('');
      setNewProductPrice('');
      setIsAddProductMode(false);
  };

  const deleteProductFromSupplier = (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      setSupplierItemToDelete(itemId);
  };

  const confirmDeleteSupplierItem = () => {
      if (supplierItemToDelete && selectedSupplier) {
          updateSupplier(selectedSupplier.id, {
              items: selectedSupplier.items.filter(i => i.id !== supplierItemToDelete)
          });
          setSupplierItemToDelete(null);
      }
  };

  // Cart Logic (Syncs to Supabase)
  const syncCart = (newCart: DebtCartItem[]) => {
      if (!selectedSupplier) return;
      updateSupplier(selectedSupplier.id, { draftCart: newCart });
  };

  const addToDebtCart = (item: SupplierItem) => {
      const currentCart = selectedSupplier?.draftCart || [];
      const exists = currentCart.find(i => i.id === item.id);
      let newCart;
      
      if (exists) {
          newCart = currentCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
          newCart = [...currentCart, { ...item, quantity: 1 }];
      }
      syncCart(newCart);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
      const currentCart = selectedSupplier?.draftCart || [];
      const newCart = currentCart.map(item => {
          if (item.id === itemId) {
              return { ...item, quantity: Math.max(1, item.quantity + delta) };
          }
          return item;
      });
      syncCart(newCart);
  };

  const removeFromDebtCart = (itemId: string) => {
      const currentCart = selectedSupplier?.draftCart || [];
      const newCart = currentCart.filter(i => i.id !== itemId);
      syncCart(newCart);
  };

  const debtTotal = debtCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const postDebtToExpenses = () => {
      if (!selectedSupplier || debtCart.length === 0) return;

      const details = debtCart.map(i => `${i.name} (${i.quantity}x${i.price})`).join('، ');
      
      addExpense({
          title: selectedSupplier.name,
          amount: debtTotal,
          notes: `مشتريات آجل/دين: ${details}`,
          date: new Date().toISOString()
      });

      // Clear draft on server
      syncCart([]);
      setSelectedSupplierId(null);
      setActiveTab('list');
  };

  const handleSelectSupplier = (sup: Supplier) => {
      setSelectedSupplierId(sup.id);
  };

  const handleBackToSuppliers = () => {
      setSelectedSupplierId(null);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto relative">
      {/* ... Header ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">المصروفات والديون</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm md:text-base">تسجيل المصروفات وإدارة المديونيات الخارجية</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex w-full md:w-auto">
             <button 
                onClick={() => setActiveTab('list')}
                className={`flex-1 md:flex-none justify-center px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-primary dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
             >
                 <FileText size={16} />
                 سجل المصروفات
             </button>
             <button 
                onClick={() => setActiveTab('debts')}
                className={`flex-1 md:flex-none justify-center px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'debts' ? 'bg-gray-100 dark:bg-gray-700 text-primary dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
             >
                 <Calculator size={16} />
                 ديون خارجية
             </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="animate-in fade-in slide-in-from-left-4">
             {/* ... Existing Expenses List UI ... */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                {/* Date Filters ... */}
                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-full md:w-fit overflow-x-auto">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 px-2 hidden md:inline">الفترة:</span>
                    <button onClick={() => setDateFilterType('today')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${dateFilterType === 'today' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>اليوم</button>
                    <button onClick={() => setDateFilterType('all')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${dateFilterType === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>الكل</button>
                    <button onClick={() => setDateFilterType('range')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${dateFilterType === 'range' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>فترة</button>
                    
                    {dateFilterType === 'range' && (
                        <div className="hidden md:flex items-center gap-2 pr-2 border-r border-gray-200 dark:border-gray-600 mr-2">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 w-28" />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 w-28" />
                        </div>
                    )}
                </div>
                
                {dateFilterType === 'range' && (
                    <div className="flex md:hidden items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-xl w-full border border-gray-100 dark:border-gray-700">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                    </div>
                )}

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-xl border border-red-100 dark:border-red-800 flex-1 md:flex-none">
                        <div className="text-xs text-red-500 dark:text-red-400 font-bold mb-1">إجمالي الفترة</div>
                        <div className="text-xl font-bold text-red-700 dark:text-red-300">{totalFilteredAmount.toFixed(2)} ج.م</div>
                    </div>
                    {hasPermission('expenses.add') && (
                        <button 
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 flex-1 md:flex-none"
                        >
                        <Plus size={20} />
                        <span className="hidden md:inline">تسجيل مصروف</span>
                        <span className="md:hidden">جديد</span>
                        </button>
                    )}
                </div>
            </div>

            {isFormOpen && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{editingId ? 'تعديل المصروف' : 'بيانات المصروف'}</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleExpenseSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">بند المصروف</label>
                    <input 
                        required
                        value={newExpense.title}
                        onChange={e => setNewExpense({...newExpense, title: e.target.value})}
                        placeholder="مثال: فاتورة كهرباء"
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                    />
                    </div>
                    <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">المبلغ</label>
                    <input 
                        required
                        type="number"
                        value={newExpense.amount}
                        onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                        placeholder="0.00"
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                    />
                    </div>
                    <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات</label>
                    <input 
                        value={newExpense.notes}
                        onChange={e => setNewExpense({...newExpense, notes: e.target.value})}
                        placeholder="تفاصيل إضافية..."
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                    />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                    <button 
                        type="button" 
                        onClick={resetForm}
                        className="px-6 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold"
                    >
                        إلغاء
                    </button>
                    <button 
                        type="submit"
                        className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                        {editingId ? <Save size={18} /> : <Plus size={18} />}
                        {editingId ? 'حفظ التعديلات' : 'إضافة'}
                    </button>
                    </div>
                </form>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm font-medium">
                    <tr>
                    <th onClick={() => requestSort('title')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-1">بند المصروف <SortIcon columnKey="title" /></div>
                    </th>
                    <th onClick={() => requestSort('date')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-1">التاريخ <SortIcon columnKey="date" /></div>
                    </th>
                    <th onClick={() => requestSort('amount')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-1">المبلغ <SortIcon columnKey="amount" /></div>
                    </th>
                    <th onClick={() => requestSort('notes')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-1">ملاحظات <SortIcon columnKey="notes" /></div>
                    </th>
                    <th className="px-6 py-4 w-32"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredAndSortedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        {expense.title}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            {new Date(expense.date).toLocaleDateString('ar-EG')}
                            <span className="text-xs text-gray-400">
                                {new Date(expense.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                        {expense.amount.toFixed(2)} ج.م
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                        {expense.notes || '-'}
                        </td>
                        <td className="px-6 py-4 text-left">
                        <div className="flex gap-1 justify-end">
                            {hasPermission('expenses.edit') && (
                                <button 
                                    onClick={() => handleEditClick(expense)}
                                    className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                    title="تعديل"
                                >
                                    <Edit3 size={18} />
                                </button>
                            )}
                            {hasPermission('expenses.delete') && (
                                <button 
                                    onClick={() => handleDeleteClick(expense.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="حذف"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        </td>
                    </tr>
                    ))}
                    {filteredAndSortedExpenses.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                            <DollarSign size={48} className="opacity-20" />
                            <p>لا توجد مصروفات مسجلة في هذه الفترة</p>
                        </div>
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
                </div>

                {/* Mobile List (Cards) */}
                <div className="md:hidden p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                    {filteredAndSortedExpenses.map((expense) => (
                        <div key={expense.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-800 dark:text-white text-lg">{expense.title}</span>
                                </div>
                                <span className="font-bold text-red-600 dark:text-red-400 text-lg">{expense.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                <div className="flex items-center gap-1 text-xs">
                                    <Calendar size={12} />
                                    {new Date(expense.date).toLocaleDateString('ar-EG')} - {new Date(expense.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                                </div>
                                {expense.notes && <div className="text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded mt-1">{expense.notes}</div>}
                            </div>
                            <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
                                {hasPermission('expenses.edit') && (
                                    <button onClick={() => handleEditClick(expense)} className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2 rounded-lg text-sm font-bold border border-blue-100 dark:border-blue-900">تعديل</button>
                                )}
                                {hasPermission('expenses.delete') && (
                                    <button onClick={() => handleDeleteClick(expense.id)} className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-2 rounded-lg text-sm font-bold border border-red-100 dark:border-red-900">حذف</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredAndSortedExpenses.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <p>لا توجد مصروفات مسجلة في هذه الفترة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="md:h-[calc(100vh-180px)] h-auto animate-in fade-in slide-in-from-right-4">
             {!selectedSupplier ? (
                 <div className="h-full flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                         <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">اختر مورد / دائن</h2>
                            <p className="text-sm text-gray-400">اضغط على المورد لعرض منتجاته وتسجيل الدين</p>
                         </div>
                         <button 
                            onClick={() => setIsAddSupplierMode(true)}
                            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                         >
                            <Plus size={20} />
                            <span className="hidden md:inline">مورد جديد</span>
                         </button>
                     </div>
                     
                     {isAddSupplierMode && (
                         <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-3 animate-in slide-in-from-top-2">
                             <input 
                                autoFocus
                                value={newSupplierName}
                                onChange={e => setNewSupplierName(e.target.value)}
                                placeholder="اسم المورد الجديد..."
                                className="w-full md:flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white"
                             />
                             <div className="flex gap-2">
                                <button onClick={handleAddSupplier} className="flex-1 md:flex-none bg-gray-800 text-white px-6 py-3 md:py-0 rounded-xl font-bold hover:bg-gray-900">حفظ</button>
                                <button onClick={() => setIsAddSupplierMode(false)} className="flex-1 md:flex-none text-gray-500 px-4 py-3 md:py-0 rounded-xl border border-gray-200 md:border-none hover:bg-gray-100 dark:hover:bg-gray-700">إلغاء</button>
                             </div>
                         </div>
                     )}

                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-4">
                         {suppliers.map(sup => (
                             <div 
                                key={sup.id}
                                onClick={() => handleSelectSupplier(sup)}
                                className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary shadow-sm hover:shadow-md cursor-pointer transition-all group flex flex-col items-center justify-center text-center gap-3 relative"
                             >
                                 <button 
                                    onClick={(e) => handleDeleteSupplierClick(e, sup.id)}
                                    className="absolute top-2 left-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                     <Trash2 size={16} />
                                 </button>
                                 
                                 {sup.draftCart && sup.draftCart.length > 0 && (
                                     <div className="absolute top-2 right-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                         <FileClock size={12} />
                                         مسودة
                                     </div>
                                 )}

                                 <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400">
                                     <User size={32} />
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-gray-800 dark:text-white text-lg">{sup.name}</h3>
                                     <span className="text-xs text-gray-400">{sup.items.length} منتجات محفوظة</span>
                                 </div>
                             </div>
                         ))}
                         {suppliers.length === 0 && !isAddSupplierMode && (
                             <div className="col-span-full py-20 text-center text-gray-400">
                                 <User size={48} className="mx-auto mb-4 opacity-20" />
                                 <p>لا يوجد موردين مسجلين</p>
                             </div>
                         )}
                     </div>
                 </div>
             ) : (
                 <div className="flex md:h-full h-auto gap-6 flex-col md:flex-row">
                     {/* Left: Product Grid (Mini POS) */}
                     <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 md:overflow-hidden overflow-visible min-h-[400px]">
                         <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                             <div className="flex items-center gap-3">
                                 <button onClick={handleBackToSuppliers} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500">
                                     <ArrowRight size={20} />
                                 </button>
                                 <h2 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                     <User size={20} className="text-primary"/>
                                     {selectedSupplier.name}
                                 </h2>
                             </div>
                             <button 
                                onClick={() => setIsAddProductMode(true)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                             >
                                 <Plus size={16} />
                                 منتج جديد
                             </button>
                         </div>

                         {/* Add Product Form - Fix overlap by using flex-col on mobile */}
                         {isAddProductMode && (
                             <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 flex flex-col gap-3 animate-in slide-in-from-top-2">
                                 <input 
                                    autoFocus
                                    placeholder="اسم المنتج..." 
                                    value={newProductName} 
                                    onChange={e => setNewProductName(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-3 outline-none text-gray-900 dark:text-white font-bold"
                                 />
                                 <div className="flex flex-col md:flex-row gap-3">
                                    <input 
                                        type="number"
                                        placeholder="السعر..." 
                                        value={newProductPrice} 
                                        onChange={e => setNewProductPrice(e.target.value)}
                                        className="w-full md:flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-3 outline-none text-gray-900 dark:text-white font-bold"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleAddProductToSupplier} className="flex-1 bg-blue-600 text-white px-6 py-3 md:py-0 rounded-lg font-bold whitespace-nowrap shadow-sm hover:bg-blue-700">حفظ</button>
                                        <button onClick={() => setIsAddProductMode(false)} className="text-gray-500 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><X size={20}/></button>
                                    </div>
                                 </div>
                             </div>
                         )}

                         {/* Grid */}
                         <div className="flex-1 md:overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-900/50">
                             {selectedSupplier.items.length > 0 ? (
                                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                     {selectedSupplier.items.map(item => (
                                         <button 
                                            key={item.id}
                                            onClick={() => addToDebtCart(item)}
                                            className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-primary dark:hover:border-primary hover:shadow-md transition-all text-right group relative active:scale-95"
                                         >
                                             <div onClick={(e) => deleteProductFromSupplier(e, item.id)} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded">
                                                 <Trash2 size={14} />
                                             </div>
                                             <div className="font-bold text-gray-800 dark:text-white mb-1 line-clamp-2 min-h-[1.5em]">{item.name}</div>
                                             <div className="text-primary font-bold">{item.price} ج.م</div>
                                         </button>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                     <Grid size={48} className="mb-2 opacity-20" />
                                     <p>لا توجد منتجات محفوظة</p>
                                     <button onClick={() => setIsAddProductMode(true)} className="mt-2 text-primary font-bold text-sm hover:underline">أضف منتج الآن</button>
                                 </div>
                             )}
                         </div>
                     </div>

                     {/* Right: The Cart/Bill */}
                     <div className="w-full md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col h-auto md:h-auto shrink-0">
                         <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                             <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                 <ShoppingBag size={20} />
                                 قائمة الدين الحالية
                             </h3>
                         </div>
                         
                         <div className="flex-1 md:overflow-y-auto p-4 space-y-2 max-h-[300px] md:max-h-none overflow-y-auto">
                             {debtCart.length > 0 ? (
                                 debtCart.map(item => (
                                     <div key={item.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                         <div>
                                             <div className="font-bold text-sm text-gray-800 dark:text-white">{item.name}</div>
                                             <div className="text-xs text-gray-400">{item.price} ج.م</div>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-0.5">
                                                 <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Minus size={12} /></button>
                                                 <span className="w-6 text-center text-sm font-bold dark:text-white">{item.quantity}</span>
                                                 <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Plus size={12} /></button>
                                             </div>
                                             <button onClick={() => removeFromDebtCart(item.id)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                                         </div>
                                     </div>
                                 ))
                             ) : (
                                 <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 min-h-[100px]">
                                     <ShoppingBag size={48} className="mb-2" />
                                     <p>القائمة فارغة</p>
                                 </div>
                             )}
                         </div>

                         <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                             <div className="flex justify-between items-center mb-4">
                                 <span className="text-gray-500 font-bold">المجموع</span>
                                 <span className="text-2xl font-bold text-primary">{debtTotal.toFixed(2)} ج.م</span>
                             </div>
                             <button 
                                onClick={postDebtToExpenses}
                                disabled={debtCart.length === 0}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                             >
                                <CheckCircle size={20} />
                                ترحيل للمصروفات
                             </button>
                         </div>
                     </div>
                 </div>
             )}
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {expenseToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تأكيد الحذف</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            onClick={() => setExpenseToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            onClick={confirmDeleteExpense}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                          >
                              حذف
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">حذف المورد</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذا المورد؟ سيتم حذف جميع منتجاته المحفوظة.</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            onClick={() => setSupplierToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            onClick={confirmDeleteSupplier}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                          >
                              تأكيد الحذف
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Supplier Item Confirmation Modal */}
      {supplierItemToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">حذف المنتج</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذا المنتج من قائمة المورد؟</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            onClick={() => setSupplierItemToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            onClick={confirmDeleteSupplierItem}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                          >
                              حذف
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExpensesView;
