import React, { useState, useMemo } from 'react';
import type { SubjectGrade } from '../types';

// Добавлена функция для получения иконки предмета по аналогии с расписанием
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


/**
 * Форматирует дату в полный локализованный вид (с годом).
 */
const formatDate = (dateString: string): string => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
    } catch (e) {
        return dateString;
    }
};

/**
 * ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ ЦВЕТОВ.
 * Принимает числовую оценку (по 100-балльной шкале) и возвращает классы Tailwind.
 * @param {number} score - Оценка по 100-балльной шкале.
 * @returns {{textColor: string, badgeColor: string, bgColor: string}} Объект с классами Tailwind.
 */
const getColorsByScore = (score: number): { textColor: string, badgeColor: string, bgColor: string } => {
    if (score >= 86) return { // Отлично
        textColor: 'text-green-500 dark:text-green-400', 
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        bgColor: 'bg-green-500' 
    };
    if (score >= 71) return { // Хорошо
        textColor: 'text-yellow-500 dark:text-yellow-400', 
        badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        bgColor: 'bg-yellow-500' 
    };
    if (score >= 56) return { // Удовлетворительно
        textColor: 'text-orange-500 dark:text-orange-400', 
        badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        bgColor: 'bg-orange-500' 
    };
    return { // Неудовлетворительно
        textColor: 'text-red-500 dark:text-red-400', 
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        bgColor: 'bg-red-500'
    };
};

/**
 * Возвращает правильное склонение слова "отработка".
 */
const getPluralizedAbsences = (count: number): string => {
    const cases = [2, 0, 1, 1, 1, 2];
    const titles = ['отработка', 'отработки', 'отработок'];
    return titles[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[(count % 10 < 5) ? count % 10 : 5]];
};


interface SubjectGradeCardProps {
  subject: string;
  subjectGrades: SubjectGrade[];
  averageScoreFromSheet?: number;
  onAbsencesClick: () => void;
  onAnalyticsClick: () => void;
}

/**
 * Компонент карточки, отображающий все оценки по одному предмету.
 */
export const SubjectGradeCard: React.FC<SubjectGradeCardProps> = ({ subject, subjectGrades, averageScoreFromSheet, onAbsencesClick, onAnalyticsClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const absencesDetails = useMemo(() => subjectGrades.filter(g => g.score === 'н'), [subjectGrades]);
    const gradesToShow = subjectGrades.slice(0, 3);
    const hiddenGrades = subjectGrades.slice(3);
    
    const averageScoreForDisplay = averageScoreFromSheet?.toFixed(2) ?? 'N/A';
    const { textColor } = getColorsByScore(averageScoreFromSheet ?? 0);

    return (
        <div className="group bg-secondary dark:bg-dark-secondary rounded-3xl shadow-soft-subtle dark:shadow-dark-soft-subtle border border-border-color dark:border-dark-border-color p-5 transition-all duration-400 hover:shadow-soft-lg dark:hover:shadow-dark-soft-lg hover:scale-[1.01]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3 min-w-0 pr-4">
                    <span className="text-2xl" role="img" aria-hidden="true">{getSubjectIcon(subject)}</span>
                    <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">{subject}</h3>
                </div>
                <div className="text-right pl-2">
                    <span className={`font-bold text-3xl ${textColor}`}>{averageScoreForDisplay}</span>
                </div>
            </div>
            
            <div className="flex gap-2 mb-4">
                 {absencesDetails.length > 0 && (
                    <button 
                        onClick={onAbsencesClick}
                        className="flex-1 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-bold text-sm rounded-xl py-2.5 px-4 text-center hover:bg-red-200 dark:hover:bg-red-900/80 transition-colors flex items-center justify-center"
                    >
                        <span>🗓️ {absencesDetails.length} {getPluralizedAbsences(absencesDetails.length)}</span>
                    </button>
                 )}
                 <button 
                     onClick={onAnalyticsClick}
                     className="flex-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-sm rounded-xl py-2.5 px-4 text-center hover:bg-blue-200 dark:hover:bg-blue-900/80 transition-colors flex items-center justify-center"
                 >
                     <span>📊 Аналитика</span>
                 </button>
            </div>

            <ul className="space-y-2">
                {gradesToShow.map((grade, index) => <GradeListItem key={`last-${index}`} grade={grade} />)}
            </ul>

            <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[9999px] mt-2' : 'max-h-0 overflow-hidden'}`}>
                {hiddenGrades.length > 0 && (
                    <ul className="space-y-2 border-t border-border-color dark:border-dark-border-color pt-2">
                        {hiddenGrades.map((grade, index) => <GradeListItem key={`hidden-${index}`} grade={grade} />)}
                    </ul>
                )}
            </div>

            {subjectGrades.length > 3 && (
                <button onClick={() => setIsExpanded(prev => !prev)} className="w-full mt-4 text-accent dark:text-dark-accent font-bold py-2 px-3 rounded-lg text-sm hover:bg-accent/10 dark:hover:bg-dark-accent/10 flex items-center justify-center space-x-2 transition-colors">
                <span>{isExpanded ? 'Свернуть' : 'Показать все'}</span>
                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
            )}
        </div>
    );
};


/**
 * Компонент для отображения одной оценки в списке.
 * Вынесен для улучшения читаемости и верстки.
 */
const GradeListItem: React.FC<{ grade: SubjectGrade }> = ({ grade }) => {
    
    const getBadge = () => {
        let badgeColor: string;
        let displayText: string | number;

        if (grade.score === 'зачет') {
            badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            displayText = 'ЗЧ';
        } else if (grade.score === 'н') {
            badgeColor = 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200';
            displayText = 'Н';
        } else if (typeof grade.score === 'number') {
            badgeColor = getColorsByScore(grade.score).badgeColor;
            displayText = grade.score;
        } else {
            badgeColor = 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
            displayText = '?';
        }
        
        return <div className={`flex-shrink-0 text-sm font-bold w-10 h-10 flex items-center justify-center rounded-full ${badgeColor}`}>{displayText}</div>;
    };

    return (
        <li className="flex items-center p-3 rounded-xl bg-secondary dark:bg-dark-secondary border border-border-color dark:border-dark-border-color">
            <div className="flex-grow min-w-0 pr-3">
                <p className="font-semibold text-sm truncate text-text-primary dark:text-dark-text-primary">{grade.topic}</p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{formatDate(grade.date)}</p>
            </div>
            {getBadge()}
        </li>
    );
};