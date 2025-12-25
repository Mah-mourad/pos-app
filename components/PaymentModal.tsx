
import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { PaymentMethod } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: PaymentMethod) => void;
  totalAmount: number;
  remainingAmount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  totalAmount, 
  remainingAmount 
}) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');

  useEffect(() => {
    if (isOpen) {
      setAmount(remainingAmount.toString());
      setMethod('cash');
    }
  }, [isOpen, remainingAmount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (val > 0 && val <= remainingAmount) {
      onConfirm(val, method);
      onClose();
    } else if (val > remainingAmount) {
        alert('المبلغ المدخل أكبر من المبلغ المتبقي');
    } else {
        alert('يرجى إدخال مبلغ صحيح');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 scale-100 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">تحصيل دفعة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-blue-600 font-medium">إجمالي الفاتورة</span>
                <span className="font-bold text-gray-700">{totalAmount.toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm text-blue-600 font-medium">المبلغ المتبقي</span>
                <span className="font-bold text-red-600 text-lg">{remainingAmount.toFixed(2)} ج.م</span>
            </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">المبلغ المراد تحصيله</label>
            <div className="relative">
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="number" 
                  step="0.01"
                  max={remainingAmount}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-10 outline-none focus:border-primary text-lg font-bold"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setMethod('cash')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    method === 'cash' ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Banknote size={24} />
                <span className="font-bold text-sm">كاش</span>
              </button>
              <button 
                type="button"
                onClick={() => setMethod('vodafone_cash')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    method === 'vodafone_cash' ? 'border-primary bg-red-50 text-primary' : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Smartphone size={24} />
                <span className="font-bold text-sm">فودافون كاش</span>
              </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign size={20} />
            تأكيد التحصيل
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
