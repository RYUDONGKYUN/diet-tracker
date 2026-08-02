import { useState } from "react";

interface Props {
  selected: string;
  onSelect: (date: string) => void;
  markedDates?: Set<string>;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function Calendar({ selected, onSelect, markedDates }: Props) {
  const initial = new Date(selected);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div>
      <div className="calendar-header">
        <button className="btn" onClick={goPrevMonth}>
          ◀
        </button>
        <strong>
          {viewYear}년 {viewMonth + 1}월
        </strong>
        <button className="btn" onClick={goNextMonth}>
          ▶
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div className="calendar-weekday" key={w}>
            {w}
          </div>
        ))}
        {cells.map((d, idx) => {
          if (d === null) return <div className="calendar-day empty" key={`e${idx}`} />;
          const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
          const isSelected = dateStr === selected;
          const hasLog = markedDates?.has(dateStr);
          return (
            <div
              key={dateStr}
              className={`calendar-day${isSelected ? " selected" : ""}${hasLog ? " has-log" : ""}`}
              onClick={() => onSelect(dateStr)}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
