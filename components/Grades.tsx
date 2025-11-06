import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { GRADES_DATA } from '../constants';
import type { SubjectGrade, TelegramUser } from './../types';
import { getGrades, getAllowedUserIds } from '../services/googleSheetsService';
import { SubjectGradeCard } from './SubjectGradeCard';
import { RefreshIcon } from './icons/Icons';
import BottomSheet from './BottomSheet';
import { GradeChart } from './GradeChart';

interface GroupedGrades {
  grades: SubjectGrade[];
  avgScore?: number;
}

interface StudentAbsences {
    userId: string;
    userName:string;
    totalAbsences: number;
    absencesBySubject: Record<string, { topic: string; date: string }[]>;
}

interface FullLeaderboardStudent {
    userId: string;
    userName: string;
    overallRating: number;
    subjectAverages: Record<string, number>;
}

const MOTIVATIONAL_PHRASES = [
  'Каждый шаг вперед — это уже победа.',
  'Успех — это сумма небольших усилий, повторяющихся изо дня в день.',
  'Верь в себя, и у тебя все получится!',
  'Самое сложное — начать действовать, остальное зависит только от упорства.',
  'Не бойся ошибаться, бойся не попробовать.',
  'Сегодня — лучший день, чтобы стать лучше.',
  'Знания — это сила, которая всегда с тобой.',
];

const getGreeting = (): { text: string; emoji: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Доброе утро', emoji: '☀️' };
  if (hour >= 12 && hour < 18) return { text: 'Добрый день', emoji: '👋' };
  if (hour >= 18 && hour < 22) return { text: 'Добрый вечер', emoji: '🌆' };
  return { text: 'Доброй ночи', emoji: '🌙' };
};

const formatDate = (dateString: string): string => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
    } catch (e) {
        return dateString;
    }
};

interface GradesProps {
  user: TelegramUser | null;
}

