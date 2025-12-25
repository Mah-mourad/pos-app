
import React, { useState } from 'react';
import { Trash2, ShoppingCart, Plus, Minus, Coffee, Banknote, Smartphone, CreditCard, User, Search, X, Settings, Ruler, Save, Printer, DollarSign, ChevronDown, Scissors } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { PaymentMethod, Customer } from '../types';
import { createTransaction } from '../handle_tool/transactions.service';

interface CartSidebarProps {
    onClose?: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ onClose }) => {
  const { cart, removeFromCart, updateQuantity, setQuantity, updateCartItemDimensions, toggleServiceForCartItem, totalAmount, completeTransaction, customers, addCustomer, printReceipt, t } = usePOS();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [downPayment, setDownPayment] = useState<string>('');

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch));

  // const handleProcessTransaction = (shouldPrint: boolean) => {
  //   if (cart.length === 0) return;
  //   let finalCustomer: Customer | undefined;
  //   if (selectedCustomerId) { finalCustomer = customers.find(c => c.id === selectedCustomerId); }
  //   else if (customerSearch.trim()) { finalCustomer = addCustomer({ name: customerSearch, phone: '' }); }

  //   if (paymentMethod === 'credit' && !finalCustomer) { alert(t('selectCustomer')); return; }

  //   const paidAmount = paymentMethod === 'credit' ? parseFloat(downPayment) || 0 : undefined;
  //   const transaction = completeTransaction(paymentMethod, finalCustomer, paidAmount);
  //   if (transaction && shouldPrint) { printReceipt(transaction); }
    
  //   setSelectedCustomerId(''); setCustomerSearch(''); setPaymentMethod('cash'); setDownPayment('');
  //   if (onClose) onClose();
  // };
  
  const handleProcessTransaction = async (shouldPrint: boolean) => {
  if (cart.length === 0) return;

  try {
    let finalCustomer: Customer | undefined;

    if (selectedCustomerId) {
      finalCustomer = customers.find(c => c.id === selectedCustomerId);
    } else if (customerSearch.trim()) {
      finalCustomer = addCustomer({ name: customerSearch, phone: '' });
    }

    if (paymentMethod === 'credit' && !finalCustomer) {
      alert(t('selectCustomer'));
      return;
    }

    const payload = {
      itemsCount: cart.reduce((sum, i) => sum + i.quantity, 0),
      total: totalAmount,
      paymentMethod,
      customerId: finalCustomer?.id || 'guest',
      customerName: finalCustomer?.name || 'Guest',
      items: cart,
      payments: paymentMethod === 'credit'
        ? [{
            method: 'down_payment',
            amount: parseFloat(downPayment) || 0
          }]
        : [],
      isPaid: paymentMethod !== 'credit',
      type: 'sale',
      relatedTransac: null
    };

    const savedTransaction = await createTransaction(payload);

    // طباعة
    if (shouldPrint) {
      printReceipt(savedTransaction);
    }

    // تنظيف
    setSelectedCustomerId('');
    setCustomerSearch('');
    setPaymentMethod('cash');
    setDownPayment('');

    if (onClose) onClose();

    alert('تم حفظ العملية بنجاح');

  } catch (error) {
    console.error('Transaction Error:', error);
    alert('حصل خطأ أثناء حفظ العملية');
  }
};


  const remainingDebt = totalAmount - (parseFloat(downPayment) || 0);

  return (
    <div className="w-full md:w-[400px] bg-card dark:bg-gray-800 h-full flex flex-col shadow-xl z-30 border-r border-gray-100 dark:border-gray-700 relative">
      <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-900/50">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">{t('newInvoice')}</h2>
                <span className="bg-red-100 dark:bg-red-900/50 text-primary dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">{cart.reduce((acc, item) => acc + item.quantity, 0)} {t('item')}</span>
            </div>
            <div className="text-xs text-gray-400">#{Date.now().toString().slice(-6)}</div>
        </div>
        {onClose && (
            <button onClick={onClose} className="md:hidden p-2 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-300">
                <ChevronDown size={24} />
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/20">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
            <ShoppingCart size={48} className="mb-4 opacity-50" />
            <p>{t('emptyCart')}</p>
            <p className="text-sm">{t('addItems')}</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0 mt-1"><Coffee size={18} /></div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 dark:text-white text-sm leading-tight">{item.name}</h4>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.pricingMethod === 'area' ? <span className="text-blue-600 dark:text-blue-400 font-medium">({item.price.toFixed(2)}/م²)</span> : <div>{item.price.toFixed(2)}</div>}
                      </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-primary font-bold text-sm">{(item.finalPrice * item.quantity).toFixed(2)}</div>
                    <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 border border-gray-200 dark:border-gray-600">
                            <button onClick={() => updateQuantity(index, -1)} className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-gray-600 shadow-sm text-gray-600 dark:text-gray-200 active:scale-90"><Minus size={14} /></button>
                            <input type="number" min="1" className="w-8 text-center text-sm font-bold outline-none bg-transparent p-0 appearance-none m-0 dark:text-white" value={item.quantity} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val > 0) setQuantity(index, val); }} onClick={(e) => e.currentTarget.select()} />
                            <button onClick={() => updateQuantity(index, 1)} className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-gray-600 shadow-sm text-gray-600 dark:text-gray-200 active:scale-90"><Plus size={14} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id, index)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
              </div>
              {item.pricingMethod === 'area' && item.dimensions && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-2 flex gap-2 items-center border border-blue-100 dark:border-blue-900 mt-1">
                      <div className="flex items-center gap-1 text-blue-400"><Ruler size={14} /></div>
                      <div className="flex-1 flex gap-2">
                          <div className="flex-1"><label className="text-[10px] text-gray-400 block mb-0.5">{t('width')}</label><input type="number" step="0.01" className="w-full text-xs p-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 dark:text-white outline-none focus:border-blue-500 text-center font-bold" value={item.dimensions.width} onChange={(e) => { const w = parseFloat(e.target.value); if (!isNaN(w)) updateCartItemDimensions(index, w, item.dimensions?.height || 0); }} onClick={(e) => e.currentTarget.select()} /></div>
                          <div className="flex items-center text-gray-400">×</div>
                          <div className="flex-1"><label className="text-[10px] text-gray-400 block mb-0.5">{t('height')}</label><input type="number" step="0.01" className="w-full text-xs p-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 dark:text-white outline-none focus:border-blue-500 text-center font-bold" value={item.dimensions.height} onChange={(e) => { const h = parseFloat(e.target.value); if (!isNaN(h)) updateCartItemDimensions(index, item.dimensions?.width || 0, h); }} onClick={(e) => e.currentTarget.select()} /></div>
                      </div>
                  </div>
              )}
                {item.wasted && (
                  <div className="bg-orange-50/50 dark:bg-orange-900/20 rounded-lg p-2 text-xs text-orange-600 dark:text-orange-400 font-medium border border-orange-100 dark:border-orange-900 mt-1">
                      {`+ هادر: ${item.wasted.width}م × ${item.wasted.height}م`}
                  </div>
                )}
                {item.services && item.services.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 mb-1.5"><Settings size={10} /><span>{t('services')}:</span></div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.services.map(service => {
                      const isSelected = !!item.selectedServices.find(s => s.id === service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleServiceForCartItem(index, service)}
                          className={`text-[10px] px-2 py-1 rounded border transition-all flex items-center gap-2 shadow-sm ${isSelected ? 'bg-purple-600 text-white border-purple-700' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                          <span className="font-medium">{service.name}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-gray-500'}`}>({service.price})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 md:p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <div className="mb-4">
             <label className="text-xs font-bold text-gray-400 mb-2 block">{t('paymentMethod')}</label>
             <div className="grid grid-cols-3 gap-2">
                 <button onClick={() => setPaymentMethod('cash')} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all gap-1 ${paymentMethod === 'cash' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><Banknote size={18} /><span className="text-xs font-bold">{t('cash')}</span></button>
                 <button onClick={() => setPaymentMethod('vodafone_cash')} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all gap-1 ${paymentMethod === 'vodafone_cash' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><Smartphone size={18} /><span className="text-xs font-bold">{t('vodafone')}</span></button>
                 <button onClick={() => setPaymentMethod('credit')} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all gap-1 ${paymentMethod === 'credit' ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><CreditCard size={18} /><span className="text-xs font-bold">{t('credit')}</span></button>
             </div>
        </div>
        
        {paymentMethod === 'credit' && (
            <div className="mb-4 animate-in slide-in-from-top-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl border border-yellow-100 dark:border-yellow-800">
                <label className="text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-2 block flex items-center gap-1"><DollarSign size={12} />{t('downPayment')}</label>
                <div className="flex gap-2 items-center mb-2"><input type="number" placeholder="Amount..." className="w-full p-2 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-white dark:bg-gray-900 focus:border-yellow-400 outline-none text-sm font-bold text-gray-700 dark:text-gray-200" value={downPayment} onChange={(e) => { const val = parseFloat(e.target.value); if (val > totalAmount) return; setDownPayment(e.target.value); }} /></div>
                <div className="flex justify-between items-center text-xs"><span className="text-gray-500 dark:text-gray-400">{t('remaining')}:</span><span className="font-bold text-red-600 dark:text-red-400">{Math.max(0, remainingDebt).toFixed(2)}</span></div>
            </div>
        )}

        <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 mb-2 block">{t('selectCustomer')}</label>
            <div className="relative">
                <div className="relative"><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg py-2 pl-8 pr-9 text-sm outline-none focus:border-primary dark:text-white ${paymentMethod === 'credit' && !selectedCustomerId && !customerSearch ? 'border-red-200 dark:border-red-900 focus:border-red-500' : 'border-gray-200 dark:border-gray-700'}`} placeholder={t('searchCustomer')} value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); }} />{customerSearch && (<button onClick={() => setCustomerSearch('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>)}</div>
                {customerSearch && !selectedCustomerId && (
                    <div className="absolute bottom-full mb-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (<div key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 text-sm border-b border-gray-50 dark:border-gray-700 last:border-none text-gray-800 dark:text-gray-200"><User size={14} className="text-gray-400" /><span>{c.name}</span></div>))
                        ) : (<div className="p-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 cursor-pointer">{t('addNewCustomer', {name: customerSearch})}</div>)}
                    </div>
                )}
            </div>
        </div>

        <div className="mb-4"><div className="flex justify-between text-2xl font-bold text-gray-800 dark:text-white"><span>{t('total')}</span><span className="text-primary">{totalAmount.toFixed(2)}</span></div></div>
        <div className="grid grid-cols-2 gap-3">
             <button onClick={() => handleProcessTransaction(false)} disabled={cart.length === 0} className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Save size={20} /><span>{t('saveOnly')}</span></button>
             <button onClick={() => handleProcessTransaction(true)} disabled={cart.length === 0} className="bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold shadow-md shadow-red-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Printer size={20} /><span>{t('saveAndPrint')}</span></button>
        </div>
      </div>
    </div>
  );
};

export default CartSidebar;