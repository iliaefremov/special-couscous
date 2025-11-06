import React from 'react';

const Games: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
      <div className="bg-secondary dark:bg-dark-secondary p-8 rounded-3xl shadow-soft dark:shadow-dark-soft border border-border-color dark:border-dark-border-color">
        <span className="text-6xl mb-4" role="img" aria-label="Game controller">🎮</span>
        <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mt-4">Игры в разработке</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary mt-2 max-w-xs">
          Этот раздел временно недоступен. Скоро здесь появятся интересные игры!
        </p>
      </div>
    </div>
  );
};

export default Games;