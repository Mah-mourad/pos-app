
import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import POSView from './views/POSView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import CustomersView from './views/CustomersView';
import ExpensesView from './views/ExpensesView';
import CreditsView from './views/CreditsView';
import MachinesView from './views/MachinesView';
import AIView from './views/AIView';
import LoginView from './views/LoginView';
import UsersView from './views/UsersView';
import { POSProvider, usePOS } from './context/POSContext';
import { ViewState } from './types';
import { APP_THEMES } from './constants';

const MainContent: React.FC = () => {
  const { currentView, currentUser } = usePOS();

  if (!currentUser) {
      return <LoginView />;
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.POS: return <POSView />;
      case ViewState.PRODUCTS: return <POSView />; // Fallback to POS
      case ViewState.REPORTS: return <ReportsView />;
      case ViewState.EXPENSES: return <ExpensesView />;
      case ViewState.CREDITS: return <CreditsView />;
      case ViewState.MACHINES: return <MachinesView />;
      case ViewState.CUSTOMERS: return <CustomersView />;
      case ViewState.SETTINGS: return <SettingsView />;
      case ViewState.USERS: return <UsersView />;
      case ViewState.AI: return <AIView />;
      default: return <POSView />;
    }
  };

  // Add padding bottom on mobile to account for the fixed bottom navigation
  return (
    <div className="flex-1 bg-background dark:bg-gray-900 h-full overflow-hidden relative transition-colors duration-200 pb-20 md:pb-0">
      {renderView()}
    </div>
  );
};

const LayoutContainer: React.FC<{children: React.ReactNode}> = ({children}) => {
    const { appSettings, currentUser, serverStatus, connectionError } = usePOS();
    const isSidebar = appSettings.layoutMode === 'sidebar';
    
    // Apply Theme Effect
    useEffect(() => {
        // 1. Dark Mode Class
        if (appSettings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // 2. Color Variables
        const theme = APP_THEMES.find(t => t.id === appSettings.theme);
        if (theme) {
            document.documentElement.style.setProperty('--color-primary', theme.primaryColor);
            document.documentElement.style.setProperty('--color-sidebar', theme.sidebarColor);
        }
        
        // 3. Font Scale
        document.documentElement.style.fontSize = `${16 * (appSettings.fontScale || 1)}px`;
        
        // 4. Border Radius
        document.documentElement.style.setProperty('--app-radius', 
            appSettings.borderRadius === 'none' ? '0rem' :
            appSettings.borderRadius === 'sm' ? '0.25rem' :
            appSettings.borderRadius === 'md' ? '0.375rem' :
            appSettings.borderRadius === 'full' ? '9999px' : '0.5rem' // lg default
        );

    }, [appSettings]);
    
    // Determine if we should show a warning banner
    const showError = connectionError || (!serverStatus && !connectionError);
    const errorMessage = connectionError || "⚠️ النظام غير متصل بالسحابة. يرجى ضبط إعدادات الربط (Supabase) من صفحة الإعدادات أو التحقق من الإنترنت.";

    if (!currentUser) {
        return (
            <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900 font-sans relative">
                {showError && (
                    <div className="bg-orange-600 text-white text-center py-2 px-4 text-xs font-bold fixed top-0 left-0 right-0 z-[100] shadow-md">
                        {errorMessage}
                    </div>
                )}
                <MainContent />
            </div>
        );
    }

    return (
        <div className={`flex h-screen w-screen overflow-hidden bg-background dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-all duration-300 flex-col ${isSidebar ? 'md:flex-row' : 'md:flex-col'}`}>
            {showError && (
                <div className="bg-orange-600 text-white text-center py-1 px-4 text-xs font-bold fixed top-0 left-0 right-0 z-[100] shadow-md">
                    {errorMessage}
                </div>
            )}
            {children}
        </div>
    );
};

const App: React.FC = () => {
  return (
    <POSProvider>
      <LayoutContainer>
        <Sidebar />
        <MainContent />
      </LayoutContainer>
    </POSProvider>
  );
};

export default App;
