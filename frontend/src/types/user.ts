export type Role = "admin" | "customer";
export type Gender = "" | "male" | "female" | "other";

export interface User {
  id: number;
  /** Họ và tên thật (dùng khi giao hàng) */
  name: string;
  /** Tên hiển thị / biệt danh — "" nghĩa là chưa đặt */
  nickname: string;
  email: string;
  role: Role;
  /** Ảnh đại diện dạng data URL, "" = chưa có */
  avatar: string;
  phone: string;
  address: string;
  /** "YYYY-MM-DD" hoặc null */
  birthday: string | null;
  gender: Gender;
  createdAt: string;
}

export type ProfileInput = Partial<Pick<User, "name" | "nickname" | "phone" | "address" | "gender">> & { birthday?: string };
