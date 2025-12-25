
import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Plus, Trash2, Edit3, User as UserIcon, Save, X, Shield, Package, Users, BarChart3, Wallet, Settings, Tag, Printer, Sparkles, CreditCard } from 'lucide-react';
import { User, Permission, UserRole } from '../types';

interface UsersViewProps {
    isEmbedded?: boolean;
}

const UsersView: React.FC<UsersViewProps> = ({ isEmbedded = false }) => {
  const { users, addUser, updateUser, deleteUser, t, currentUser, categories } = usePOS();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
      name: string;
      username: string;
      pin: string;
      role: UserRole;
      permissions: Permission[];
      allowedCategories: string[];
  }>({
      name: '',
      username: '',
      pin: '',
      role: 'user',
      permissions: ['pos.view'],
      allowedCategories: []
  });

  const resetForm = () => {
      setFormData({ name: '', username: '', pin: '', role: 'user', permissions: ['pos.view'], allowedCategories: [] });
      setEditingId(null);
      setIsFormOpen(false);
  };

  const handleEdit = (user: User) => {
      setFormData({
          name: user.name,
          username: user.username,
          pin: user.pin,
          role: user.role,
          permissions: user.permissions,
          allowedCategories: user.allowedCategories || []
      });
      setEditingId(user.id);
      setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingId) {
          updateUser(editingId, formData);
      } else {
          addUser(formData);
      }
      resetForm();
  };

  const togglePermission = (perm: Permission) => {
      setFormData(prev => {
          const exists = prev.permissions.includes(perm);
          if (exists) return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
          return { ...prev, permissions: [...prev.permissions, perm] };
      });
  };

  const toggleGroup = (perms: Permission[]) => {
      const allSelected = perms.every(p => formData.permissions.includes(p));
      if (allSelected) {
          // Deselect all
          setFormData(prev => ({ ...prev, permissions: prev.permissions.filter(p => !perms.includes(p)) }));
      } else {
          // Select all
          setFormData(prev => ({ ...prev, permissions: Array.from(new Set([...prev.permissions, ...perms])) }));
      }
  };

  const toggleCategory = (cat: string) => {
      setFormData(prev => {
          const exists = prev.allowedCategories.includes(cat);
          if (exists) return { ...prev, allowedCategories: prev.allowedCategories.filter(c => c !== cat) };
          return { ...prev, allowedCategories: [...prev.allowedCategories, cat] };
      });
  };

  const toggleAllCategories = () => {
      if (formData.allowedCategories.length === categories.length) {
          setFormData(prev => ({ ...prev, allowedCategories: [] }));
      } else {
          setFormData(prev => ({ ...prev, allowedCategories: categories.map(c => c.name) }));
      }
  };

  // Comprehensive Permission Groups
  const permissionGroups: { titleKey: string, icon: any, perms: Permission[] }[] = [
      {
          titleKey: 'pos',
          icon: Shield,
          perms: ['pos.view', 'pos.variable_product']
      },
      {
          titleKey: 'products',
          icon: Package,
          perms: ['products.view', 'products.add', 'products.edit', 'products.delete', 'products.manage_categories']
      },
      {
          titleKey: 'customers',
          icon: Users,
          perms: ['customers.view', 'customers.add', 'customers.edit', 'customers.delete']
      },
      {
          titleKey: 'expenses',
          icon: Wallet,
          perms: ['expenses.view', 'expenses.add', 'expenses.edit', 'expenses.delete']
      },
      {
          titleKey: 'reports',
          icon: BarChart3,
          perms: ['reports.view', 'reports.delete_transaction']
      },
      {
          titleKey: 'credits',
          icon: CreditCard,
          perms: ['credits.view']
      },
      {
          titleKey: 'machines',
          icon: Printer,
          perms: ['machines.view', 'machines.manage']
      },
      {
          titleKey: 'ai',
          icon: Sparkles,
          perms: ['ai.chat']
      },
      {
          titleKey: 'settings',
          icon: Settings,
          perms: ['settings.manage', 'users.manage']
      }
  ];

  if (!currentUser || currentUser.role !== 'admin') {
      return <div className="p-8 text-center text-red-500 font-bold">{t('accessDenied')}</div>;
  }

  return (
    <div className={`${isEmbedded ? 'animate-in fade-in slide-in-from-bottom-4' : 'p-8 h-full overflow-y-auto'}`}>
      {!isEmbedded && (
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('usersManagement')}</h1>
              <p className="text-gray-400 dark:text-gray-500 mt-1">{t('usersDesc')}</p>
            </div>
            <button 
              onClick={() => { resetForm(); setIsFormOpen(true); }}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              {t('newUser')}
            </button>
          </div>
      )}

      {isEmbedded && !isFormOpen && (
          <div className="flex justify-between items-center mb-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                      <Shield size={20} className="text-primary"/>
                      {t('usersManagement')}
                  </h3>
                  <p className="text-sm text-gray-400">{t('usersDesc')}</p>
              </div>
              <button 
                onClick={() => { resetForm(); setIsFormOpen(true); }}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold shadow transition-all flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                {t('newUser')}
              </button>
          </div>
      )}

      {isFormOpen && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">{editingId ? t('edit') : t('newUser')}</h3>
                  <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('fullName')}</label>
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('username')}</label>
                          <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('pinCode')}</label>
                          <input required value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white" />
                      </div>
                  </div>

                  <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('role')}</label>
                      <div className="flex gap-4">
                          <button type="button" onClick={() => setFormData({...formData, role: 'admin'})} className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${formData.role === 'admin' ? 'border-primary bg-red-50 dark:bg-red-900/30 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-500'}`}>
                              <Shield size={18} /> {t('admin')}
                          </button>
                          <button type="button" onClick={() => setFormData({...formData, role: 'user'})} className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${formData.role === 'user' ? 'border-primary bg-red-50 dark:bg-red-900/30 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-500'}`}>
                              <UserIcon size={18} /> {t('user')}
                          </button>
                      </div>
                  </div>

                  {formData.role === 'user' && (
                      <>
                        {/* Category Permissions */}
                        <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Tag size={16} />
                                    صلاحيات التصنيفات
                                    <span className="text-xs font-normal text-gray-500">(حدد التصنيفات المسموح للكاشير رؤيتها)</span>
                                </label>
                                <button type="button" onClick={toggleAllCategories} className="text-xs text-primary hover:underline">
                                    {formData.allowedCategories.length === categories.length ? t('deselectAll') : t('selectAll')}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                {categories.map(cat => (
                                    <label key={cat.name} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors border border-transparent hover:border-gray-200">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.allowedCategories.includes(cat.name)} 
                                            onChange={() => toggleCategory(cat.name)} 
                                            className="accent-primary w-4 h-4" 
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                                    </label>
                                ))}
                                {categories.length === 0 && <span className="text-sm text-gray-400 p-2">لا توجد تصنيفات مضافة</span>}
                            </div>
                        </div>

                        {/* Functional Permissions */}
                        <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">{t('permissions')}</label>
                            </div>
                            
                            <div className="space-y-4">
                                {permissionGroups.map((group) => (
                                    <div key={group.titleKey} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                                                <group.icon size={16} />
                                                {t(group.titleKey)}
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => toggleGroup(group.perms)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {group.perms.every(p => formData.permissions.includes(p)) ? t('deselectAll') : t('selectAll')}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {group.perms.map(perm => (
                                                <label key={perm} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                                                    <input type="checkbox" checked={formData.permissions.includes(perm)} onChange={() => togglePermission(perm)} className="accent-primary w-4 h-4" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-300">{t(`perm_${perm.replace('.', '_')}`)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                      </>
                  )}

                  <div className="flex justify-end gap-3">
                      <button type="button" onClick={resetForm} className="px-6 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold">{t('cancel')}</button>
                      <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover flex items-center gap-2">
                          <Save size={18} /> {t('save')}
                      </button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
              <div key={user.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-900/50 transition-all">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${user.role === 'admin' ? 'bg-gray-800' : 'bg-primary'}`}>
                              {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-gray-800 dark:text-white">{user.name}</h3>
                              <p className="text-sm text-gray-400">@{user.username}</p>
                          </div>
                      </div>
                      <div className="flex gap-1">
                          <button onClick={() => handleEdit(user)} className="text-gray-400 hover:text-blue-500 p-1"><Edit3 size={18} /></button>
                          {users.length > 1 && <button onClick={() => deleteUser(user.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>}
                      </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                          {user.role === 'admin' ? t('admin') : t('user')}
                      </span>
                  </div>
                  {user.role === 'user' && (
                      <div className="space-y-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-1 items-center">
                              <Shield size={12} /> {user.permissions.length} {t('permissions')}
                          </div>
                          {user.allowedCategories && user.allowedCategories.length > 0 && (
                              <div className="text-xs text-blue-500 dark:text-blue-400 flex flex-wrap gap-1 items-center">
                                  <Tag size={12} /> {user.allowedCategories.length} تصنيفات مسموحة
                              </div>
                          )}
                      </div>
                  )}
              </div>
          ))}
      </div>
    </div>
  );
};

export default UsersView;
