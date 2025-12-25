
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { usePOS } from '../context/POSContext';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const AIView: React.FC = () => {
  const { t, transactions, products, expenses, customers, aiSettings } = usePOS();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [genAI, setGenAI] = useState<GoogleGenAI | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini Client
  useEffect(() => {
    // Try to get key from settings first, then fallback to env
    let apiKey = process.env.API_KEY;
    
    // Read from Context (synced with DB)
    if (aiSettings && aiSettings.apiKey) {
        apiKey = aiSettings.apiKey;
    }

    if (apiKey) {
      const client = new GoogleGenAI({ apiKey: apiKey });
      setGenAI(client);
    }
  }, [aiSettings]);

  // Add initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: t('aiWelcome')
      }]);
    }
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const getContextData = () => {
    // Calculate key metrics
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const todayTrans = transactions.filter(t => new Date(t.date) >= today);
    const totalSalesToday = todayTrans.reduce((sum, t) => sum + t.total, 0);
    const totalExpensesToday = expenses.filter(e => new Date(e.date) >= today).reduce((sum, e) => sum + e.amount, 0);
    const transactionsCount = todayTrans.length;
    
    // Products Stats
    const lowStock = 'N/A (Inventory tracking not fully active)'; 
    const totalProducts = products.length;
    
    // Debt Stats
    const totalDebt = transactions
        .filter(t => t.paymentMethod === 'credit' && !t.isPaid && t.type !== 'collection')
        .reduce((sum, t) => {
            const paid = t.payments?.reduce((s, p) => s + p.amount, 0) || 0;
            return sum + (t.total - paid);
        }, 0);

    // Recent Transactions Summary
    const recentTransSummary = todayTrans.slice(0, 5).map(t => 
        `- Time: ${new Date(t.date).toLocaleTimeString()}, Total: ${t.total}, Items: ${t.items?.map(i => i.name).join(', ')}`
    ).join('\n');

    return `
Current Date: ${new Date().toLocaleString()}
Business Data Context:
- Total Sales Today: ${totalSalesToday.toFixed(2)}
- Total Expenses Today: ${totalExpensesToday.toFixed(2)}
- Transactions Count Today: ${transactionsCount}
- Total Active Debt (Credit): ${totalDebt.toFixed(2)}
- Total Products in Catalog: ${totalProducts}
- Recent 5 Transactions Today:
${recentTransSummary || 'No transactions today yet.'}

Instructions:
- You are a helpful AI assistant for a Point of Sale (POS) system.
- Answer the user's questions based on the data provided above.
- Be concise, professional, and encouraging.
- If asked about data not present here, explain that you only have access to the summary provided.
- Use simple Arabic suitable for business owners.
    `;
  };

  const handleSend = async () => {
    if (!input.trim() || !genAI) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const systemInstruction = getContextData();
        
        // Prepare history for context (limit to last 10 messages to save tokens)
        // Map our 'role' to Gemini 'role' (user -> user, model -> model)
        const history = messages.slice(-10).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const chat = genAI.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
            },
            history: history
        });

        const result = await chat.sendMessage({ message: userMsg.text });
        const responseText = result.text;

        if (responseText) {
            const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
            setMessages(prev => [...prev, botMsg]);
        }
    } catch (error) {
        console.error("AI Error:", error);
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: 'عذراً، حدث خطأ أثناء الاتصال بالخادم. يرجى التأكد من مفتاح API.' 
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  if (!genAI) {
      return (
          <div className="h-full flex items-center justify-center flex-col p-8 text-center">
              <Sparkles size={48} className="text-gray-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-500">الذكاء الاصطناعي غير متوفر</h2>
              <p className="text-gray-400 mt-2">يرجى إضافة مفتاح API في صفحة الإعدادات (تبويب السحابة).</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 relative">
        {/* Header */}
        <div className="p-4 md:p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 z-10">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Sparkles size={20} />
            </div>
            <div>
                <h1 className="font-bold text-lg text-gray-800 dark:text-white">{t('aiTitle')}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('aiSubtitle')}</p>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" ref={scrollRef}>
            {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-purple-600 text-white'}`}>
                        {msg.role === 'user' ? <User size={16} className="text-gray-600 dark:text-gray-300" /> : <Bot size={16} />}
                    </div>
                    <div 
                        className={`p-3 md:p-4 rounded-2xl max-w-[85%] md:max-w-[70%] text-sm md:text-base leading-relaxed shadow-sm whitespace-pre-line ${
                            msg.role === 'user' 
                                ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-tr-none' 
                                : 'bg-purple-50 dark:bg-purple-900/20 text-gray-800 dark:text-gray-100 border border-purple-100 dark:border-purple-800 rounded-tl-none'
                        }`}
                    >
                        {msg.text}
                    </div>
                </div>
            ))}
            
            {isLoading && (
                <div className="flex gap-3">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center shrink-0">
                        <Bot size={16} />
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm font-bold">{t('aiThinking')}</span>
                    </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="relative max-w-4xl mx-auto">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('typeMessage')}
                    className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-xl py-4 pl-4 pr-14 text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
                >
                    <Send size={18} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                </button>
            </div>
            <div className="text-center mt-2 text-[10px] text-gray-400">
                Powered by Google Gemini • لا يتم حفظ المحادثات لضمان الخصوصية
            </div>
        </div>
    </div>
  );
};

export default AIView;