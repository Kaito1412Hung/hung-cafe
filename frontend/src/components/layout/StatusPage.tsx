import type { ReactNode } from "react";
import { Logo } from "./Logo";

interface StatusPageProps {
  code: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  /** false khi trang đã nằm trong layout có Navbar (tránh 2 logo) */
  withHeader?: boolean;
}

/** Khung chung cho trang 404 / trang lỗi: nội dung giữa màn hình, có thể kèm logo trên cùng */
export function StatusPage({ code, icon, title, description, children, withHeader = true }: StatusPageProps) {
  return (
    <div className={`relative flex flex-col overflow-hidden bg-cream ${withHeader ? "min-h-screen" : "min-h-[70vh] pt-12"}`}>
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-coffee-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

      {withHeader && (
        <header className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Logo />
        </header>
      )}

      <main className="relative flex flex-1 items-center justify-center px-4 pb-20">
        <div className="max-w-lg animate-fade-up text-center">
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
            <span className="absolute font-display text-[7.5rem] font-bold leading-none text-coffee-100 select-none">{code}</span>
            <span className="relative flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-coffee-900 text-cream shadow-xl shadow-coffee-900/30">
              {icon}
            </span>
          </div>
          <h1 className="mt-8 font-display text-4xl font-bold tracking-tight text-coffee-950 sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-coffee-600">{description}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">{children}</div>
        </div>
      </main>
    </div>
  );
}
