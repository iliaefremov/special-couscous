import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SCHEDULE_WEEK_1, SCHEDULE_WEEK_2, NURSING_COURSE_USER_IDS } from '../constants';
import type { ScheduleItem, DaySchedule, Homework, TelegramUser } from './../types';
import { getHomeworks } from '../services/googleSheetsService';
import { RefreshIcon } from './icons/Icons';

// --- Новая вспомогательная функция для иконок ---
const getSubjectIcon = (subject: string): string => {
    const lowerCaseSubject = subject.toLowerCase();
    if (lowerCaseSubject.includes('физическая культура')) return '🏃‍♀️';
    if (lowerCaseSubject.includes('анатомия')) return '💀';
    if (lowerCaseSubject.includes('философия')) return '🧠';
    if (lowerCaseSubject.includes('физиология')) return '🫀';
    if (lowerCaseSubject.includes('иммунология')) return '🦠';
    if (lowerCaseSubject.includes('биохимия')) return '🧪';
    if (lowerCaseSubject.includes('гистология')) return '🔬';
    if (lowerCaseSubject.includes('безопасность жизнедеятельности')) return '⛑️';
    if (lowerCaseSubject.includes('сестринское дело')) return '🩹';
    if (lowerCaseSubject.includes('коммуникативный тренинг')) return '🗣️';
    if (lowerCaseSubject.includes('биоэтика')) return '❤️‍🩹';
    return '📚'; // Иконка по умолчанию
};


// --- Вспомогательные функции (вынесены для чистоты кода) ---

const DAYS_OF_WEEK = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
// CORRECTED: The start date has been adjusted to align the week calculation with the user's reality.
const SEMESTER_START_DATE = new Date('2024-08-26');

/**
 * Определяет номер ТЕКУЩЕЙ учебной недели (1 или 2).
 */
const getCurrentAcademicWeek = (currentDate: Date): 1 | 2 => {
    const start = new Date(SEMESTER_START_DATE);
    start.setHours(0, 0, 0, 0);

    const now = new Date(currentDate);
    now.setHours(0, 0, 0, 0);

    if (now < start) return 1;

    const diff = now.getTime() - start.getTime();
    const weeksPassed = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    const academicWeek = (weeksPassed % 2 === 0) ? 1 : 2;

    return academicWeek as 1 | 2;
};

/**
 * Определяет, какую неделю показывать по умолчанию.
 * Начиная с субботы, показывает следующую неделю.
 */
const getInitialDisplayedWeek = (currentDate: Date): 1 | 2 => {
    const currentAcademicWeek = getCurrentAcademicWeek(currentDate);
    const dayOfWeek = currentDate.getDay(); // Sunday - 0, Saturday - 6

    // Если сегодня суббота или воскресенье, показываем следующую неделю
    if (dayOfWeek === 6 || dayOfWeek === 0) {
        return currentAcademicWeek === 1 ? 2 : 1;
    }
    // В остальные дни показываем текущую
    return currentAcademicWeek;
};


const isCurrentTimeInRange = (timeString: string): boolean => {
    try {
        const now = new Date();
        const [startTimeStr, endTimeStr] = timeString.split(' - ');
        if (!startTimeStr || !endTimeStr) return false;
        const [startHour, startMinute] = startTimeStr.split(':').map(Number);
        const [endHour, endMinute] = endTimeStr.split(':').map(Number);
        if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return false;
        const classStartTime = new Date(now);
        classStartTime.setHours(startHour, startMinute, 0, 0);
        const classEndTime = new Date(now);
        classEndTime.setHours(endHour, endMinute, 0, 0);
        return now >= classStartTime && now < classEndTime;
    } catch (e) {
        console.error("Ошибка при парсинге строки времени:", timeString, e);
        return false;
    }
};

const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const getFormattedClassType = (type: string): 'Лекция' | 'Практика' | null => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('лекция')) return 'Лекция';
    if (typeLower.includes('практика')) return 'Практика';
    return null;
};

