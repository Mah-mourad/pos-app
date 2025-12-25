
import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Lock, User } from 'lucide-react';
import { APP_VERSION } from '../constants';

const LoginView: React.FC = () => {
  const { login, t, appSettings, receiptSettings } = usePOS();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      setError('');
    } else {
      setError(t('loginError'));
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 mx-4">
        <div className="text-center mb-8">
          {appSettings.appLogo && (
              <img src={appSettings.appLogo} alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{receiptSettings.storeName || appSettings.appName}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('loginTitle')}</p>
          <div className="mt-2 inline-block px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-700 text-[10px] font-mono text-gray-400 dark:text-gray-500">
            {APP_VERSION}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl mb-6 text-center text-sm font-bold border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('username')}</label>
            <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" size={20} />
                <input 
                  type="text" 
                  className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-600 rounded-xl p-3 pr-10 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-white placeholder-gray-400 font-bold shadow-sm"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  placeholder={t('username')}
                  style={{ colorScheme: 'light dark' }} // Native hint for browser
                />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('password')}</label>
            <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" size={20} />
                <input 
                  type="password" 
                  className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-600 rounded-xl p-3 pr-10 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-white placeholder-gray-400 font-bold shadow-sm"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="****"
                  style={{ colorScheme: 'light dark' }}
                />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all mt-4 active:scale-95"
          >
            {t('login')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;