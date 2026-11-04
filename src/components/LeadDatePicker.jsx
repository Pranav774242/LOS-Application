'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import Calendar from 'react-calendar';

const leadDatePickerStyles = `
.lead-calendar-picker{position:relative;width:100%;min-width:0}
.lead-calendar-picker .lead-date-picker-trigger{height:39px;min-height:39px;padding:0 10px;border:1px solid #cbd9d6;border-radius:5px;background:#fff;color:#263f41;font-size:12px}
.lead-calendar-picker .lead-date-picker-trigger:disabled{background:#f1f5f4;color:#839291;cursor:not-allowed;opacity:1}
.lead-date-picker-clear{width:100%;margin-top:8px;padding:7px;border:1px solid #d4e8e2;border-radius:5px;background:#fff;color:#176e67;font:inherit;font-size:12px;cursor:pointer}
.lead-date-picker-clear:hover{background:#e5f3ef}
`;

const toCalendarDate = (value) => {
  if (!value) return null;
  const dateParts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateParts) return null;

  const [, yearText, monthText, dayText] = dateParts;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
};

const formatDate = (value) => toCalendarDate(value)?.toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}) || 'Select date';

const toInputDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function LeadDatePicker({
  id,
  name,
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
}) {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = toCalendarDate(value);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsidePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [isOpen]);

  const handleDateChange = (date) => {
    if (!(date instanceof Date)) return;
    onChange(toInputDate(date));
    setIsOpen(false);
  };

  return (
    <>
      <style>{leadDatePickerStyles}</style>
      <div ref={containerRef} className="lead-calendar-picker">
        <input type="hidden" name={name} value={value || ''} disabled={disabled} />
        <button
          id={id}
          type="button"
          className="dob-picker-trigger lead-date-picker-trigger"
          aria-label={`Choose ${label}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-required={required}
          data-date-picker-trigger={name}
          disabled={disabled}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className={value ? '' : 'dob-picker-placeholder'}>{formatDate(value)}</span>
          <CalendarDays size={16} aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className="dob-calendar-popover" role="dialog" aria-label={`Choose ${label}`}>
            <Calendar
              className="loan-birth-calendar"
              value={selectedDate}
              minDate={toCalendarDate(min) || undefined}
              maxDate={toCalendarDate(max) || undefined}
              defaultActiveStartDate={selectedDate || toCalendarDate(min) || toCalendarDate(max) || new Date()}
              onChange={handleDateChange}
              locale="en-IN"
            />
            {value && !required ? (
              <button type="button" className="lead-date-picker-clear" onClick={() => {
                onChange('');
                setIsOpen(false);
              }}>Clear date</button>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
