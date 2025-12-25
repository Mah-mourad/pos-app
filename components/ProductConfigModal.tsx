
import React, { useState, useEffect } from 'react';

import { Product, Service, CartItem } from '../types';

import { X, Ruler, Plus, Check, Edit3, DollarSign, Trash2 } from 'lucide-react';

import { usePOS } from '../context/POSContext';



interface ProductConfigModalProps {

  product: Product | null; // Product can be null for ad-hoc items

  isOpen: boolean;

  onClose: () => void;

  onConfirm: (item: CartItem) => void;

  isAdHoc?: boolean; // New prop to indicate ad-hoc product creation

}



const ProductConfigModal: React.FC<ProductConfigModalProps> = ({ product, isOpen, onClose, onConfirm, isAdHoc }) => {

  const { t } = usePOS();

  const [width, setWidth] = useState<string>('');

  const [height, setHeight] = useState<string>('');

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  const [quantity, setQuantity] = useState(1);

  

  // Wasted dimensions state

  const [addWasted, setAddWasted] = useState<boolean>(false);

  const [wastedWidth, setWastedWidth] = useState<string>('');

  const [wastedHeight, setWastedHeight] = useState<string>('');



  // Variable Product State

  const [customName, setCustomName] = useState('');

  const [customPrice, setCustomPrice] = useState<string>('');



  useEffect(() => {

    if (isOpen) {

        setWidth('');

        setHeight('');

        setSelectedServices([]);

        setQuantity(1);

        setAddWasted(false); // Reset wasted state

        setWastedWidth('');

        setWastedHeight('');

        if (isAdHoc) {

            setCustomName(''); // Start blank for ad-hoc

            setCustomPrice(''); // Start blank for ad-hoc

        } else if (product) {

            setCustomName(product.name);

            setCustomPrice(product.price > 0 ? product.price.toString() : '');

        }

    }

  }, [isOpen, product, isAdHoc]); // Added isAdHoc to dependency array



  const currentMeterPrice = isAdHoc ? (parseFloat(customPrice) || 0) : (product?.isVariable ? (parseFloat(customPrice) || 0) : (product?.price || 0));



  const calculateTotal = () => {

    let basePrice = 0;

    

    // Determine base price (Fixed, Area, or Variable/Ad-hoc)

    if (isAdHoc) {

        basePrice = parseFloat(customPrice) || 0;

    } else if (product?.isVariable) {

        basePrice = currentMeterPrice;

    } else if (product?.pricingMethod === 'area') {

      const w = parseFloat(width) || 0;

      const h = parseFloat(height) || 0;

      let totalArea = w * h;



      if (addWasted) {

          const ww = parseFloat(wastedWidth) || 0;

          const wh = parseFloat(wastedHeight) || 0;

          totalArea += ww * wh;

      }

      

      basePrice = totalArea * currentMeterPrice;

    } else {

      basePrice = currentMeterPrice;

    }



    // Services Calculation (Fixed type only)

    const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);



    return basePrice + servicesTotal;

  };



  const handleConfirm = () => {

    const finalPrice = calculateTotal();

    

    // Validation

    if (isAdHoc || product?.isVariable) {

        if (!customName.trim()) { alert('يرجى إدخال اسم المنتج'); return; }

        if (!customPrice || parseFloat(customPrice) < 0) { alert('يرجى إدخال سعر صحيح'); return; }

    }

    

    if (product?.pricingMethod === 'area' && !isAdHoc) { // Area pricing only applies to pre-defined products, not ad-hoc

        if (!width || !height || parseFloat(width) <= 0 || parseFloat(height) <= 0) {

            alert('يرجى إدخال الطول والعرض للمنتج بشكل صحيح');

            return;

        }

        if (addWasted && (!wastedWidth || !wastedHeight || parseFloat(wastedWidth) <= 0 || parseFloat(wastedHeight) <= 0)) {

            alert('يرجى إدخال أبعاد الهادر بشكل صحيح');

            return;

        }

    }



    // Prepare Services

    const finalServices = [...selectedServices];



    // Create a unique ID for ad-hoc products

    const productId = isAdHoc ? `adhoc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : product?.id;



    const item: CartItem = {

      id: productId || 'unknown', // Provide a fallback if product and adHoc are both somehow missing (shouldn't happen)

      name: isAdHoc ? customName : (product?.isVariable ? customName : (product?.name || '')), // Override name if variable or ad-hoc

      price: isAdHoc ? parseFloat(customPrice) : (product?.price || 0), // Use customPrice for ad-hoc, original for others

      category: isAdHoc ? 'مخصص' : (product?.category || 'عام'), // Default category for ad-hoc

      isVariable: true, // Ad-hoc products are always variable

      pricingMethod: isAdHoc ? 'fixed' : (product?.pricingMethod || 'fixed'), // Ad-hoc defaults to fixed, or product's method

      quantity,

      selectedServices: finalServices,

      finalPrice,

      dimensions: (product?.pricingMethod === 'area' && !isAdHoc) ? { width: parseFloat(width), height: parseFloat(height) } : undefined,

      wasted: (product?.pricingMethod === 'area' && !isAdHoc && addWasted && parseFloat(wastedWidth) > 0 && parseFloat(wastedHeight) > 0)

        ? { width: parseFloat(wastedWidth), height: parseFloat(wastedHeight) }

        : undefined

    };

    

    onConfirm(item);

    onClose();

  };



  const toggleService = (service: Service) => {

    if (selectedServices.find(s => s.id === service.id)) {

      setSelectedServices(prev => prev.filter(s => s.id !== service.id));

    } else {

      setSelectedServices(prev => [...prev, service]);

    }

  };



  if (!isOpen) return null;



  const currentTotal = calculateTotal();

  const mainArea = (parseFloat(width) || 0) * (parseFloat(height) || 0);

  const wastedArea = addWasted ? (parseFloat(wastedWidth) || 0) * (parseFloat(wastedHeight) || 0) : 0;

  const totalArea = mainArea + wastedArea;



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">

      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95">

        

        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">

          <div>

            <h3 className="font-bold text-lg text-gray-800">{isAdHoc ? t('newCustomProduct') : (product?.isVariable ? t('variableProductTitle') : product?.name)}</h3>

            <p className="text-sm text-gray-500">{isAdHoc ? t('configureCustomProductDesc') : t('configureProductDesc')}</p>

          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm">

            <X size={20} />

          </button>

        </div>



        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

          

          {/* --- VARIABLE PRODUCT INPUTS --- */}

          {(product?.isVariable || isAdHoc) && (

              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-4">

                  <div>

                      <label className="block text-xs font-bold text-purple-800 mb-1">{t('enterProductName')}</label>

                      <div className="relative">

                          <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />

                          <input 

                              type="text" 

                              className="w-full p-2 pr-9 rounded-lg border border-purple-200 outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"

                              value={customName}

                              onChange={e => setCustomName(e.target.value)}

                              autoFocus

                          />

                      </div>

                  </div>

                  <div>

                      <label className="block text-xs font-bold text-purple-800 mb-1">{t('enterProductPrice')}</label>

                      <div className="relative">

                          <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />

                          <input 

                              type="number"

                              step="0.01"

                              className="w-full p-2 pr-9 rounded-lg border border-purple-200 outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"

                              value={customPrice}

                              onChange={e => setCustomPrice(e.target.value)}

                              placeholder="0.00"

                          />

                      </div>

                  </div>

              </div>

          )}



          {/* 1. Dimensions (If Area) */}

          {product?.pricingMethod === 'area' && !isAdHoc && (

            <div className="space-y-4">

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">

                    <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">

                        <Ruler size={18} />

                        المقاسات (بالمتر)

                    </h4>

                    <div className="grid grid-cols-2 gap-4">

                        <div>

                            <label className="block text-xs font-bold text-gray-500 mb-1">العرض</label>

                            <input 

                            type="number"

                            step="0.01"

                            className="w-full p-2 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 text-center font-bold text-lg"

                            value={width}

                            onChange={e => setWidth(e.target.value)}

                            placeholder="0.00"

                            />

                        </div>

                        <div>

                            <label className="block text-xs font-bold text-gray-500 mb-1">الطول</label>

                            <input 

                            type="number"

                            step="0.01"

                            className="w-full p-2 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 text-center font-bold text-lg"

                            value={height}

                            onChange={e => setHeight(e.target.value)}

                            placeholder="0.00"

                            />

                        </div>

                    </div>

                    <div className="mt-2 text-right text-xs text-blue-600 font-medium">

                        سعر المتر: {currentMeterPrice.toFixed(2)} ج.م

                    </div>

                </div>



                {/* Wasted Area Section */}

                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">

                    <div className="flex items-center justify-between">

                        <h4 className="font-bold text-orange-800 flex items-center gap-2">

                            <Trash2 size={16} />

                            إضافة هادر

                        </h4>

                        <label className="flex items-center cursor-pointer">

                            <div className="relative">

                                <input type="checkbox" className="sr-only" checked={addWasted} onChange={() => setAddWasted(!addWasted)} />

                                <div className={`block w-10 h-6 rounded-full transition ${addWasted ? 'bg-orange-500' : 'bg-gray-300'}`}></div>

                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${addWasted ? 'translate-x-full' : ''}`}></div>

                            </div>

                        </label>

                    </div>



                    {addWasted && (

                        <div className="grid grid-cols-2 gap-4 mt-3 animate-in fade-in slide-in-from-top-4">

                            <div>

                                <label className="block text-xs font-bold text-gray-500 mb-1">عرض الهادر</label>

                                <input 

                                type="number"

                                step="0.01"

                                className="w-full p-2 rounded-lg border border-orange-200 outline-none focus:ring-2 focus:ring-orange-500/20 text-center font-bold text-lg"

                                value={wastedWidth}

                                onChange={e => setWastedWidth(e.target.value)}

                                placeholder="0.00"

                                />

                            </div>

                            <div>

                                <label className="block text-xs font-bold text-gray-500 mb-1">طول الهادر</label>

                                <input 

                                type="number"

                                step="0.01"

                                className="w-full p-2 rounded-lg border border-orange-200 outline-none focus:ring-2 focus:ring-orange-500/20 text-center font-bold text-lg"

                                value={wastedHeight}

                                onChange={e => setWastedHeight(e.target.value)}

                                placeholder="0.00"

                                />

                            </div>

                        </div>

                    )}

                </div>

            </div>

          )}



          {/* 2. Services (Fixed Only) */}

          {product?.services && product.services.length > 0 && !isAdHoc && (

            <div>

               <h4 className="font-bold text-gray-800 mb-3">الخدمات الإضافية</h4>

               <div className="grid grid-cols-1 gap-2">

                 {product.services.map(service => {

                   const isSelected = !!selectedServices.find(s => s.id === service.id);

                   

                   return (

                     <div 

                        key={service.id} 

                        onClick={() => toggleService(service)}

                        className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}

                     >

                        <div className="flex items-center gap-3">

                           <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>

                              {isSelected && <Check size={12} />}

                           </div>

                           <span className={isSelected ? 'font-bold text-gray-800' : 'text-gray-600'}>

                               {service.name}

                           </span>

                        </div>

                        <span className="font-bold text-primary">+{service.price} ج.م</span>

                     </div>

                   );

                 })}

               </div>

            </div>

          )}



          {/* Quantity */}

          <div>

            <h4 className="font-bold text-gray-800 mb-2">الكمية</h4>

            <div className="flex items-center gap-4 bg-gray-50 w-fit p-1 rounded-lg border border-gray-200">

               <button 

                 onClick={() => setQuantity(Math.max(1, quantity - 1))}

                 className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-100"

               >

                 -

               </button>

               <span className="font-bold text-lg w-8 text-center">{quantity}</span>

               <button 

                 onClick={() => setQuantity(quantity + 1)}

                 className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-100"

               >

                 +

               </button>

            </div>

          </div>

        </div>



        {/* Footer Info & Action */}

        <div className="p-5 border-t border-gray-100 bg-gray-50">

           <div className="flex items-center justify-between mb-2">

              <span className="text-gray-500 text-sm block">الإجمالي للقطعة</span>

              <span className="text-2xl font-bold text-primary">{currentTotal.toFixed(2)} ج.م</span>

           </div>

           {product?.pricingMethod === 'area' && totalArea > 0 && (

               <div className="text-xs text-center text-blue-600 bg-blue-100 p-1 rounded">

                   صافي المساحة: {mainArea.toFixed(2)}م²

                   {wastedArea > 0 && ` + ${wastedArea.toFixed(2)}م² هادر`}

                   = <span className="font-bold">{totalArea.toFixed(2)}م²</span>

               </div>

           )}

           <button 

             onClick={handleConfirm}

             className="mt-3 w-full px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover shadow-lg shadow-red-200 transition-all"

           >

             إضافة للسلة

           </button>

        </div>



      </div>

    </div>

  );

};



export default ProductConfigModal;
