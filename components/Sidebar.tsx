
import React, { useState } from 'react';

import { BarChart3, Settings, LogOut, Users, Wallet, CreditCard, Shield, Package, Printer, Sparkles } from 'lucide-react';

import { usePOS } from '../context/POSContext';

import { ViewState, Permission } from '../types';

import { DEFAULT_APP_SETTINGS, APP_VERSION } from '../constants';



const CashRegisterIcon = ({ size = 24, strokeWidth = 2, className = "" }: { size?: number, strokeWidth?: number, className?: string }) => {

  return (

    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>

      <rect width="16" height="10" x="4" y="2" rx="2" />

      <path d="M8 6h8" />

      <path d="M8 9h4" />

      <path d="M12 12v3" />

      <rect width="20" height="7" x="2" y="15" rx="2" />

      <line x1="10" x2="14" y1="18.5" y2="18.5" />

    </svg>

  );

};



const Sidebar: React.FC = () => {

  const { currentView, setView, appSettings, t, logout, hasPermission, currentUser } = usePOS();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const isSidebar = appSettings.layoutMode === 'sidebar';



  const handleLogout = () => {

    setIsLogoutModalOpen(true);

  };

  

  const confirmLogout = () => {

      logout();

      setIsLogoutModalOpen(false);

  }



  const itemDefinitions: Record<string, { icon: any, labelKey: string, permission?: Permission }> = {

      [ViewState.POS]: { icon: CashRegisterIcon, labelKey: 'pos', permission: 'pos.view' },

      [ViewState.REPORTS]: { icon: BarChart3, labelKey: 'reports', permission: 'reports.view' },

      [ViewState.EXPENSES]: { icon: Wallet, labelKey: 'expenses', permission: 'expenses.view' },

      [ViewState.CREDITS]: { icon: CreditCard, labelKey: 'credits', permission: 'credits.view' },

      [ViewState.MACHINES]: { icon: Printer, labelKey: 'machines', permission: 'machines.view' },

      [ViewState.CUSTOMERS]: { icon: Users, labelKey: 'customers', permission: 'customers.view' },

      [ViewState.AI]: { icon: Sparkles, labelKey: 'ai', permission: 'ai.chat' },

      [ViewState.SETTINGS]: { icon: Settings, labelKey: 'settings', permission: 'settings.manage' },

  };



  // Ensure AI is in the menu order if not already present (for migration)

  const menuOrder = (appSettings.menuOrder && appSettings.menuOrder.length > 0) 

      ? [...appSettings.menuOrder] 

      : [...DEFAULT_APP_SETTINGS.menuOrder!];



  // Migration fixes for new items

  if (!menuOrder.includes(ViewState.MACHINES)) {

      const custIdx = menuOrder.indexOf(ViewState.CUSTOMERS);

      if (custIdx > -1) menuOrder.splice(custIdx, 0, ViewState.MACHINES);

      else menuOrder.push(ViewState.MACHINES);

  }

  if (!menuOrder.includes(ViewState.AI)) {

      const settingsIdx = menuOrder.indexOf(ViewState.SETTINGS);

      if (settingsIdx > -1) menuOrder.splice(settingsIdx, 0, ViewState.AI);

      else menuOrder.push(ViewState.AI);

  }



  return (

    <>

      <div className={`

        bg-sidebar text-white shadow-2xl z-40 transition-all duration-300 flex items-center

        fixed bottom-0 w-full h-16 flex-row px-1 justify-between

        md:static md:h-auto md:w-auto md:px-2

        ${isSidebar ? 'md:h-screen md:w-24 md:flex-col md:py-6 md:justify-start md:sticky md:top-0' : 'md:w-full md:h-16 md:flex-row md:px-4 md:justify-between md:relative md:shadow-md'}

      `}>

        

        <div className={`flex flex-1 w-full justify-around md:justify-center gap-0 md:gap-2 ${isSidebar ? 'md:w-full md:flex-col' : 'md:flex-row md:items-center md:h-full'}`}>

          {menuOrder.map((itemId) => {

            const def = itemDefinitions[itemId as keyof typeof itemDefinitions];

            if (!def) return null;

            

            // Check Permission

            if (def.permission && !hasPermission(def.permission)) return null;



            const isActive = currentView === itemId;

            const Icon = def.icon;

            

            return (

              <button key={itemId} onClick={() => setView(itemId as ViewState)} className={`flex items-center justify-center relative group transition-all duration-300 flex-col py-1 md:py-0 ${isSidebar ? 'md:w-full md:flex-col md:py-3' : 'md:h-full md:px-4 md:flex-col'} ${isActive ? 'text-white' : 'text-white/60 hover:text-white'}`}>

                {/* Active Indicator: Top on mobile/horizontal, Side on sidebar desktop */}

                {isActive && (

                    <div className={`absolute bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] h-1 top-0 left-4 right-4 rounded-b-md md:rounded-none md:h-auto md:inset-auto ${isSidebar ? 'md:right-0 md:top-0 md:bottom-0 md:w-1.5 md:rounded-l-md' : 'md:bottom-0 md:left-0 md:right-0 md:h-1 md:rounded-t-md'}`}></div>

                )}

                

                <Icon size={isSidebar ? 26 : 22} strokeWidth={isActive ? 2.5 : 2} className="md:w-auto md:h-auto mb-0.5 md:mb-0" />

                

                <span className={`text-[9px] md:text-[10px] font-medium transition-opacity text-center leading-none ${isSidebar ? `mt-1 md:mt-1.5 px-1 ${isActive ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}` : `mt-0.5 md:mt-0 md:ml-1 ${isActive ? 'block' : 'block md:hidden'}`}`}>

                  {t(def.labelKey)}

                </span>

              </button>

            );

          })}

          

          {/* Logout Button on Mobile in Menu Grid */}

          <button onClick={handleLogout} className="md:hidden flex flex-col items-center justify-center text-white/60 hover:text-white py-1">

              <LogOut size={22} className="mb-0.5" />

              <span className="text-[9px] font-medium">{t('logout')}</span>

          </button>

        </div>



        {/* Logout - Desktop Only (Bottom of Sidebar) */}

        <div className={`flex flex-col items-center ${isSidebar ? 'md:mt-auto md:pb-4' : 'md:ml-4'}`}>

            <button onClick={handleLogout} className={`text-white/60 hover:text-white transition-colors hidden md:block`} title={t('logout')}>

              <LogOut size={24} />

            </button>

            {isSidebar && (

                <div className="hidden md:block mt-2 text-[8px] text-white/30 font-mono tracking-widest">

                    {APP_VERSION}

                </div>

            )}

        </div>

      </div>



      {/* Logout Confirmation Modal */}

      {isLogoutModalOpen && (

          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">

                  <div className="flex flex-col items-center text-center">

                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">

                          <LogOut size={32} />

                      </div>

                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('logout')}</h3>

                      <p className="text-gray-500 dark:text-gray-400 mb-6">{t('logoutConfirm')}</p>

                      

                      <div className="flex gap-3 w-full">

                          <button 

                            onClick={() => setIsLogoutModalOpen(false)}

                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"

                          >

                              {t('cancel')}

                          </button>

                          <button 

                            onClick={confirmLogout}

                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"

                          >

                              {t('logout')}

                          </button>

                      </div>

                  </div>

              </div>

          </div>

      )}

    </>

  );

};



export default Sidebar;


