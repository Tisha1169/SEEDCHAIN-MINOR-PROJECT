import { CheckCircle2 } from "lucide-react";
import { dateTime } from "@/lib/format";

export interface TimelineItem {
  key: string;
  label: string;
  time: string;
  detail?: string | null;
  meta?: string | null;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-accent/25 pl-6">
      {items.map((e) => (
        <li key={e.key} className="relative">
          <CheckCircle2 className="absolute -left-[34px] top-0.5 h-5 w-5 rounded-full bg-glass-2 text-accent" />
          <div className="text-sm font-medium text-ink">{e.label}</div>
          <div className="text-xs text-ink/50">
            {dateTime(e.time)}
            {e.meta ? ` · ${e.meta}` : ""}
          </div>
          {e.detail && <div className="mt-0.5 text-xs text-ink/70">{e.detail}</div>}
        </li>
      ))}
    </ol>
  );
}
