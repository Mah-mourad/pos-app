// import React, { useState } from 'react';
// import {
//   Trash2, ShoppingCart, Plus, Minus, Coffee, Banknote, Smartphone,
//   CreditCard, User, Search, X, Settings, Ruler, Save, Printer,
//   DollarSign, ChevronDown
// } from 'lucide-react';

// import { usePOS } from '../context/POSContext';
// import { PaymentMethod, Customer } from '../types';
// import { createTransaction } from '../services/transactions.service';

// interface CartSidebarProps {
//   onClose?: () => void;
// }

// const CartSidebar: React.FC<CartSidebarProps> = ({ onClose }) => {
//   const {
//     cart,
//     removeFromCart,
//     updateQuantity,
//     setQuantity,
//     updateCartItemDimensions,
//     toggleServiceForCartItem,
//     totalAmount,
//     customers,
//     addCustomer,
//     printReceipt,
//     t
//   } = usePOS();

//   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
//   const [selectedCustomerId, setSelectedCustomerId] = useState('');
//   const [customerSearch, setCustomerSearch] = useState('');
//   const [downPayment, setDownPayment] = useState('');

//   const filteredCustomers = customers.filter(
//     c =>
//       c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
//       c.phone.includes(customerSearch)
//   );

//   const handleProcessTransaction = async (shouldPrint: boolean) => {
//     if (cart.length === 0) return;

//     try {
//       let finalCustomer: Customer | undefined;

//       if (selectedCustomerId) {
//         finalCustomer = customers.find(c => c.id === selectedCustomerId);
//       } else if (customerSearch.trim()) {
//         finalCustomer = addCustomer({ name: customerSearch, phone: '' });
//       }

//       if (paymentMethod === 'credit' && !finalCustomer) {
//         alert(t('selectCustomer'));
//         return;
//       }

//       const payload = {
//   id: Date.now().toString(),          // لأن id عندك text
//   itemsCount: cart.reduce((sum, i) => sum + i.quantity, 0),
//   total: totalAmount,
//   paymentMethod,

//   // أهم سطرين 👇
//   customerId: finalCustomer?.id ?? null,
//   customerName: finalCustomer?.name ?? 'ضيف',

//   items: cart,

//   payments:
//     paymentMethod === 'credit'
//       ? [
//           {
//             method: 'down_payment',
//             amount: parseFloat(downPayment) || 0
//           }
//         ]
//       : [
//           {
//             method: paymentMethod,
//             amount: totalAmount
//           }
//         ],

//   isPaid: paymentMethod !== 'credit',
//   type: 'sale'
// };

//       const savedTransaction = await createTransaction(payload);

//       if (shouldPrint) {
//         printReceipt(savedTransaction);
//       }

//       // Reset
//       setSelectedCustomerId('');
//       setCustomerSearch('');
//       setPaymentMethod('cash');
//       setDownPayment('');

//       if (onClose) onClose();

//       alert('تم حفظ العملية بنجاح');

//     } catch (error) {
//       console.error('Transaction Error:', error);
//       alert('حصل خطأ أثناء حفظ العملية');
//     }
//   };

//   const remainingDebt = totalAmount - (parseFloat(downPayment) || 0);

//   return (
//     <div className="w-full md:w-[400px] bg-card dark:bg-gray-800 h-full flex flex-col shadow-xl z-30 border-r border-gray-100 dark:border-gray-700 relative">
      
//       {/* Header */}
//       <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-900/50">
//         <div>
//           <div className="flex items-center gap-2 mb-1">
//             <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
//               {t('newInvoice')}
//             </h2>
//             <span className="bg-red-100 dark:bg-red-900/50 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
//               {cart.reduce((a, i) => a + i.quantity, 0)} {t('item')}
//             </span>
//           </div>
//           <div className="text-xs text-gray-400">
//             #{Date.now().toString().slice(-6)}
//           </div>
//         </div>