const formatClassroom = (classroom: string): string => {
    if (!classroom) return '';
    return classroom.replace(/ауд\./g, 'аудитория').replace(/каб\./g, 'кабинет').replace(/#/g, '№');
};

const getClassTypeBadgeColor = (classType: 'Лекция' | 'Практика' | null): string => {
  switch (classType) {
    case 'Лекция': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    case 'Практика': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
    default: return 'bg-highlight text-text-secondary dark:bg-dark-highlight dark:text-dark-text-secondary';
  }
};

const getActiveClassBorderColor = (classType: 'Лекция' | 'Практика' | null): string => {
  switch (classType) {
    case 'Лекция': return 'border-purple-500 dark:border-purple-400';
    case 'Практика': return 'border-orange-500 dark:border-orange-400';
    default: return 'border-red-500 dark:border-red-400'; // Fallback to red
  }
};

const parseSimpleMarkdown = (text: string | undefined) => {
    if (!text) return { __html: '' };

    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    html = html.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-accent dark:text-dark-accent hover:underline">${url}</a>`);

    html = html.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
    html = html.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
    html = html.replace(/~~(.*?)~~/g, '<del>$1$2</del>');
    html = html.replace(/\n/g, '<br />');

    return { __html: html };
};

// --- Оптимизированный компонент DayCard (вынесен и мемоизирован) ---

interface DayCardProps {
  dayData: DaySchedule;
  weekNumber: 1 | 2;
  date: Date;
  currentAcademicWeek: 1 | 2;
  today: Date;
  homeworkMap: Map<string, string>;
  isLoadingHomework: boolean;
  user: TelegramUser | null;
}

const DayCard = React.memo<DayCardProps>(({ dayData, weekNumber, date, currentAcademicWeek, today, homeworkMap, isLoadingHomework, user }) => {
    const { day: dayName, classes } = dayData;
    const isToday = currentAcademicWeek === weekNumber && date.toDateString() === today.toDateString();
    const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

    const filteredClasses = useMemo(() => {
        const userId = user?.id.toString();
        return classes.filter(item => {
            const isNursing = item.subject.toLowerCase().includes('сестринское дело');
            if (isNursing && !NURSING_COURSE_USER_IDS.includes(userId ?? '')) {
                return false; // Скрываем сестринское дело, если ID пользователя не в списке
            }
            return true;
        });
    }, [classes, user]);


    return (
        <div className={`flex-shrink-0 w-full flex flex-col p-4 rounded-2xl transition-all duration-300 ${isToday ? 'bg-accent/5 dark:bg-dark-accent/5 border-2 border-accent/30 dark:border-dark-accent/30 shadow-soft-lg dark:shadow-dark-soft-lg' : 'bg-secondary dark:bg-dark-secondary border border-border-color dark:border-dark-border-color shadow-soft dark:shadow-dark-soft'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${isToday ? 'text-accent dark:text-dark-accent' : 'text-text-primary dark:text-dark-text-primary'}`}>{dayName}</h3>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${isToday ? 'bg-accent/10 dark:bg-dark-accent/10 text-accent dark:text-dark-accent' : 'bg-highlight dark:bg-dark-highlight text-text-secondary dark:text-dark-text-secondary'}`}>{formattedDate}</span>
            </div>
            <div className="space-y-3">
                {filteredClasses.length > 0 ? filteredClasses.map((item) => {
                    const isNow = isToday && isCurrentTimeInRange(item.time);
                    const classType = getFormattedClassType(item.type);
                    const homeworkKey = `${weekNumber}-${dayName.trim().toLowerCase()}-${item.subject.trim().toLowerCase()}`;
                    const homeworkTask = homeworkMap.get(homeworkKey);

                    return (
                        <div key={item.id} className={`relative group bg-secondary dark:bg-dark-secondary rounded-2xl p-4 flex flex-col text-sm transition-all duration-300 ease-in-out border ${isNow ? getActiveClassBorderColor(classType) : 'border-border-color dark:border-dark-border-color'}`}>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3 flex-grow min-w-0">
                                        <span className="text-xl" role="img" aria-hidden="true">{getSubjectIcon(item.subject)}</span>
                                        <p className="font-bold text-text-primary dark:text-dark-text-primary pr-2">{item.subject}</p>
                                    </div>
                                    {classType && <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${getClassTypeBadgeColor(classType)}`}>{classType}</span>}
                                </div>
                                <div className="space-y-2 text-text-secondary dark:text-dark-text-secondary text-xs">
                                    <p className="flex items-center">
                                        <span className="opacity-75 mr-2.5" role="img" aria-hidden="true">⏰</span>
                                        <span className="font-medium text-text-primary dark:text-dark-text-primary whitespace-nowrap">{item.time}</span>
                                        {item.classroom && (
                                            <span className="flex min-w-0 items-baseline">
                                                <span className="mx-2 opacity-50">·</span>
                                                <span className="min-w-0">{formatClassroom(item.classroom)}</span>
                                            </span>
                                        )}
                                    </p>
                                    {item.teacher && (
                                        <p className="flex items-center">
                                            <span className="opacity-75 mr-2.5" role="img" aria-hidden="true">🧑‍🏫</span>
                                            <span className="font-semibold text-text-primary dark:text-dark-text-primary">{item.teacher}</span>
                                        </p>
                                    )}
                                </div>
                                {isLoadingHomework ? (
                                    <div className="text-xs mt-3 border-t border-border-color dark:border-dark-border-color pt-3">
                                        <p className="text-text-secondary dark:text-dark-text-secondary font-semibold mb-1.5">📝 Домашнее задание:</p>
                                        <div className="bg-highlight dark:bg-dark-highlight h-8 w-full rounded-lg animate-pulse"></div>
                                    </div>
                                ) : homeworkTask && (
                                    <div className="text-xs mt-3 border-t border-border-color dark:border-dark-border-color pt-3">
                                        <p className="text-text-secondary dark:text-dark-text-secondary font-semibold mb-1.5">📝 Домашнее задание:</p>
                                        <div 
                                            className="text-text-primary dark:text-dark-text-primary bg-blue-50 dark:bg-blue-500/10 p-2.5 rounded-lg break-words leading-snug"
                                            dangerouslySetInnerHTML={parseSimpleMarkdown(homeworkTask)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className={`rounded-2xl text-center text-text-secondary dark:text-dark-text-secondary flex items-center justify-center border-2 border-dashed border-highlight dark:border-dark-highlight p-4 min-h-[100px]`}>
                        <p className="text-sm">Пар нет, можно отдохнуть!</p>
                    </div>
                )}
            </div>
        </div>
    );
});

