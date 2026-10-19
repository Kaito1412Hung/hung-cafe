import type { ReactNode } from "react";

/**
 * Khung một nhóm cài đặt: tiêu đề + mô tả bên trái, nội dung bên phải.
 * Dùng container query (@container) → chia cột theo độ rộng thật của thẻ, không theo màn hình.
 */
export function SettingsCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="@container overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
      <div className="grid gap-6 p-6 @3xl:grid-cols-[240px_1fr] @3xl:gap-10">
        <div>
          <h2 className="font-display text-lg font-semibold text-coffee-950">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-coffee-500">{description}</p>
        </div>
        <div className="@container min-w-0">{children}</div>
      </div>
      {footer && <div className="flex justify-end gap-3 border-t border-coffee-100 bg-coffee-50/50 px-6 py-4">{footer}</div>}
    </section>
  );
}