//         {onClose && (
//           <button
//             onClick={onClose}
//             className="md:hidden p-2 bg-gray-200 dark:bg-gray-700 rounded-full"
//           >
//             <ChevronDown size={24} />
//           </button>
//         )}
//       </div>

//       {/* Cart Items */}
//       <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/20">
//         {cart.length === 0 ? (
//           <div className="h-full flex flex-col items-center justify-center text-gray-300">
//             <ShoppingCart size={48} className="mb-4 opacity-50" />
//             <p>{t('emptyCart')}</p>
//             <p className="text-sm">{t('addItems')}</p>
//           </div>
//         ) : (
//           cart.map((item, index) => (
//             <div
//               key={`${item.id}-${index}`}
//               className="flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border shadow-sm"
//             >
//               <div className="flex items-start gap-3">
//                 <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
//                   <Coffee size={18} />
//                 </div>

//                 <div className="flex-1">
//                   <h4 className="font-bold text-sm">{item.name}</h4>
//                   <div className="text-xs text-gray-500">
//                     {item.price.toFixed(2)}
//                   </div>
//                 </div>

//                 <div className="flex flex-col items-end gap-2">
//                   <div className="font-bold text-primary">
//                     {(item.finalPrice * item.quantity).toFixed(2)}
//                   </div>

//                   <div className="flex items-center gap-1">
//                     <button onClick={() => updateQuantity(index, -1)}>
//                       <Minus size={14} />
//                     </button>

//                     <input
//                       type="number"
//                       value={item.quantity}
//                       className="w-8 text-center"
//                       onChange={e =>
//                         setQuantity(index, parseInt(e.target.value) || 1)
//                       }
//                     />

//                     <button onClick={() => updateQuantity(index, 1)}>
//                       <Plus size={14} />
//                     </button>

