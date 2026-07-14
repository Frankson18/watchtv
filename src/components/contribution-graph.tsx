"use client";

import { useMemo } from "react";
import type { ContributionDay } from "@/lib/stats";

const WEEKS = 53;
const DAYS = 7;

function levelColor(count: number): string {
  if (count === 0) return "var(--color-bg-elev-2)";
  if (count === 1) return "#7E2828";
  if (count <= 3) return "var(--color-accent)";
  return "#FF6E6E";
}

const WD = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function ContributionGraph({
  days,
  year,
}: {
  days: ContributionDay[];
  year: number;
}) {
  const grid = useMemo(() => {
    const out: (ContributionDay | null)[][] = [];
    for (let w = 0; w < WEEKS; w++) out.push(new Array(DAYS).fill(null));

    for (const day of days) {
      const d = new Date(day.date + "T00:00:00");
      const dayOfWeek = d.getDay();
      const startOfYear = new Date(year, 0, 1);
      const startDayOfWeek = startOfYear.getDay();
      const diffMs = d.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diffMs / 86400000);
      const adjusted = dayOfYear + startDayOfWeek;
      const week = Math.floor(adjusted / 7);
      const dow = dayOfWeek;
      if (week >= 0 && week < WEEKS) {
        out[week][dow] = day;
      }
    }
    return out;
  }, [days, year]);

  const total = days.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-tertiary">
          {total} contribuições em {year}
        </span>
      </div>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 justify-around mr-1 text-[9px] text-text-tertiary pr-0.5">
          {WD.map((d, i) => (
            <span key={i} className="h-[10px] leading-[10px]">
              {i % 2 === 1 ? d : ""}
            </span>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day ? `${day.count} em ${day.date}` : undefined}
                  className="w-[10px] h-[10px] rounded-[2px]"
                  style={{
                    backgroundColor: day ? levelColor(day.count) : "transparent",
                    border: day ? "none" : "1px solid var(--color-border)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-text-tertiary self-end">
        <span>Menos</span>
        {[0, 1, 2, 3].map((lv) => (
          <span
            key={lv}
            className="w-[10px] h-[10px] rounded-[2px]"
            style={{ backgroundColor: levelColor(lv === 0 ? 0 : lv === 1 ? 1 : lv === 2 ? 3 : 5) }}
          />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}