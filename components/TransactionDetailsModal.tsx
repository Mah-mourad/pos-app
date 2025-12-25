
import React, { useState } from 'react';
import { X, Printer, ShoppingBag, User, CreditCard, Calendar, Check, Clock, DollarSign, ArrowUpRight } from 'lucide-react';
import { Transaction, PaymentMethod } from '../types';
import { usePOS } from '../context/POSContext';
import PaymentModal from './PaymentModal';

interface TransactionDetailsModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSwitchTransaction?: (transactionId: string) => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ transaction, onClose, onSwitchTransaction }) => {
  const { addPaymentToTransaction, printReceipt } = usePOS();
  
  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const getMethodLabel = (method: string) => {
    switch(method) {
        case 'cash': return 'كاش';
        case 'vodafone_cash': return 'فودافون كاش';
        case 'credit': return 'آجل';
        default: return method;
    }
  };

  const getPaidAmount = () => transaction.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remaining = transaction.total - getPaidAmount();
  const currentPaid = getPaidAmount();

  const handleCollectClick = () => {
     setPaymentModalOpen(true);
  };

  const handlePaymentConfirm = (amount: number, method: PaymentMethod) => {
     addPaymentToTransaction(transaction.id, amount, method);
     setPaymentModalOpen(false);
     onClose(); 
  };

  const handlePrint = () => {
      printReceipt(transaction);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
       <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 transition-colors flex flex-col max-h-[90vh]">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
              <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {transaction.type === 'collection' ? 'إيصال تحصيل نقدية' : `تفاصيل الفاتورة #${transaction.id.slice(-6)}`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(transaction.date).toLocaleString('ar-EG')}</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm transition-colors border border-gray-100 dark:border-gray-700">
                  <X size={20} />
              </button>
          </div>
          
          <div className="p-4 md:p-5 overflow-y-auto bg-white dark:bg-gray-800 flex-1">
               {/* Meta Data */}
               <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                   <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                       <span className="text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1 text-xs"><User size={12}/> العميل</span>
                       <span className="font-bold text-gray-900 dark:text-white truncate block">{transaction.customerName || 'عميل نقدي'}</span>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                       <span className="text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1 text-xs"><CreditCard size={12}/> طريقة الدفع</span>
                       <span className="font-bold text-gray-900 dark:text-white truncate block">{getMethodLabel(transaction.paymentMethod)}</span>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                       <span className="text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1 text-xs"><Calendar size={12}/> التاريخ</span>
                       <span className="font-bold text-gray-900 dark:text-white truncate block">{new Date(transaction.date).toLocaleDateString('ar-EG')}</span>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                       <span className="text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1 text-xs"><Clock size={12}/> التوقيت</span>
                       <span className="font-bold text-gray-900 dark:text-white truncate block">{new Date(transaction.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
               </div>
               
               {/* If Collection, show View Original Button */}
               {transaction.type === 'collection' && transaction.relatedTransactionId && onSwitchTransaction && (
                   <button 
                     onClick={() => onSwitchTransaction(transaction.relatedTransactionId!)}
                     className="w-full mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800 font-bold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                   >
                       <ArrowUpRight size={18} />
                       عرض الفاتورة الأصلية (الآجل)
                   </button>
               )}

               {/* Items List */}
               <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                   <ShoppingBag size={18} className="text-gray-500" />
                   المنتجات / البيان
               </h4>
               <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-6 shadow-sm">
                   <table className="w-full text-right text-sm">
                       <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                           <tr>
                               <th className="p-3 font-bold">الصنف</th>
                               <th className="p-3 text-center font-bold">الكمية</th>
                               <th className="p-3 font-bold">السعر</th>
                               <th className="p-3 font-bold">المجموع</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                           {transaction.items?.map((item, idx) => (
                               <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                   <td className="p-3 font-medium text-gray-900 dark:text-white">
                                       <div>{item.name}</div>
                                       {item.pricingMethod === 'area' && item.dimensions && (
                                           <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{`صافي: ${item.dimensions.width} × ${item.dimensions.height} م`}</div>
                                       )}
                                       {item.wasted && (
                                           <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">{`هادر: ${item.wasted.width} × ${item.wasted.height} م`}</div>
                                       )}
                                       {item.selectedServices && item.selectedServices.length > 0 && (
                                           <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{`خدمات: ${item.selectedServices.map(s => s.name).join(', ')}`}</div>
                                       )}
                                   </td>
                                   <td className="p-3 text-center text-gray-900 dark:text-white">{item.quantity}</td>
                                   <td className="p-3 text-gray-900 dark:text-white">{item.finalPrice?.toFixed ? item.finalPrice.toFixed(2) : item.price.toFixed(2)}</td>
                                   <td className="p-3 font-bold text-gray-900 dark:text-white">{((item.finalPrice || item.price) * item.quantity).toFixed(2)}</td>
                               </tr>
                           ))}
                           {(!transaction.items || transaction.items.length === 0) && (
                               <tr><td colSpan={4} className="p-6 text-center text-gray-400 dark:text-gray-500">لا توجد عناصر</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>

               {/* Payment History if Credit (Original Invoice) */}
               {transaction.paymentMethod === 'credit' && transaction.type !== 'collection' && (transaction.payments && transaction.payments.length > 0) && (
                   <div className="mb-4 animate-in slide-in-from-bottom-2">
                       <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                           <DollarSign size={18} className="text-gray-500" />
                           سجل المدفوعات (التحصيل)
                       </h4>
                       <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                           <table className="w-full text-right text-sm">
                               <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                   <tr>
                                       <th className="p-3 font-bold">التاريخ</th>
                                       <th className="p-3 font-bold">الطريقة</th>
                                       <th className="p-3 font-bold">المبلغ</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                   {transaction.payments.map((p, idx) => (
                                       <tr key={idx}>
                                           <td className="p-3 text-gray-900 dark:text-white">
                                               <div>{new Date(p.date).toLocaleDateString('ar-EG')}</div>
                                           </td>
                                           <td className="p-3 text-gray-900 dark:text-white">{getMethodLabel(p.method)}</td>
                                           <td className="p-3 font-bold text-green-600 dark:text-green-400">{p.amount.toFixed(2)}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </div>
               )}
          </div>

          <div className="p-4 md:p-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-4 shrink-0">
              <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">الإجمالي الكلي</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{transaction.total.toFixed(2)} ج.م</span>
                  </div>
                  {transaction.paymentMethod === 'credit' && transaction.type !== 'collection' && (
                      <>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">المدفوع</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{currentPaid.toFixed(2)} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                            <span className="text-gray-900 dark:text-white font-bold">المتبقي</span>
                            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{remaining.toFixed(2)} ج.م</span>
                        </div>
                      </>
                  )}
              </div>
              
              <div className="flex gap-2">
                 {/* Collect Button for unpaid credit transactions */}
                 {transaction.paymentMethod === 'credit' && !transaction.isPaid && transaction.type !== 'collection' && (
                     <button 
                        onClick={handleCollectClick}
                        className="flex-1 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 dark:shadow-none"
                     >
                         <DollarSign size={18} />
                         تحصيل
                     </button>
                 )}

                 <button 
                    onClick={handlePrint}
                    className="flex-1 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                 >
                     <Printer size={18} />
                     طباعة
                 </button>
              </div>
          </div>
       </div>

       {paymentModalOpen && (
        <PaymentModal 
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onConfirm={handlePaymentConfirm}
          totalAmount={transaction.total}
          remainingAmount={remaining}
        />
       )}
    </div>
  );
};

export default TransactionDetailsModal;
