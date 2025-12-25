
import React from 'react';
import { Edit3, Trash2, Shuffle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd, onEdit, onDelete }) => {
  
  const handleEdit = () => {
    if (onEdit) onEdit(product);
  };

  const handleDelete = () => {
    if (onDelete) {
        onDelete(product.id); // Trigger custom confirm modal in parent, or handle locally if needed
    }
  };

  return (
    <div className={`bg-card dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border group min-h-[140px] h-full relative overflow-hidden flex flex-col ${product.isVariable ? 'border-purple-200 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700 bg-purple-50/30 dark:bg-purple-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-red-100 dark:hover:border-red-900/50'}`}>
      
      {/* Decorative Side Bar */}
      <div className={`absolute top-0 right-0 w-1.5 h-full transition-colors duration-300 ${product.isVariable ? 'bg-purple-200 dark:bg-purple-800 group-hover:bg-purple-500' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-primary'}`}></div>
      
      {/* Action Buttons - Top Left - High Z-Index & Sibling to Click Area */}
      {(onEdit || onDelete) && (
          <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
              {onEdit && (
                  <button 
                    type="button"
                    onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        handleEdit(); 
                    }}
                    className="p-1.5 bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 rounded-lg shadow-sm hover:bg-blue-50 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 hover:scale-110 transition-transform"
                    title="تعديل"
                  >
                      <Edit3 size={14} />
                  </button>
              )}
              {onDelete && (
                  <button 
                    type="button"
                    onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        handleDelete(); 
                    }}
                    className="p-1.5 bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 hover:scale-110 transition-transform"
                    title="حذف"
                  >
                      <Trash2 size={14} />
                  </button>
              )}
          </div>
      )}

      {/* Main Content - Click Target for Add to Cart */}
      <div 
        onClick={() => !product.isVariable && onAdd(product)}
        className="flex-1 w-full p-4 flex flex-col justify-between cursor-pointer relative z-10"
      >
        <div className="mb-2">
            <div className="flex items-start gap-1 mb-1">
                {product.isVariable && <Shuffle size={14} className="text-purple-500 dark:text-purple-400 mt-1 shrink-0" />}
                <h3 className={`font-bold text-base md:text-lg leading-tight group-hover:text-primary transition-colors pr-2 break-words ${product.isVariable ? 'text-purple-900 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>
                    {product.name}
                </h3>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-xs pr-2 truncate">{product.category}</p>
        </div>
        
        <div className="flex items-center justify-end mt-auto pl-1 pr-2 pt-2">
            <span className={`font-bold text-lg ${product.isVariable ? 'text-purple-700 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                {product.isVariable ? 'متغير' : `${product.price.toFixed(2)}`}
                {!product.isVariable && <span className="text-xs font-normal text-gray-500 mr-1">ج.م</span>}
            </span>
        </div>
      </div>
      {product.isVariable && (
        <button
            onClick={() => onAdd(product)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-b-xl transition-colors duration-200 z-20 relative"
        >
            تكوين المنتج
        </button>
      )}
    </div>
  );
};

export default ProductCard;
