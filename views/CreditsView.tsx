
import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { Check, Clock, User, Search, CreditCard, AlertCircle, Printer, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Trash2, AlertTriangle, Users, X, Phone, Wallet, ArrowUpRight } from 'lucide-react';
import { Transaction, PaymentMethod } from '../types';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import PaymentModal from '../components/PaymentModal';

const WhatsAppIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.46 3.53 1.34 5.09l-1.38 5.02 5.14-1.35c1.51.81 3.19 1.24 4.81 1.24h.01c5.46 0 9.9-4.43 9.9-9.9C21.94 6.45 17.5 2 12.04 2zM12.04 20.08c-1.58 0-3.13-.4-4.5-1.18l-.32-.19-3.34.88.89-3.25-.21-.34c-.78-1.35-1.19-2.91-1.19-4.51 0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.64 8.1-8.1 8.1zm4.83-5.9c-.28-.14-1.65-.81-1.9-.9-.25-.1-.44-.1-.62.1-.19.19-.72.81-.88.98-.16.16-.32.19-.59.06s-1.14-.42-2.18-1.34c-.81-.72-1.35-1.62-1.51-1.88-.16-.27-.02-.42.12-.54.12-.11.27-.28.4-.41.14-.12.19-.21.28-.35.1-.14.05-.27 0-.38-.05-.11-.59-1.42-.81-1.96-.22-.53-.44-.45-.59-.45-.15 0-.32-.03-.49-.03-.17 0-.44.06-.67.3s-.88.86-.88 2.07c0 1.21.9 2.39 1.03 2.56.13.16 1.76 2.67 4.27 3.77.6.26 1.06.42 1.42.53.59.19 1.13.16 1.56.1.48-.07.72-.81.82-1s.1-.19.07-.3z"/>
    </svg>
);

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

type DateFilterType = 'all' | 'today' | 'range';

