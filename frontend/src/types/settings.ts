export interface ShopSettings {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  /** Giờ "HH:mm". Giờ đóng nhỏ hơn giờ mở = mở qua đêm */
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  /** false = tạm ngưng nhận đơn online */
  acceptOrders: boolean;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  shippingFee: number;
  freeShippingThreshold: number;
}

/** Trạng thái mở cửa do server tính theo giờ Việt Nam */
export interface OpenStatus {
  isOpen: boolean;
  todayOpen: string;
  todayClose: string;
  message: string;
}
