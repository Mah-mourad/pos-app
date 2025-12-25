
import React, { useState, useEffect } from 'react';
import { Check, X, Printer, Banknote, Smartphone, CreditCard, UserPlus, User } from 'lucide-react';
import { CartItem, PaymentMethod, Customer } from '../types';
import { usePOS } from '../context/POSContext';
import QRCode from 'qrcode';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm?: (method: PaymentMethod, customer?: Customer) => void;
  cart: CartItem[];
  mode?: 'full' | 'success_only';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, total, onConfirm, cart, mode = 'full' }) => {
  const [step, setStep] = useState<'payment' | 'success'>(mode === 'success_only' ? 'success' : 'payment');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [snapshotCart] = useState<CartItem[]>(cart);
  const { receiptSettings, customers, addCustomer } = usePOS();

  // Credit payment states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  useEffect(() => {
     if (isOpen && mode === 'success_only') {
         setStep('success');
     }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleProcess = () => {
    if (!selectedMethod || !onConfirm) return;
    
    let customer: Customer | undefined;
    
    if (selectedMethod === 'credit') {
        if (selectedCustomerId) {
            customer = customers.find(c => c.id === selectedCustomerId);
        } else if (newCustomerName) {
            customer = addCustomer({ name: newCustomerName, phone: newCustomerPhone });
        } else {
            alert('يرجى اختيار عميل أو إضافة عميل جديد للدفع الآجل');
            return;
        }
    }

    onConfirm(selectedMethod, customer);
    setStep('success');
  };

  const handleQuickAddCustomer = () => {
      if (newCustomerName) {
          const newCus = addCustomer({ name: newCustomerName, phone: newCustomerPhone });
          setSelectedCustomerId(newCus.id);
          setIsAddingCustomer(false);
          setNewCustomerName('');
          setNewCustomerPhone('');
      }
  };

  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(searchCustomer.toLowerCase()) || 
      c.phone.includes(searchCustomer)
  );

  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
    }

    const date = new Date().toLocaleString('ar-EG');
    const receiptId = Date.now().toString().slice(-6);

    const getSize = (size: string) => {
        switch(size) {
            case 'xs': return '10px';
            case 'sm': return '12px';
            case 'base': return '14px';
            case 'lg': return '18px';
            case 'xl': return '24px';
            case '2xl': return '30px';
            default: return '14px';
        }
    };

    const getImageSize = (size: string) => {
        switch(size) {
            case 'xs': return '40px';
            case 'sm': return '60px';
            case 'base': return '80px';
            case 'lg': return '100px';
            case 'xl': return '120px';
            case '2xl': return '150px';
            default: return '80px';
        }
    };

    const getAlign = (align: string) => {
        if (align === 'right') return 'right';
        if (align === 'left') return 'left';
        return 'center';
    };

    // Generate QR Code Data URL locally
    let qrImageBase64 = '';
    if (receiptSettings.showQr) {
        const qrData = `Store:${receiptSettings.storeName}|Date:${date}|Total:${total}`;
        try {
            qrImageBase64 = await QRCode.toDataURL(qrData, { width: 150, margin: 1 });
        } catch (err) {
            console.error('Failed to generate QR', err);
        }
    }

    const contentHtml = receiptSettings.layout.map(item => {
        if (!item.visible) return '';

        const style = `text-align: ${getAlign(item.align)}; font-size: ${getSize(item.fontSize)}; margin-bottom: 5px;`;

        switch(item.id) {
            case 'logo':
                return receiptSettings.logo 
                    ? `<div style="${style}"><img src="${receiptSettings.logo}" alt="Logo" style="max-height: ${getImageSize(item.fontSize)}; max-width: 100%; object-fit: contain; filter: grayscale(100%);" /></div>` 
                    : '';
            
            case 'storeName':
                return `<div style="${style} font-weight: bold;">${receiptSettings.storeName}</div>`;
            
            case 'address':
                return receiptSettings.address ? `<div style="${style}">${receiptSettings.address}</div>` : '';
            
            case 'contact':
                return receiptSettings.phone ? `<div style="${style}">${receiptSettings.phone}</div>` : '';
            
            case 'separator':
                return `<div style="border-bottom: 2px dashed #000; margin: 10px 0;"></div>`;
            
            case 'meta':
                return `
                    <div style="${style} margin-bottom: 15px; color: #333;">
                        <div>${date}</div>
                        <div>فاتورة #${receiptId}</div>
                    </div>
                `;
            
            case 'items':
                const itemsRows = snapshotCart.map(c => {
                    let details = '';
                    if (c.pricingMethod === 'area' && c.dimensions) {
                        details += `<div>[${c.dimensions.width}x${c.dimensions.height}م]</div>`;
                    }
                    if (c.selectedServices && c.selectedServices.length > 0) {
                        details += `<div>+ ${c.selectedServices.map(s => s.name).join(', ')}</div>`;
                    }
                    
                    return `
                    <tr>
                        <td style="text-align: right; padding: 5px 0; width: 35%;">
                            ${c.name}
                            ${details ? `<div style="font-size: 0.8em; color: #555;">${details}</div>` : ''}
                        </td>
                        <td style="text-align: center; padding: 5px 0; width: 20%;">${c.finalPrice.toFixed(2)}</td>
                        <td style="text-align: center; padding: 5px 0; width: 15%;">${c.quantity}</td>
                        <td style="text-align: left; padding: 5px 0; width: 30%;">${(c.finalPrice * c.quantity).toFixed(2)}</td>
                    </tr>
                `;
                }).join('');
                return `
                    <div style="${style}">
                        <table style="width: 100%; border-collapse: collapse; font-size: inherit;">
                            <thead>
                                <tr style="border-bottom: 1px solid #000;">
                                    <th style="text-align: right; padding-bottom: 5px; width: 35%;">الصنف</th>
                                    <th style="text-align: center; padding-bottom: 5px; width: 20%;">سعر</th>
                                    <th style="text-align: center; padding-bottom: 5px; width: 15%;">العدد</th>
                                    <th style="text-align: left; padding-bottom: 5px; width: 30%;">اجمالي</th>
                                </tr>
                            </thead>
                            <tbody>${itemsRows}</tbody>
                        </table>
                    </div>
                `;

            case 'totals':
                return `
                    <div style="${style} font-weight: bold; border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>الإجمالي:</span>
                            <span>${total.toFixed(2)} ج.م</span>
                        </div>
                    </div>
                `;
            
            case 'qr': 
                if (!receiptSettings.showQr || !qrImageBase64) return ''; 
                return `<div style="${style} margin-top: 10px; margin-bottom: 10px;"><img src="${qrImageBase64}" alt="QR Code" style="width: 80px; height: 80px;" /></div>`;

            case 'footer':
                return receiptSettings.footerMessage 
                    ? `<div style="${style} margin-top: 20px;">${receiptSettings.footerMessage}</div>` 
                    : '';
            
            default:
                return '';
        }
    }).join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>إيصال دفع #${receiptId}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 300px;
              margin: 0 auto;
              padding: 10px;
              background: #fff;
              color: #000;
            }
            @media print {
              body { width: 100%; padding: 0; margin: 0; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${contentHtml}
          <script>
            window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute left-6 top-6 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>

        {step === 'payment' ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">تأكيد عملية الدفع</h2>
            <div className="text-4xl font-black text-primary mb-6">{total.toFixed(2)} <span className="text-xl text-gray-500">ج.م</span></div>
            
            <p className="text-gray-500 mb-6 text-sm font-medium">اختر طريقة الدفع</p>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
                <button 
                    onClick={() => { setSelectedMethod('cash'); setSelectedCustomerId(''); }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${selectedMethod === 'cash' ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                    <Banknote size={24} />
                    <span className="font-bold text-sm">كاش</span>
                </button>
                <button 
                    onClick={() => { setSelectedMethod('vodafone_cash'); setSelectedCustomerId(''); }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${selectedMethod === 'vodafone_cash' ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                    <Smartphone size={24} />
                    <span className="font-bold text-sm">فودافون كاش</span>
                </button>
                <button 
                    onClick={() => setSelectedMethod('credit')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${selectedMethod === 'credit' ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                    <CreditCard size={24} />
                    <span className="font-bold text-sm">آجل (دين)</span>
                </button>
            </div>

            {selectedMethod === 'credit' && (
                <div className="bg-gray-50 p-4 rounded-xl mb-6 text-right border border-gray-200 animate-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">تحديد العميل</label>
                    {!isAddingCustomer ? (
                         <div className="space-y-3">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="بحث عن اسم العميل..." 
                                    className="w-full bg-white border border-gray-300 rounded-lg p-3 outline-none focus:border-primary"
                                    value={searchCustomer}
                                    onChange={(e) => setSearchCustomer(e.target.value)}
                                />
                                {searchCustomer && filteredCustomers.length === 0 && (
                                    <button 
                                        onClick={() => { setNewCustomerName(searchCustomer); setIsAddingCustomer(true); }}
                                        className="absolute left-2 top-2 bg-primary text-white px-3 py-1 text-xs rounded-md hover:bg-primary-hover"
                                    >
                                        إضافة جديد
                                    </button>
                                )}
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {filteredCustomers.map(cus => (
                                    <div 
                                        key={cus.id} 
                                        onClick={() => { setSelectedCustomerId(cus.id); setSearchCustomer(cus.name); }}
                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${selectedCustomerId === cus.id ? 'bg-red-100 text-primary border border-red-200' : 'hover:bg-gray-200'}`}
                                    >
                                        <User size={16} />
                                        <span>{cus.name}</span>
                                        <span className="text-xs text-gray-500 mr-auto">{cus.phone}</span>
                                    </div>
                                ))}
                            </div>
                         </div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in">
                            <input 
                                placeholder="اسم العميل الجديد" 
                                className="w-full bg-white border border-gray-300 rounded-lg p-3 outline-none focus:border-primary"
                                value={newCustomerName}
                                onChange={e => setNewCustomerName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <input 
                                    placeholder="رقم الهاتف (اختياري)" 
                                    className="flex-1 bg-white border border-gray-300 rounded-lg p-3 outline-none focus:border-primary"
                                    value={newCustomerPhone}
                                    onChange={e => setNewCustomerPhone(e.target.value)}
                                />
                                <button 
                                    onClick={handleQuickAddCustomer}
                                    className="bg-primary text-white px-4 rounded-lg font-bold"
                                >
                                    حفظ
                                </button>
                                <button 
                                    onClick={() => setIsAddingCustomer(false)}
                                    className="bg-gray-200 text-gray-600 px-4 rounded-lg"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex gap-4">
              <button 
                onClick={handleProcess}
                disabled={!selectedMethod || (selectedMethod === 'credit' && !selectedCustomerId)}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تأكيد ودفع
              </button>
              <button 
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-bounce">
                <Check size={40} className="text-primary" strokeWidth={4} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-800">تمت العملية بنجاح</h2>
            <p className="text-gray-500 mb-8">تم حفظ العملية وإصدار الفاتورة</p>

            <div className="bg-gray-50 p-4 rounded-xl mb-8 flex justify-between items-center">
              <span className="text-gray-600">المبلغ المدفوع</span>
              <span className="font-bold text-xl">{total.toFixed(2)} ج.م</span>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold text-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                طباعة الإيصال
              </button>
              <button 
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;