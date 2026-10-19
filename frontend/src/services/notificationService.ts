import { api } from "@/lib/api";
import type { Notification } from "@/types/notification";

export const notificationService = {
  async list(limit = 20) {
    return api<{ data: Notification[]; unreadCount: number }>(`/notifications?limit=${limit}`);
  },

  async markRead(id: number) {
    await api(`/notifications/${id}/read`, { method: "PATCH" });
  },

  async markAllRead() {
    await api("/notifications/read-all", { method: "PATCH" });
  },
};
