"use client";

/**
 * Kết nối realtime (Socket.IO) tới backend: server chủ động báo khi có chuyện mới
 * (đơn mới, đơn đổi trạng thái, thông báo) thay vì trình duyệt cứ vài chục giây hỏi lại.
 *
 * - Chỉ mở khi đã đăng nhập; đăng xuất / đổi tài khoản thì đóng.
 * - Nối THẲNG vào backend (NEXT_PUBLIC_SOCKET_URL) vì Vercel không chuyển tiếp được WebSocket.
 *   Cookie đăng nhập không đi theo sang tên miền backend → mỗi lần (nối lại) xin "vé" ngắn hạn qua /api/auth/socket-token.
 * - Mất mạng / server khởi động lại → Socket.IO tự nối lại; nối lại xong báo cho các trang tải lại dữ liệu (không bỏ sót tin).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

/** Sự kiện server gửi về */
export interface SocketEvents {
  "notification:new": import("@/types/notification").Notification;
  "order:new": { id: number };
  "order:updated": { id: number; status: string; paymentStatus: string };
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const userId = user?.id;

  // Tạo đối tượng kết nối theo người đăng nhập (chưa kết nối ngay — autoConnect: false)
  const socket = useMemo(
    () =>
      userId
        ? io(SOCKET_URL, {
            autoConnect: false,
            // Gọi lại mỗi lần kết nối / nối lại → luôn có vé còn hạn
            auth: (cb) => {
              api<{ data: { token: string } }>("/auth/socket-token")
                .then((res) => cb({ token: res.data.token }))
                .catch(() => cb({}));
            },
            transports: ["websocket", "polling"],
          })
        : null,
    [userId],
  );

  // Kết nối khi có người đăng nhập; đăng xuất / đổi tài khoản thì ngắt
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.connect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
      setConnected(false);
    };
  }, [socket]);

  return <SocketContext.Provider value={{ socket, connected: Boolean(socket) && connected }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

/** Lắng nghe 1 sự kiện realtime. `handler` luôn là bản mới nhất (không cần useCallback) */
export function useSocketEvent<E extends keyof SocketEvents>(event: E, handler: (data: SocketEvents[E]) => void) {
  const { socket } = useSocket();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!socket) return;
    const listener = (data: SocketEvents[E]) => ref.current(data);
    socket.on(event as string, listener);
    return () => {
      socket.off(event as string, listener);
    };
  }, [socket, event]);
}

/** Chạy `handler` mỗi khi NỐI LẠI sau khi mất kết nối → trang tải lại dữ liệu, không bỏ sót tin lúc mất mạng */
export function useSocketReconnect(handler: () => void) {
  const { socket } = useSocket();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!socket) return;
    let wasDisconnected = false;
    const onDisconnect = () => (wasDisconnected = true);
    const onConnect = () => {
      if (wasDisconnected) ref.current();
      wasDisconnected = false;
    };
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [socket]);
}