//                     <button onClick={() => removeFromCart(item.id, index)}>
//                       <Trash2 size={16} />
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               {item.pricingMethod === 'area' && item.dimensions && (
//                 <div className="flex gap-2">
//                   <Ruler size={14} />
//                   <input
//                     type="number"
//                     value={item.dimensions.width}
//                     onChange={e =>
//                       updateCartItemDimensions(
//                         index,
//                         parseFloat(e.target.value),
//                         item.dimensions.height
//                       )
//                     }
//                   />
//                   ×
//                   <input
//                     type="number"
//                     value={item.dimensions.height}
//                     onChange={e =>
//                       updateCartItemDimensions(
//                         index,
//                         item.dimensions.width,
//                         parseFloat(e.target.value)
//                       )
//                     }
//                   />
//                 </div>
//               )}

//               {item.services && item.services.length > 0 && (
//                 <div className="pt-2 border-t">
//                   {item.services.map(service => (
//                     <button
//                       key={service.id}
//                       onClick={() =>
//                         toggleServiceForCartItem(index, service)
//                       }
//                       className="text-xs px-2 py-1 border rounded mr-1"
//                     >
//                       {service.name} ({service.price})
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </div>
//           ))
//         )}
//       </div>

//       {/* Footer */}
//       <div className="p-4 border-t bg-white dark:bg-gray-800">
//         <div className="mb-4">
//           <label className="text-xs font-bold">{t('paymentMethod')}</label>
//           <div className="grid grid-cols-3 gap-2 mt-2">
//             <button onClick={() => setPaymentMethod('cash')}>
//               <Banknote size={18} />
//             </button>
//             <button onClick={() => setPaymentMethod('vodafone_cash')}>
//               <Smartphone size={18} />
//             </button>
//             <button onClick={() => setPaymentMethod('credit')}>
//               <CreditCard size={18} />
//             </button>
//           </div>
//         </div>

//         {paymentMethod === 'credit' && (
//           <div className="mb-3">
//             <input
//               type="number"
//               value={downPayment}
//               onChange={e => setDownPayment(e.target.value)}
//               placeholder={t('downPayment')}
//               className="w-full border p-2 rounded"
//             />
//             <div className="text-xs text-red-500">
//               {t('remaining')}: {remainingDebt.toFixed(2)}
//             </div>
//           </div>
//         )}

//         <div className="flex justify-between text-xl font-bold mb-4">
//           <span>{t('total')}</span>
//           <span className="text-primary">{totalAmount.toFixed(2)}</span>
//         </div>

//         <div className="grid grid-cols-2 gap-3">
//           <button
//             onClick={() => handleProcessTransaction(false)}
//             className="bg-gray-800 text-white py-3 rounded-xl flex items-center justify-center gap-2"
//           >
//             <Save size={18} /> {t('saveOnly')}
//           </button>

//           <button
//             onClick={() => handleProcessTransaction(true)}
//             className="bg-primary text-white py-3 rounded-xl flex items-center justify-center gap-2"
//           >
//             <Printer size={18} /> {t('saveAndPrint')}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CartSidebar;




import React, { useState } from 'react';
import {
  Trash2,
  ShoppingCart,
  Plus,
  Minus,
  Coffee,
  Banknote,
  Smartphone,
  CreditCard,
  User,
  Search,
  X,
  Settings,
  Ruler,
  Save,
  Printer,
  DollarSign,
  ChevronDown
} from 'lucide-react';

import { usePOS } from '../context/POSContext';
import { PaymentMethod, Customer } from '../types';
import { createTransaction } from '../services/transactions.service';

interface CartSidebarProps {
  onClose?: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ onClose }) => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    setQuantity,
    updateCartItemDimensions,
    toggleServiceForCartItem,
    totalAmount,
    customers,
    addCustomer,
    printReceipt,
    t
  } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [downPayment, setDownPayment] = useState('');

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const handleProcessTransaction = async (shouldPrint: boolean) => {
    if (cart.length === 0) return;

    try {
      let finalCustomer: Customer | undefined;

      if (selectedCustomerId) {
        finalCustomer = customers.find(c => c.id === selectedCustomerId);
      } else if (customerSearch.trim()) {
        finalCustomer = addCustomer({
          name: customerSearch,
          phone: ''
        });
      }

      if (paymentMethod === 'credit' && !finalCustomer) {
        alert(t('selectCustomer'));
        return;
      }

      const payload = {
        id: Date.now().toString(), // لأن id عندك text
        itemsCount: cart.reduce((sum, i) => sum + i.quantity, 0),
        total: totalAmount,
        paymentMethod,

        // ربط الفاتورة بالعميل
        customerId: finalCustomer?.id ?? null,
        customerName: finalCustomer?.name ?? 'ضيف',

        items: cart,

        payments:
          paymentMethod === 'credit'
            ? [
                {
                  method: 'down_payment',
                  amount: parseFloat(downPayment) || 0
                }
              ]
            : [
                {
                  method: paymentMethod,
                  amount: totalAmount
                }
              ],

        isPaid: paymentMethod !== 'credit',
        type: 'sale'
      };

      const savedTransaction = await createTransaction(payload);

      if (shouldPrint) {
        printReceipt(savedTransaction);
      }

      // Reset
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
      
      {/* Header */}
      <div className="p-4 md:p-6 border-b flex justify-between items-start bg-gray-50 dark:bg-gray-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold">{t('newInvoice')}</h2>
            <span className="bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold">
              {cart.reduce((a, i) => a + i.quantity, 0)} {t('item')}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            #{Date.now().toString().slice(-6)}
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 rounded-full">
            <ChevronDown size={24} />
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <ShoppingCart size={48} className="mb-4 opacity-50" />
            <p>{t('emptyCart')}</p>
            <p className="text-sm">{t('addItems')}</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div key={`${item.id}-${index}`} className="p-3 rounded-xl bg-white dark:bg-gray-800 border">
              <div className="flex gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
                  <Coffee size={18} />
                </div>

                <div className="flex-1">
                  <h4 className="font-bold text-sm">{item.name}</h4>
                  <div className="text-xs text-gray-500">{item.price.toFixed(2)}</div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="font-bold text-primary">
                    {(item.finalPrice * item.quantity).toFixed(2)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(index, -1)}><Minus size={14} /></button>
                    <input
                      type="number"
                      value={item.quantity}
                      className="w-8 text-center"
                      onChange={e => setQuantity(index, parseInt(e.target.value) || 1)}
                    />
                    <button onClick={() => updateQuantity(index, 1)}><Plus size={14} /></button>
                    <button onClick={() => removeFromCart(item.id, index)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>

              {item.pricingMethod === 'area' && item.dimensions && (
                <div className="flex gap-2 mt-2 items-center">
                  <Ruler size={14} />
                  <input
                    type="number"
                    value={item.dimensions.width}
                    onChange={e =>
                      updateCartItemDimensions(index, parseFloat(e.target.value), item.dimensions.height)
                    }
                  />
                  ×
                  <input
                    type="number"
                    value={item.dimensions.height}
                    onChange={e =>
                      updateCartItemDimensions(index, item.dimensions.width, parseFloat(e.target.value))
                    }
                  />
                </div>
              )}

              {item.services?.length > 0 && (
                <div className="pt-2 border-t mt-2">
                  {item.services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => toggleServiceForCartItem(index, service)}
                      className="text-xs px-2 py-1 border rounded mr-1"
                    >
                      {service.name} ({service.price})
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-white dark:bg-gray-800">

        {/* Payment */}
        <div className="mb-3">
          <label className="text-xs font-bold">{t('paymentMethod')}</label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <button onClick={() => setPaymentMethod('cash')}><Banknote size={18} /></button>
            <button onClick={() => setPaymentMethod('vodafone_cash')}><Smartphone size={18} /></button>
            <button onClick={() => setPaymentMethod('credit')}><CreditCard size={18} /></button>
          </div>
        </div>

        {paymentMethod === 'credit' && (
          <div className="mb-3">
            <input
              type="number"
              value={downPayment}
              onChange={e => setDownPayment(e.target.value)}
              placeholder={t('downPayment')}
              className="w-full border p-2 rounded"
            />
            <div className="text-xs text-red-500">
              {t('remaining')}: {remainingDebt.toFixed(2)}
            </div>
          </div>
        )}

        {/* Customer */}
        <div className="mb-4">
          <label className="text-xs font-bold">{t('selectCustomer')}</label>
          <div className="relative mt-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value);
                setSelectedCustomerId('');
              }}
              className="w-full border rounded-lg py-2 pl-3 pr-8 text-sm"
              placeholder={t('searchCustomer')}
            />

            {customerSearch && (
              <div className="absolute bottom-full mb-1 w-full bg-white border rounded-lg shadow max-h-40 overflow-y-auto z-20">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch(c.name);
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-sm flex gap-2 items-center"
                    >
                      <User size={14} />
                      {c.name}
                    </div>
                  ))
                ) : (
                  <div
                    className="p-2 text-sm text-blue-600 cursor-pointer"
                    onClick={() => {
                      const newCustomer = addCustomer({ name: customerSearch, phone: '' });
                      setSelectedCustomerId(newCustomer.id);
                      setCustomerSearch(newCustomer.name);
                    }}
                  >
                    إضافة عميل جديد: {customerSearch}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between text-xl font-bold mb-4">
          <span>{t('total')}</span>
          <span className="text-primary">{totalAmount.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleProcessTransaction(false)} className="bg-gray-800 text-white py-3 rounded-xl flex gap-2 justify-center">
            <Save size={18} /> {t('saveOnly')}
          </button>

          <button onClick={() => handleProcessTransaction(true)} className="bg-primary text-white py-3 rounded-xl flex gap-2 justify-center">
            <Printer size={18} /> {t('saveAndPrint')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartSidebar;
