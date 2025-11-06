import React, { useEffect } from 'react';
import type { Player } from '../types';

// This component has been cleared of all Gemini AI functionality as per user request.

interface MafiaGameProps {
  initialPlayers: Player[];
  onExit: () => void;
}

const MafiaGame: React.FC<MafiaGameProps> = ({ onExit }) => {
   useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in pt-16">
      <div className="bg-secondary dark:bg-dark-secondary p-8 rounded-3xl shadow-soft dark:shadow-dark-soft border border-border-color dark:border-dark-border-color">
        <span className="text-6xl mb-4" role="img" aria-label="Tools">🛠️</span>
        <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mt-4">Игра в разработке</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary mt-2 max-w-xs">
          Этот раздел временно недоступен, так как AI-функции отключены.
        </p>
         <button onClick={onExit} className="mt-4 bg-accent text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center hover:bg-accent-hover transition-colors">
            Назад
        </button>
      </div>
    </div>
  );
};

export default MafiaGame;
