import { CalendarClock, KanbanSquare, LineChart } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const HIGHLIGHTS = [
  { icon: KanbanSquare, text: "Drag applications through every stage" },
  { icon: CalendarClock, text: "Never miss an interview or follow-up" },
  { icon: LineChart, text: "See which applications turn into interviews" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</main>
      </div>

      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-end">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,oklch(0.55_0.22_280/0.45),transparent_70%),radial-gradient(50%_40%_at_10%_90%,oklch(0.6_0.2_300/0.3),transparent_70%)]" />
        <div aria-hidden className="bg-grid absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative space-y-8">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Your job search.
            <br />
            <span className="bg-linear-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              Finally organized.
            </span>
          </p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="grid size-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="size-4 text-indigo-200" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
