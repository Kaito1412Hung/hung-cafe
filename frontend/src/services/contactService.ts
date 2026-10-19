import { api } from "@/lib/api";
import type { ContactInput, ContactMessage, Subscriber } from "@/types/contact";

export const contactService = {
  /* ----- Khách ----- */
  async send(input: ContactInput): Promise<string> {
    return (await api<{ message: string }>("/contact", { method: "POST", body: JSON.stringify(input) })).message;
  },

  /** Đăng ký mới thành công → kèm mã giảm giá đơn đầu tiên */
  async subscribe(email: string): Promise<{ message: string; couponCode?: string }> {
    return api<{ message: string; couponCode?: string }>("/newsletter", { method: "POST", body: JSON.stringify({ email }) });
  },

  /* ----- Admin ----- */
  async getMessages() {
    return api<{ data: ContactMessage[]; unreadCount: number }>("/contact");
  },

  async setRead(id: number, isRead: boolean): Promise<ContactMessage> {
    return (await api<{ data: ContactMessage }>(`/contact/${id}`, { method: "PATCH", body: JSON.stringify({ isRead }) })).data;
  },

  async deleteMessage(id: number): Promise<void> {
    await api(`/contact/${id}`, { method: "DELETE" });
  },

  async getSubscribers(): Promise<Subscriber[]> {
    return (await api<{ data: Subscriber[] }>("/newsletter")).data;
  },

  async deleteSubscriber(id: number): Promise<void> {
    await api(`/newsletter/${id}`, { method: "DELETE" });
  },
};
