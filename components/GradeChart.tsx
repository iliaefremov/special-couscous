import React from 'react';
import type { SubjectGrade } from '../types';

interface GradeChartProps {
    grades: (SubjectGrade & { score: number })[];
}

export const GradeChart: React.FC<GradeChartProps> = ({ grades }) => {
    if (grades.length < 2) {
        return (
            <div className="h-40 flex items-center justify-center text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                Недостаточно данных для построения графика.
            </div>
        );
    }
    
    const width = 300;
    const height = 150;
    const padding = 20;

    const minScore = 0;
    const maxScore = 100;

    const getX = (index: number) => {
        return padding + (index / (grades.length - 1)) * (width - padding * 2);
    };

    const getY = (score: number) => {
        return height - padding - ((score - minScore) / (maxScore - minScore)) * (height - padding * 2);
    };
    
    const pathData = grades.map((grade, index) => {
        const x = getX(index);
        const y = getY(grade.score);
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');

    const lastGrade = grades[grades.length - 1];
    const firstGrade = grades[0];
    const trendColor = lastGrade.score >= firstGrade.score ? "stroke-green-500" : "stroke-red-500";

    return (
        <div className="w-full h-40">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={lastGrade.score >= firstGrade.score ? "rgba(74, 222, 128, 0.2)" : "rgba(239, 68, 68, 0.2)"} />
                        <stop offset="95%" stopColor={lastGrade.score >= firstGrade.score ? "rgba(74, 222, 128, 0)" : "rgba(239, 68, 68, 0)"} />
                    </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(score => (
                    <g key={score}>
                         <line
                            x1={padding}
                            y1={getY(score)}
                            x2={width - padding}
                            y2={getY(score)}
                            className="stroke-current text-border-color dark:text-dark-border-color"
                            strokeWidth="0.5"
                            strokeDasharray="2,3"
                        />
                        <text x={padding - 5} y={getY(score) + 3} className="text-[8px] fill-current text-text-secondary dark:text-dark-text-secondary" textAnchor="end">{score}</text>
                    </g>
                ))}

                {/* Area under line */}
                <path d={`${pathData} L ${getX(grades.length - 1)},${height - padding} L ${getX(0)},${height - padding} Z`} fill="url(#chartGradient)" />

                {/* Line */}
                <path d={pathData} className={`fill-none ${trendColor}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Points */}
                {grades.map((grade, index) => (
                    <circle key={index} cx={getX(index)} cy={getY(grade.score)} r="2.5" className={`fill-current ${trendColor}`} />
                ))}
            </svg>
        </div>
    );
};