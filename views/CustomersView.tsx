
import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Plus, Trash2, User, Search, Phone, Save, X, FileText, Calendar, DollarSign, Wallet, Printer, Edit3, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react';
import { Customer, Transaction, PaymentMethod } from '../types';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import PaymentModal from '../components/PaymentModal';

const WhatsAppIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.46 3.53 1.34 5.09l-1.38 5.02 5.14-1.35c1.51.81 3.19 1.24 4.81 1.24h.01c5.46 0 9.9-4.43 9.9-9.9C21.94 6.45 17.5 2 12.04 2zM12.04 20.08c-1.58 0-3.13-.4-4.5-1.18l-.32-.19-3.34.88.89-3.25-.21-.34c-.78-1.35-1.19-2.91-1.19-4.51 0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.64 8.1-8.1 8.1zm4.83-5.9c-.28-.14-1.65-.81-1.9-.9-.25-.1-.44-.1-.62.1-.19.19-.72.81-.88.98-.16.16-.32.19-.59.06s-1.14-.42-2.18-1.34c-.81-.72-1.35-1.62-1.51-1.88-.16-.27-.02-.42.12-.54.12-.11.27-.28.4-.41.14-.12.19-.21.28-.35.1-.14.05-.27 0-.38-.05-.11-.59-1.42-.81-1.96-.22-.53-.44-.45-.59-.45-.15 0-.32-.03-.49-.03-.17 0-.44.06-.67.3s-.88.86-.88 2.07c0 1.21.9 2.39 1.03 2.56.13.16 1.76 2.67 4.27 3.77.6.26 1.06.42 1.42.53.59.19 1.13.16 1.56.1.48-.07.72-.81.82-1s.1-.19.07-.3z"/>
    </svg>
);

