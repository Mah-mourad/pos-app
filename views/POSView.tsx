import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Tag, X, Box, Ruler, Save, ArrowUp, ArrowDown, Check, Edit3, Trash2, AlertTriangle, ArrowLeftRight, Grip, GripVertical, Settings2, LayoutGrid, ShoppingBag, ChevronUp, Wifi, WifiOff } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CartSidebar from '../components/CartSidebar';
import ProductConfigModal from '../components/ProductConfigModal';
import { usePOS } from '../context/POSContext';
// import { Product, CartItem, PricingMethod, Service } from '../types';
import { Product, CartItem, PricingMethod, Service, Category } from '../types';
import { createTransaction } from '../handle_tool/transactions.service';

const POSView: React.FC = () => {
  const { 
      products, addToCart, categories, cart, totalAmount,
      t, hasPermission, appSettings, currentUser,
      addProduct, updateProduct, deleteProduct, reorderProducts,
      addCategory, updateCategory, deleteCategory, reorderCategories,
      serverStatus
  } = usePOS();

  // Filter Categories based on User Permissions
  const displayCategories = categories.filter(cat => {
      if (currentUser?.role === 'admin') return true;
      if (!currentUser?.allowedCategories || currentUser.allowedCategories.length === 0) return true; // Full access if undefined
      return currentUser.allowedCategories.includes(cat.name); // Check name
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(displayCategories[0]?.name || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Cart State
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // --- POS State ---
  // Config Modal State (For Variable / Area products during sale)
  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  // State for adding a completely ad-hoc/custom product
  const [adHocProductMode, setAdHocProductMode] = useState(false);

  // --- Management State ---
  const [isEditMode, setIsEditMode] = useState(false); // Master toggle for editing/moving/deleting
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  // Product Form State
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '' });
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed');
  const [services, setServices] = useState<Omit<Service, 'id'>[]>([]);
  const [currentService, setCurrentService] = useState({ name: '', price: '' });

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);

  useEffect(() => {
    if (displayCategories.length > 0) {
        if (!selectedCategory || !displayCategories.some(cat => cat.name === selectedCategory)) {
            setSelectedCategory(displayCategories[0]);
        }
    }
  }, [displayCategories, selectedCategory]);
  
  const filteredProducts = products.filter(product => { 
      const matchesCategory = product.category === selectedCategory; 
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()); 
      
      // Ensure product belongs to an allowed category (security measure)
      const isAllowed = displayCategories.some(cat => cat.name === product.category);

      return matchesCategory && matchesSearch && isAllowed; 
  });
  
  // --- POS Actions ---
