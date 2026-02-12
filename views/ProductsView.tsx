
import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Plus, Edit3, Trash2, Tag, X, Box, Ruler, Settings, Check, Save, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { PricingMethod, Service, Product } from '../types';

const ProductsView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, categories, addCategory, updateCategory, deleteCategory, hasPermission, t } = usePOS();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State for Delete Confirmation Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
  });
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed');
  const [services, setServices] = useState<Omit<Service, 'id'>[]>([]);
  const [currentService, setCurrentService] = useState({ name: '', price: '' });
  const [isVariable, setIsVariable] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);

  const handleEditClick = (product: Product) => {
    if (!hasPermission('products.edit')) {
        alert(t('permissionDeniedAction'));
        return;
    }
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
    });
    setPricingMethod(product.pricingMethod || 'fixed');
    
    // Standard map for services
    setServices(product.services ? product.services.map(s => ({ 
        name: s.name, 
        price: s.price
    })) : []);
    
    setIsVariable(product.isVariable || false);
    setIsFormOpen(true);
    setIsCategoryManagerOpen(false);
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setNewProduct({ name: '', price: '', category: '' });
    setPricingMethod('fixed');
    setServices([]);
    setCurrentService({ name: '', price: '' });
    setIsVariable(false);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.category) {
        if (categories.length > 0) newProduct.category = categories[0];
        else return;
    }

    const servicesToSave = [...services];
    if (currentService.name && currentService.price) {
         servicesToSave.push({ 
            name: currentService.name, 
            price: parseFloat(currentService.price)
        });
    }

    const finalServices = servicesToSave.map(s => ({ ...s, id: Date.now().toString() + Math.random() }));

    const productData = {
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      category: newProduct.category || categories[0],
      pricingMethod,
      services: finalServices,
      isVariable
    };

    if (editingId) {
      updateProduct(editingId, productData);
    } else {
      addProduct(productData);
    }
    resetForm();
  };

  const handleAddService = () => {
      if (currentService.name && currentService.price) {
          setServices([...services, { 
              name: currentService.name, 
              price: parseFloat(currentService.price)
          }]);
          setCurrentService({ name: '', price: '' });
      }
  };

  const removeService = (index: number) => {
      setServices(services.filter((_, i) => i !== index));
  };

  const moveService = (index: number, direction: 'up' | 'down') => {
      const newServices = [...services];
      if (direction === 'up' && index > 0) {
          [newServices[index], newServices[index - 1]] = [newServices[index - 1], newServices[index]];
      } else if (direction === 'down' && index < newServices.length - 1) {
          [newServices[index], newServices[index + 1]] = [newServices[index + 1], newServices[index]];
      }
      setServices(newServices);
  };

  const editService = (index: number) => {
      const service = services[index];
      setCurrentService({ name: service.name, price: service.price.toString() });
      removeService(index);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const handleUpdateCategory = () => {
      if (editingCategory && editingCategory.new.trim()) {
          updateCategory(editingCategory.old, editingCategory.new.trim());
          setEditingCategory(null);
      }
  };

  const confirmDelete = () => {
      if (deleteConfirmId) {
          deleteProduct(deleteConfirmId);
          setDeleteConfirmId(null);
      }
  };

  const handleInitDelete = (id: string) => {
      if (!hasPermission('products.delete')) {
          alert(t('permissionDeniedAction'));
          return;
      }
      setDeleteConfirmId(id);
  };

  return (
    <div className="p-8 h-full overflow-y-auto relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">إدارة المنتجات</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1">عرض وتعديل قائمة المنتجات والخدمات</p>
        </div>
        <div className="flex gap-3">
            {hasPermission('products.manage_categories') && (
                <button 
                    onClick={() => { setIsCategoryManagerOpen(!isCategoryManagerOpen); setIsFormOpen(false); }}
                    className={`px-6 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 border ${isCategoryManagerOpen ? 'bg-gray-800 text-white border-gray-800' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <Tag size={20} />
                    التصنيفات
                </button>
            )}
            {hasPermission('products.add') && (
                <button 
                    onClick={() => { 
                      resetForm();
                      setIsFormOpen(true); 
                      setIsCategoryManagerOpen(false); 
                    }}
                    className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    إضافة منتج جديد
                </button>
            )}
        </div>
      </div>

      {isCategoryManagerOpen && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4">
             {/* ... Category Manager UI ... */}
             <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">إدارة التصنيفات</h3>
                    <p className="text-sm text-gray-400">أضف تصنيفات جديدة أو احذف التصنيفات غير المستخدمة</p>
                 </div>
                 <button onClick={() => setIsCategoryManagerOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
             </div>
             <div className="flex flex-col md:flex-row gap-8">
                 <div className="w-full md:w-1/3">
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="اسم التصنيف الجديد..." 
                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white text-sm"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={!newCategoryName.trim()}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={18} />
                        </button>
                    </form>
                 </div>
                 <div className="flex-1">
                     <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <div key={cat.name} className="group flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg hover:border-red-200 transition-colors">
                                {editingCategory?.old === cat.name ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            value={editingCategory.new}
                                            onChange={e => setEditingCategory({...editingCategory, new: e.target.value})}
                                            className="w-32 bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-sm outline-none dark:text-white"
                                            autoFocus
                                        />
                                        <button onClick={handleUpdateCategory} className="text-green-600 hover:text-green-800"><Check size={14}/></button>
                                        <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{cat}</span>
                                        <div className="flex gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                                            <button onClick={() => setEditingCategory({old: cat.name, new: cat.name})} className="text-gray-400 hover:text-blue-500 transition-colors p-1"><Edit3 size={12} /></button>
                                            <button onClick={() => deleteCategory(cat)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><X size={14} /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                     </div>
                 </div>
             </div>
        </div>
      )}

      {isFormOpen && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">
              {editingId ? 'تعديل بيانات المنتج' : 'بيانات المنتج الجديد'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
          </div>
          
          <form onSubmit={handleProductSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">اسم المنتج</label>
                <input 
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                  placeholder="اسم المنتج"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">التصنيف</label>
                <select 
                  value={newProduct.category}
                  onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                  required
                >
                  <option value="" disabled>اختر تصنيفاً...</option>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3">طريقة التسعير</label>
                <div className="flex gap-4 mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            setPricingMethod('fixed');
                        }}
                        className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${pricingMethod === 'fixed' ? 'border-primary bg-red-50 dark:bg-red-900/20 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200'}`}
                    >
                        <Box size={20} />
                        <span className="font-bold">سعر ثابت للقطعة</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPricingMethod('area')}
                        className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${pricingMethod === 'area' ? 'border-primary bg-red-50 dark:bg-red-900/20 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200'}`}
                    >
                        <Ruler size={20} />
                        <span className="font-bold">حساب بالمتر (طول × عرض)</span>
                    </button>
                </div>
                
                <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {pricingMethod === 'fixed' ? 'السعر (ج.م)' : 'سعر المتر (ج.م)'}
                    </label>
                    <input 
                        required
                        type="number"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                        placeholder="0.00"
                    />




            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3">الخدمات الإضافية</label>
                
                <div className="flex gap-2 mb-3">
                    <input 
                        placeholder="اسم خدمة إضافية (تغليف، تركيب...)"
                        className="flex-[2] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary text-sm dark:text-white"
                        value={currentService.name}
                        onChange={e => setCurrentService({...currentService, name: e.target.value})}
                    />
                    
                    <input 
                        type="number"
                        placeholder="السعر"
                        className="w-24 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary text-sm dark:text-white"
                        value={currentService.price}
                        onChange={e => setCurrentService({...currentService, price: e.target.value})}
                    />

                    <button 
                        type="button"
                        onClick={handleAddService}
                        disabled={!currentService.name || !currentService.price}
                        className="bg-gray-800 text-white px-4 rounded-lg font-bold hover:bg-gray-900 disabled:opacity-50"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                {services.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700 space-y-2">
                        {services.map((s, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-0.5">
                                        <button type="button" onClick={() => moveService(idx, 'up')} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ArrowUp size={12}/></button>
                                        <button type="button" onClick={() => moveService(idx, 'down')} disabled={idx === services.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ArrowDown size={12}/></button>
                                    </div>
                                    <span className="text-sm font-medium dark:text-white">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{s.price} ج.م</span>
                                    <button type="button" onClick={() => editService(idx)} className="text-gray-400 hover:text-blue-500"><Edit3 size={14}/></button>
                                    <button type="button" onClick={() => removeService(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button 
                type="button" 
                onClick={resetForm}
                className="px-6 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold"
              >
                إلغاء
              </button>
              <button 
                type="submit"
                disabled={categories.length === 0}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-red-200 disabled:opacity-50 flex items-center gap-2"
              >
                {editingId ? <Save size={18} /> : <Plus size={18} />}
                {editingId ? 'حفظ التعديلات' : 'حفظ المنتج'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                <Box size={20} />
              </div>
              <div className="flex flex-col items-start gap-1">
                <h3 className="font-bold text-gray-800 dark:text-white">{product.name}</h3>
                <div className="flex gap-2 flex-wrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-600">{product.category}</span>
                    {product.pricingMethod === 'area' && (
                        <span className="text-sm text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/50 flex items-center gap-1">
                            <Ruler size={12} /> حساب بالمتر
                        </span>
                    )}
                    {product.services && product.services.length > 0 && (
                        <span className="text-sm text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/50 flex items-center gap-1">
                            <Settings size={12} /> {product.services.length} خدمات
                        </span>
                    )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-left">
                <div className="font-bold text-lg dark:text-white">{product.price.toFixed(2)} ج.م</div>
                <div className="text-xs text-gray-400">
                    {product.pricingMethod === 'fixed' ? 'سعر القطعة' : 'سعر المتر'}
                </div>
              </div>
              
              <div className="flex gap-2 relative z-20">
                {hasPermission('products.edit') && (
                    <button 
                      type="button"
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditClick(product);
                      }}
                      className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:text-blue-600 flex items-center justify-center transition-colors"
                      title="تعديل"
                    >
                      <Edit3 size={18} />
                    </button>
                )}
                {hasPermission('products.delete') && (
                    <button 
                      type="button"
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleInitDelete(product.id);
                      }}
                      className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500 flex items-center justify-center transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
            <div className="text-center py-12 text-gray-400">
                <p>لا توجد منتجات مضافة.</p>
            </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تأكيد الحذف</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من رغبتك في حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            type="button"
                            onClick={confirmDelete}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                          >
                              حذف المنتج
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProductsView;