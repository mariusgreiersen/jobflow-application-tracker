import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  KanbanSquare,
  MoonStar,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProductPreview } from "@/features/marketing/product-preview";

const REPO_URL = "https://github.com/SqushiLoL/jobflow-application-tracker";

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Visual pipeline",
    text: "Drag applications from Saved to Offer on a Kanban board. Every move is saved instantly and kept in a history log.",
  },
  {
    icon: CalendarClock,
    title: "Interview agenda",
    text: "Every upcoming interview, grouped by day in your own time zone, with preparation notes alongside.",
  },
  {
    icon: BellRing,
    title: "Follow-up reminders",
    text: "Set reminders to check in with recruiters. Overdue follow-ups stand out on your dashboard so nothing slips.",
  },
  {
    icon: BarChart3,
    title: "Honest analytics",
    text: "See how many applications turn into interviews and offers, with every formula explained.",
  },
  {
    icon: Search,
    title: "Search & filters",
    text: "Find any application by company, role or location, then narrow by status, work type or date.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Postgres Row Level Security means your data is only ever readable by you, enforced by the database itself.",
  },
];

const STEPS = [
  { title: "Add the jobs you care about", text: "Save postings you're eyeing or log applications you've already sent. Only company and title are required." },
  { title: "Move them through your pipeline", text: "Drag cards as you hear back, schedule interviews and set follow-up reminders." },
  { title: "Learn what's working", text: "Your dashboard and analytics update as you go, so you can see where to focus." },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-transparent bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href={REPO_URL} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden h-9 sm:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="h-9">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 h-[640px] bg-[radial-gradient(50%_50%_at_50%_0%,oklch(0.6_0.2_280/0.22),transparent_75%)] dark:bg-[radial-gradient(50%_50%_at_50%_0%,oklch(0.55_0.22_280/0.3),transparent_75%)]" />
          <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-50 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)] dark:opacity-30" />

          <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur transition-colors hover:text-foreground"
            >
              <Sparkles className="size-3.5 text-primary" />
              Free and open source
              <ArrowRight className="size-3" />
            </a>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
              Your job search.{" "}
              <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-fuchsia-400">
                Finally organized.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
              Track every application, prepare for every interview, and stay on top of every opportunity, all in one
              beautiful workspace.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-5 text-[15px] shadow-lg shadow-indigo-500/25">
                <Link href="/signup">
                  Get started free <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5 text-[15px]">
                {/* Plain anchor: /demo sets a cookie, so it must not be prefetched. */}
                <a href="/demo">
                  <Sparkles className="text-primary" /> Try the demo
                </a>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">The demo needs no account and runs entirely in your browser.</p>
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
            <ProductPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary">Everything in one place</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Built for the way job searches actually go</h2>
              <p className="mt-4 text-muted-foreground">
                No more spreadsheets, sticky notes and forgotten follow-ups. JobFlow keeps your whole pipeline current.
              </p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="group rounded-2xl border bg-card p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-indigo-500/15 to-violet-500/10 text-primary ring-1 ring-primary/15">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MoonStar className="size-4" /> Light and dark themes, keyboard accessible, and responsive down to your phone.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary">How it works</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Up and running in a minute</h2>
            </div>
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative rounded-2xl border bg-card p-6 shadow-xs">
                  <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-sidebar px-6 py-16 text-center text-white shadow-2xl sm:px-12">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,oklch(0.55_0.22_280/0.55),transparent_70%)]" />
            <div aria-hidden className="bg-grid absolute inset-0 opacity-[0.06]" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to take control of your search?</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">
                Create a free account, or explore a fully working demo with sample data first.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-11 bg-white px-5 text-[15px] text-slate-900 hover:bg-white/90">
                  <Link href="/signup">
                    Create your workspace <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="h-11 px-5 text-[15px] text-white hover:bg-white/10 hover:text-white">
                  <a href="/demo">Try the demo</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="opacity-80" />
          <p>Open source under the MIT License.</p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            View source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