const handleConfirmTransaction = async () => {
  if (cart.length === 0) {
    alert('السلة فارغة');
    return;
  }

  try {
    const payload = {
      itemsCount: cart.reduce((sum, i) => sum + i.quantity, 0),
      total: totalAmount,
      paymentMethod: 'cash', // أو من state لاحقًا
      customerId: currentUser?.id || 'guest',
      customerName: currentUser?.name || 'Guest',
      items: cart,
      payments: [],
      isPaid: true,
      type: 'sale',
      relatedTransac: null
    };

    const result = await createTransaction(payload);

    console.log('Transaction Saved:', result);

    // 🔥 هنا فقط تقول "تم الحفظ"
    alert('تم حفظ العملية بنجاح');

    // TODO:
    // - فضي السلة
    // - اطبع فاتورة
    // - انتقل لشاشة تانية

  } catch (error) {
    console.error('Transaction Error:', error);
    alert('حصل خطأ أثناء حفظ العملية');
  }
};

  const handleProductClick = (product: Product) => { 
      // Check Variable Product Permission
      if (product.isVariable && !hasPermission('pos.variable_product')) {
          alert(t('permissionDeniedVariable'));
          return;
      }
      // Only open config modal for variable products. All other products add directly to cart.
      if (product.isVariable || product.pricingMethod === 'area') {
          setConfigProduct(product);
          return;
      }
      // If not variable, not area-based, and has no services, add directly to cart
      const item: CartItem = {
          ...product,
          quantity: 1,
          selectedServices: [],
          finalPrice: product.price
      };
      addToCart(item);
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, product: Product) => {
      setDraggedProduct(product);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetProduct: Product) => {
      e.preventDefault();
      if (!draggedProduct || draggedProduct.id === targetProduct.id) {
          return;
      }

      const draggedIndex = products.findIndex(p => p.id === draggedProduct.id);
      const targetIndex = products.findIndex(p => p.id === targetProduct.id);

      if (draggedIndex > -1 && targetIndex > -1) {
          const newProducts = [...products];
          newProducts.splice(draggedIndex, 1);
          const newTargetIndex = newProducts.findIndex(p => p.id === targetProduct.id);
          newProducts.splice(newTargetIndex, 0, draggedProduct);
          reorderProducts(newProducts);
      }
      setDraggedProduct(null);
  };

  const handleDragEnd = () => {
      setDraggedProduct(null);
  };

  // --- Category Drag and Drop Logic ---
  const handleCategoryDragStart = (e: React.DragEvent, category: string) => {
      setDraggedCategory(category);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCategoryName: string) => {
      e.preventDefault();
      if (!draggedCategory || draggedCategory === targetCategoryName) {
          return;
      }
      console.log("DEBUG: Category Dragged:", draggedCategory, "Target:", targetCategoryName);

      const draggedCatObject = categories.find(c => c.name === draggedCategory);
      const targetCatObject = categories.find(c => c.name === targetCategoryName);

      if (!draggedCatObject || !targetCatObject) return;

      const newCategories = [...categories];

      const draggedIndex = newCategories.indexOf(draggedCatObject);
      const targetIndex = newCategories.indexOf(targetCatObject);

      console.log("DEBUG: Category Indices:", draggedIndex, targetIndex);
      console.log("DEBUG: Categories before splice:", newCategories);

      if (draggedIndex > -1 && targetIndex > -1) {
          newCategories.splice(draggedIndex, 1); // Remove dragged
          newCategories.splice(targetIndex, 0, draggedCatObject); // Insert at target
          console.log("DEBUG: New categories after splice:", newCategories);
          reorderCategories(newCategories);
      }
      setDraggedCategory(null);
  };

  const handleCategoryDragEnd = () => {
      setDraggedCategory(null);
  };


  // --- Management Actions ---

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
    setPricingMethod(product.pricingMethod);
    setServices(product.services ? product.services.map(s => ({ name: s.name, price: s.price })) : []);
    setEditingId(product.id);
    setIsFormOpen(true);
    setIsCategoryManagerOpen(false);
  };

  const handleInitDelete = (id: string) => {
      if (!hasPermission('products.delete')) {
          alert(t('permissionDeniedAction'));
          return;
      }
      setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
      if (deleteConfirmId) {
          deleteProduct(deleteConfirmId);
          setDeleteConfirmId(null);
      }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setNewProduct({ name: '', price: '', category: '' });
    setPricingMethod('fixed');
    setServices([]);
    setCurrentService({ name: '', price: '' });
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.category) {
        if (displayCategories.length > 0) newProduct.category = displayCategories[0];
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
      category: newProduct.category || displayCategories[0],
      pricingMethod,
      services: finalServices
    };

    if (editingId) {
      updateProduct(editingId, productData);
    } else {
      addProduct(productData);
    }
    resetForm();
  };

  // Service Management
  const handleAddService = () => {
      if (currentService.name && currentService.price) {
          setServices([...services, { name: currentService.name, price: parseFloat(currentService.price) }]);
          setCurrentService({ name: '', price: '' });
      }
  };
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index));
  const moveService = (index: number, direction: 'up' | 'down') => {
      const newServices = [...services];
      if (direction === 'up' && index > 0) {
          [newServices[index], newServices[index - 1]] = [newServices[index - 1], newServices[index]];
      } else if (direction === 'down' && index < newServices.length - 1) {
          [newServices[index], newServices[index + 1]] = [newServices[index + 1], newServices[index]];
      }
      setServices(newServices);
  };

  // Category Management
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

  const isRTL = appSettings.language === 'ar';

  // Check general permission for management
  const canManage = hasPermission('products.edit') || hasPermission('products.add') || hasPermission('products.delete');

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex h-full w-full overflow-hidden relative flex-col md:flex-row">
      <div className="flex-1 h-full flex flex-col p-3 md:p-6 overflow-hidden relative">
        <div className="mb-4 md:mb-6 flex flex-col gap-4 md:gap-6">
          <div className="flex justify-between items-center">
             <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white mb-1">{t('posTitle')}</h1>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-colors ${serverStatus ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`} title={serverStatus ? 'متصل بالسحابة' : 'غير متصل بالسحابة'}>
                        {serverStatus ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span className="hidden sm:inline">{serverStatus ? 'متصل' : 'غير متصل'}</span>
                    </div>
                </div>
                <p className="text-gray-400 dark:text-gray-500 text-xs md:text-base">{t('posSubtitle')}</p>
             </div>
             
             {/* Master Management Toggle Button */}
             {canManage && (
                 <div className="flex gap-2 md:gap-3 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    
                    {isEditMode && (
                        <div className="flex gap-2 animate-in slide-in-from-right-4 fade-in">
                            {hasPermission('products.manage_categories') && (
                                <button 
                                    onClick={() => { setIsCategoryManagerOpen(!isCategoryManagerOpen); setIsFormOpen(false); }}
                                    className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-xs md:text-sm ${isCategoryManagerOpen ? 'bg-gray-800 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    title={t('categories')}
                                >
                                    <Tag size={16} />
                                    <span className="hidden md:inline">{t('categories')}</span>
                                </button>
                            )}
                            {hasPermission('products.add') && (
                                <button 
                                    onClick={() => { 
                                    resetForm();
                                    setIsFormOpen(true); 
                                    setIsCategoryManagerOpen(false); 
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-xs md:text-sm"
                                    title={t('addProduct')}
                                >
                                    <Plus size={16} />
                                    <span className="hidden md:inline">{t('addProduct')}</span>
                                </button>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={() => {
                            setIsEditMode(!isEditMode);
                            setIsFormOpen(false);
                            setIsCategoryManagerOpen(false);
                        }}
                        className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-xs md:text-sm ${isEditMode ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        title="وضع التعديل"
                    >
                        {isEditMode ? <Check size={18} /> : <Settings2 size={18} />}
                        <span className="hidden md:inline">{isEditMode ? 'إتمام التعديل' : 'تعديل المنتجات'}</span>
                    </button>
                </div>
             )}
          </div>

          {/* Search & Categories Row */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <div className="flex-1 w-full relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder={t('searchProduct')} 
                  className="pl-4 pr-12 py-2.5 md:py-3 w-full rounded-xl bg-white dark:bg-gray-800 dark:text-white border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none text-sm" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              {/* Ad-hoc Product Button */}
              {hasPermission('pos.variable_product') && (
                <button 
                  onClick={() => setAdHocProductMode(true)}
                  className="bg-primary text-white px-4 py-2.5 md:py-3 rounded-xl font-bold flex items-center gap-2 text-sm shadow-md hover:bg-primary-hover transition-colors w-full md:w-auto"
                  title={t('addCustomProduct')}
                >
                  <Plus size={18} />
                  <span className="md:inline">{t('addCustomProduct')}</span>
                </button>
              )}
          </div>
          
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {displayCategories.map(cat => (
              <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.name ? 'bg-primary text-white shadow-md shadow-red-200' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{cat.name}</button>
            ))}
            {displayCategories.length === 0 && <span className="text-gray-400 text-sm p-2">لا توجد تصنيفات متاحة</span>}
          </div>

          {isEditMode && (
              <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-3 rounded-xl text-center text-sm font-bold border border-orange-200 dark:border-orange-800 animate-in fade-in flex items-center justify-center gap-2">
                  <LayoutGrid size={16} />
                  {t('dragToReorder')}
              </div>
          )}
        </div>

        {/* --- MODALS SECTION (MANAGEMENT) --- */}
        {/* Category Manager */}
        {isCategoryManagerOpen && isEditMode && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto scale-100 animate-in zoom-in-95">
                     <div className="flex justify-between items-start mb-6">
                         <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t('manageCategories')}</h3>
                            <p className="text-sm text-gray-400">{t('manageCategoriesDesc')}</p>
                         </div>
                         <button onClick={() => setIsCategoryManagerOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                     </div>
                     <div className="flex flex-col md:flex-row gap-8">
                         <div className="w-full md:w-1/3">
                            <form onSubmit={handleAddCategory} className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder={t('newCategoryPlaceholder')}
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
                                {categories.map((cat: Category, index: number) => ( // Cast cat to Category type
                                    <div 
                                      key={cat.name} // Use cat.name for key
                                      className={`group flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg hover:border-red-200 transition-colors relative ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                      draggable={isEditMode}
                                      onDragStart={(e) => handleCategoryDragStart(e, cat.name)} // Pass cat.name
                                      onDragOver={handleCategoryDragOver}
                                      onDrop={(e) => handleCategoryDrop(e, cat.name)} // Pass cat.name
                                      onDragEnd={handleCategoryDragEnd}
                                      style={{ opacity: draggedCategory === cat.name ? 0.4 : 1 }} // Compare with cat.name
                                    >
                                        {isEditMode && (
                                            <div className="absolute inset-y-0 -left-2 w-4 flex items-center justify-center pointer-events-none">
                                                <Grip size={16} className="text-gray-400" />
                                            </div>
                                        )}
                                        {editingCategory?.old === cat.name ? ( // Compare with cat.name
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
                                                <span className="font-medium text-gray-700 dark:text-gray-200">{cat.name}</span> {/* Use cat.name */}
                                                <div className="flex gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                                                    <button onClick={() => setEditingCategory({old: cat.name, new: cat.name})} className="text-gray-400 hover:text-blue-500 transition-colors p-1"><Edit3 size={12} /></button>
                                                    <button onClick={() => deleteCategory(cat.name)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><X size={14} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* Product Form (Modal) */}
        {isFormOpen && isEditMode && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto scale-100 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                      {editingId ? t('editProduct') : t('newProductHeader')}
                    </h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                  </div>
                  
                  <form onSubmit={handleProductSubmit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('productName')}</label>
                        <input 
                          required
                          value={newProduct.name}
                          onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                          placeholder={t('productName')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('category')}</label>
                        <select 
                          value={newProduct.category}
                          onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                          required
                        >
                          <option value="" disabled>{t('selectCategory')}</option>
                          {categories.map(c => c && c.name ? <option key={c.name} value={c.name}>{c.name}</option> : null)}
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3">{t('pricingMethod')}</label>
                        <div className="flex gap-4 mb-4">
                            <button
                                type="button"
                                onClick={() => setPricingMethod('fixed')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${pricingMethod === 'fixed' ? 'border-primary bg-red-50 dark:bg-red-900/20 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200'}`}
                            >
                                <Box size={20} />
                                <span className="font-bold">{t('fixedPrice')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPricingMethod('area')}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${pricingMethod === 'area' ? 'border-primary bg-red-50 dark:bg-red-900/20 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-200'}`}
                            >
                                <Ruler size={20} />
                                <span className="font-bold">{t('areaPrice')}</span>
                            </button>
                        </div>
                        
                        <div>
                            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                                {pricingMethod === 'fixed' ? t('price') : t('meterPrice')}
                            </label>
                            <input 
                                required
                                type="number"
                                value={newProduct.price}
                                onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-3">{t('extraServices')}</label>
                        
                        <div className="flex gap-2 mb-3">
                            <input 
                                placeholder={t('serviceName')}
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary text-sm dark:text-white"
                                value={currentService.name}
                                onChange={e => setCurrentService({...currentService, name: e.target.value})}
                            />
                            <input 
                                type="number"
                                placeholder="0.00"
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

                        {(services.length > 0 || (currentService.name && currentService.price)) && (
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
                                            <button type="button" onClick={() => removeService(idx)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
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
                        {t('cancel')}
                      </button>
                      <button 
                        type="submit"
                        disabled={displayCategories.length === 0}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-red-200 disabled:opacity-50 flex items-center gap-2"
                      >
                        {editingId ? <Save size={18} /> : <Plus size={18} />}
                        {editingId ? t('saveChanges') : t('saveProduct')}
                      </button>
                    </div>
                  </form>
                </div>
            </div>
        )}

        {/* --- Product List --- */}
        <div className="flex-1 overflow-y-auto pr-1 md:pr-2 pb-32 md:pb-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id} 
                className={`relative transition-all duration-200 ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, product)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, product)}
                style={{ opacity: draggedProduct?.id === product.id ? 0.4 : 1 }}
              >
                  <ProductCard 
                    product={product} 
                    onAdd={handleProductClick} 
                    onEdit={hasPermission('products.edit') && isEditMode ? handleEditClick : undefined}
                    onDelete={hasPermission('products.delete') && isEditMode ? handleInitDelete : undefined}
                  />
                  
                  {isEditMode && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                         <div className="bg-white/80 dark:bg-black/60 rounded-full p-3 shadow-sm backdrop-blur-[1px]">
                             <Grip size={24} className="text-gray-600 dark:text-gray-300" />
                         </div>
                      </div>
                  )}
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && (<div className="h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600"><p className="text-lg">{displayCategories.length === 0 ? t('addFirstCategory') : t('noProducts')}</p></div>)}
        </div>
      </div>

      {/* Desktop Cart Sidebar - Visible only on MD+ */}
      <div className="hidden md:block h-full">
          <CartSidebar />
      </div>

      {/* Mobile Cart Modal/Overlay */}
      {mobileCartOpen && (
          <div className="md:hidden fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col animate-in slide-in-from-bottom-full duration-300">
              <CartSidebar onClose={() => setMobileCartOpen(false)} />
          </div>
      )}

      {/* Mobile Cart Floating Action Bar */}
      {!mobileCartOpen && cart.length > 0 && (
          <div 
            className="md:hidden fixed bottom-20 left-3 right-3 bg-gray-900 dark:bg-gray-700 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center z-30 cursor-pointer hover:bg-gray-800 active:scale-95 transition-all border border-gray-700 dark:border-gray-600" 
            onClick={() => setMobileCartOpen(true)}
          >
             <div className="flex items-center gap-3">
                <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm text-sm">{totalItems}</div>
                <span className="font-bold flex items-center gap-2 text-sm"><ShoppingBag size={18}/> معاينة السلة <ChevronUp size={14} /></span>
             </div>
             <span className="font-bold text-lg text-primary">{totalAmount.toFixed(2)} <span className="text-xs text-gray-400">ج.م</span></span>
          </div>
      )}
      
      {/* Config Modal for Variable / Area Products Only */}
      {(configProduct || adHocProductMode) && (
          <ProductConfigModal 
              product={configProduct} 
              isOpen={!!configProduct || adHocProductMode} 
              onClose={() => { setConfigProduct(null); setAdHocProductMode(false); }} 
              onConfirm={(item) => { addToCart(item); setConfigProduct(null); setAdHocProductMode(false); }} 
              isAdHoc={adHocProductMode}
          />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('confirm')}</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذا المنتج؟</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              {t('cancel')}
                          </button>
                          <button 
                            type="button"
                            onClick={confirmDelete}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                          >
                              {t('delete')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default POSView;