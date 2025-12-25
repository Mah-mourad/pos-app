
import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import { Save, Eye, Upload, X, ArrowUp, ArrowDown, AlignLeft, AlignCenter, AlignRight, Type, EyeOff, Database, Palette, Layout, Download, UploadCloud, Trash2, CheckCircle, RefreshCcw, Table, ScrollText, DollarSign, Store, Facebook, Instagram, Globe, MonitorSmartphone, List, Cloud, Link as LinkIcon, Copy, Shield, Sparkles, Key, ExternalLink } from 'lucide-react';
import { ReceiptItemConfig, ViewState } from '../types';
import { APP_THEMES, DEFAULT_APP_SETTINGS } from '../constants';
import UsersView from './UsersView';

type SettingsTab = 'appearance' | 'receipt' | 'connection' | 'users';

const SettingsView: React.FC = () => {
  const { receiptSettings, updateReceiptSettings, appSettings, updateAppSettings, t, serverStatus, hasPermission, aiSettings, updateAiSettings } = usePOS();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [localReceiptSettings, setLocalReceiptSettings] = useState(receiptSettings);
  const [localAppSettings, setLocalAppSettings] = useState(appSettings);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Config State
  const [supabaseConfig, setSupabaseConfig] = useState({
      url: '',
      key: ''
  });
  const [isSupabaseSaving, setIsSupabaseSaving] = useState(false);

  // AI Config State (Local to component for editing)
  const [localAiConfig, setLocalAiConfig] = useState(aiSettings);
  const [isAiSaving, setIsAiSaving] = useState(false);

  useEffect(() => {
      // Load Supabase Config
      const savedConfig = localStorage.getItem('pos_supabase_config');
      if (savedConfig) {
          try {
              setSupabaseConfig(JSON.parse(savedConfig));
          } catch (e) {
              console.error("Error parsing saved config", e);
          }
      } else {
          // Fallback to default credentials if not configured locally
          setSupabaseConfig({
              url: 'https://kdqmnfiynswwlezopmuh.supabase.co',
              key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcW1uZml5bnN3d2xlem9wbXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNDI5MTgsImV4cCI6MjA3OTcxODkxOH0.GzZbcrjEYTEBAMUcqYM1g58nvIo0c3OyADEdtrS7bEU'
          });
      }
  }, []);

  // Sync if context updates externally
  useEffect(() => {
    setLocalReceiptSettings(receiptSettings);
  }, [receiptSettings]);

  useEffect(() => {
    setLocalAiConfig(aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    // Ensure menuOrder exists (migration fix)
    const settingsWithDefaults = {
        ...appSettings,
        menuOrder: appSettings.menuOrder || DEFAULT_APP_SETTINGS.menuOrder
    };
    setLocalAppSettings(settingsWithDefaults);
  }, [appSettings]);

  const handleSave = () => {
    updateReceiptSettings(localReceiptSettings);
    updateAppSettings(localAppSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveSupabase = () => {
      if (!supabaseConfig.url || !supabaseConfig.key) {
          alert('يرجى إدخال Project URL و API Key.');
          return;
      }

      setIsSupabaseSaving(true);

      try {
          // Clean URL (remove trailing slash if exists)
          let cleanUrl = supabaseConfig.url.trim();
          if (cleanUrl.endsWith('/')) {
              cleanUrl = cleanUrl.slice(0, -1);
          }

          const configToSave = {
              url: cleanUrl,
              key: supabaseConfig.key.trim()
          };

          localStorage.setItem('pos_supabase_config', JSON.stringify(configToSave));
          
          setTimeout(() => {
             window.location.reload();
          }, 1500);
          
      } catch (err) {
          console.error("Failed to save config:", err);
          alert('حدث خطأ أثناء حفظ الإعدادات.');
          setIsSupabaseSaving(false);
      }
  };

  const handleSaveAi = () => {
      setIsAiSaving(true);
      try {
          updateAiSettings({ apiKey: localAiConfig.apiKey.trim() });
          
          setTimeout(() => {
              setIsAiSaving(false);
              alert(t('saveSuccess'));
          }, 500);
      } catch (err) {
          console.error("Failed to save AI config:", err);
          setIsAiSaving(false);
      }
  };

  const copySQL = () => {
      // Permissions for the default admin
      const permissions = JSON.stringify([
        "pos.view", "pos.variable_product",
        "products.view", "products.add", "products.edit", "products.delete", "products.manage_categories",
        "customers.view", "customers.add", "customers.edit", "customers.delete",
        "reports.view", "reports.delete_transaction",
        "credits.view",
        "expenses.view", "expenses.add", "expenses.edit", "expenses.delete",
        "machines.view", "machines.manage",
        "settings.manage", "users.manage", "ai.chat"
      ]);

      const sql = `
-- 1. إنشاء الجداول (Create Tables)
create table if not exists products ( id text primary key, name text, price numeric, category text, "pricingMethod" text, services jsonb, "isVariable" boolean );
create table if not exists categories ( name text primary key );
create table if not exists transactions ( id text primary key, date text, "itemsCount" numeric, total numeric, "paymentMethod" text, "customerId" text, "customerName" text, items jsonb, "isPaid" boolean, payments jsonb, "type" text, "relatedTransactionId" text );
create table if not exists customers ( id text primary key, name text, phone text, notes text );
create table if not exists expenses ( id text primary key, title text, amount numeric, date text, notes text );
create table if not exists machines ( id text primary key, name text, "initialReading" numeric );
create table if not exists machine_readings ( id text primary key, "machineId" text, value numeric, date text, notes text );
create table if not exists users ( id text primary key, username text, pin text, role text, permissions jsonb, name text, "allowedCategories" jsonb );
create table if not exists settings ( key text primary key, value jsonb );
create table if not exists suppliers ( id text primary key, name text, items jsonb, "draftCart" jsonb );

-- 2. إضافة المستخدم الافتراضي (Default Admin User)
INSERT INTO users (id, name, username, pin, role, permissions)
VALUES ('1', 'المدير العام', 'admin', '1234', 'admin', '${permissions}')
ON CONFLICT (id) DO NOTHING;

-- 3. تفعيل التحديث اللحظي (Enable Realtime)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'products') then
    alter publication supabase_realtime add table products, categories, transactions, customers, expenses, machines, machine_readings, users, settings, suppliers;
  end if;
end $$;

-- 4. تفعيل سياسات الأمان (RLS Policies - Public Access)
-- ملاحظة: هذه السياسات تسمح بالقراءة والكتابة للجميع لتسهيل عمل التطبيق كـ POS
-- في بيئة الإنتاج الحقيقية يفضل تقييدها، ولكن هنا نعتمد على أن التطبيق يعمل في بيئة مسيطر عليها

alter table products enable row level security; 
create policy "AllowAll" on products for all using (true) with check (true);

alter table categories enable row level security; 
create policy "AllowAll" on categories for all using (true) with check (true);

alter table transactions enable row level security; 
create policy "AllowAll" on transactions for all using (true) with check (true);

alter table customers enable row level security; 
create policy "AllowAll" on customers for all using (true) with check (true);

alter table expenses enable row level security; 
create policy "AllowAll" on expenses for all using (true) with check (true);

alter table machines enable row level security; 
create policy "AllowAll" on machines for all using (true) with check (true);

alter table machine_readings enable row level security; 
create policy "AllowAll" on machine_readings for all using (true) with check (true);

alter table users enable row level security; 
create policy "AllowAll" on users for all using (true) with check (true);

alter table settings enable row level security; 
create policy "AllowAll" on settings for all using (true) with check (true);

alter table suppliers enable row level security; 
create policy "AllowAll" on suppliers for all using (true) with check (true);
      `;
      navigator.clipboard.writeText(sql);
      alert('تم نسخ كود SQL المحدث! يمكنك لصقه الآن في Supabase SQL Editor.');
  };

  const handleChangeReceipt = (field: keyof typeof localReceiptSettings, value: any) => {
    setLocalReceiptSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleChangeApp = (field: keyof typeof localAppSettings, value: any) => {
    setLocalAppSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('Size too large');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          handleChangeReceipt('logo', result);
          handleChangeApp('appLogo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...localReceiptSettings.layout];
    if (direction === 'up' && index > 0) {
      [newLayout[index], newLayout[index - 1]] = [newLayout[index - 1], newLayout[index]];
    } else if (direction === 'down' && index < newLayout.length - 1) {
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
    }
    handleChangeReceipt('layout', newLayout);
  };

  const moveMenuItem = (index: number, direction: 'up' | 'down') => {
      if (!localAppSettings.menuOrder) return;
      const newOrder = [...localAppSettings.menuOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      handleChangeApp('menuOrder', newOrder);
  };

  const resetMenuOrder = () => {
      handleChangeApp('menuOrder', DEFAULT_APP_SETTINGS.menuOrder);
  };

  const getMenuLabel = (view: ViewState) => {
      switch(view) {
          case ViewState.POS: return t('pos');
          case ViewState.PRODUCTS: return t('products');
          case ViewState.REPORTS: return t('reports');
          case ViewState.EXPENSES: return t('expenses');
          case ViewState.CREDITS: return t('credits');
          case ViewState.CUSTOMERS: return t('customers');
          case ViewState.SETTINGS: return t('settings');
          case ViewState.MACHINES: return t('machines');
          case ViewState.USERS: return t('usersManagement');
          case ViewState.AI: return t('ai');
          default: return view;
      }
  };

  const updateItemConfig = (index: number, updates: Partial<ReceiptItemConfig>) => {
    const newLayout = [...localReceiptSettings.layout];
    newLayout[index] = { ...newLayout[index], ...updates };
    handleChangeReceipt('layout', newLayout);
  };

  const getImageHeight = (size: string) => {
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

  const renderPreviewItem = (item: ReceiptItemConfig) => {
    if (!item.visible) return null;
    const style = { 
      textAlign: item.align,
      fontSize: item.fontSize === 'xs' ? '0.7rem' : item.fontSize === 'sm' ? '0.8rem' : item.fontSize === 'base' ? '1rem' : item.fontSize === 'lg' ? '1.25rem' : item.fontSize === 'xl' ? '1.5rem' : '2rem',
    };
    const currency = localReceiptSettings.currency || 'ج.م';
    const cols = localReceiptSettings.tableConfig;

    switch (item.id) {
      case 'logo': return localReceiptSettings.logo ? (<div style={{ display: 'flex', justifyContent: item.align === 'center' ? 'center' : item.align === 'left' ? 'flex-start' : 'flex-end', marginBottom: '10px' }}><img src={localReceiptSettings.logo} alt="Logo" style={{ maxHeight: getImageHeight(item.fontSize) }} className="object-contain grayscale" /></div>) : null;
      case 'storeName': return <div style={{...style, fontWeight: 'bold', marginBottom: '4px'}}>{localReceiptSettings.storeName || 'Store Name'}</div>;
      case 'address': return <div style={{...style, marginBottom: '2px'}}>{localReceiptSettings.address || 'Address'}</div>;
      case 'contact': return <div style={{...style, marginBottom: '4px'}}>{localReceiptSettings.phone || 'Phone'}</div>;
      case 'separator': return <div style={{borderBottom: '2px dashed #ccc', margin: '10px 0'}}></div>;
      case 'meta': return (<div style={{...style, color: '#666', marginBottom: '10px'}}><div>{new Date().toLocaleString()}</div><div>Invoice #123456</div>{localReceiptSettings.taxNumber && <div>Tax ID: {localReceiptSettings.taxNumber}</div>}</div>);
      case 'items': return (<div style={{ fontSize: style.fontSize, margin: '10px 0' }}><div className="flex border-b border-black pb-1 mb-1 font-bold gap-1 text-center"><span className="flex-[2] text-right">{cols.labelName}</span>{cols.showPrice && <span className="flex-1">{cols.labelPrice}</span>}{cols.showQuantity && <span className="flex-1">{cols.labelQuantity}</span>}<span className="flex-1 text-left">{cols.labelTotal}</span></div><div className="flex mb-1 gap-1 text-center items-center"><span className="flex-[2] text-right truncate">Item A</span>{cols.showPrice && <span className="flex-1">15.00</span>}{cols.showQuantity && <span className="flex-1">1</span>}<span className="flex-1 text-left">15.00</span></div></div>);
      case 'totals': return (<div style={{...style, fontWeight: 'bold', margin: '10px 0', borderTop: '1px dashed #000', paddingTop: '5px'}}><div className="flex justify-between"><span>Total</span><span>15.00 {currency}</span></div></div>);
      case 'qr': return localReceiptSettings.showQr ? (<div style={{...style, margin: '10px 0', display: 'flex', justifyContent: 'center'}}><div className="w-20 h-20 bg-gray-200 flex items-center justify-center text-xs text-gray-500 border border-gray-300">QR Code</div></div>) : null;
      case 'footer': return <div style={{...style, marginTop: '10px'}}>{localReceiptSettings.footerMessage || 'Footer Message'}</div>;
      default: return null;
    }
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="p-4 md:p-8 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{t('settingsTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">{t('settingsSubtitle')}</p>
        </div>
        {activeTab !== 'connection' && activeTab !== 'users' && (
            <button 
            onClick={handleSave}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${isSaved ? 'bg-green-600 text-white shadow-green-200' : 'bg-primary hover:bg-primary-hover text-white shadow-red-200'}`}
            >
            {isSaved ? <CheckCircle size={20} /> : <Save size={20} />}
            <span className="hidden md:inline">{isSaved ? t('saveSuccess') : t('save')}</span>
            <span className="md:hidden">{isSaved ? t('saveSuccess') : t('save')}</span>
            </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="w-full md:w-64 bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-l border-gray-200 dark:border-gray-700 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 scrollbar-hide">
             <button onClick={() => setActiveTab('appearance')} className={`flex-1 md:flex-none whitespace-nowrap md:w-full text-right p-3 md:p-4 rounded-xl font-bold flex items-center justify-center md:justify-start gap-3 transition-all min-w-fit ${activeTab === 'appearance' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                 <Palette size={20} /> <span className="hidden md:inline">{t('tabAppearance')}</span><span className="md:hidden">المظهر</span>
             </button>
             <button onClick={() => setActiveTab('receipt')} className={`flex-1 md:flex-none whitespace-nowrap md:w-full text-right p-3 md:p-4 rounded-xl font-bold flex items-center justify-center md:justify-start gap-3 transition-all min-w-fit ${activeTab === 'receipt' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                 <Layout size={20} /> <span className="hidden md:inline">{t('tabReceipt')}</span><span className="md:hidden">الفاتورة</span>
             </button>
             {hasPermission('users.manage') && (
                 <button onClick={() => setActiveTab('users')} className={`flex-1 md:flex-none whitespace-nowrap md:w-full text-right p-3 md:p-4 rounded-xl font-bold flex items-center justify-center md:justify-start gap-3 transition-all min-w-fit ${activeTab === 'users' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                     <Shield size={20} /> <span className="hidden md:inline">{t('usersManagement')}</span><span className="md:hidden">المستخدمين</span>
                 </button>
             )}
             <button onClick={() => setActiveTab('connection')} className={`flex-1 md:flex-none whitespace-nowrap md:w-full text-right p-3 md:p-4 rounded-xl font-bold flex items-center justify-center md:justify-start gap-3 transition-all min-w-fit ${activeTab === 'connection' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                 <Cloud size={20} /> <span className="hidden md:inline">حالة السحابة</span><span className="md:hidden">السحابة</span>
             </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {activeTab === 'users' && (
                <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4">
                    <UsersView isEmbedded />
                </div>
            )}

            {activeTab === 'connection' && (
                <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                     
                     {/* Supabase Config */}
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white">
                            <Cloud size={20} className="text-gray-400" />
                            إعدادات السيرفر (Supabase)
                        </h3>
                        
                        <div className={`p-4 rounded-xl border mb-6 flex items-center gap-3 ${serverStatus ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {serverStatus ? <CheckCircle size={24} /> : <X size={24} />}
                            <div>
                                <div className="font-bold">{serverStatus ? 'متصل بالسحابة بنجاح (Supabase)' : 'غير متصل / لم يتم ضبط الإعدادات'}</div>
                                <div className="text-sm opacity-80">{serverStatus ? 'يتم مزامنة البيانات بشكل لحظي' : 'يرجى إدخال بيانات الربط الخاصة بمشروعك في الأسفل'}</div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-200 mb-6">
                            <h4 className="font-bold flex items-center gap-2 mb-2"><LinkIcon size={16}/> خطوات التشغيل (هام):</h4>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>أنشئ مشروعاً جديداً على <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold">Supabase</a>.</li>
                                <li>انسخ <code>Project URL</code> و <code>anon key</code> من إعدادات المشروع (API Settings).</li>
                                <li>
                                    <strong className="text-red-600">خطوة ضرورية:</strong> اذهب إلى <strong>SQL Editor</strong> في Supabase وألصق الكود التالي لإنشاء الجداول والمدير العام:
                                    <button onClick={copySQL} className="mr-2 px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1 inline-flex">
                                        <Copy size={12} /> نسخ كود SQL (محدث)
                                    </button>
                                </li>
                            </ol>
                        </div>

                        <div className="grid grid-cols-1 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Project URL</label>
                                <input value={supabaseConfig.url} onChange={e => setSupabaseConfig({...supabaseConfig, url: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none font-mono text-sm dark:text-white" placeholder="https://xyz.supabase.co" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Anon API Key</label>
                                <input value={supabaseConfig.key} onChange={e => setSupabaseConfig({...supabaseConfig, key: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none font-mono text-sm dark:text-white" />
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveSupabase} 
                            disabled={isSupabaseSaving}
                            className={`w-full py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${isSupabaseSaving ? 'bg-green-700 text-white cursor-wait' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                            {isSupabaseSaving ? <RefreshCcw size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
                            {isSupabaseSaving ? 'جاري الحفظ...' : 'حفظ إعدادات السيرفر وإعادة التشغيل'}
                        </button>
                     </div>

                     {/* AI Config */}
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white">
                            <Sparkles size={20} className="text-purple-500" />
                            إعدادات المساعد الذكي (AI)
                        </h3>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 mb-6 text-sm">
                            <h4 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2">
                                <Key size={16} /> كيفية الحصول على المفتاح (API Key)؟
                            </h4>
                            <ol className="list-decimal list-inside space-y-1.5 text-purple-700 dark:text-purple-400">
                                <li>
                                    اذهب إلى موقع <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold inline-flex items-center gap-1">Google AI Studio <ExternalLink size={12}/></a>.
                                </li>
                                <li>اضغط على زر <strong>"Get API key"</strong> ثم <strong>"Create API key"</strong>.</li>
                                <li>انسخ المفتاح الذي يظهر لك وقم بلصقه في الخانة أدناه.</li>
                            </ol>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">Google Gemini API Key</label>
                            <input 
                                value={localAiConfig.apiKey} 
                                onChange={e => setLocalAiConfig({...localAiConfig, apiKey: e.target.value})} 
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none font-mono text-sm dark:text-white" 
                                placeholder="AIzaSy..." 
                                type="password"
                            />
                        </div>

                        <button 
                            onClick={handleSaveAi} 
                            disabled={isAiSaving}
                            className={`w-full py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${isAiSaving ? 'bg-purple-700 text-white cursor-wait' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                        >
                            <Save size={20} />
                            {isAiSaving ? 'جاري الحفظ...' : 'حفظ مفتاح API'}
                        </button>
                     </div>
                </div>
            )}

            {activeTab === 'appearance' && (
                <div className="max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white"><Store size={20} className="text-gray-400" />{t('storeInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('storeName')}</label><input value={localReceiptSettings.storeName} onChange={(e) => { handleChangeReceipt('storeName', e.target.value); handleChangeApp('appName', e.target.value); }} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('phone')}</label><input value={localReceiptSettings.phone} onChange={(e) => handleChangeReceipt('phone', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white" /></div>
                            </div>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('address')}</label><input value={localReceiptSettings.address} onChange={(e) => handleChangeReceipt('address', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('logo')}</label><div className="flex gap-3 items-center">{localReceiptSettings.logo && <img src={localReceiptSettings.logo} className="h-10 w-10 object-contain rounded border border-gray-200 dark:border-gray-700" alt="Logo" />}<label className="cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><Upload size={16} /><span>{t('uploadImage')}</span><input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /></label></div></div>
                            </div>
                        </div>
                         <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 text-sm">{t('socialLinks')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative"><Facebook size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Facebook" value={localReceiptSettings.facebook || ''} onChange={(e) => handleChangeReceipt('facebook', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pr-9 text-sm outline-none focus:border-primary dark:text-white" /></div>
                                <div className="relative"><Instagram size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Instagram" value={localReceiptSettings.instagram || ''} onChange={(e) => handleChangeReceipt('instagram', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pr-9 text-sm outline-none focus:border-primary dark:text-white" /></div>
                                <div className="relative"><Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Website" value={localReceiptSettings.website || ''} onChange={(e) => handleChangeReceipt('website', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pr-9 text-sm outline-none focus:border-primary dark:text-white" /></div>
                            </div>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white"><Palette size={20} className="text-gray-400" />{t('themeColor')}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {APP_THEMES.map(theme => (
                                    <button key={theme.id} onClick={() => handleChangeApp('theme', theme.id)} className={`relative p-3 rounded-xl border-2 transition-all group overflow-hidden ${localAppSettings.theme === theme.id ? 'border-gray-800 dark:border-white ring-2 ring-gray-200 dark:ring-gray-600' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                                        <div className="h-12 w-full rounded-lg mb-2 shadow-sm flex flex-col overflow-hidden"><div className="h-full w-4" style={{ backgroundColor: `rgb(${theme.sidebarColor})` }}></div><div className="flex-1 -mt-12 mr-4 bg-gray-50 dark:bg-gray-900 relative"><div className="absolute top-1 right-1 left-1 h-1.5 rounded" style={{ backgroundColor: `rgb(${theme.primaryColor})` }}></div></div></div>
                                        <span className={`block text-center font-bold text-xs ${localAppSettings.theme === theme.id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t(`theme_${theme.id}`)}</span>
                                        {localAppSettings.theme === theme.id && <div className="absolute top-1 left-1 bg-gray-800 text-white p-0.5 rounded-full"><CheckCircle size={10} /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white"><MonitorSmartphone size={20} className="text-gray-400" />{t('uiCustomization')}</h3>
                            <div className="space-y-6">
                                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex justify-between"><span>{t('fontSize')}</span><span className="text-gray-400 text-xs">{(localAppSettings.fontScale || 1) * 100}%</span></label><input type="range" min="0.8" max="1.2" step="0.05" value={localAppSettings.fontScale || 1} onChange={(e) => handleChangeApp('fontScale', parseFloat(e.target.value))} className="w-full accent-primary h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer" /><div className="flex justify-between text-xs text-gray-400 mt-1"><span>{t('small')}</span><span>{t('medium')}</span><span>{t('large')}</span></div></div>
                                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('appLanguage')}</label><div className="flex gap-2"><button onClick={() => handleChangeApp('language', 'ar')} className={`flex-1 p-2 border rounded-lg flex items-center justify-center gap-2 text-sm ${localAppSettings.language === 'ar' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}><span className="font-bold">العربية</span></button><button onClick={() => handleChangeApp('language', 'en')} className={`flex-1 p-2 border rounded-lg flex items-center justify-center gap-2 text-sm ${localAppSettings.language === 'en' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}><span className="font-bold">English</span></button></div></div>
                                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('menuStyle')}</label><div className="flex gap-2"><button onClick={() => handleChangeApp('layoutMode', 'sidebar')} className={`flex-1 p-2 border rounded-lg flex items-center justify-center gap-2 text-sm ${localAppSettings.layoutMode === 'sidebar' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}><Layout size={16} className="rotate-90" /><span>{t('sidebar')}</span></button><button onClick={() => handleChangeApp('layoutMode', 'topbar')} className={`flex-1 p-2 border rounded-lg flex items-center justify-center gap-2 text-sm ${localAppSettings.layoutMode === 'topbar' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}><Layout size={16} /><span>{t('topbar')}</span></button></div></div>
                                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('buttonStyle')}</label><div className="flex gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-100 dark:border-gray-700">{['none', 'sm', 'md', 'lg', 'full'].map((r) => (<button key={r} onClick={() => handleChangeApp('borderRadius', r)} className={`flex-1 py-1.5 text-xs font-bold transition-all ${(localAppSettings.borderRadius || 'lg') === r ? 'bg-white dark:bg-gray-700 text-primary shadow-sm rounded-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{r === 'none' ? t('square') : r === 'full' ? t('rounded') : r}</button>))}</div></div>
                                
                                {/* Menu Ordering Section */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('menuOrdering')}</label>
                                        <button onClick={resetMenuOrder} className="text-xs text-primary hover:underline">{t('resetOrder')}</button>
                                    </div>
                                    <div className="space-y-2 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                        {localAppSettings.menuOrder && localAppSettings.menuOrder.map((item, idx) => (
                                            <div key={item} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700 shadow-sm">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><List size={14} className="text-gray-400"/> {getMenuLabel(item)}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => moveMenuItem(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 disabled:opacity-30"><ArrowUp size={14}/></button>
                                                    <button onClick={() => moveMenuItem(idx, 'down')} disabled={idx === localAppSettings.menuOrder!.length - 1} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 disabled:opacity-30"><ArrowDown size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'receipt' && (
                <div className="flex flex-col xl:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-full xl:w-[400px] xl:sticky xl:top-8 order-2 xl:order-1">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <div className="bg-gray-800 text-white p-4 flex items-center justify-center gap-2 font-bold"><Eye size={18} /> {t('livePreview')}</div>
                            <div className="bg-gray-200 dark:bg-gray-900 p-8 min-h-[500px] flex justify-center items-start overflow-y-auto">
                            <div className="bg-white shadow-sm p-4 text-black font-mono leading-relaxed relative animate-in fade-in zoom-in-95 duration-300 transition-all" style={{ width: localReceiptSettings.paperSize === '58mm' ? '58mm' : (localReceiptSettings.paperSize === 'A4' ? '100%' : '80mm') }}>
                                {localReceiptSettings.paperSize !== 'A4' && (<div className="absolute top-0 left-0 right-0 h-4 bg-gray-200" style={{clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'}}></div>)}
                                <div className="py-4 space-y-1">{localReceiptSettings.layout.map((item, index) => (<div key={`${item.id}-${index}`} className="relative group border border-transparent hover:border-blue-200 hover:bg-blue-50/30 transition-colors">{renderPreviewItem(item)}</div>))}</div>
                                {localReceiptSettings.paperSize !== 'A4' && (<div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200" style={{clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)'}}></div>)}
                            </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full order-1 xl:order-2 space-y-8">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                             <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white"><ScrollText size={20} className="text-gray-400" />{t('paperAndCurrency')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('paperSize')}</label><div className="flex gap-2">{['80mm', '58mm', 'A4'].map(size => (<button key={size} onClick={() => handleChangeReceipt('paperSize', size)} className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${localReceiptSettings.paperSize === size ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>{size}</button>))}</div></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('currencySymbol')}</label><div className="relative"><DollarSign size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={localReceiptSettings.currency} onChange={(e) => handleChangeReceipt('currency', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pr-9 outline-none focus:border-primary dark:text-white" /></div></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('taxNumber')}</label><input value={localReceiptSettings.taxNumber || ''} onChange={(e) => handleChangeReceipt('taxNumber', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:border-primary dark:text-white" /></div>
                                <div className="flex items-center gap-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">QR Code</label><button onClick={() => handleChangeReceipt('showQr', !localReceiptSettings.showQr)} className={`w-12 h-6 rounded-full transition-colors relative ${localReceiptSettings.showQr ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${localReceiptSettings.showQr ? 'left-1' : 'left-7'}`}></div></button></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('footerMessage')}</label><textarea value={localReceiptSettings.footerMessage} onChange={(e) => handleChangeReceipt('footerMessage', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:border-primary dark:text-white" rows={3}/></div>
                            </div>
                        </div>

                         <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white"><Table size={20} className="text-gray-400" />{t('productTable')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:text-white"><input type="checkbox" checked={localReceiptSettings.tableConfig.showPrice} onChange={(e) => handleChangeReceipt('tableConfig', {...localReceiptSettings.tableConfig, showPrice: e.target.checked})} /><span className="text-sm font-bold">{t('showUnitPrice')}</span></label><label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:text-white"><input type="checkbox" checked={localReceiptSettings.tableConfig.showQuantity} onChange={(e) => handleChangeReceipt('tableConfig', {...localReceiptSettings.tableConfig, showQuantity: e.target.checked})} /><span className="text-sm font-bold">{t('showQuantity')}</span></label></div>
                                <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-gray-500 block mb-1">{t('labelItem')}</label><input className="w-full text-sm p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={localReceiptSettings.tableConfig.labelName} onChange={(e) => handleChangeReceipt('tableConfig', {...localReceiptSettings.tableConfig, labelName: e.target.value})} /></div><div><label className="text-xs text-gray-500 block mb-1">{t('labelTotal')}</label><input className="w-full text-sm p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={localReceiptSettings.tableConfig.labelTotal} onChange={(e) => handleChangeReceipt('tableConfig', {...localReceiptSettings.tableConfig, labelTotal: e.target.value})} /></div></div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 text-gray-800 dark:text-white"><AlignLeft size={20} className="text-gray-400" />{t('layoutOrder')}</h3>
                            <div className="space-y-3">{localReceiptSettings.layout.map((item, index) => (<div key={`${item.id}-${index}`} className={`flex flex-col md:flex-row items-center gap-4 p-3 rounded-xl border transition-all ${item.visible ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60'}`}><div className="flex flex-row md:flex-col gap-1"><button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ArrowUp size={18} /></button><button onClick={() => moveItem(index, 'down')} disabled={index === localReceiptSettings.layout.length - 1} className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ArrowDown size={18} /></button></div><div className="flex-1 font-bold text-gray-700 dark:text-gray-200 min-w-[150px] flex items-center gap-2">{item.visible ? <Eye size={16} className="text-green-500" /> : <EyeOff size={16} className="text-gray-400" />}{item.id === 'qr' ? 'QR Code' : item.label}</div><div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700"><div className="flex border-l border-gray-300 dark:border-gray-600 pl-2 ml-1"><button onClick={() => updateItemConfig(index, { align: 'right' })} className={`p-1.5 rounded ${item.align === 'right' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}><AlignRight size={16} /></button><button onClick={() => updateItemConfig(index, { align: 'center' })} className={`p-1.5 rounded ${item.align === 'center' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}><AlignCenter size={16} /></button><button onClick={() => updateItemConfig(index, { align: 'left' })} className={`p-1.5 rounded ${item.align === 'left' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}><AlignLeft size={16} /></button></div><div className="flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 pl-2 ml-1"><Type size={14} className="text-gray-400" /><select value={item.fontSize} onChange={(e) => updateItemConfig(index, { fontSize: e.target.value as any })} className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer hover:text-primary w-20"><option value="xs">XS</option><option value="sm">S</option><option value="base">M</option><option value="lg">L</option><option value="xl">XL</option><option value="2xl">XXL</option></select></div></div><button onClick={() => updateItemConfig(index, { visible: !item.visible })} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${item.visible ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{item.visible ? t('visible') : t('hidden')}</button></div>))}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
