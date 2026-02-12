import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Clock, Package, User, PieChart, X, ShoppingBag, Check, Printer, Trash2, Smartphone, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Layers, AlertTriangle, Ruler, Box, ArrowUpRight, ArrowUpDown } from 'lucide-react';
import { ViewState, Transaction, PaymentMethod } from '../types';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import PaymentModal from '../components/PaymentModal';

type SortConfig = {
  key: 'customerName' | 'date' | 'total' | null;
  direction: 'asc' | 'desc';
};

const ReportsView: React.FC = () => {
  const { transactions, expenses, categories, setView, deleteTransaction, receiptSettings, addPaymentToTransaction, hasPermission, t } = usePOS();
  
  const [filterType, setFilterType] = useState<'today' | 'range'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // State for detailed category view (Modal)
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<string | null>(null);

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{id: string, total: number, remaining: number} | null>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  const getFilteredData = () => {
    let start, end;
    const now = new Date();
    if (filterType === 'today') {
        start = new Date(now.setHours(0,0,0,0));
        end = new Date(now.setHours(23,59,59,999));
    } else {
        start = new Date(new Date(startDate).setHours(0,0,0,0));
        end = new Date(new Date(endDate).setHours(23,59,59,999));
    }
    
    // Filter transactions created in date range
    const filteredTrans = transactions.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
    const filteredExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; });
    
    return { filteredTrans, filteredExpenses, start, end };
  };

  const { filteredTrans, filteredExpenses, start, end } = getFilteredData();

  const sortedTrans = React.useMemo(() => {
    let sortableItems = [...filteredTrans];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'date':
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
            break;
          case 'total':
            aValue = a.total;
            bValue = b.total;
            break;
          case 'customerName':
            aValue = (a.customerName || '').toLowerCase();
            bValue = (b.customerName || '').toLowerCase();
            break;
          default:
            // Fallback for other potential sort keys or if a.sortConfig.key is invalid
            aValue = (a[sortConfig.key as keyof Transaction] || '').toString().toLowerCase();
            bValue = (b[sortConfig.key as keyof Transaction] || '').toString().toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTrans, sortConfig]);

  const getPaidAmount = (t: Transaction) => t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const getRemainingAmount = (t: Transaction) => t.total - getPaidAmount(t);

  // TOTAL SALES: Only count "sale" type transactions to avoid double counting collections
//   const totalSales = filteredTrans
//     .filter(t => t.type !== 'collection')
    //     .reduce((sum, t) => sum + t.total, 0);
    const issuedSales = filteredTrans
  .filter(t => t.type === 'sale')
  .reduce((sum, t) => sum + t.total, 0);

  