const CreditsView: React.FC = () => {
  const { transactions, addPaymentToTransaction, receiptSettings, deleteTransaction, hasPermission, t, customers, collectDebtFromCustomer } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');
  
  // Date Filter State
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{id?: string, total: number, remaining: number, isGeneralDebt?: boolean, customerId?: string} | null>(null);

  // Delete State
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Debtors List Modal State
  const [isDebtorsModalOpen, setIsDebtorsModalOpen] = useState(false);
  const [viewDebtorId, setViewDebtorId] = useState<string | null>(null);

  const getPaidAmount = (t: Transaction) => t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const getRemainingAmount = (t: Transaction) => t.total - getPaidAmount(t);

  const creditTransactions = useMemo(() => transactions.filter(t => t.paymentMethod === 'credit'), [transactions]);

  // Calculate totals based on ALL credit transactions (for the summary box)
  const totalPendingSummary = useMemo(() => creditTransactions.filter(t => !t.isPaid).reduce((sum, t) => sum + getRemainingAmount(t), 0), [creditTransactions]);

  // Calculate Unique Debtors List
  const debtorsList = useMemo(() => {
      const map: Record<string, { name: string, phone: string, totalDebt: number, count: number, id: string }> = {};
      
      creditTransactions.forEach(t => {
          if (!t.isPaid && t.customerId) {
              const cid = t.customerId;
              const rem = getRemainingAmount(t);
              if (rem > 0) {
                  if (!map[cid]) {
                      const customer = customers.find(c => c.id === cid);
                      map[cid] = { 
                          name: t.customerName || 'Unknown', 
                          phone: customer?.phone || '', 
                          totalDebt: 0, 
                          count: 0,
                          id: cid
                      };
                  }
                  map[cid].totalDebt += rem;
                  map[cid].count += 1;
              }
          }
      });
      // Sort by total debt descending
      return Object.values(map).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [creditTransactions, customers]);

  const uniqueDebtorsCount = debtorsList.length;

  // Data for Specific Debtor Statement (Modal 2)
  const selectedDebtorTransactions = useMemo(() => {
      if (!viewDebtorId) return [];
      return transactions.filter(t => 
          (t.customerId === viewDebtorId || (viewDebtorId === '1' && !t.customerId && t.paymentMethod !== 'credit')) &&
          (t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection')
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, viewDebtorId]);

  const filteredAndSortedData = useMemo(() => {
      let data = creditTransactions.filter(t => {
          // 1. Status Filter
          if (filter === 'pending' && t.isPaid) return false;
          if (filter === 'paid' && !t.isPaid) return false;

          // 2. Search Filter
          if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (t.customerName?.toLowerCase() || '').includes(query) || t.id.includes(query);
          }
          return true;
      });

      // 3. Date Filter
      if (dateFilterType !== 'all') {
          const start = dateFilterType === 'today' 
              ? new Date(new Date().setHours(0,0,0,0)) 
              : new Date(new Date(startDate).setHours(0,0,0,0));
          
          const end = dateFilterType === 'today'
              ? new Date(new Date().setHours(23,59,59,999))
              : new Date(new Date(endDate).setHours(23,59,59,999));

          data = data.filter(t => {
              const d = new Date(t.date);
              return d >= start && d <= end;
          });
      }

      // 4. Sorting
      return data.sort((a, b) => {
          let aValue: any = '';
          let bValue: any = '';

          switch(sortConfig.key) {
              case 'id':
                  aValue = a.id; bValue = b.id; break;
              case 'customer':
                  aValue = a.customerName || ''; bValue = b.customerName || ''; break;
              case 'date':
                  aValue = new Date(a.date).getTime(); bValue = new Date(b.date).getTime(); break;
              case 'total':
                  aValue = a.total; bValue = b.total; break;
              case 'paid':
                  aValue = getPaidAmount(a); bValue = getPaidAmount(b); break;
              case 'remaining':
                  aValue = getRemainingAmount(a); bValue = getRemainingAmount(b); break;
              case 'status':
                  aValue = a.isPaid ? 1 : 0; bValue = b.isPaid ? 1 : 0; break;
              default:
                  aValue = new Date(a.date).getTime(); bValue = new Date(b.date).getTime();
          }

          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });

  }, [creditTransactions, filter, searchQuery, dateFilterType, startDate, endDate, sortConfig]);

  const requestSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
      if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />;
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

  const handleGeneralDebtCollect = (e: React.MouseEvent, customerId: string, amount: number) => {
      e.stopPropagation();
      setPaymentTarget({
          total: amount,
          remaining: amount,
          isGeneralDebt: true,
          customerId: customerId
      });
      setPaymentModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setTransactionToDelete(id);
  };

  const confirmDelete = () => {
      if (transactionToDelete) {
          deleteTransaction(transactionToDelete);
          setTransactionToDelete(null);
          if (selectedTransaction?.id === transactionToDelete) {
              setSelectedTransaction(null);
          }
      }
  };

  const handlePaymentConfirm = (amount: number, method: PaymentMethod) => {
      if (paymentTarget) {
          if (paymentTarget.isGeneralDebt && paymentTarget.customerId) {
              collectDebtFromCustomer(paymentTarget.customerId, amount, method);
          } else if (paymentTarget.id) {
              addPaymentToTransaction(paymentTarget.id, amount, method);
          }
      }
  };

  const handleSendWhatsApp = (debtorId: string, debtorName: string, debtorTransactions: Transaction[]) => {
    const customer = customers.find(c => c.id === debtorId);
    if (!customer || !customer.phone) {
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
    
    let cleanPhone = customer.phone.replace(/\D/g, ''); // Remove all non-digits
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '20' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('20')) {
        cleanPhone = '20' + cleanPhone;
    }
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  const handlePrintAll = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8" />
            <title>تقرير مديونيات شامل</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: 'Cairo', sans-serif; padding: 20px; color: #000; }
              .header { text-align: center; border-bottom: 3px solid #E31E24; padding-bottom: 20px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
              th { background: #E31E24; color: white; padding: 8px; text-align: right; }
              td { border-bottom: 1px solid #ddd; padding: 8px; }
              .summary { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-around; border: 1px solid #ddd; }
              .print-meta { font-size: 10px; color: #666; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
          </head>
          <body>
              <div class="header">
                  <h1>${receiptSettings.storeName}</h1>
                  <h2>تقرير متابعة الآجل والديون</h2>
                  <p>${dateFilterType === 'all' ? 'جميع الفترات' : (dateFilterType === 'today' ? 'اليوم' : `من ${startDate} إلى ${endDate}`)}</p>
              </div>
              <div class="summary">
                  <div><strong>عدد المدينين:</strong> ${uniqueDebtorsCount}</div>
                  <div><strong>إجمالي الديون المستحقة:</strong> ${totalPendingSummary.toFixed(2)} ج.م</div>
              </div>
              <table>
                  <thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>العميل</th><th>المبلغ الكلي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
                  <tbody>
                      ${filteredAndSortedData.map(t => {
                          const paid = getPaidAmount(t);
                          const rem = t.total - paid;
                          const status = t.isPaid ? 'محصل' : (paid > 0 ? 'سداد جزئي' : 'مستحق');
                          return `
                          <tr>
                              <td>#${t.id.slice(-6)}</td>
                              <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
                              <td>${t.customerName}</td>
                              <td>${t.total.toFixed(2)}</td>
                              <td>${paid.toFixed(2)}</td>
                              <td style="font-weight: bold;">${rem.toFixed(2)}</td>
                              <td style="color: ${t.isPaid ? 'green' : (paid > 0 ? 'orange' : 'red')}">${status}</td>
                          </tr>`;
                      }).join('')}
                  </tbody>
              </table>
              <div class="print-meta">تم الاستخراج في ${new Date().toLocaleString('ar-EG')}</div>
              <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  const handlePrintStatement = (debtorId: string, debtorName: string, debtorTransactions: Transaction[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const justDate = new Date().toLocaleDateString('ar-EG');
    const totalDebt = debtorTransactions.reduce((sum, t) => sum + getRemainingAmount(t), 0);
    const customer = customers.find(c => c.id === debtorId);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>كشف حساب - ${debtorName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Cairo', sans-serif; background: #fff; color: #000; margin: 0; padding: 40px; width: 210mm; box-sizing: border-box; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #E31E24; padding-bottom: 20px; margin-bottom: 30px; }
            .store-info h1 { margin: 0; color: #E31E24; font-size: 24px; }
            .store-info p { margin: 5px 0; font-size: 14px; color: #555; }
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
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="store-info">
              <h1>${receiptSettings.storeName}</h1>
              <p>${receiptSettings.address}</p>
              <p>${receiptSettings.phone}</p>
            </div>
            ${receiptSettings.logo ? `<img src="${receiptSettings.logo}" style="max-height: 80px;" />` : ''}
          </div>
          <div class="statement-title"><h2>كشف حساب مديونية</h2></div>
          <div class="info-grid">
            <div class="info-col">
              <div class="label">بيانات العميل</div>
              <div class="value">${debtorName}</div>
              <div style="font-size: 14px; margin-top: 2px;">${customer?.phone || '-'}</div>
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
              ${debtorTransactions.length > 0 ? debtorTransactions.map(t => {
                  const date = new Date(t.date).toLocaleDateString('ar-EG');
                  const itemsStr = t.items && t.items.length > 0 
                      ? t.items.map(i => `• ${i.name} (عدد ${i.quantity})`).join('<br>')
                      : 'لا توجد تفاصيل';
                  const paid = getPaidAmount(t);
                  const rem = t.total - paid;
                  return `<tr>
                    <td><strong>#${t.id.slice(-6)}</strong></td>
                    <td>${date}</td>
                    <td><div class="items-detail">${itemsStr}</div><div style="margin-top:5px; font-size:10px; color:#888;">(الإجمالي: ${t.total} - المدفوع: ${paid})</div></td>
                    <td><strong>${rem.toFixed(2)} ج.م</strong></td>
                  </tr>`;
              }).join('') : `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #888;">لا توجد فواتير آجلة (غير مدفوعة) مسجلة.</td></tr>`}
            </tbody>
          </table>
          <div class="totals-section"><div class="total-box"><div class="total-label">إجمالي المبلغ المستحق (الآجل)</div><div class="total-amount">${totalDebt.toFixed(2)} ج.م</div></div></div>
          <div class="print-meta">تم استخراج هذا المستند إلكترونياً من نظام ${receiptSettings.storeName}.</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">متابعة الآجل (الديون)</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm md:text-base">كشف بجميع فواتير البيع الآجل وحالة استحقاقها</p>
        </div>
        
        <div className="flex gap-3 items-center w-full md:w-auto flex-wrap">
            <button onClick={handlePrintAll} className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-3 rounded-2xl font-bold hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center justify-center gap-2 flex-1 md:flex-none">
                <Printer size={20} /> طباعة
            </button>
            
            {/* Debtors Count Card - CLICKABLE */}
            <div 
                onClick={() => setIsDebtorsModalOpen(true)}
                className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-5 py-3 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-3 flex-1 md:flex-none cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
                <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm"><Users size={20} /></div>
                <div>
                    <div className="text-xs font-bold opacity-70">عدد المدينين</div>
                    <div className="text-xl font-bold">{uniqueDebtorsCount}</div>
                </div>
            </div>

            {/* Total Amount Card */}
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-6 py-3 rounded-2xl border border-red-100 dark:border-red-800 flex items-center gap-3 flex-1 md:flex-none">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm"><AlertCircle size={20} /></div>
                <div>
                    <div className="text-xs font-bold opacity-70">إجمالي المستحق</div>
                    <div className="text-xl font-bold">{totalPendingSummary.toFixed(2)} ج.م</div>
                </div>
            </div>
        </div>
      </div>

      {/* ... Filters section ... */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6">
          <div className="relative flex-1">
             <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input 
                 type="text" 
                 placeholder="بحث برقم الفاتورة أو اسم العميل..." 
                 className="pl-4 pr-12 py-3 w-full rounded-xl bg-white dark:bg-gray-800 border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 items-center">
                <button onClick={() => setDateFilterType('all')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all ${dateFilterType === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>الكل</button>
                <button onClick={() => setDateFilterType('today')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all ${dateFilterType === 'today' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>اليوم</button>
                <button onClick={() => setDateFilterType('range')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all ${dateFilterType === 'range' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>فترة</button>
                
                {dateFilterType === 'range' && (
                    <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-gray-200 dark:border-gray-600 mr-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 w-28" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 w-28" />
                    </div>
                )}
          </div>
          
          {dateFilterType === 'range' && (
                <div className="sm:hidden flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                </div>
          )}

          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
             <button onClick={() => setFilter('pending')} className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'pending' ? 'bg-gray-800 dark:bg-gray-700 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>مستحق</button>
             <button onClick={() => setFilter('paid')} className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'paid' ? 'bg-gray-800 dark:bg-gray-700 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>تم التحصيل</button>
             <button onClick={() => setFilter('all')} className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-gray-800 dark:bg-gray-700 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>الكل</button>
          </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap min-w-[900px]">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm font-medium">
              <tr>
                  <th onClick={() => requestSort('id')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1">رقم الفاتورة <SortIcon columnKey="id" /></div>
                  </th>
                  <th onClick={() => requestSort('customer')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1">العميل <SortIcon columnKey="customer" /></div>
                  </th>
                  <th onClick={() => requestSort('date')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1">التاريخ <SortIcon columnKey="date" /></div>
                  </th>
                  <th onClick={() => requestSort('total')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1">المبلغ الكلي <SortIcon columnKey="total" /></div>
                  </th>
                  <th onClick={() => requestSort('paid')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1">المدفوع <SortIcon columnKey="paid" /></div>
                  </th>
                  <th onClick={() => requestSort('remaining')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1">المتبقي <SortIcon columnKey="remaining" /></div>
                  </th>
                  <th onClick={() => requestSort('status')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1">الحالة <SortIcon columnKey="status" /></div>
                  </th>
                  <th className="px-6 py-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAndSortedData.map((transaction) => {
                const paid = getPaidAmount(transaction);
                const remaining = transaction.total - paid;
                
                return (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4"><button onClick={() => setSelectedTransaction(transaction)} className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">#{transaction.id.slice(-6)}</button></td>
                  <td className="px-6 py-4"><div className="flex items-center gap-2"><User size={16} className="text-gray-400" /><span className="font-medium text-gray-800 dark:text-white">{transaction.customerName}</span></div></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><Clock size={16} className="text-gray-400" />{new Date(transaction.date).toLocaleDateString('ar-EG')}</div></td>
                  <td className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300">{transaction.total.toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">{paid.toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400">{remaining.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {transaction.isPaid ? (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1"><Check size={12} />تم التحصيل</span>
                    ) : paid > 0 ? (
                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1"><Clock size={12} />سداد جزئي</span>
                    ) : (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1"><Clock size={12} />مستحق للدفع</span>
                    )}
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    {!transaction.isPaid && (
                        <button 
                           onClick={(e) => handleCollectClick(e, transaction)}
                           className="px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm bg-primary hover:bg-primary-hover text-white flex items-center gap-1"
                        >
                            <DollarSign size={14} />
                            تحصيل
                        </button>
                    )}
                    {hasPermission('reports.delete_transaction') && (
                        <button 
                            onClick={(e) => handleDeleteClick(e, transaction.id)}
                            className="p-2 rounded-lg transition-colors text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50"
                            title={t('delete')}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                  </td>
                </tr>
              )})}
              {filteredAndSortedData.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400"><CreditCard size={48} className="mx-auto mb-4 opacity-50" /><p>لا توجد فواتير مطابقة</p></td></tr>}
            </tbody>
          </table>
          </div>

          {/* Mobile List (Cards) */}
          <div className="md:hidden p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
            {filteredAndSortedData.map((t) => {
                const paid = getPaidAmount(t);
                const remaining = t.total - paid;
                
                return (
                    <div key={t.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">#{t.id.slice(-6)}</span>
                                <span className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString('ar-EG')}</span>
                            </div>
                            <div className={`text-xs font-bold px-2 py-1 rounded ${t.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {t.isPaid ? 'تم التحصيل' : 'مستحق'}
                            </div>
                        </div>
                        
                        <div className="mb-3">
                            <div className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-1 mb-2">
                                <User size={14} className="text-gray-400"/> {t.customerName}
                            </div>
                            <div className="flex justify-between items-end bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500">الإجمالي</div>
                                    <div className="font-bold dark:text-white">{t.total.toFixed(2)}</div>
                                </div>
                                <div className="text-center text-green-600 dark:text-green-400">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">المدفوع</div>
                                    <div className="font-bold">{paid.toFixed(2)}</div>
                                </div>
                                <div className="text-center text-red-600 dark:text-red-400">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">المتبقي</div>
                                    <div className="font-bold text-lg">{remaining.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            {!t.isPaid && (
                                <button onClick={(e) => handleCollectClick(e, t)} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold shadow-sm">
                                    تحصيل دفعة
                                </button>
                            )}
                            <button onClick={() => setSelectedTransaction(t)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-lg text-sm font-bold">
                                التفاصيل
                            </button>
                        </div>
                    </div>
                )
            })}
            {filteredAndSortedData.length === 0 && <div className="text-center py-8 text-gray-400">لا توجد فواتير مطابقة</div>}
          </div>
      </div>

      {/* --- MODAL 1: DEBTORS LIST --- */}
      {isDebtorsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl p-0 overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                              <Users size={24} className="text-primary" />
                              كشف العملاء المدينين
                          </h3>
                          <p className="text-sm text-gray-500">قائمة بجميع العملاء الذين لديهم مستحقات مالية</p>
                      </div>
                      <button onClick={() => setIsDebtorsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-0">
                      <table className="w-full text-right">
                          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-sm sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="p-4">اسم العميل</th>
                                  <th className="p-4">رقم الهاتف</th>
                                  <th className="p-4 text-center">عدد الفواتير</th>
                                  <th className="p-4">إجمالي المستحق</th>
                                  <th className="p-4"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {debtorsList.map(debtor => (
                                  <tr key={debtor.id} onClick={() => setViewDebtorId(debtor.id)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group">
                                      <td className="p-4 font-bold text-gray-800 dark:text-white">{debtor.name}</td>
                                      <td className="p-4 text-gray-500 dark:text-gray-400">{debtor.phone}</td>
                                      <td className="p-4 text-center"><span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-bold">{debtor.count}</span></td>
                                      <td className="p-4 font-bold text-red-600 dark:text-red-400 text-lg">{debtor.totalDebt.toFixed(2)} ج.م</td>
                                      <td className="p-4 text-left">
                                          <button className="text-primary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                                              عرض الكشف <ArrowUpRight size={12} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {debtorsList.length === 0 && (
                                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">لا توجد مديونيات حالياً</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 text-left">
                      <span className="text-gray-500 text-sm font-bold">الإجمالي الكلي:</span> <span className="text-2xl font-bold text-primary ml-2">{totalPendingSummary.toFixed(2)} ج.م</span>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL 2: CUSTOMER STATEMENT (Opened from Debtors List) --- */}
      {viewDebtorId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                              <User size={24} className="text-primary" />
                              كشف حساب: {debtorsList.find(d => d.id === viewDebtorId)?.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                              <Phone size={12}/> {debtorsList.find(d => d.id === viewDebtorId)?.phone || 'لا يوجد رقم هاتف'}
                          </p>
                      </div>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => {
                                const d = debtorsList.find(x => x.id === viewDebtorId);
                                if(d) handleSendWhatsApp(viewDebtorId, d.name, selectedDebtorTransactions);
                            }} 
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-green-700"
                          >
                              <WhatsAppIcon size={16} />
                              واتساب
                          </button>
                          <button 
                            onClick={() => {
                                const d = debtorsList.find(x => x.id === viewDebtorId);
                                if(d) handlePrintStatement(viewDebtorId, d.name, selectedDebtorTransactions);
                            }} 
                            className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-900"
                          >
                              <Printer size={16} /> طباعة الكشف
                          </button>
                          <button onClick={() => setViewDebtorId(null)} className="text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-700"><X size={20}/></button>
                      </div>
                  </div>

                  {/* Summary Boxes */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1 flex items-center gap-1"><Wallet size={12}/> إجمالي المشتريات (الآجلة)</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-200">
                              {selectedDebtorTransactions.reduce((sum, t) => sum + t.total, 0).toFixed(2)} ج.م
                          </div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 relative">
                          <div className="text-xs text-red-600 dark:text-red-400 font-bold mb-1 flex items-center gap-1"><AlertCircle size={12}/> المتبقي (المديونية)</div>
                          <div className="text-xl font-bold text-red-900 dark:text-red-200">
                              {selectedDebtorTransactions.reduce((sum, t) => sum + getRemainingAmount(t), 0).toFixed(2)} ج.م
                          </div>
                          <button 
                             onClick={(e) => {
                                 const debt = selectedDebtorTransactions.reduce((sum, t) => sum + getRemainingAmount(t), 0);
                                 if(debt > 0) handleGeneralDebtCollect(e, viewDebtorId, debt);
                             }}
                             className="absolute top-1/2 -translate-y-1/2 left-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-1"
                          >
                              <DollarSign size={14} />
                              تحصيل
                          </button>
                      </div>
                  </div>

                  {/* Transactions List */}
                  <div className="flex-1 overflow-y-auto p-0">
                      <table className="w-full text-right text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 sticky top-0 z-10">
                              <tr>
                                  <th className="p-4">الفاتورة</th>
                                  <th className="p-4">التاريخ</th>
                                  <th className="p-4">البيان (أصناف مختصرة)</th>
                                  <th className="p-4">المبلغ</th>
                                  <th className="p-4">مدفوع</th>
                                  <th className="p-4">متبقي</th>
                                  <th className="p-4"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                              {selectedDebtorTransactions.map(t => {
                                  const paid = getPaidAmount(t);
                                  const rem = t.total - paid;
                                  const itemsSummary = t.items ? t.items.map(i => i.name).join(', ').slice(0, 30) + (t.items.length > 1 ? '...' : '') : '-';
                                  
                                  return (
                                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                          <td className="p-4 font-mono font-bold text-blue-600">#{t.id.slice(-6)}</td>
                                          <td className="p-4 text-gray-500">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                                          <td className="p-4 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={t.items?.map(i => i.name).join(', ')}>{itemsSummary}</td>
                                          <td className="p-4 font-bold">{t.total.toFixed(2)}</td>
                                          <td className="p-4 text-green-600">{paid.toFixed(2)}</td>
                                          <td className="p-4 font-bold text-red-600">{rem.toFixed(2)}</td>
                                          <td className="p-4">
                                               {rem > 0 && (
                                                   <button 
                                                      onClick={(e) => handleCollectClick(e, t)}
                                                      className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-green-100 hover:text-green-700"
                                                   >
                                                       دفعة
                                                   </button>
                                               )}
                                          </td>
                                      </tr>
                                  )
                              })}
                              {selectedDebtorTransactions.length === 0 && (
                                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا توجد فواتير آجلة مسجلة</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
      
      {selectedTransaction && (
          <TransactionDetailsModal 
              transaction={selectedTransaction} 
              onClose={() => setSelectedTransaction(null)} 
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
      {transactionToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تأكيد الحذف</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            type="button"
                            onClick={() => setTransactionToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            type="button"
                            onClick={confirmDelete}
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

export default CreditsView;
