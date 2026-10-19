import type { Role } from "../modules/auth/auth.schema";

// Bổ sung thuộc tính req.user cho Request của Express
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: Role };
    }
  }
}

export {};