// --- Основной компонент Schedule ---

interface ScheduleProps {
    user: TelegramUser | null;
}

const Schedule: React.FC<ScheduleProps> = ({ user }) => {
    const [scheduleWeek1] = useState<DaySchedule[]>(SCHEDULE_WEEK_1);
    const [scheduleWeek2] = useState<DaySchedule[]>(SCHEDULE_WEEK_2);
    const [now, setNow] = useState(() => new Date());
    
    useEffect(() => {
        const timerId = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(timerId);
    }, []);

    const currentAcademicWeek = useMemo(() => getCurrentAcademicWeek(now), [now]);
    const [activeWeek, setActiveWeek] = useState<1 | 2>(() => getInitialDisplayedWeek(now));
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [isLoadingHomework, setIsLoadingHomework] = useState(true);
    const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const handleRefresh = useCallback(async () => {
        setIsLoadingHomework(true);
        try {
            const fetchedHomeworks = await getHomeworks();
            setHomeworks(fetchedHomeworks);
        } catch (error) {
            console.error("Не удалось обновить домашние задания:", error);
        } finally {
            setIsLoadingHomework(false);
        }
    }, []);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) tg.ready();
        handleRefresh();
    }, [handleRefresh]);

    const homeworkMap = useMemo(() => {
        const map = new Map<string, string>();
        homeworks.forEach(hw => {
            const key = `${hw.week}-${hw.day.trim().toLowerCase()}-${hw.subject.trim().toLowerCase()}`;
            map.set(key, hw.task);
        });
        return map;
    }, [homeworks]);

    const today = useMemo(() => now, [now]);
    const scrollToDayName = useMemo(() => {
        const dayIndex = today.getDay();
        return (dayIndex > 0 && dayIndex < 6) ? DAYS_OF_WEEK[dayIndex - 1] : 'Понедельник';
    }, [today]);

    const todayDateFormatted = useMemo(() => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(today), [today]);

    const activeWeekMonday = useMemo(() => {
        const monday = getMonday(new Date());
        if (activeWeek !== currentAcademicWeek) {
            // Если выбранная неделя не текущая, смещаем дату на 7 дней
            const weekDifference = (currentAcademicWeek === 1 && activeWeek === 2) ? 7 : -7;
            monday.setDate(monday.getDate() + weekDifference);
        }
        return monday;
    }, [activeWeek, currentAcademicWeek]);

    const displayedSchedule = useMemo(() => {
        const scheduleData = activeWeek === 1 ? scheduleWeek1 : scheduleWeek2;
        return [...scheduleData].sort((a, b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day));
    }, [activeWeek, scheduleWeek1, scheduleWeek2]);

    useEffect(() => {
        if (activeWeek === currentAcademicWeek && scrollToDayName && !isLoadingHomework) {
            const dayElement = dayRefs.current[scrollToDayName];
            if (dayElement) {
                const animationFrameId = requestAnimationFrame(() => {
                    dayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                return () => cancelAnimationFrame(animationFrameId);
            }
        }
    }, [activeWeek, currentAcademicWeek, scrollToDayName, isLoadingHomework]);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Расписание</h2>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">Сегодня: {todayDateFormatted}</p>
                </div>
                <button onClick={handleRefresh} disabled={isLoadingHomework} className="bg-secondary/80 dark:bg-dark-secondary/80 backdrop-blur-sm border border-border-color dark:border-dark-border-color text-accent dark:text-dark-accent font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center hover:bg-highlight dark:hover:bg-dark-highlight transition-colors disabled:opacity-50 disabled:cursor-wait">
                    <RefreshIcon className={`w-5 h-5 ${isLoadingHomework ? 'animate-spin' : ''}`} />
                    <span className="ml-2">{isLoadingHomework ? 'Обновление...' : 'Обновить'}</span>
                </button>
            </div>

            <div className="mb-6 p-4 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl border border-blue-500/20 dark:border-blue-400/20 text-left">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Сессия с 12 по 25 января 2026</p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">Каникулы с 26 января по 01 февраля 2026.</p>
            </div>

            <div className="flex gap-3 mb-6">
                <button onClick={() => setActiveWeek(1)} className={`flex-1 py-1.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 backdrop-blur-sm border dark:border-white/10 relative flex items-center justify-center ${activeWeek === 1 ? 'bg-white/70 dark:bg-white/20 text-accent dark:text-dark-accent shadow-soft' : 'bg-white/30 dark:bg-white/10 text-text-secondary dark:text-dark-text-secondary hover:bg-white/50 dark:hover:bg-white/15'}`}>
                    <span>Первая неделя</span>
                </button>
                <button onClick={() => setActiveWeek(2)} className={`flex-1 py-1.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 backdrop-blur-sm border dark:border-white/10 relative flex items-center justify-center ${activeWeek === 2 ? 'bg-white/70 dark:bg-white/20 text-accent dark:text-dark-accent shadow-soft' : 'bg-white/30 dark:bg-white/10 text-text-secondary dark:text-dark-text-secondary hover:bg-white/50 dark:hover:bg-white/15'}`}>
                    <span>Вторая неделя</span>
                </button>
            </div>

            <div className="space-y-6">
                {displayedSchedule.map((dayData, index) => {
                    const dayDate = new Date(activeWeekMonday);
                    dayDate.setDate(dayDate.getDate() + index);
                    const isScrollTarget = activeWeek === currentAcademicWeek && dayData.day === scrollToDayName;
                    return (
                        <div key={`w${activeWeek}-${dayData.day}`} ref={el => { dayRefs.current[dayData.day] = el; }} className={isScrollTarget ? 'scroll-target' : ''}>
                            <DayCard
                                dayData={dayData}
                                weekNumber={activeWeek}
                                date={dayDate}
                                currentAcademicWeek={currentAcademicWeek}
                                today={today}
                                homeworkMap={homeworkMap}
                                isLoadingHomework={isLoadingHomework}
                                user={user}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Schedule;