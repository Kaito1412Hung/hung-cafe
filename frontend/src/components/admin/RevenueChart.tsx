"use client";

import { useState } from "react";
import { cn, formatPrice } from "@/lib/utils";

interface Point {
  date: string;
  revenue: number;
  orders: number;
}

/** 1.250.000 → "1,3tr", 45.000 → "45k" (nhãn trục ngắn gọn) */
function shortMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",")}tr`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

/** Làm tròn giá trị lớn nhất lên số "đẹp" để vạch lưới dễ đọc */
function niceMax(v: number) {
  if (v <= 0) return 100_000;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v)!;
  return step * pow;
}

const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/**
 * Biểu đồ cột doanh thu theo ngày — 1 chuỗi số liệu nên dùng 1 màu, không cần chú thích.
 * Cột bo 4px ở đầu, khe 2px giữa các cột, lưới mờ, di chuột vào cột để xem chi tiết.
 */
export function RevenueChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.revenue)));
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  // Nhiều ngày thì chỉ ghi nhãn cách quãng để chữ không chồng lên nhau
  const labelEvery = data.length <= 7 ? 1 : data.length <= 31 ? 5 : 15;
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="relative flex h-64">
        {/* Trục Y */}
        <div className="flex w-12 shrink-0 flex-col justify-between pb-6 pr-2 text-right text-[11px] tabular-nums text-coffee-400">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {shortMoney(t)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Lưới ngang (mờ, nằm sau cột) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t, i) => (
              <div key={t} className={cn("border-t", i === ticks.length - 1 ? "border-coffee-200" : "border-dashed border-coffee-100")} />
            ))}
          </div>

          {/* Cột */}
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const h = (d.revenue / max) * 100;
              return (
                <div
                  key={d.date}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                >
                  <div
                    className={cn(
                      "w-full max-w-10 rounded-t-[4px] transition-colors",
                      d.revenue === 0 ? "bg-coffee-100" : hover === i ? "bg-coffee-900" : "bg-coffee-600",
                    )}
                    style={{ height: d.revenue === 0 ? "2px" : `${Math.max(h, 1.5)}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Tooltip */}
          {hovered && hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-44 -translate-x-1/2 rounded-xl bg-white p-3 text-xs shadow-lg ring-1 ring-coffee-100"
              style={{ left: `clamp(88px, ${((hover + 0.5) / data.length) * 100}%, calc(100% - 88px))` }}
            >
              <p className="font-semibold text-coffee-950">{dayLabel(hovered.date)}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-coffee-600">
                  <span className="h-2 w-2 rounded-sm bg-coffee-600" /> Doanh thu
                </span>
                <span className="font-semibold tabular-nums text-coffee-950">{formatPrice(hovered.revenue)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-coffee-600">Số đơn</span>
                <span className="tabular-nums text-coffee-950">{hovered.orders}</span>
              </div>
            </div>
          )}

          {/* Trục X */}
          <div className="absolute inset-x-0 bottom-0 flex h-6 items-end gap-[2px]">
            {data.map((d, i) => (
              <span key={d.date} className="flex-1 text-center text-[11px] tabular-nums text-coffee-400">
                {(i % labelEvery === 0 || i === data.length - 1) && (data.length - 1 - i >= labelEvery / 2 || i === data.length - 1) ? dayLabel(d.date) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng dữ liệu cho trình đọc màn hình */}
      <table className="sr-only">
        <caption>Doanh thu theo ngày</caption>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Doanh thu</th>
            <th>Số đơn</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{formatPrice(d.revenue)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
