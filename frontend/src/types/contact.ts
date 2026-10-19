export interface ContactMessage {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContactInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface Subscriber {
  id: number;
  email: string;
  createdAt: string;
}
