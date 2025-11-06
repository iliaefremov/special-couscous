import React, { useState, useEffect } from 'react';
import Schedule from './components/Schedule';
import Grades from './components/Grades';
import Chat from './components/Chat';
import Games from './components/Games';
import { ScheduleIcon, GradesIcon, AssistantIcon, GamesIcon } from './components/icons/Icons';
import { ALLOWED_TELEGRAM_USER_IDS } from './constants';
import type { TelegramUser } from './types';

// Define the available tabs
type Tab = 'schedule' | 'grades' | 'chat' | 'games';

const AccessDeniedScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen text-center bg-primary dark:bg-dark-primary p-6 animate-fade-in">
    <div className="bg-secondary dark:bg-dark-secondary p-8 sm:p-12 rounded-3xl shadow-soft-lg dark:shadow-dark-soft-lg border border-border-color dark:border-dark-border-color w-full max-w-md">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-dark-text-primary">Доступ ограничен</h2>
      <p className="text-text-secondary dark:text-dark-text-secondary mt-4 max-w-sm mx-auto whitespace-pre-line text-base">
        {`Кажется, твой Telegram ID не найден в списке участников.

Попробуй открыть приложение через Telegram-аккаунт, которому предоставлен доступ.`}
      </p>
    </div>
  </div>
);


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand?.(); 
    }

    const currentUser = tg?.initDataUnsafe?.user;

    if (currentUser) {
        setUser(currentUser);
        if (ALLOWED_TELEGRAM_USER_IDS.includes(currentUser.id.toString())) {
            setIsAllowed(true);
        }
    }
    
    setIsLoading(false);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':
        return <Schedule user={user} />;
      case 'grades':
        return <Grades user={user} />;
      case 'chat':
        return <Chat />;
      case 'games':
        return <Games />;
      default:
        return <Schedule user={user} />;
    }
  };
  
  const NavItem = ({ tab, icon, label }: { tab: Tab, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex flex-col items-center justify-center py-2 text-xs transition-colors duration-300 ${activeTab === tab ? 'text-accent dark:text-dark-accent font-bold' : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'}`}
    >
      <div className="relative flex items-center justify-center">
        {icon}
      </div>
      <span className="mt-1">{label}</span>
    </button>
  );

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-primary dark:bg-dark-primary text-text-primary dark:text-dark-text-primary">
            Загрузка...
        </div>
    );
  }

  if (!isAllowed) {
     return <AccessDeniedScreen />;
  }

  return (
    <>
      <div className="bg-primary dark:bg-dark-primary text-text-primary dark:text-dark-text-primary min-h-screen font-sans pb-24">
        <main className="container mx-auto px-4 pt-6">
          {renderContent()}
        </main>
        
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3 sm:pb-4 pointer-events-none">
            <nav className="pointer-events-auto max-w-md mx-auto h-16 bg-white/40 dark:bg-slate-900/50 backdrop-blur-3xl border border-white/30 dark:border-white/10 rounded-[2.5rem] shadow-soft-lg dark:shadow-dark-soft-lg">
               <div className="flex items-stretch h-full">
                  <NavItem tab="schedule" icon={<ScheduleIcon className="text-2xl" isActive={activeTab === 'schedule'} />} label="Расписание" />
                  <NavItem tab="grades" icon={<GradesIcon className="text-2xl" isActive={activeTab === 'grades'} />} label="Успеваемость" />
                  <NavItem tab="chat" icon={<AssistantIcon className="text-2xl" isActive={activeTab === 'chat'} />} label="Ассистент" />
                  <NavItem tab="games" icon={<GamesIcon className="text-2xl" isActive={activeTab === 'games'} />} label="Игры" />
               </div>
            </nav>
        </div>

      </div>
    </>
  );
};

export default App;