"use client";

import Link from "next/link";
import Image from "next/image";
import { Instrument_Serif } from "next/font/google";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Github,
  GitBranch,
  Boxes,
  Globe,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/globals/theme-toggle";
import { Reveal } from "@/components/landing/reveal";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

const AUTH_HREF = "/connect-github";

/* -------------------------------------------------------------------------- */
/*  Nav                                                                        */
/* -------------------------------------------------------------------------- */

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Image src="/logo.svg" alt="" width={24} height={24} aria-hidden />
          <span>ShipIt</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <a
            href="#how-it-works"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            How it works
          </a>
          <a
            href="#features"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Features
          </a>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
            <Link href={AUTH_HREF}>Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={AUTH_HREF}>
              <Github aria-hidden />
              Deploy
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

const heroLines = [
  { prefix: "→", text: "Deploying you/app (main)", muted: false },
  { prefix: "✓", text: "Cloning github.com/you/app", muted: true },
  { prefix: "✓", text: "Building in isolated container", muted: true },
  { prefix: "✓", text: "Uploading artifacts to storage", muted: true },
  { prefix: "→", text: "Live at app.shipit.dev", muted: false },
];

function TerminalCard() {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-primary/5">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-4 py-3">
        <span className="size-3 rounded-full bg-destructive/60" aria-hidden />
        <span
          className="size-3 rounded-full bg-muted-foreground/40"
          aria-hidden
        />
        <span className="size-3 rounded-full bg-primary/50" aria-hidden />
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          build log
        </span>
      </div>
      <div className="space-y-2 p-5 font-mono text-sm">
        {heroLines.map((line, i) => (
          <motion.div
            key={line.text}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={reduce ? undefined : { opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              ease: [0, 0, 0.2, 1],
              delay: 0.5 + i * 0.18,
            }}
            className="flex items-start gap-3"
          >
            <span
              className={
                line.prefix === "✓"
                  ? "text-primary"
                  : line.prefix === "→"
                    ? "text-foreground"
                    : "text-muted-foreground"
              }
              aria-hidden
            >
              {line.prefix}
            </span>
            <span
              className={
                line.muted ? "text-muted-foreground" : "text-foreground"
              }
            >
              {line.text}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft token-based glow, purely decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-105 w-205 max-w-full -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="container mx-auto px-4 pb-16 pt-20 md:pt-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Reveal mount>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Zap className="size-3.5 text-primary" aria-hidden />
              Self-hosted deployments, your infrastructure
            </span>
          </Reveal>

          <Reveal mount delay={0.08}>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Ship any repo to a live URL,{" "}
              <span
                className={`${instrumentSerif.className} font-normal italic`}
              >
                in one click
              </span>
            </h1>
          </Reveal>

          <Reveal mount delay={0.16}>
            <p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              Connect a GitHub repo and ShipIt clones it, builds it in an
              isolated container, and serves it from your own storage — a
              self-hosted platform you fully control.
            </p>
          </Reveal>

          <Reveal mount delay={0.24}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href={AUTH_HREF}>
                  <Github aria-hidden />
                  Deploy from GitHub
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 px-5">
                <a href="#how-it-works">
                  See how it works
                  <ArrowRight aria-hidden />
                </a>
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal mount delay={0.32} className="mt-14">
          <TerminalCard />
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  How it works                                                               */
/* -------------------------------------------------------------------------- */

const steps = [
  {
    icon: GitBranch,
    title: "Connect your repo",
    body: "Sign in with GitHub and pick any repository — public or private. Your access token stays on your own instance.",
  },
  {
    icon: Boxes,
    title: "Build in isolation",
    body: "A fresh Docker container clones, installs, and builds your project. Resource-capped and torn down after every run.",
  },
  {
    icon: Globe,
    title: "Go live instantly",
    body: "Build output is uploaded to your storage and served on a subdomain. Push again to ship a new deployment.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="border-t border-border/60 py-20"
    >
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2
            id="how-heading"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            From commit to live URL in three steps
          </h2>
          <p className="mt-3 text-muted-foreground">
            The same flow every time — no config sprawl, no black boxes.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="h-full rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Features                                                                   */
/* -------------------------------------------------------------------------- */

const features = [
  {
    icon: Github,
    title: "GitHub-native",
    body: "Deploy straight from your repositories, including private ones, using OAuth.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated builds",
    body: "Every build runs in its own container with memory, CPU, and time limits.",
  },
  {
    icon: Server,
    title: "Self-hosted",
    body: "Runs on your infrastructure with S3-compatible storage — R2, MinIO, or AWS.",
  },
  {
    icon: Zap,
    title: "Instant subdomains",
    body: "Each deployment is served on its own subdomain, with SPA routing built in.",
  },
];

function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-t border-border/60 py-20"
    >
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2
            id="features-heading"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Everything you need to ship
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built to feel like Vercel — running entirely on hardware you own.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.06}>
              <div className="h-full rounded-lg border border-border bg-card p-6">
                <feature.icon className="size-5 text-primary" aria-hidden />
                <h3 className="mt-4 font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  CTA                                                                        */
/* -------------------------------------------------------------------------- */

function CtaBand() {
  return (
    <section className="border-t border-border/60 py-20">
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-lg border border-border bg-card px-6 py-14 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-primary/10 blur-3xl"
            />
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Deploy your first project today
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Connect a repo and watch it go live. No credit card, no lock-in.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href={AUTH_HREF}>
                  <Github aria-hidden />
                  Get started with GitHub
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                     */
/* -------------------------------------------------------------------------- */

function LandingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Image src="/logo.svg" alt="" width={20} height={20} aria-hidden />
          <span>ShipIt</span>
        </div>
        <p className="text-sm text-muted-foreground">
          A self-hosted deployment platform. © {new Date().getFullYear()}
        </p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          aria-label="ShipIt on GitHub"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Github className="size-5" aria-hidden />
        </a>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}