const CustomersView: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, transactions, receiptSettings, addPaymentToTransaction, collectDebtFromCustomer, hasPermission, t } = usePOS();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Payment Modal (Single & General)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{id?: string, total: number, remaining: number, isGeneralDebt?: boolean} | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  // Delete Modal State
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  const resetForm = () => {
      setCustomerForm({ name: '', phone: '', notes: '' });
      setEditingId(null);
      setIsFormOpen(false);
  };

  const handleEditClick = (customer: Customer) => {
      if (!hasPermission('customers.edit')) {
          alert(t('permissionDeniedAction'));
          return;
      }
      setCustomerForm({
          name: customer.name,
          phone: customer.phone,
          notes: customer.notes || ''
      });
      setEditingId(customer.id);
      setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
      if (!hasPermission('customers.delete')) {
          alert(t('permissionDeniedAction'));
          return;
      }
      setCustomerToDelete(id);
  };

  const confirmDeleteCustomer = () => {
      if (customerToDelete) {
          deleteCustomer(customerToDelete);
          setCustomerToDelete(null);
          if (selectedCustomer?.id === customerToDelete) {
              setSelectedCustomer(null);
          }
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        updateCustomer(editingId, customerForm);
    } else {
        addCustomer(customerForm);
    }
    resetForm();
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const customerTransactions = selectedCustomer 
    ? transactions.filter(t => {
        // Base filter by customer
        const isCustomer = t.customerId === selectedCustomer.id || (selectedCustomer.id === '1' && !t.customerId && t.paymentMethod !== 'credit');
        if (!isCustomer) return false;

        // "Show Unpaid Only" filter: includes unpaid AND partially paid (where !isPaid)
        if (showUnpaidOnly) {
            return t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection';
        }
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const getPaidAmount = (t: Transaction) => t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const getRemainingAmount = (t: Transaction) => t.total - getPaidAmount(t);

  // Stats calculation
  const allCustomerTrans = selectedCustomer 
    ? transactions.filter(t => t.customerId === selectedCustomer.id || (selectedCustomer.id === '1' && !t.customerId && t.paymentMethod !== 'credit'))
    : [];

  const totalPurchases = allCustomerTrans
    .filter(t => t.type !== 'collection')
    .reduce((sum, t) => sum + t.total, 0);

  const totalDebt = allCustomerTrans
    .filter(t => t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection')
    .reduce((sum, t) => sum + getRemainingAmount(t), 0);

  const getMethodLabel = (t: Transaction) => {
    if (t.type === 'collection') return 'تحصيل نقدية';
    if (t.paymentMethod === 'credit') {
        if (t.isPaid) return 'آجل (تم التحصيل)';
        const paid = getPaidAmount(t);
        if (paid > 0) return 'آجل (سداد جزئي)';
        return 'آجل (مستحق)';
    }
    switch(t.paymentMethod) {
        case 'cash': return 'كاش';
        case 'vodafone_cash': return 'فودافون كاش';
        default: return t.paymentMethod;
    }
  };

  const getMethodStyle = (t: Transaction) => {
      if (t.type === 'collection') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      if (t.paymentMethod === 'credit') {
          if (t.isPaid) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800';
          const paid = getPaidAmount(t);
          if (paid > 0) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'; // Partial
          return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'; // Unpaid
      }
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  };

  const handleCollectClick = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    const remaining = getRemainingAmount(t);
    setPaymentTarget({
        id: t.id,
        total: t.total,
        remaining: remaining,
        isGeneralDebt: false
    });
    setPaymentModalOpen(true);
  };

  const handleGeneralDebtCollect = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (totalDebt <= 0) return;
      setPaymentTarget({
          total: totalDebt,
          remaining: totalDebt,
          isGeneralDebt: true
      });
      setPaymentModalOpen(true);
  };

  const handlePaymentConfirm = (amount: number, method: PaymentMethod) => {
      if (paymentTarget) {
          if (paymentTarget.isGeneralDebt && selectedCustomer) {
              collectDebtFromCustomer(selectedCustomer.id, amount, method);
          } else if (paymentTarget.id) {
              addPaymentToTransaction(paymentTarget.id, amount, method);
          }
      }
  };

  const handleSwitchTransaction = (targetId: string) => {
      const target = transactions.find(t => t.id === targetId);
      if (target) setSelectedTransaction(target);
  };

  const handlePrintStatement = () => {
    // ... existing print logic ...
    if (!selectedCustomer) return;
    const creditTransactions = allCustomerTrans.filter(t => t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
    }

    const justDate = new Date().toLocaleDateString('ar-EG');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>كشف حساب - ${selectedCustomer.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; margin: 0; padding: 40px; width: 210mm; box-sizing: border-box; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #E31E24; padding-bottom: 20px; margin-bottom: 30px; }
            .store-info h1 { margin: 0; color: #E31E24; font-size: 24px; }
            .store-info p { margin: 5px 0; font-size: 14px; color: #555; }
            .logo-img { max-height: 100px; max-width: 150px; object-fit: contain; }
            .statement-title { text-align: center; margin-bottom: 30px; }
            .statement-title h2 { font-size: 28px; background-color: #f3f4f6; display: inline-block; padding: 10px 40px; border-radius: 50px; margin: 0; }
            .info-grid { display: flex; justify-content: space-between; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
            .info-col { flex: 1; }
            .label { font-size: 12px; color: #6b7280; font-weight: bold; margin-bottom: 4px; }
            .value { font-size: 16px; font-weight: bold; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            thead th { background-color: #E31E24; color: white; padding: 12px; text-align: right; font-size: 14px; }
            tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; vertical-align: top; }
            tbody tr:nth-child(even) { background-color: #f9fafb; }
            .items-detail { font-size: 12px; color: #666; margin-top: 4px; line-height: 1.4; }
            .totals-section { display: flex; justify-content: flex-end; margin-bottom: 50px; }
            .total-box { width: 300px; background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; }
            .total-label { font-size: 14px; color: #555; margin-bottom: 5px; }
            .total-amount { font-size: 24px; font-weight: bold; color: #E31E24; }
            .print-meta { position: fixed; bottom: 20px; left: 40px; right: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            @media print { body { padding: 0; margin: 20mm; width: auto; } .print-meta { position: static; margin-top: 40px; } }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="store-info">
              <h1>${receiptSettings.storeName}</h1>
              <p>${receiptSettings.address}</p>
              <p>${receiptSettings.phone}</p>
            </div>
            ${receiptSettings.logo ? `<img src="${receiptSettings.logo}" class="logo-img" />` : ''}
          </div>
          <div class="statement-title"><h2>كشف حساب مديونية</h2></div>
          <div class="info-grid">
            <div class="info-col">
              <div class="label">بيانات العميل</div>
              <div class="value">${selectedCustomer.name}</div>
              <div style="font-size: 14px; margin-top: 2px;">${selectedCustomer.phone || '-'}</div>
            </div>
            <div class="info-col" style="text-align: left;">
              <div class="label">تاريخ الاستخراج</div>
              <div class="value">${justDate}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th style="width: 15%">رقم الفاتورة</th><th style="width: 20%">التاريخ</th><th style="width: 45%">تفاصيل المشتريات</th><th style="width: 20%">المبلغ المتبقي</th></tr>
            </thead>
            <tbody>
              ${creditTransactions.length > 0 ? creditTransactions.map(t => {
                  const date = new Date(t.date).toLocaleDateString('ar-EG');
                  const time = new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
                  const itemsStr = t.items && t.items.length > 0 
                      ? t.items.map(i => `• ${i.name} (عدد ${i.quantity}) - ${i.price} ج.م`).join('<br>')
                      : 'لا توجد تفاصيل محفوظة';
                  const paid = getPaidAmount(t);
                  const rem = t.total - paid;
                  
                  return `<tr>
                    <td><strong>#${t.id.slice(-6)}</strong></td>
                    <td><div>${date}</div><div style="color: #888; font-size: 12px;">${time}</div></td>
                    <td><div class="items-detail">${itemsStr}</div><div style="margin-top:5px; font-size:10px; color:#888;">(الإجمالي: ${t.total} - المدفوع: ${paid})</div></td>
                    <td><strong>${rem.toFixed(2)} ج.م</strong></td>
                  </tr>`;
              }).join('') : `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #888;">لا توجد فواتير آجلة (غير مدفوعة) مسجلة لهذا العميل.</td></tr>`}
            </tbody>
          </table>
          <div class="totals-section"><div class="total-box"><div class="total-label">إجمالي المبلغ المستحق (الآجل)</div><div class="total-amount">${totalDebt.toFixed(2)} ج.م</div></div></div>
          <div class="print-meta">تم استخراج هذا المستند إلكترونياً من نظام ${receiptSettings.storeName} لإدارة نقاط البيع.</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSendWhatsApp = () => {
    if (!selectedCustomer) return;

    const debtorTransactions = allCustomerTrans.filter(t => t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection');
    const debtorName = selectedCustomer.name;

    if (!selectedCustomer.phone || selectedCustomer.phone.trim() === '') {
        alert('لا يوجد رقم هاتف مسجل لهذا العميل.');
        return;
    }

    const totalDebt = debtorTransactions.reduce((sum, t) => sum + getRemainingAmount(t), 0);
    const storeName = receiptSettings.storeName;
    const storePhone = receiptSettings.phone;
    const storeAddress = receiptSettings.address;
    const todayDate = new Date().toLocaleDateString('ar-EG');

    let message = `*كشف حساب آجل*\n\n`;
    message += `*من:* ${storeName}\n`;
    message += `*إلى:* ${debtorName}\n`;
    message += `*تاريخ الكشف:* ${todayDate}\n`;
    message += `----------------------------------\n`;
    message += `*إجمالي المديونية المستحقة: ${totalDebt.toFixed(2)} ج.م*\n`;
    message += `----------------------------------\n\n`;
    message += `*تفاصيل الفواتير:*\n\n`;

    debtorTransactions.forEach(t => {
        const date = new Date(t.date).toLocaleDateString('ar-EG');
        const rem = getRemainingAmount(t);
        message += `*فاتورة رقم:* #${t.id.slice(-6)}\n`;
        message += `*التاريخ:* ${date}\n`;
        message += `*المبلغ المتبقي:* ${rem.toFixed(2)} ج.م\n`;
        
        if (t.items && t.items.length > 0) {
            message += `*الأصناف:*\n`;
            t.items.forEach(item => {
                message += `  - ${item.name} (الكمية: ${item.quantity})\n`;
            });
        }
        message += `\n---\n\n`;
    });

    message += `*شكراً لتعاملكم معنا.*\n`;
    if (storePhone) message += `${storePhone}\n`;
    if (storeAddress) message += `${storeAddress}\n`;

    let cleanPhone = selectedCustomer.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '20' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('20')) {
        cleanPhone = '20' + cleanPhone;
    }
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      {/* ... Header and search section ... */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">قاعدة بيانات العملاء</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm md:text-base">إدارة العملاء والديون والتقارير</p>
        </div>
        {hasPermission('customers.add') && (
            <button 
              onClick={() => { resetForm(); setIsFormOpen(true); }}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="hidden md:inline">إضافة عميل جديد</span>
              <span className="md:hidden">جديد</span>
            </button>
        )}
      </div>

      <div className="flex flex-col gap-6">
         <div className="relative">
             <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input 
                 type="text" 
                 placeholder="بحث باسم العميل أو رقم الهاتف..." 
                 className="pl-4 pr-12 py-3 w-full md:w-96 rounded-xl bg-white dark:bg-gray-800 border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
             />
         </div>

         {isFormOpen && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4">
                {/* ... Form content ... */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{editingId ? 'تعديل بيانات العميل' : 'بيانات العميل الجديد'}</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">اسم العميل</label>
                        <input 
                            required
                            value={customerForm.name}
                            onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">رقم الهاتف</label>
                        <input 
                            value={customerForm.phone}
                            onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات</label>
                        <input 
                            value={customerForm.notes}
                            onChange={e => setCustomerForm({...customerForm, notes: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                        />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                         <button type="button" onClick={resetForm} className="px-6 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold">إلغاء</button>
                         <button type="submit" className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center gap-2">
                            <Save size={18} />
                            {editingId ? 'حفظ التعديلات' : 'حفظ البيانات'}
                         </button>
                    </div>
                </form>
            </div>
         )}

         {/* Customer Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredCustomers.map(customer => (
                 <div key={customer.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-red-100 dark:hover:border-red-900/50 transition-colors group">
                     <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                             <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                                 <User size={24} />
                             </div>
                             <div>
                                 <h3 className="font-bold text-lg text-gray-800 dark:text-white">{customer.name}</h3>
                                 <div className="flex items-center gap-1 text-sm text-gray-400">
                                     <Phone size={12} />
                                     <span>{customer.phone || 'لا يوجد هاتف'}</span>
                                 </div>
                             </div>
                         </div>
                         <div className="flex gap-1">
                             {hasPermission('customers.edit') && (
                                 <button 
                                    onClick={() => handleEditClick(customer)}
                                    className="text-gray-300 hover:text-blue-500 transition-colors p-1"
                                 >
                                     <Edit3 size={18} />
                                 </button>
                             )}
                             {hasPermission('customers.delete') && (
                                 <button 
                                    onClick={() => handleDeleteClick(customer.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                 >
                                     <Trash2 size={18} />
                                 </button>
                             )}
                         </div>
                     </div>
                     
                     {customer.notes && (
                         <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400 mb-4">
                             {customer.notes}
                         </div>
                     )}

                     <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                        <button 
                            onClick={() => { setSelectedCustomer(customer); setShowUnpaidOnly(false); }}
                            className="w-full py-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <FileText size={16} />
                            عرض كشف الحساب
                        </button>
                     </div>
                 </div>
             ))}
             {filteredCustomers.length === 0 && <div className="col-span-full py-12 text-center text-gray-400"><p>لا يوجد عملاء</p></div>}
         </div>
      </div>

      {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-4xl p-0 relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-primary shadow-sm border border-gray-100 dark:border-gray-700">
                              <User size={28} />
                          </div>
                          <div>
                              <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{selectedCustomer.name}</h2>
                              <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2"><Phone size={14} />{selectedCustomer.phone || 'لا يوجد رقم هاتف'}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm"><X size={24} /></button>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800">
                      {/* ... Stat boxes ... */}
                      <div 
                        onClick={() => setShowUnpaidOnly(false)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${!showUnpaidOnly ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/20' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                          <div className={`text-sm font-medium mb-1 flex items-center gap-2 ${!showUnpaidOnly ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}><Wallet size={16} />إجمالي المشتريات</div>
                          <div className={`text-2xl font-bold ${!showUnpaidOnly ? 'text-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}`}>{totalPurchases.toFixed(2)} ج.م</div>
                      </div>
                      <div 
                        onClick={() => setShowUnpaidOnly(true)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all group relative ${showUnpaidOnly ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ring-2 ring-red-500/20' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                          <div className={`text-sm font-medium mb-1 flex items-center gap-2 ${showUnpaidOnly ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}><DollarSign size={16} />المديونية (الآجل المستحق)</div>
                          <div className={`text-2xl font-bold ${showUnpaidOnly ? 'text-red-900 dark:text-red-200' : 'text-gray-700 dark:text-gray-300'}`}>{totalDebt.toFixed(2)} ج.م</div>
                          
                          {totalDebt > 0 && (
                            <button 
                                onClick={handleGeneralDebtCollect}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-1 z-10"
                            >
                                <DollarSign size={14} />
                                تحصيل
                            </button>
                          )}
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <FileText size={20} className="text-gray-400" />
                            {showUnpaidOnly ? 'سجل الفواتير المستحقة' : 'سجل العمليات'}
                        </h3>
                        {showUnpaidOnly && (
                             <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded">غير مدفوعة</span>
                        )}
                      </div>

                      {customerTransactions.length > 0 ? (
                          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                              {/* Desktop Table */}
                              <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-right whitespace-nowrap min-w-[600px]">
                                  <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm font-medium">
                                      <tr><th className="p-4">رقم الفاتورة</th><th className="p-4">التاريخ</th><th className="p-4">نوع الدفع / الحالة</th><th className="p-4">المبلغ</th><th className="p-4">المدفوع</th><th className="p-4">المتبقي</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {customerTransactions.map(t => {
                                          const paid = getPaidAmount(t);
                                          const rem = t.total - paid;
                                          const isCollection = t.type === 'collection';
                                          return (
                                          <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isCollection ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                                              <td className="p-4"><button onClick={() => setSelectedTransaction(t)} className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">#{t.id.slice(-6)}</button></td>
                                              <td className="p-4 text-gray-600 dark:text-gray-300 flex items-center gap-2"><Calendar size={14} className="text-gray-400" />{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                                              <td className="p-4">
                                                  <div className="flex flex-col items-start gap-1">
                                                      <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodStyle(t)}`}>
                                                          {isCollection && <RefreshCw size={10} className="inline ml-1" />}
                                                          {getMethodLabel(t)}
                                                      </span>
                                                      {t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection' && (
                                                           <button onClick={(e) => handleCollectClick(e, t)} className="text-xs px-2 py-1 rounded transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800">تحصيل دفعة</button>
                                                      )}
                                                  </div>
                                              </td>
                                              <td className="p-4 font-bold text-gray-800 dark:text-white">{isCollection ? `+${t.total.toFixed(2)}` : t.total.toFixed(2)}</td>
                                              <td className="p-4 font-bold text-green-600 dark:text-green-400">{paid.toFixed(2)}</td>
                                              <td className="p-4 font-bold text-red-600 dark:text-red-400">{isCollection ? '-' : rem.toFixed(2)}</td>
                                          </tr>
                                      )})}
                                  </tbody>
                              </table>
                              </div>

                              {/* Mobile List */}
                              <div className="md:hidden space-y-3 p-3 bg-gray-50 dark:bg-gray-900">
                                {customerTransactions.map(t => {
                                    const paid = getPaidAmount(t);
                                    const rem = t.total - paid;
                                    const isCollection = t.type === 'collection';
                                    return (
                                        <div key={t.id} className={`bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${isCollection ? 'border-l-4 border-l-blue-500' : ''}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <button onClick={() => setSelectedTransaction(t)} className="font-bold text-blue-600 dark:text-blue-400 font-mono">#{t.id.slice(-6)}</button>
                                                <div className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString('ar-EG')}</div>
                                            </div>
                                            <div className="mb-2 flex justify-between items-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodStyle(t)}`}>
                                                    {isCollection && <RefreshCw size={10} className="inline ml-1" />}
                                                    {getMethodLabel(t)}
                                                </span>
                                                <div className="font-bold text-lg dark:text-white">{isCollection ? `+${t.total.toFixed(2)}` : t.total.toFixed(2)}</div>
                                            </div>
                                            {!isCollection && (
                                                <div className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                                    <div className="text-green-600">مدفوع: <span className="font-bold">{paid.toFixed(2)}</span></div>
                                                    <div className="text-red-600">متبقي: <span className="font-bold">{rem.toFixed(2)}</span></div>
                                                </div>
                                            )}
                                            {t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection' && (
                                                <button onClick={(e) => handleCollectClick(e, t)} className="w-full mt-3 py-2 rounded-lg bg-primary text-white text-sm font-bold">تحصيل دفعة</button>
                                            )}
                                        </div>
                                    )
                                })}
                              </div>
                          </div>
                      ) : (
                          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl"><p>لا توجد عمليات مسجلة لهذا العميل</p></div>
                      )}
                  </div>

                  <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                       <button onClick={handleSendWhatsApp} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2"><WhatsAppIcon size={18} />إرسال واتساب</button>
                       <button onClick={handlePrintStatement} className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center gap-2"><Printer size={18} />طباعة كشف مديونية</button>
                       <button onClick={() => setSelectedCustomer(null)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600">إغلاق</button>
                  </div>
              </div>
          </div>
      )}
      
      {selectedTransaction && (
          <TransactionDetailsModal 
              transaction={selectedTransaction} 
              onClose={() => setSelectedTransaction(null)} 
              onSwitchTransaction={handleSwitchTransaction}
          />
      )}
      
      {paymentModalOpen && paymentTarget && (
        <PaymentModal 
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onConfirm={handlePaymentConfirm}
          totalAmount={paymentTarget.total}
          remainingAmount={paymentTarget.remaining}
        />
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تأكيد الحذف</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من رغبتك في حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            type="button"
                            onClick={() => setCustomerToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            type="button"
                            onClick={confirmDeleteCustomer}
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

export default CustomersView;
