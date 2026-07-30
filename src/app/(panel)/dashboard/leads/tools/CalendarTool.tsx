'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarToolProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  description?: string;
}

export default function CalendarTool({
  value,
  onChange,
  label = 'Fecha de inicio de trabajo',
  description = 'Selecciona la fecha en que comenzarás a trabajar este prospecto',
}: CalendarToolProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isMonthDisabled = (month: Date) => {
    return month < today;
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const numDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    return days;
  }, [currentMonth]);

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true;
    const dateString = date.toISOString().split('T')[0];
    return dateString < todayString;
  };

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    return date.toISOString().split('T')[0] === value;
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateDisabled(date)) {
      onChange(date.toISOString().split('T')[0]);
    }
  };

  const monthName = currentMonth.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-slate-700">{label}</label>

      {/* Calendar Container */}
      <div className="mx-auto w-72">
        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
            }
            disabled={isMonthDisabled(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
            )}
            className="p-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <span className="text-sm font-bold text-slate-700 capitalize flex-1 text-center">{monthName}</span>
          <button
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
            }
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-slate-50 rounded-lg p-1.5">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day) => (
              <div key={day} className="text-center text-[8px] font-bold text-slate-500 h-6 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              const disabled = isDateDisabled(date);
              const selected = isDateSelected(date);

              return (
                <button
                  key={idx}
                  onClick={() => date && handleDateSelect(date)}
                  disabled={disabled}
                  className={`
                    w-7 h-7 text-[10px] font-bold rounded transition-all flex items-center justify-center
                    ${!date ? 'invisible' : ''}
                    ${
                      selected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : disabled
                        ? 'bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed'
                        : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-100'
                    }
                  `}
                >
                  {date?.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}
