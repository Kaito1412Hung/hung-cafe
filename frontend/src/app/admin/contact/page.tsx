"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, Download, Inbox, Mail, MailOpen, Phone, Reply, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { contactService } from "@/services/contactService";
import type { ContactMessage, Subscriber } from "@/types/contact";

type Tab = "messages" | "subscribers";

export default function AdminContactPage() {
  // useSearchParams() cần được bọc trong Suspense
  return (
    <Suspense>
      <AdminContact />
    </Suspense>
  );
}

function AdminContact() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  // ?message=12 (từ chuông thông báo) → mở sẵn tin nhắn #12
  const messageParam = Number(useSearchParams().get("message")) || null;

  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([contactService.getMessages(), contactService.getSubscribers()])
      .then(([m, s]) => {
        if (cancelled) return;
        setMessages(m.data);
        setSubscribers(s);
      })
      .catch((err: Error) => !cancelled && toast(err.message, "error"));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const replaceMessage = (updated: ContactMessage) => setMessages((prev) => prev?.map((m) => (m.id === updated.id ? updated : m)) ?? null);

  /** Mở tin nhắn → tự đánh dấu đã đọc */
  const openMessage = async (m: ContactMessage) => {
    setOpenId(openId === m.id ? null : m.id);
    if (!m.isRead) {
      replaceMessage({ ...m, isRead: true });
      contactService.setRead(m.id, true).catch(() => {});
    }
  };

  // Mở sẵn tin nhắn trong link thông báo (1 lần, sau khi tải xong), rồi xoá ?message khỏi URL
  useEffect(() => {
    if (!messageParam || !messages) return;
    const target = messages.find((m) => m.id === messageParam);
    const t = setTimeout(() => {
      if (target) {
        setTab("messages");
        setOpenId(target.id);
        if (!target.isRead) {
          replaceMessage({ ...target, isRead: true });
          contactService.setRead(target.id, true).catch(() => {});
        }
        requestAnimationFrame(() => document.getElementById(`tin-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
      router.replace(pathname, { scroll: false });
    }, 0);
    return () => clearTimeout(t);
  }, [messageParam, messages, pathname, router]);

  const toggleRead = async (m: ContactMessage) => {
    try {
      replaceMessage(await contactService.setRead(m.id, !m.isRead));
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const removeMessage = async (m: ContactMessage) => {
    if (!confirm(`Xoá tin nhắn của ${m.name}?`)) return;
    try {
      await contactService.deleteMessage(m.id);
      setMessages((prev) => prev?.filter((x) => x.id !== m.id) ?? null);
      toast("Đã xoá tin nhắn", "info");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const removeSubscriber = async (s: Subscriber) => {
    if (!confirm(`Xoá ${s.email} khỏi danh sách nhận tin?`)) return;
    try {
      await contactService.deleteSubscriber(s.id);
      setSubscribers((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
      toast("Đã xoá email", "info");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText((subscribers ?? []).map((s) => s.email).join(", "));
      toast(`Đã sao chép ${subscribers?.length ?? 0} email`);
    } catch {
      toast("Không sao chép được", "error");
    }
  };

  /** Xuất file CSV (mở được bằng Excel) */
  const exportCsv = () => {
    const rows = [["Email", "Ngày đăng ký"], ...(subscribers ?? []).map((s) => [s.email, formatDateTime(s.createdAt)])];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "dang-ky-nhan-tin.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const unreadCount = messages?.filter((m) => !m.isRead).length ?? 0;
  const shownMessages = (messages ?? []).filter((m) => filter === "all" || !m.isRead);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-coffee-500">Quản lý / Liên hệ</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Liên hệ</h1>
        <p className="mt-1 text-coffee-600">Tin nhắn khách gửi từ trang Liên hệ và danh sách đăng ký nhận tin.</p>
      </div>

      <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-coffee-100">
        {(
          [
            ["messages", "Tin nhắn", messages?.length, unreadCount],
            ["subscribers", "Đăng ký nhận tin", subscribers?.length, 0],
          ] as const
        ).map(([value, label, count, unread]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition", tab === value ? "bg-coffee-900 text-cream" : "text-coffee-600 hover:bg-coffee-50")}
          >
            {label}
            {count !== undefined && <span className={cn("rounded-md px-1.5 text-xs", tab === value ? "bg-coffee-700" : "bg-coffee-100 text-coffee-700")}>{count}</span>}
            {unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread} mới</span>}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
          <div className="flex gap-1.5 border-b border-coffee-100 p-3">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn("cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition", filter === f ? "bg-coffee-100 text-coffee-950" : "text-coffee-500 hover:bg-coffee-50")}
              >
                {f === "all" ? "Tất cả" : `Chưa đọc (${unreadCount})`}
              </button>
            ))}
          </div>

          {messages === null ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-coffee-50" />
              ))}
            </div>
          ) : shownMessages.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <Inbox className="h-10 w-10 text-coffee-300" />
              <p className="mt-3 font-medium text-coffee-900">{filter === "unread" ? "Đã đọc hết tin nhắn 🎉" : "Chưa có tin nhắn nào"}</p>
            </div>
          ) : (
            <ul className="divide-y divide-coffee-100">
              {shownMessages.map((m) => {
                const open = openId === m.id;
                return (
                  <li key={m.id} id={`tin-${m.id}`} className={cn(!m.isRead && "bg-coffee-50/60")}>
                    <button onClick={() => openMessage(m)} className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left transition hover:bg-coffee-50">
                      <span className={cn("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", m.isRead ? "bg-coffee-100 text-coffee-500" : "bg-pink-50 text-pink-600")}>
                        {m.isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className={cn("text-coffee-950", !m.isRead && "font-semibold")}>
                            {m.name}
                            {m.userId && <span className="ml-2 rounded bg-coffee-100 px-1.5 py-0.5 text-[10px] font-medium text-coffee-600">Thành viên</span>}
                          </span>
                          <span className="text-xs text-coffee-400">{formatDateTime(m.createdAt)}</span>
                        </span>
                        {m.subject && <span className="block text-sm font-medium text-coffee-800">{m.subject}</span>}
                        <span className={cn("block text-sm text-coffee-600", !open && "line-clamp-1")}>{m.message}</span>
                      </span>
                    </button>
                    {open && (
                      <div className="space-y-3 px-5 pb-5 pl-17">
                        <p className="whitespace-pre-line rounded-xl bg-white p-4 text-sm leading-relaxed text-coffee-800 ring-1 ring-coffee-100">{m.message}</p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-coffee-600">
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-4 w-4" /> {m.email}
                          </span>
                          {m.phone && (
                            <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 hover:text-coffee-950">
                              <Phone className="h-4 w-4" /> {m.phone}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Tin nhắn gửi Hưng Café"}`)}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-coffee-900 px-3 text-sm font-medium text-cream transition hover:bg-coffee-800"
                          >
                            <Reply className="h-4 w-4" /> Trả lời qua email
                          </a>
                          <Button size="sm" variant="outline" onClick={() => toggleRead(m)}>
                            {m.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeMessage(m)} className="text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" /> Xoá
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-coffee-100 p-4">
            <p className="text-sm text-coffee-600">
              <strong className="text-coffee-950">{subscribers?.length ?? 0}</strong> email đã đăng ký nhận ưu đãi
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyEmails} disabled={!subscribers?.length}>
                <Copy className="h-4 w-4" /> Sao chép tất cả
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={!subscribers?.length}>
                <Download className="h-4 w-4" /> Xuất Excel (CSV)
              </Button>
            </div>
          </div>
          {subscribers === null ? (
            <div className="h-40 animate-pulse bg-coffee-50/50" />
          ) : subscribers.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <Users className="h-10 w-10 text-coffee-300" />
              <p className="mt-3 font-medium text-coffee-900">Chưa có ai đăng ký nhận tin</p>
            </div>
          ) : (
            <ul className="divide-y divide-coffee-100">
              {subscribers.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-coffee-950">{s.email}</p>
                    <p className="text-xs text-coffee-500">Đăng ký lúc {formatDateTime(s.createdAt)}</p>
                  </div>
                  <button onClick={() => removeSubscriber(s)} className="cursor-pointer rounded-lg p-2 text-coffee-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Xoá ${s.email}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
