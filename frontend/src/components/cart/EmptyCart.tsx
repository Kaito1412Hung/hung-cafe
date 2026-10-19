import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

interface EmptyCartProps {
  title: string;
  description: string;
  action: { href: string; label: string };
  onNavigate?: () => void;
}

export function EmptyCart({ title, description, action, onNavigate }: EmptyCartProps) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-coffee-100">
        <ShoppingBag className="h-9 w-9 text-coffee-500" />
      </span>
      <p className="mt-5 font-display text-xl font-semibold text-coffee-950">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm text-coffee-600">{description}</p>
      <Link href={action.href} onClick={onNavigate} className={buttonClass("primary", "md", "mt-6 rounded-full")}>
        {action.label}
      </Link>
    </div>
  );
}