//   const creditIssuedInPeriodUnpaid = filteredTrans
//     .filter(t => t.paymentMethod === 'credit' && t.type !== 'collection')
//     .reduce((sum, t) => sum + getRemainingAmount(t), 0);
  
    const totalDebt = filteredTrans
  .filter(t => t.type === 'sale')
  .reduce((sum, t) => {
    const remaining = getRemainingAmount(t);
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
//   let collectedCash = 0;
//   let collectedVodafone = 0;

//   // Revenue Calculation
//   transactions.forEach(t => {
//       if (t.payments) {
//           t.payments.forEach(p => {
//               const pDate = new Date(p.date);
//               if (pDate >= start && pDate <= end) {
//                   if (p.method === 'cash') collectedCash += p.amount;
//                   if (p.method === 'vodafone_cash') collectedVodafone += p.amount;
//               }
//           });
//       }
    //   });
    const totalCollected = filteredTrans.reduce((sum, t) => {
  return sum + (t.payments?.reduce((s, p) => s + p.amount, 0) || 0);
}, 0);
const collectedCash = filteredTrans.reduce((sum, t) => {
  return sum + (t.payments?.filter(p => p.method === 'cash')
    .reduce((s, p) => s + p.amount, 0) || 0);
}, 0);

const collectedVodafone = filteredTrans.reduce((sum, t) => {
  return sum + (t.payments?.filter(p => p.method === 'vodafone_cash')
    .reduce((s, p) => s + p.amount, 0) || 0);
}, 0);


//   const netTreasury = collectedCash - totalExpenses; // Cash in hand
    const netTreasury = totalCollected - totalExpenses;

  // --- DETAILED SALES CALCULATION ---
  interface ProductStat {
      qty: number;
      total: number;
      totalArea: number; // New: To calculate total m2 for Area products
      breakdown: {
          label: string; // e.g., "1.2m x 2m" or "Fixed"
          count: number;
          area: number; // m2 for this dimension group
      }[];
  }
  interface CategoryStat {
      total: number;
      count: number;
      products: Record<string, ProductStat>;
  }

  const categoryStats: Record<string, CategoryStat> = {};
  categories.forEach(c => categoryStats[c] = { total: 0, count: 0, products: {} });
  
  filteredTrans.forEach(t => {
      if (t.type !== 'collection' && t.items) {
          t.items.forEach(item => {
              let itemTotal = item.finalPrice * item.quantity;

              // Check if pricing is Area based
              if (item.pricingMethod === 'area' && item.dimensions) {
                   let areaPerPiece = item.dimensions.width * item.dimensions.height;
                   if (item.wasted) {
                       areaPerPiece += item.wasted.width * item.wasted.height;
                   }
                   // Ensure total price reflects full amount
                   if (Math.abs(item.finalPrice - item.price) < 0.01 && Math.abs(areaPerPiece - 1) > 0.01) {
                       itemTotal = (item.price * areaPerPiece) * item.quantity;
                   }
              }

              // Ensure category exists
              if (!categoryStats[item.category]) {
                  categoryStats[item.category] = { total: 0, count: 0, products: {} };
              }

              categoryStats[item.category].total += itemTotal;
              categoryStats[item.category].count += item.quantity;

              const productKey = item.name;
              
              if (!categoryStats[item.category].products[productKey]) {
                  categoryStats[item.category].products[productKey] = { 
                      qty: 0, 
                      total: 0,
                      totalArea: 0,
                      breakdown: []
                  };
              }

              // Update Product Stats
              const pStat = categoryStats[item.category].products[productKey];
              pStat.qty += item.quantity;
              pStat.total += itemTotal;

              // Calculate Area if applicable
              let itemArea = 0;
              let dimLabel = 'قياسي';
              
              if (item.pricingMethod === 'area' && item.dimensions) {
                  itemArea = item.dimensions.width * item.dimensions.height;
                  dimLabel = `${item.dimensions.width}م × ${item.dimensions.height}م`;
                  
                  if (item.wasted) {
                      const wastedArea = item.wasted.width * item.wasted.height;
                      itemArea += wastedArea;
                      dimLabel += ` (+ ${item.wasted.width}×${item.wasted.height}م هادر)`;
                  }

                  pStat.totalArea += (itemArea * item.quantity);
              }

              // Update Breakdown
              const existingBreakdown = pStat.breakdown.find(b => b.label === dimLabel);
              if (existingBreakdown) {
                  existingBreakdown.count += item.quantity;
                  existingBreakdown.area += (itemArea * item.quantity);
              } else {
                  pStat.breakdown.push({
                      label: dimLabel,
                      count: item.quantity,
                      area: itemArea * item.quantity
                  });
              }
          });
      }
  });

  const getMethodLabel = (method: string) => {
    switch(method) { case 'cash': return 'كاش'; case 'vodafone_cash': return 'فودافون كاش'; case 'credit': return 'آجل'; default: return method; }
  };
  const getMethodStyle = (method: string) => {
    switch(method) { case 'cash': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'; case 'vodafone_cash': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'; case 'credit': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'; default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'; }
  };
  
  const handleQuickCollect = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    const remaining = getRemainingAmount(t);
    setPaymentTarget({
        id: t.id,
        total: t.total,
        remaining: remaining
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentConfirm = (amount: number, method: PaymentMethod) => {
      if (paymentTarget) {
          addPaymentToTransaction(paymentTarget.id, amount, method);
      }
  };

  const requestSort = (key: 'customerName' | 'date' | 'total') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: 'customerName' | 'date' | 'total' }) => {
      if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
      return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
  };

  const handleSwitchTransaction = (targetId: string) => {
      const target = transactions.find(t => t.id === targetId);
      if (target) setSelectedTransaction(target);
  };

  const handleDeleteTransaction = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!hasPermission('reports.delete_transaction')) {
          alert(t('permissionDeniedAction'));
          return;
      }
      setTransactionToDelete(id);
  };

  const confirmDeleteTransaction = () => {
      if (transactionToDelete) {
          deleteTransaction(transactionToDelete);
          setTransactionToDelete(null);
          if (selectedTransaction?.id === transactionToDelete) {
              setSelectedTransaction(null);
          }
      }
  };

  const handleCategoryClick = (cat: string) => {
      if (categoryStats[cat].total > 0) {
          setSelectedCategoryDetails(cat);
      }
  };

  const printCategoryReport = (cat: string) => {
      const stats = categoryStats[cat];
      if (!stats) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const itemsHtml = Object.entries(stats.products).map(([pName, pData]) => {
          const breakdownHtml = pData.breakdown.map(b => {
              if (b.label === 'قياسي') return ''; // Don't show standard breakdown
              return `<div>${b.count} قطع (${b.label})</div>`;
          }).join('');

          // Determine what to show in Quantity/Area column
          const qtyOrAreaDisplay = pData.totalArea > 0 
              ? `<div>${pData.qty} قطعة</div><div style="font-weight:bold; color:#000;">إجمالي مساحة: ${pData.totalArea.toFixed(2)} متر</div>`
              : `${pData.qty} قطعة`;

          return `
            <tr>
                <td style="padding:10px;">
                    <div style="font-weight:bold;">${pName}</div>
                    <div style="font-size:11px; color:#666;">${breakdownHtml}</div>
                </td>
                <td style="padding:10px; text-align:center;">${qtyOrAreaDisplay}</td>
                <td style="padding:10px; text-align:left; font-weight:bold;">${pData.total.toFixed(2)}</td>
            </tr>
          `;
      }).join('');

      const content = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="utf-8" />
            <title>تقرير تصنيف: ${cat}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: 'Cairo', sans-serif; padding: 20px; color: #000; }
                .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background-color: #f3f3f3; padding: 10px; border-bottom: 1px solid #ddd; }
                td { border-bottom: 1px solid #eee; }
                .total-box { text-align: left; font-size: 18px; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${receiptSettings.storeName}</h1>
                <h2>تقرير مبيعات تصنيف: ${cat}</h2>
                <p>الفترة: ${filterType === 'today' ? 'اليوم' : `${startDate} إلى ${endDate}`}</p>
            </div>
            <table>
                <thead><tr><th style="text-align:right;">المنتج</th><th>الكمية / المساحة</th><th style="text-align:left;">الإجمالي</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="total-box">إجمالي مبيعات التصنيف: ${stats.total.toFixed(2)} ج.م</div>
            <div style="font-size:10px; text-align:center; margin-top:30px;">تم الاستخراج في ${new Date().toLocaleString('ar-EG')}</div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
  };

  const handlePrintReport = () => {
    // ... (Main Report Print Logic - Kept Simple for Brevity as it was in previous code)
    // Re-using logic to print main report
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>تقرير مالي شامل</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Cairo', sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; border-bottom: 3px solid #E31E24; padding-bottom: 20px; margin-bottom: 20px; }
            .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 30px; }
            .stat-box { border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; background: #f9f9f9; }
            .stat-val { font-size: 16px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
            th { background: #E31E24; color: white; padding: 8px; text-align: right; }
            td { border-bottom: 1px solid #ddd; padding: 8px; }
            .print-meta { font-size: 10px; color: #666; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
            <div class="header">
                <h1>${receiptSettings.storeName}</h1>
                <h2>تقرير مالي شامل</h2>
                <p>الفترة: ${filterType === 'today' ? 'اليوم' : `${startDate} إلى ${endDate}`}</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-box"><div>المبيعات</div><div class="stat-val">${issuedSales.toFixed(2)}</div></div>
                <div class="stat-box"><div>المصروفات</div><div class="stat-val">${totalExpenses.toFixed(2)}</div></div>
                <div class="stat-box"><div>تحصيل كاش</div><div class="stat-val">${collectedCash.toFixed(2)}</div></div>
                <div class="stat-box"><div>تحصيل فودافون</div><div class="stat-val">${collectedVodafone.toFixed(2)}</div></div>
                <div class="stat-box"><div>صافي الخزينة</div><div class="stat-val">${netTreasury.toFixed(2)}</div></div>
            </div>

            <h3 style="border-right: 4px solid #E31E24; padding-right: 10px; margin-bottom: 10px;">سجل الفواتير</h3>
            <table>
                <thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>العميل</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                <tbody>
                    ${filteredTrans.map(t => {
                        const paid = getPaidAmount(t);
                        let status = '';
                        if (t.type === 'collection') { status = '(تحصيل)'; } 
                        else if (t.paymentMethod === 'credit') { status = (t.isPaid ? ' (محصل)' : (paid > 0 ? ' (سداد جزئي)' : ' (مستحق)')); }
                        return `<tr><td>#${t.id.slice(-6)}</td><td>${new Date(t.date).toLocaleString('ar-EG')}</td><td>${t.customerName || 'عميل نقدي'}</td><td>${t.total.toFixed(2)}</td><td>${getMethodLabel(t.paymentMethod)}${status}</td></tr>`;
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

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      {/* ... Header and Charts sections ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">التقارير المالية</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm md:text-base">نظرة شاملة وتفصيلية على المبيعات والأداء</p>
        </div>
        
        <div className="flex flex-col md:flex-row w-full md:w-auto items-start md:items-center gap-3">
             <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex-1 md:flex-none">
                    <button onClick={() => setFilterType('today')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${filterType === 'today' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>اليوم</button>
                    <button onClick={() => setFilterType('range')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${filterType === 'range' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>فترة محددة</button>
                </div>
                {filterType === 'range' && (
                    <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                    </div>
                )}
            </div>
            <button onClick={handlePrintReport} className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center justify-center gap-2 w-full md:w-auto">
                 <Printer size={18} /> طباعة تقرير
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          {/* Sales Card */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 transition-all group">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><TrendingUp size={24} /></div>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">المبيعات</span>
             </div>
             <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1">{issuedSales.toFixed(2)}</h3>
             <p className="text-xs text-gray-400 dark:text-gray-500">إجمالي الفواتير (مبيعات)</p>
          </div>

          {/* Expenses Card */}
          <div onClick={() => setView(ViewState.EXPENSES)} className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-700 transition-all group cursor-pointer">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors"><TrendingDown size={24} /></div>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">المصروفات</span>
             </div>
             <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1">{totalExpenses.toFixed(2)}</h3>
             <p className="text-xs text-gray-400 dark:text-gray-500">إجمالي المصروفات</p>
          </div>

          {/* Vodafone Cash Card */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-red-600 transition-all group">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Smartphone size={24} />
                </div>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">فودافون</span>
             </div>
             <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1">{collectedVodafone.toFixed(2)}</h3>
             <p className="text-xs text-gray-400 dark:text-gray-500">تحصيل فودافون كاش</p>
          </div>

          {/* Credits Card */}
          <div onClick={() => setView(ViewState.CREDITS)} className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-yellow-200 dark:hover:border-yellow-700 transition-all group cursor-pointer">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 dark:text-yellow-400 rounded-xl group-hover:bg-yellow-500 group-hover:text-white transition-colors"><CreditCard size={24} /></div>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">آجل</span>
             </div>
             <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1">{totalDebt.toFixed(2)}</h3>
             <p className="text-xs text-gray-400 dark:text-gray-500">متبقي من فواتير الفترة</p>
          </div>

          {/* Net Treasury Card */}
          <div className="bg-gray-800 dark:bg-gray-700 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-700 dark:border-gray-600 hover:bg-gray-900 dark:hover:bg-gray-600 transition-all group text-white">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/10 text-white rounded-xl"><DollarSign size={24} /></div>
                <span className="text-xs font-bold text-white/50 bg-white/10 px-2 py-1 rounded">الخزينة</span>
             </div>
             <h3 className="text-2xl md:text-3xl font-bold mb-1">{netTreasury.toFixed(2)}</h3>
             <p className="text-xs text-gray-400">صافي (كاش - مصروف)</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mb-8">
          {/* Detailed Category Sales */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2"><PieChart size={20} className="text-gray-400" />صافي المبيعات حسب التصنيف</h3>
              </div>
              <div className="p-2 md:p-4">
                <div className="space-y-2 md:space-y-3">
                    {Object.entries(categoryStats).map(([cat, stats]) => {
                        const percentage = issuedSales > 0 ? (stats.total / issuedSales) * 100 : 0;
                        if (stats.total === 0) return null;

                        return (
                            <div key={cat} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
                                <div 
                                    className="p-3 md:p-4 flex items-center justify-between cursor-pointer bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => handleCategoryClick(cat)}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300">
                                            <Layers size={18} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 dark:text-white text-sm md:text-base">{cat}</div>
                                            <div className="text-xs text-gray-400">{stats.count} قطعة مباعة</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold text-gray-800 dark:text-white text-sm md:text-base">{stats.total.toFixed(2)} ج.م</div>
                                            <div className="text-xs text-primary font-medium">{percentage.toFixed(1)}%</div>
                                        </div>
                                        <ArrowUpRight size={16} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {Object.values(categoryStats).every(s => s.total === 0) && (
                        <div className="text-center py-8 text-gray-400">لا توجد مبيعات في هذه الفترة</div>
                    )}
                </div>
              </div>
          </div>

          {/* Quick Summary / Charts Placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-fit">
               <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-6">ملخص التوزيع</h3>
               <div className="space-y-6">
                   {Object.entries(categoryStats).map(([cat, stats]) => {
                       const percentage = issuedSales > 0 ? (stats.total / issuedSales) * 100 : 0;
                       if (stats.total === 0) return null;
                       return (
                           <div key={cat}>
                               <div className="flex justify-between text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">
                                   <span>{cat}</span>
                                   <span>{percentage.toFixed(0)}%</span>
                               </div>
                               <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                   <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                               </div>
                           </div>
                       )
                   })}
               </div>
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700"><h3 className="font-bold text-lg text-gray-800 dark:text-white">سجل الفواتير</h3></div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm font-medium">
              <tr>
                <th className="px-6 py-4">الفاتورة</th>
                <th onClick={() => requestSort('customerName')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-1">العميل <SortIcon columnKey="customerName" /></div>
                </th>
                <th onClick={() => requestSort('date')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-1">التاريخ <SortIcon columnKey="date" /></div>
                </th>
                <th onClick={() => requestSort('total')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-1">الإجمالي <SortIcon columnKey="total" /></div>
                </th>
                <th className="px-6 py-4">الحالة / إجراءات</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedTrans.map((t) => {
                const paid = getPaidAmount(t);
                const isCollection = t.type === 'collection';
                
                return (
                <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isCollection ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <td className="px-6 py-4"><button onClick={() => setSelectedTransaction(t)} className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-mono">#{t.id.slice(-6)}</button></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2">{t.customerName ? <><User size={16} className="text-gray-400" /><span className="font-medium">{t.customerName}</span></> : <span className="text-gray-400 text-sm">عميل نقدي</span>}</div></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300"><div className="flex items-center gap-2"><Clock size={16} className="text-gray-400" />{new Date(t.date).toLocaleDateString('ar-EG')}</div></td>
                  <td className="px-6 py-4 font-bold text-primary">{t.total.toFixed(2)} ج.م</td>
                  <td className="px-6 py-4">
                    {isCollection ? (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full w-fit">
                            <RefreshCw size={12} />
                            تحصيل نقدية
                        </div>
                    ) : t.paymentMethod === 'credit' ? (
                        <div className="flex flex-col items-start gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${t.isPaid ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : (paid > 0 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400')}`}>
                                <CreditCard size={12} />
                                {t.isPaid ? 'آجل (محصل)' : (paid > 0 ? 'آجل (سداد جزئي)' : 'آجل (مستحق)')}
                            </span>
                            {!t.isPaid && <button onClick={(e) => handleQuickCollect(e, t)} className="text-xs px-2 py-1 rounded border transition-colors bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400">تحصيل دفعة</button>}
                        </div>
                    ) : <span className={`px-3 py-1 rounded-full text-xs font-bold ${getMethodStyle(t.paymentMethod)}`}>{getMethodLabel(t.paymentMethod)}</span>}
                  </td>
                  <td className="px-6 py-4">
                      {hasPermission('reports.delete_transaction') && (
                          <button 
                            onClick={(e) => handleDeleteTransaction(e, t.id)}
                            className="p-2 rounded-lg transition-colors text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50"
                            title="حذف"
                          >
                              <Trash2 size={16} />
                          </button>
                      )}
                  </td>
                </tr>
              )})}
              {sortedTrans.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">لا توجد عمليات بيع في هذه الفترة</td></tr>}
            </tbody>
          </table>
          </div>

          {/* Mobile List (Cards) */}
          <div className="md:hidden p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
            {filteredTrans.map((t) => {
                const paid = getPaidAmount(t);
                const isCollection = t.type === 'collection';
                
                return (
                <div key={t.id} className={`bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${isCollection ? 'border-l-4 border-l-blue-500' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                        <button onClick={() => setSelectedTransaction(t)} className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono text-left">
                        #{t.id.slice(-6)}
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <Clock size={12} /> {new Date(t.date).toLocaleString('ar-EG')}
                        </span>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-gray-800 dark:text-white">{t.total.toFixed(2)}</div>
                        {isCollection ? (
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">تحصيل</span>
                        ) : (
                            <span className={`text-xs px-2 py-0.5 rounded ${t.isPaid ? 'bg-green-100 text-green-700' : (t.paymentMethod === 'credit' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}`}>
                                {t.paymentMethod === 'credit' ? (t.isPaid ? 'مدفوع' : 'آجل') : getMethodLabel(t.paymentMethod)}
                            </span>
                        )}
                    </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <User size={14} />
                        <span className="truncate max-w-[150px]">{t.customerName || 'عميل نقدي'}</span>
                    </div>
                    
                    <div className="flex gap-2">
                        {!t.isPaid && t.paymentMethod === 'credit' && !isCollection && (
                            <button onClick={(e) => handleQuickCollect(e, t)} className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-200">
                                <DollarSign size={16} />
                            </button>
                        )}
                        {hasPermission('reports.delete_transaction') && (
                            <button onClick={(e) => handleDeleteTransaction(e, t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-200">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    </div>
                </div>
                );
            })}
            {sortedTrans.length === 0 && <div className="text-center py-8 text-gray-400">لا توجد عمليات بيع في هذه الفترة</div>}
          </div>
      </div>

      {selectedTransaction && (
          <TransactionDetailsModal 
              transaction={selectedTransaction} 
              onClose={() => setSelectedTransaction(null)} 
              onSwitchTransaction={handleSwitchTransaction}
          />
      )}

      {/* Category Details Modal */}
      {selectedCategoryDetails && categoryStats[selectedCategoryDetails] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
              <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
                      <div>
                          <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
                              <Layers size={24} className="text-primary"/>
                              تقرير تصنيف: {selectedCategoryDetails}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              إجمالي المبيعات: <span className="font-bold text-primary">{categoryStats[selectedCategoryDetails].total.toFixed(2)} ج.م</span>
                          </p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => printCategoryReport(selectedCategoryDetails)} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm transition-colors">
                              <Printer size={16} /> طباعة الكشف
                          </button>
                          <button onClick={() => setSelectedCategoryDetails(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                              <X size={20} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-0">
                      <table className="w-full text-right text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="p-4 font-bold">المنتج</th>
                                  <th className="p-4 font-bold text-center">الكمية / صافي المقاس</th>
                                  <th className="p-4 font-bold text-left">إجمالي الإيراد</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                              {Object.entries(categoryStats[selectedCategoryDetails].products).map(([prodKey, pStat]) => (
                                  <tr key={prodKey} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                      <td className="p-4 align-top">
                                          <div className="font-bold text-gray-800 dark:text-white text-base">{prodKey.split('__')[0]}</div>
                                          {/* Detailed Breakdown */}
                                          {pStat.breakdown.length > 0 && (
                                              <div className="mt-2 space-y-1">
                                                  {pStat.breakdown.map((b, idx) => {
                                                      if (b.label === 'قياسي') return null; // Skip if regular item
                                                      return (
                                                          <div key={idx} className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 w-fit px-2 py-1 rounded border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                                              <Box size={10}/>
                                                              <span>{b.count} قطع</span>
                                                              <span className="font-mono text-gray-400">({b.label})</span>
                                                          </div>
                                                      )
                                                  })}
                                              </div>
                                          )}
                                      </td>
                                      <td className="p-4 text-center align-middle">
                                          <div className="font-bold text-lg text-gray-700 dark:text-gray-200">{pStat.qty} قطعة</div>
                                          {pStat.totalArea > 0 && (
                                              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full w-fit mx-auto border border-blue-100 dark:border-blue-800 flex items-center justify-center gap-1">
                                                  <Ruler size={12}/>
                                                  صافي: {pStat.totalArea.toFixed(2)} متر
                                              </div>
                                          )}
                                      </td>
                                      <td className="p-4 text-left font-bold text-gray-900 dark:text-white text-lg align-middle">
                                          {pStat.total.toFixed(2)} ج.م
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
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
                            onClick={() => setTransactionToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            onClick={confirmDeleteTransaction}
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

export default ReportsView;
