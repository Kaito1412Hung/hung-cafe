"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, KeyRound, MessageCircle, PackageCheck, PackageX, Receipt, UserPlus, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notificationService";
import type { Notification, NotificationType } from "@/types/notification";

/** Bao lâu hỏi server một lần (polling). Nâng cao hơn có thể dùng WebSocket / SSE. */
const POLL_INTERVAL = 30_000;

const TYPE_STYLE: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  new_order: { icon: Receipt, color: "bg-emerald-50 text-emerald-600" },
  order_cancelled: { icon: XCircle, color: "bg-red-50 text-red-600" },
  low_stock: { icon: PackageX, color: "bg-amber-50 text-amber-600" },
  new_customer: { icon: UserPlus, color: "bg-violet-50 text-violet-600" },
  password_reset: { icon: KeyRound, color: "bg-sky-50 text-sky-600" },
  contact_message: { icon: MessageCircle, color: "bg-pink-50 text-pink-600" },
  order_status: { icon: PackageCheck, color: "bg-emerald-50 text-emerald-600" },
};

const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

/** "vừa xong", "5 phút trước", "hôm qua"... */
function timeAgo(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (seconds > -60) return "vừa xong";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) return rtf.format(Math.round(seconds / secs), unit);
  }
  return rtf.format(seconds, "second");
}

export function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  // Nhớ id thông báo mới nhất đã thấy để biết khi nào có cái mới → bật toast
  const latestSeenId = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await notificationService.list(20);
      const newest = res.data[0];
      if (latestSeenId.current !== null && newest && newest.id > latestSeenId.current && !newest.isRead) {
        toast(`🔔 ${newest.title}`, "info");
      }
      if (newest) latestSeenId.current = Math.max(latestSeenId.current ?? 0, newest.id);
      else latestSeenId.current ??= 0;
      setItems(res.data);
      setUnread(res.unreadCount);
    } catch {
      // Lỗi mạng tạm thời: bỏ qua, lần polling sau thử lại
    }
  }, [toast]);

  // Tải lần đầu + hỏi lại định kỳ + khi người dùng quay lại tab
  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, POLL_INTERVAL);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Click ra ngoài / Esc thì đóng
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) load();
    setOpen(!open);
  };

  const handleClick = async (n: Notification) => {
    setOpen(false);
    if (!n.isRead) {
      // Cập nhật giao diện ngay, gọi API sau (optimistic update)
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
      notificationService.markRead(n.id).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    setItems((prev) => prev?.map((x) => ({ ...x, isRead: true })) ?? null);
    setUnread(0);
    try {
      await notificationService.markAllRead();
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={cn("relative cursor-pointer rounded-full p-2 text-coffee-600 transition hover:bg-coffee-100", open && "bg-coffee-100")}
        aria-label={unread ? `Thông báo (${unread} chưa đọc)` : "Thông báo"}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-coffee-100 animate-modal-in max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:mt-0 max-sm:w-auto">
          <div className="flex items-center justify-between border-b border-coffee-100 px-4 py-3">
            <p className="font-semibold text-coffee-950">
              Thông báo {unread > 0 && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{unread} mới</span>}
            </p>
            <button
              onClick={markAll}
              disabled={unread === 0}
              className="flex cursor-pointer items-center gap-1 text-xs font-medium text-coffee-600 hover:text-coffee-950 disabled:cursor-default disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc tất cả
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {items === null ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse gap-3">
                    <div className="h-9 w-9 rounded-full bg-coffee-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-coffee-100" />
                      <div className="h-3 w-1/2 rounded bg-coffee-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <BellOff className="h-9 w-9 text-coffee-300" />
                <p className="mt-3 text-sm font-medium text-coffee-900">Chưa có thông báo nào</p>
                <p className="mt-1 text-xs text-coffee-500">Các cập nhật mới sẽ hiện ở đây.</p>
              </div>
            ) : (
              <ul className="divide-y divide-coffee-100">
                {items.map((n) => {
                  const { icon: Icon, color } = TYPE_STYLE[n.type];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={cn("flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition hover:bg-coffee-50", !n.isRead && "bg-coffee-50/60")}
                      >
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", color)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm text-coffee-950", !n.isRead && "font-semibold")}>{n.title}</span>
                          {n.message && <span className="mt-0.5 block text-xs leading-relaxed text-coffee-600">{n.message}</span>}
                          <span className="mt-1 block text-[11px] text-coffee-400">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-label="Chưa đọc" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
