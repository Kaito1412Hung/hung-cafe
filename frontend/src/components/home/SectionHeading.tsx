import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, description, align = "center" }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coffee-500">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-coffee-950 sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-lg leading-relaxed text-coffee-600">{description}</p>}
    </div>
  );
}