const Grades: React.FC<GradesProps> = ({ user }) => {
  const [userGrades, setUserGrades] = useState<SubjectGrade[]>([]);
  const [allGrades, setAllGrades] = useState<SubjectGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAbsencesSheetOpen, setIsAbsencesSheetOpen] = useState(false);
  const [isRatingSheetOpen, setIsRatingSheetOpen] = useState(false);
  const [animateStats, setAnimateStats] = useState(false);
  const [activeRatingTab, setActiveRatingTab] = useState('myRating');
  const [activeAbsencesTab, setActiveAbsencesTab] = useState('myAbsences');
  const absenceSubjectRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const [renderInfoBanner, setRenderInfoBanner] = useState(false);
  const [isInfoBannerVisible, setIsInfoBannerVisible] = useState(false);

  const [selectedSubjectForAnalytics, setSelectedSubjectForAnalytics] = useState<string | null>(null);

  const [motivationalPhrase] = useState(
    () => MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]
  );

  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);

  const loadGrades = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedGrades = await getGrades();
      setAllGrades(fetchedGrades);
      
      const filteredGrades = fetchedGrades.filter(grade => grade.user_id === userId);
      
      if (filteredGrades.length === 0 && fetchedGrades.length > 0) {
        console.warn(`Оценки были загружены, но для пользователя с ID ${userId} ничего не найдено.`);
      }

      setUserGrades(filteredGrades);

      const fetchedAllowedUserIds = await getAllowedUserIds();
      setAllowedUserIds(fetchedAllowedUserIds);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Произошла неизвестная ошибка.";
      setError(`Не удалось подключиться к Google Sheets: "${errorMessage}". Показаны демонстрационные данные.`);
      
      setAllGrades(GRADES_DATA);
      const filteredDemoGrades = GRADES_DATA.filter(grade => grade.user_id === userId);
      setUserGrades(filteredDemoGrades);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.ready();
    if (user) {
      loadGrades(user.id.toString());
    } else {
      setIsLoading(false);
    }
  }, [user, loadGrades]);

  const isUserAllowed = useMemo(() => {
    if (!user) return false;
    return allowedUserIds.includes(user.id.toString());
  }, [user, allowedUserIds]);

  useEffect(() => {
    if (!isLoading) {
        setAnimateStats(true);
        const timer = setTimeout(() => setAnimateStats(false), 1000);
        return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  useEffect(() => {
      if (!isLoading && !error) {
          setRenderInfoBanner(true);
          const showTimer = setTimeout(() => setIsInfoBannerVisible(true), 10);
          
          const hideTimer = setTimeout(() => {
              setIsInfoBannerVisible(false);
          }, 7000);
          
          const unmountTimer = setTimeout(() => {
              setRenderInfoBanner(false);
          }, 7500);

          return () => {
              clearTimeout(showTimer);
              clearTimeout(hideTimer);
              clearTimeout(unmountTimer);
          };
      } else {
          setRenderInfoBanner(false);
          setIsInfoBannerVisible(false);
      }
  }, [isLoading, error]);


  const gradesBySubject = useMemo((): Record<string, GroupedGrades> => {
    return userGrades.reduce<Record<string, GroupedGrades>>((acc, grade) => {
      if (!acc[grade.subject]) {
        acc[grade.subject] = { grades: [], avgScore: grade.avg_score };
      }
      acc[grade.subject].grades.push(grade);
      return acc;
    }, {});
  }, [userGrades]);

  const overallStats = useMemo(() => {
    const subjects = Object.values(gradesBySubject) as GroupedGrades[];
    if (subjects.length === 0) {
        return { rating: '0.00', totalAbsences: 0 };
    }
    const validAvgScores = subjects
        .map(s => s.avgScore)
        .filter(score => typeof score === 'number') as number[];
    const totalAvgScore = validAvgScores.reduce((sum, score) => sum + score, 0);
    const rating = validAvgScores.length > 0 ? (totalAvgScore / validAvgScores.length) : 0;
    const totalAbsences = userGrades.filter(g => g.score === 'н').length;
    
    return { rating: rating.toFixed(2), totalAbsences };
  }, [gradesBySubject, userGrades]);

  const allUserRatings = useMemo(() => {
    if (allGrades.length === 0) return [];
    
    const gradesByUserId = allGrades.reduce<Record<string, SubjectGrade[]>>((acc, grade) => {
        if (!acc[grade.user_id]) acc[grade.user_id] = [];
        acc[grade.user_id].push(grade);
        return acc;
    }, {});

    const ratings = Object.entries(gradesByUserId).map(([userId, grades]) => {
        const subjectAvgs = new Map<string, number>();
        (grades as SubjectGrade[]).forEach(g => {
            if (g.avg_score !== undefined) subjectAvgs.set(g.subject, g.avg_score);
        });
        const avgScores = Array.from(subjectAvgs.values());
        const total = avgScores.reduce((sum, score) => sum + score, 0);
        const rating = avgScores.length > 0 ? total / avgScores.length : 0;
        return { userId, rating };
    });

    ratings.sort((a, b) => b.rating - a.rating);
    return ratings;
  }, [allGrades]);
  
  const rankingStats = useMemo(() => {
    const currentUserId = user?.id.toString();
    const rank = allUserRatings.findIndex(u => u.userId === currentUserId) + 1;
    return { rank, total: allUserRatings.length };
  }, [allUserRatings, user]);

  const fullLeaderboardData = useMemo((): FullLeaderboardStudent[] => {
    return allUserRatings.map(({ userId, rating }) => {
        const userGrades = allGrades.filter(g => g.user_id === userId);
        const userName = userGrades[0]?.user_name || `User ${userId}`;
        const subjectAverages = userGrades.reduce((acc, grade) => {
            if (grade.avg_score !== undefined) {
                acc[grade.subject] = grade.avg_score;
            }
            return acc;
        }, {} as Record<string, number>);
        return { userId, userName, overallRating: rating, subjectAverages };
    });
  }, [allGrades, allUserRatings]);

  const allAbsencesBySubject = useMemo((): Record<string, SubjectGrade[]> => {
    return userGrades
        .filter(grade => grade.score === 'н')
        .reduce<Record<string, SubjectGrade[]>>((acc, absence) => {
            if (!acc[absence.subject]) {
                acc[absence.subject] = [];
            }
            acc[absence.subject].push(absence);
            return acc;
        }, {});
  }, [userGrades]);
  
  const allStudentsAbsences = useMemo((): StudentAbsences[] => {
    const studentsData: Record<string, StudentAbsences> = {};
    allGrades.forEach(grade => {
      if (grade.score === 'н') {
        if (!studentsData[grade.user_id]) {
          studentsData[grade.user_id] = {
            userId: grade.user_id,
            userName: grade.user_name || `User ${grade.user_id}`,
            totalAbsences: 0,
            absencesBySubject: {}
          };
        }
        const student = studentsData[grade.user_id];
        student.totalAbsences += 1;
        if (!student.absencesBySubject[grade.subject]) {
          student.absencesBySubject[grade.subject] = [];
        }
        student.absencesBySubject[grade.subject].push({ topic: grade.topic, date: grade.date });
      }
    });
    return Object.values(studentsData).sort((a, b) => b.totalAbsences - a.totalAbsences);
  }, [allGrades]);


  const userNameFromSheet = useMemo(() => {
      if (userGrades.length > 0 && userGrades[0].user_name) {
        return userGrades[0].user_name.split(' ')[0];
      }
      return null;
  }, [userGrades]);

  const handleOpenAbsencesForSubject = useCallback((subject: string) => {
      setActiveAbsencesTab('myAbsences');
      setIsAbsencesSheetOpen(true);
      setTimeout(() => {
          const element = absenceSubjectRefs.current[subject];
          if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              element.classList.add('bg-yellow-500/20', 'dark:bg-yellow-400/20', 'rounded-lg');
              setTimeout(() => {
                  element.classList.remove('bg-yellow-500/20', 'dark:bg-yellow-400/20', 'rounded-lg');
              }, 2000);
          }
      }, 300);
  }, []);
  
  const handleAnalyticsClick = (subject: string) => {
      setSelectedSubjectForAnalytics(subject);
  };

  const renderAnalyticsContent = () => {
    if (!selectedSubjectForAnalytics) return null;

    const subjectData = gradesBySubject[selectedSubjectForAnalytics];
    if (!subjectData) return null;
    
    const numericGrades = subjectData.grades
      .filter(g => typeof g.score === 'number')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as (SubjectGrade & { score: number })[];

    const topicsToImprove = numericGrades
      .filter(g => g.score <= 56)
      .sort((a, b) => a.score - b.score);
      
    const getRecommendation = (): { text: string; icon: string } => {
        if (numericGrades.length < 3) {
            return { text: 'Нужно больше данных для анализа динамики.', icon: '📊' };
        }
        const firstHalf = numericGrades.slice(0, Math.floor(numericGrades.length / 2));
        const secondHalf = numericGrades.slice(Math.ceil(numericGrades.length / 2));
        
        const avgFirst = firstHalf.reduce((sum, g) => sum + g.score, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, g) => sum + g.score, 0) / secondHalf.length;
        
        if (avgSecond > avgFirst + 5) {
            return { text: 'Отличная динамика! Твои результаты заметно улучшаются.', icon: '🚀' };
        } else if (avgFirst > avgSecond + 5) {
            return { text: 'Заметен некоторый спад. Стоит уделить предмету больше внимания.', icon: '📉' };
        } else {
            return { text: 'Результаты стабильны. Есть хороший потенциал для роста!', icon: '🎯' };
        }
    };
    
    const recommendation = getRecommendation();
    const stats = {
        best: Math.max(...numericGrades.map(g => g.score), 0),
        worst: Math.min(...numericGrades.map(g => g.score), 100),
        average: subjectData.avgScore?.toFixed(2) ?? 'N/A'
    };

    return (
        <div className="space-y-6">
            <div className="bg-highlight dark:bg-dark-highlight p-4 rounded-xl">
                <h4 className="font-bold text-text-primary dark:text-dark-text-primary mb-2">График успеваемости</h4>
                <GradeChart grades={numericGrades} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-highlight dark:bg-dark-highlight p-3 rounded-xl">
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Лучшая</p>
                    <p className="font-bold text-lg text-green-500 dark:text-green-400">{stats.best}</p>
                </div>
                <div className="bg-highlight dark:bg-dark-highlight p-3 rounded-xl">
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Средняя</p>
                    <p className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{stats.average}</p>
                </div>
                <div className="bg-highlight dark:bg-dark-highlight p-3 rounded-xl">
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Худшая</p>
                    <p className="font-bold text-lg text-red-500 dark:text-red-400">{stats.worst}</p>
                </div>
            </div>

            {topicsToImprove.length > 0 && (
                <div>
                    <h4 className="font-bold text-text-primary dark:text-dark-text-primary mb-2">Темы для улучшения</h4>
                    <ul className="space-y-2 text-sm">
                        {topicsToImprove.map((grade, index) => (
                            <li key={index} className="flex justify-between items-center bg-highlight dark:bg-dark-highlight p-2 rounded-lg">
                                <div>
                                    <p className="font-semibold text-text-primary dark:text-dark-text-primary">{grade.topic}</p>
                                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{formatDate(grade.date)}</p>
                                </div>
                                <span className="font-bold text-lg text-red-500 dark:text-red-400">{grade.score}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="p-4 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl border border-blue-500/20 dark:border-blue-400/20 text-left">
                <p className="font-bold text-blue-800 dark:text-blue-300 mb-1">{recommendation.icon} Рекомендация</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">{recommendation.text}</p>
            </div>
        </div>
    );
};


  const displayName = userNameFromSheet || user?.first_name || '';
  const { text: greetingText, emoji: greetingEmoji } = getGreeting();
  const welcomeMessage = displayName ? `${greetingText}, ${displayName}!` : `${greetingText}!`;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{welcomeMessage} {greetingEmoji}</h2>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-2">{motivationalPhrase}</p>
        </div>
        <button onClick={() => user && loadGrades(user.id.toString())} disabled={isLoading} className="bg-secondary/80 dark:bg-dark-secondary/80 backdrop-blur-sm border border-border-color dark:border-dark-border-color text-accent dark:text-dark-accent font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center hover:bg-highlight dark:hover:bg-dark-highlight transition-colors disabled:opacity-50 disabled:cursor-wait">
            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">{isLoading ? 'Обновление...' : 'Обновить'}</span>
        </button>
      </div>

      {error && (
         <div className="mb-6 p-4 bg-yellow-500/10 dark:bg-yellow-400/10 rounded-2xl border border-yellow-500/20 dark:border-yellow-400/20">
           <p className="font-bold text-yellow-800 dark:text-yellow-300">⚠️ Проблема с подключением</p>
           <p className="text-sm mt-1 text-yellow-700 dark:text-yellow-400">{error}</p>
         </div>
      )}
      
      {renderInfoBanner && (
         <div className={`mb-6 p-4 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl border border-blue-500/20 dark:border-blue-400/20 ${isInfoBannerVisible ? 'animate-fade-in' : 'animate-fade-out'}`}>
           <p className="text-sm text-blue-800 dark:text-blue-300">💡 Данные из Google Таблиц могут обновляться с задержкой до 5 минут.</p>
         </div>
      )}


      {isLoading ? (
        <div className="flex items-center justify-center h-64">
            <svg className="animate-spin h-6 w-6 text-accent dark:text-dark-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="font-semibold ml-2 text-text-secondary dark:text-dark-text-secondary">Загрузка оценок...</span>
        </div>
      ) : userGrades.length === 0 && !error ? (
         <div className="text-center p-6 bg-highlight dark:bg-dark-highlight rounded-2xl">
             <p className="font-bold text-text-primary dark:text-dark-text-primary">Оценок пока нет</p>
             <p className="text-text-secondary dark:text-dark-text-secondary mt-1">Проверьте ваш ID в таблице или попробуйте обновить.</p>
         </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div 
                onClick={() => { setActiveRatingTab('myRating'); setIsRatingSheetOpen(true); }}
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                className="flex-1 bg-secondary/50 dark:bg-dark-secondary/50 backdrop-blur-md p-4 rounded-2xl shadow-soft dark:shadow-dark-soft border border-white/20 dark:border-dark-border-color flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.03] active:scale-100 focus:outline-none focus:ring-2 focus:ring-accent"
            >
                <div className="flex items-center space-x-3">
                    <span className={`text-3xl ${animateStats ? 'animate-tada' : ''}`}>🏆</span>
                    <div>
                        <h4 className="font-bold text-text-secondary dark:text-dark-text-secondary">Рейтинг</h4>
                        {rankingStats.rank > 0 && (
                            <p className="text-xs font-semibold text-accent dark:text-dark-accent">
                                {rankingStats.rank} место из {rankingStats.total}
                            </p>
                        )}
                    </div>
                </div>
                <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{overallStats.rating}</p>
            </div>
            <div 
                onClick={() => { setActiveAbsencesTab('myAbsences'); setIsAbsencesSheetOpen(true); }}
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                className="flex-1 bg-secondary/50 dark:bg-dark-secondary/50 backdrop-blur-md p-4 rounded-2xl shadow-soft dark:shadow-dark-soft border border-white/20 dark:border-dark-border-color flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.03] active:scale-100 focus:outline-none focus:ring-2 focus:ring-accent"
            >
                 <div className="flex items-center space-x-3">
                    <span className={`text-3xl ${animateStats ? 'animate-tada' : ''}`}>🗓️</span>
                    <div>
                        <h4 className="font-bold text-text-secondary dark:text-dark-text-secondary">Всего отработок</h4>
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Посмотреть детали</p>
                    </div>
                </div>
                <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{overallStats.totalAbsences}</p>
            </div>
          </div>
        
          <div className="space-y-6">
              {Object.entries(gradesBySubject).map(([subject, data]) => {
                  const { grades, avgScore } = data as GroupedGrades;
                  return (
                  <SubjectGradeCard 
                    key={subject} 
                    subject={subject} 
                    subjectGrades={grades}
                    averageScoreFromSheet={avgScore}
                    onAbsencesClick={() => handleOpenAbsencesForSubject(subject)}
                    onAnalyticsClick={() => handleAnalyticsClick(subject)}
                  />
              )})}          </div>
       </div>
      )}

      <BottomSheet
        isOpen={isAbsencesSheetOpen}
        onClose={() => setIsAbsencesSheetOpen(false)}
        title="Все отработки"
      >
        <div className="flex border-b border-border-color dark:border-dark-border-color mb-4">
            <button 
                onClick={() => setActiveAbsencesTab('myAbsences')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeAbsencesTab === 'myAbsences' ? 'text-accent dark:text-dark-accent border-b-2 border-accent dark:border-dark-accent' : 'text-text-secondary dark:text-dark-text-secondary'}`}
            >
                🗓️ Мои отработки
            </button>
            {isUserAllowed && (
              <button 
                  onClick={() => setActiveAbsencesTab('overall')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeAbsencesTab === 'overall' ? 'text-accent dark:text-dark-accent border-b-2 border-accent dark:border-dark-accent' : 'text-text-secondary dark:text-dark-text-secondary'}`}
              >
                  👥 Общий список
              </button>
            )}
        </div>

        {activeAbsencesTab === 'myAbsences' && (
             <div className="animate-fade-in">
                <p className="text-left text-xs text-text-secondary dark:text-dark-text-secondary mb-4 pb-4 border-b border-border-color dark:border-dark-border-color">
                    Здесь показано общее количество отработок по всем предметам.
                </p>
                {Object.keys(allAbsencesBySubject).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(allAbsencesBySubject).map(([subject, absencesData]) => {
                            const absences = absencesData as SubjectGrade[];
                            return (
                            <div key={subject} ref={el => { absenceSubjectRefs.current[subject] = el; }} className="transition-all duration-500 -m-2 p-2">
                                <h4 className="font-bold text-text-primary dark:text-dark-text-primary mb-2">{subject}</h4>
                                <ul className="space-y-2 text-sm">
                                    {absences.map((absence, index) => (
                                        <li key={index} className="flex justify-between items-center bg-highlight dark:bg-dark-highlight p-2 rounded-lg">
                                            <span className="text-text-secondary dark:text-dark-text-secondary">{absence.topic}</span>
                                            <span className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary whitespace-nowrap pl-4">{formatDate(absence.date)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )})}                    </div>
                ) : (
                    <p className="text-center text-text-secondary dark:text-dark-text-secondary py-8">
                        У тебя нет ни одной отработки. Великолепная работа! ✨
                    </p>
                )}
             </div>
        )}

        {activeAbsencesTab === 'overall' && isUserAllowed && (
            <div className="animate-fade-in">
                 <ul className="space-y-4">
                    {allStudentsAbsences.map(student => (
                        <li key={student.userId} className="bg-highlight dark:bg-dark-highlight p-3 rounded-lg text-sm">
                            <div className="flex justify-between items-center font-bold text-text-primary dark:text-dark-text-primary">
                                <span className="truncate pr-2">{student.userName}</span>
                                <span className="text-lg">{student.totalAbsences}</span>
                            </div>
                            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">ID: {student.userId}</div>
                            {student.totalAbsences > 0 && (
                               <div className="mt-2 pt-2 border-t border-border-color dark:border-dark-border-color">
                                 {Object.entries(student.absencesBySubject).map(([subject, absencesData]) => {
                                   const absences = absencesData as { topic: string; date: string }[];
                                   return (
                                   <div key={subject} className="mt-1">
                                     <p className="font-semibold text-xs text-text-primary dark:text-dark-text-primary">{subject}</p>
                                     <ul className="pl-2 mt-1 space-y-1">
                                       {absences.map((absence, i) => (
                                         <li key={i} className="text-xs text-text-secondary dark:text-dark-text-secondary flex justify-between">
                                            <span className="pr-2">{absence.topic}</span>
                                            <span className="opacity-80 whitespace-nowrap">{formatDate(absence.date)}</span>
                                         </li>
                                       ))}
                                     </ul>
                                   </div>
                                 )})}                               </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </BottomSheet>

       <BottomSheet
        isOpen={isRatingSheetOpen}
        onClose={() => setIsRatingSheetOpen(false)}
        title="Детали рейтинга"
      >
        <div className="flex border-b border-border-color dark:border-dark-border-color mb-4">
            <button 
                onClick={() => setActiveRatingTab('myRating')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeRatingTab === 'myRating' ? 'text-accent dark:text-dark-accent border-b-2 border-accent dark:border-dark-acцент' : 'text-text-secondary dark:text-dark-text-secondary'}`}
            >
                🏆 Мой рейтинг
            </button>
            {isUserAllowed && (
              <button 
                  onClick={() => setActiveRatingTab('overall')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeRatingTab === 'overall' ? 'text-accent dark:text-dark-accent border-b-2 border-accent dark:border-dark-accent' : 'text-text-secondary dark:text-dark-text-secondary'}`}
              >
                  👥 Общий рейтинг
              </button>
            )}
        </div>

        {activeRatingTab === 'myRating' && (
             <div className="animate-fade-in">
                {rankingStats.rank === 1 && (
                    <div className="text-center mb-6 p-4 bg-green-500/10 dark:bg-green-400/10 rounded-2xl border border-green-500/20 dark:border-green-400/20">
                        <h3 className="text-lg font-bold text-green-800 dark:text-green-300">Поздравляем! Ты — №1 в рейтинге! 🚀</h3>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">Твои усилия приносят невероятные результаты. Так держать!</p>
                    </div>
                )}
                <div className="text-center mb-6 pb-4 border-b border-border-color dark:border-dark-border-color">
                    <h3 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{displayName}</h3>
                    {rankingStats.rank > 0 && (
                         <p className="font-semibold text-accent dark:text-dark-acцент mt-1">
                            {rankingStats.rank} место из {rankingStats.total}
                        </p>
                    )}
                </div>
                <div className="flex justify-between items-center bg-highlight dark:bg-dark-highlight p-4 rounded-xl mb-6">
                    <span className="font-bold text-text-secondary dark:text-dark-text-secondary">Общий средний балл</span>
                    <span className="font-bold text-2xl text-accent dark:text-dark-acцент">{overallStats.rating}</span>
                </div>
                <div>
                    <h4 className="font-bold text-text-primary dark:text-dark-text-primary mb-2">Средние баллы по предметам:</h4>
                    <ul className="space-y-2 text-sm">
                        {Object.entries(gradesBySubject).sort(([, aData], [, bData]) => {
                            const a = aData as GroupedGrades;
                            const b = bData as GroupedGrades;
                            return (b.avgScore ?? 0) - (a.avgScore ?? 0);
                        }).map(([subject, data]) => {
                            const { avgScore } = data as GroupedGrades;
                            return (
                            <li key={subject} className="flex justify-between items-center bg-highlight dark:bg-dark-highlight p-3 rounded-lg">
                                <span className="text-text-secondary dark:text-dark-text-secondary">{subject}</span>
                                <span className="font-bold text-text-primary dark:text-dark-text-primary">{avgScore?.toFixed(2) ?? 'N/A'}</span>
                            </li>
                        )})}                    </ul>
                </div>
            </div>
        )}
        
        {activeRatingTab === 'overall' && isUserAllowed && fullLeaderboardData.length > 0 && (
            <div className="animate-fade-in">
                <p className="text-left text-xs text-text-secondary dark:text-dark-text-secondary mb-4">
                    Эксклюзивная панель с полным рейтингом группы.
                </p>
                <ul className="space-y-4">
                    {fullLeaderboardData.map((student, index) => (
                        <li key={student.userId} className="bg-highlight dark:bg-dark-highlight p-3 rounded-lg text-sm">
                            <div className="flex justify-between items-center font-bold text-text-primary dark:text-dark-text-primary">
                                <span className="truncate pr-2">
                                  {index + 1}. {student.userName}
                                </span>
                                <span className="text-lg">{student.overallRating.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">ID: {student.userId}</div>
                             <ul className="mt-2 pl-4 space-y-1 text-xs text-text-secondary dark:text-dark-text-secondary border-t border-border-color dark:border-dark-border-color pt-2">
                                {Object.entries(student.subjectAverages).map(([subject, score]) => (
                                    <li key={subject} className="flex justify-between">
                                        <span className="truncate pr-2 opacity-80">{subject}</span>
                                        <span className="font-medium whitespace-nowrap">{(score as number).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </BottomSheet>
      
      <BottomSheet
        isOpen={selectedSubjectForAnalytics !== null}
        onClose={() => setSelectedSubjectForAnalytics(null)}
        title={`Аналитика: ${selectedSubjectForAnalytics}`}
      >
        {renderAnalyticsContent()}
      </BottomSheet>

    </div>
  );
};

export default Grades;