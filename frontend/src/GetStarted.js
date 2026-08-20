import React from "react";
import { motion } from "framer-motion";
import {
    Bell,
    BookOpen,
    Clock,
    Command,
    ChevronDown,
    ChevronRight,
    Mail,
    MoreHorizontal,
    Plus,
    Search,
    ShieldCheck,
    Bookmark,
    BarChart3,
} from "lucide-react";
import { Button } from "./components/ui/button";
import ThemeToggle from "./components/ThemeToggle";

const fadeUp = (delay = 0, y = 16, duration = 0.6) => ({
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration, delay, ease: [0.22, 1, 0.36, 1] },
});

const NAV_LINKS = [
    { id: "home", label: "Home" },
    { id: "features", label: "Features" },
    { id: "preview", label: "Preview" },
    { id: "contact", label: "Contact" },
];

const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function Navbar({ onSignIn }) {
    return (
        <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="sticky top-0 z-30 flex items-center justify-between bg-background/80 px-6 py-5 backdrop-blur font-body md:px-12 lg:px-20"
        >
            <button onClick={() => scrollToId("home")} className="border-0 bg-transparent text-xl font-semibold tracking-tight text-foreground">
                ✦ Bookshelf
            </button>
            <div className="hidden md:flex items-center gap-8">
                {NAV_LINKS.map(({ id, label }) => (
                    <motion.button
                        key={id}
                        onClick={() => scrollToId(id)}
                        whileHover={{ y: -1 }}
                        className="border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {label}
                    </motion.button>
                ))}
            </div>
            <div className="flex items-center gap-3">
                <ThemeToggle />
                <Button onClick={onSignIn} className="rounded-full px-5 text-sm font-medium font-body">
                    Sign in
                </Button>
            </div>
        </motion.nav>
    );
}

function BorrowChart() {
    return (
        <svg viewBox="0 0 300 80" className="h-20 w-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id="borrowChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C8CE0" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#7C8CE0" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d="M0,58 C30,52 42,38 70,42 C98,46 112,18 140,22 C168,26 182,8 210,12 C238,16 258,32 300,6 L300,80 L0,80 Z"
                fill="url(#borrowChartGradient)"
            />
            <path
                d="M0,58 C30,52 42,38 70,42 C98,46 112,18 140,22 C168,26 182,8 210,12 C238,16 258,32 300,6"
                fill="none"
                stroke="#7C8CE0"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function DashboardPreview() {
    return (
        <motion.div {...fadeUp(0, 30, 0.8)} className="mt-8 w-full max-w-5xl">
            <div
                className="rounded-2xl overflow-hidden p-3 md:p-4 bg-white/40 dark:bg-white/[0.06] border border-white/50 dark:border-white/10"
                style={{ boxShadow: "var(--shadow-dashboard)" }}
            >
                <div className="rounded-xl bg-white overflow-hidden text-[11px] select-none pointer-events-none font-body">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded bg-foreground text-white grid place-items-center text-[10px] font-semibold">B</span>
                            <span className="font-semibold text-foreground">Bookshelf</span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-muted-foreground">
                            <Search className="h-3 w-3" />
                            <span>Search catalogue</span>
                            <span className="flex items-center gap-0.5 ml-2 text-[9px] border border-border rounded px-1">
                                <Command className="h-2.5 w-2.5" />K
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-accent text-accent-foreground px-3 py-1 font-medium">Issue Book</span>
                            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="h-6 w-6 rounded-full bg-secondary grid place-items-center font-medium text-foreground">JB</span>
                        </div>
                    </div>

                    <div className="flex">
                        {/* Sidebar */}
                        <div className="w-40 border-r border-border py-4 px-3 flex flex-col gap-0.5">
                            {[
                                { label: "Home", active: true },
                                { label: "Catalogue", badge: "128" },
                                { label: "Members" },
                                { label: "Loans", chevron: true },
                                { label: "History" },
                                { label: "Insights" },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className={`flex items-center justify-between rounded-md px-2 py-1.5 ${item.active ? "bg-secondary text-foreground font-medium" : "text-muted-foreground"
                                        }`}
                                >
                                    <span>{item.label}</span>
                                    {item.badge && (
                                        <span className="text-[9px] bg-accent text-accent-foreground rounded-full px-1.5">{item.badge}</span>
                                    )}
                                    {item.chevron && <ChevronRight className="h-3 w-3" />}
                                </div>
                            ))}
                            <div className="mt-4 mb-1 px-2 text-[9px] uppercase tracking-wide text-muted-foreground">Library</div>
                            {["Reservations", "Notifications", "Settings"].map((label) => (
                                <div key={label} className="rounded-md px-2 py-1.5 text-muted-foreground">
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* Main content */}
                        <div className="flex-1 bg-secondary/30 p-4">
                            <div className="text-sm font-semibold text-foreground mb-3">Welcome, Admin</div>

                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                {["Issue Book", "Return Book", "Add Member", "Add Book", "Search", "Reserve"].map((label, i) => (
                                    <span
                                        key={label}
                                        className={`rounded-full px-3 py-1 text-[10px] font-medium ${i === 0 ? "bg-accent text-accent-foreground" : "bg-white border border-border text-foreground"
                                            }`}
                                    >
                                        {label}
                                    </span>
                                ))}
                                <span className="text-[10px] text-muted-foreground ml-1">+ Customize</span>
                            </div>

                            <div className="flex gap-3 mb-4">
                                {/* Collection overview card */}
                                <div className="flex-1 basis-0 rounded-xl bg-white border border-border p-3">
                                    <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                                        <span className="h-3.5 w-3.5 rounded-full bg-accent/15 text-accent grid place-items-center text-[8px]">✓</span>
                                        Collection Overview
                                    </div>
                                    <div className="text-lg font-semibold text-foreground">
                                        1,248 <span className="text-xs text-muted-foreground font-normal">books</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 mb-2 text-[10px] text-muted-foreground">
                                        <span>Last 30 Days</span>
                                        <span className="text-emerald-600">+86 new</span>
                                        <span className="text-rose-500">-12 withdrawn</span>
                                    </div>
                                    <BorrowChart />
                                </div>

                                {/* Categories card */}
                                <div className="flex-1 basis-0 rounded-xl bg-white border border-border p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-foreground font-medium">Categories</span>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Plus className="h-3 w-3" />
                                            <MoreHorizontal className="h-3 w-3" />
                                        </div>
                                    </div>
                                    {[
                                        ["Fiction", "412"],
                                        ["Non-fiction", "298"],
                                        ["Reference", "156"],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex items-center justify-between py-1.5 text-xs">
                                            <span className="text-muted-foreground">{label}</span>
                                            <span className="text-foreground font-medium">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent activity table */}
                            <div className="rounded-xl bg-white border border-border p-3">
                                <div className="text-foreground font-medium mb-2">Recent Activity</div>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-muted-foreground text-[10px]">
                                            <th className="font-normal pb-1.5">Date</th>
                                            <th className="font-normal pb-1.5">Book</th>
                                            <th className="font-normal pb-1.5">Member</th>
                                            <th className="font-normal pb-1.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-foreground">
                                        {[
                                            ["Aug 18", "The Hobbit", "Jane Doe", "Borrowed", "amber"],
                                            ["Aug 17", "Clean Code", "Nimal P.", "Returned", "green"],
                                            ["Aug 15", "Atomic Habits", "S. Perera", "Overdue", "red"],
                                            ["Aug 12", "Sapiens", "R. Fernando", "Returned", "green"],
                                        ].map(([date, book, member, status, color]) => (
                                            <tr key={book} className="border-t border-border/60">
                                                <td className="py-1.5 text-muted-foreground">{date}</td>
                                                <td className="py-1.5">{book}</td>
                                                <td className="py-1.5 text-muted-foreground">{member}</td>
                                                <td className="py-1.5">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${color === "amber"
                                                                ? "bg-amber-100 text-amber-700"
                                                                : color === "green"
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-rose-100 text-rose-600"
                                                            }`}
                                                    >
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

const FEATURES = [
    { icon: BookOpen, title: "Full book catalogue", desc: "Search, filter, and manage titles, categories and copy counts in real time." },
    { icon: Clock, title: "Automatic due dates & fines", desc: "Every loan gets a standard 14-day period, with overdue fines calculated automatically." },
    { icon: Bookmark, title: "Reservations & holds", desc: "Reserve a book that's checked out and get flagged the moment it's back." },
    { icon: BarChart3, title: "Live analytics", desc: "Borrow trends, top categories, and overdue rates — for staff, at a glance." },
];

function FeaturesSection() {
    return (
        <section id="features" className="relative z-10 px-6 py-24 md:px-12 lg:px-20">
            <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary">Features</p>
                <h2 className="mt-2 font-display text-4xl text-foreground">Everything a library actually needs</h2>
            </motion.div>
            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                    <motion.div
                        key={title}
                        {...fadeUp(i * 0.08)}
                        whileHover={{ y: -4 }}
                        className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                        <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                            <Icon size={18} />
                        </span>
                        <h3 className="font-display text-lg text-foreground">{title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

function PreviewSection() {
    return (
        <section id="preview" className="relative z-10 px-6 pb-24 md:px-12 lg:px-20">
            <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary">Preview</p>
                <h2 className="mt-2 font-display text-4xl text-foreground">See it in action</h2>
                <p className="mt-3 text-muted-foreground">A quick look at the staff dashboard — catalogue, loans, and collection stats in one place.</p>
            </motion.div>
            <div className="mx-auto mt-10 flex max-w-5xl justify-center">
                <DashboardPreview />
            </div>
        </section>
    );
}

function ContactSection({ onGetStarted }) {
    return (
        <footer id="contact" className="relative z-10 border-t border-border bg-secondary/40 px-6 py-16 md:px-12 lg:px-20">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary">Contact</p>
                <h2 className="font-display text-3xl text-foreground">Questions, or want a demo?</h2>
                <p className="max-w-md text-muted-foreground">Reach out and we'll get back to you — or just create a student account and try it yourself.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <a href="mailto:hello@bookshelf.app">
                        <Button variant="accent" className="gap-2 rounded-full">
                            <Mail size={15} /> hello@bookshelf.app
                        </Button>
                    </a>
                    <Button onClick={onGetStarted} className="rounded-full">Get started as a student</Button>
                </div>
                <p className="mt-8 text-xs text-muted-foreground">✦ Bookshelf &copy; {new Date().getFullYear()}</p>
            </div>
        </footer>
    );
}

function GetStarted({ onGetStarted, onSignIn }) {
    return (
        <div className="min-h-screen bg-background font-body">
            <Navbar onSignIn={onSignIn} />

            <div id="home" className="relative overflow-hidden">
                {/* Ambient background — a slow-rotating aurora loop plus drifting blobs, instead of a stock video */}
                <div className="absolute inset-0 h-full w-full z-0 overflow-hidden">
                    <motion.div
                        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] opacity-60 dark:opacity-70"
                        style={{
                            marginLeft: "-70vmax",
                            marginTop: "-70vmax",
                            background:
                                "conic-gradient(from 0deg, hsl(var(--primary) / 0.22), transparent 25%, hsl(var(--accent) / 0.22), transparent 50%, hsl(var(--primary) / 0.18), transparent 75%, hsl(var(--accent) / 0.18))",
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-primary/35 dark:bg-primary/35 blur-3xl"
                        animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
                        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute top-10 right-[-10%] h-[380px] w-[380px] rounded-full bg-accent/40 dark:bg-accent/40 blur-3xl"
                        animate={{ x: [0, -25, 0], y: [0, 25, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute bottom-[-15%] left-1/3 h-[320px] w-[320px] rounded-full bg-primary/25 dark:bg-primary/25 blur-3xl"
                        animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {[...Array(10)].map((_, i) => (
                        <motion.span
                            key={i}
                            className="absolute h-1 w-1 rounded-full bg-primary/50 dark:bg-primary/70"
                            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
                            animate={{ opacity: [0.15, 0.6, 0.15], y: [0, -14, 0] }}
                            transition={{ duration: 5 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                        />
                    ))}
                    <div className="absolute inset-0 bg-background/20 dark:bg-background/30" />
                </div>

                <div className="relative z-10 flex min-h-[88vh] flex-col items-center justify-center w-full px-6 py-16">
                    <motion.div
                        {...fadeUp(0, 10, 0.5)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground font-body mb-6"
                    >
                        Now with automatic overdue tracking ✨
                    </motion.div>

                    <motion.h1
                        {...fadeUp(0.1, 16, 0.6)}
                        className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
                    >
                        The Future of <em className="italic">Smarter</em> Library Management
                    </motion.h1>

                    <motion.p
                        {...fadeUp(0.2, 16, 0.6)}
                        className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
                    >
                        Catalogue your books, manage members, and track every loan — from checkout to
                        overdue fines — automatically. Built for library staff and students alike.
                    </motion.p>

                    <motion.div {...fadeUp(0.3, 16, 0.6)} className="mt-5 flex items-center gap-3">
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Button onClick={onGetStarted} className="rounded-full px-6 py-5 text-sm font-medium font-body">
                                Get started as a student
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.08, rotate: -4 }} whileTap={{ scale: 0.94 }}>
                            <Button
                                onClick={onSignIn}
                                variant="ghost"
                                aria-label="Staff sign in"
                                title="Staff sign in"
                                className="h-11 w-11 rounded-full border-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80"
                            >
                                <ShieldCheck className="h-4 w-4 text-foreground" />
                            </Button>
                        </motion.div>
                    </motion.div>

                    <motion.button
                        onClick={() => scrollToId("features")}
                        aria-label="Scroll to features"
                        {...fadeUp(0.5, 8, 0.6)}
                        whileHover={{ y: 3 }}
                        className="mt-14 flex flex-col items-center gap-1 border-0 bg-transparent text-muted-foreground"
                    >
                        <span className="text-xs">Explore</span>
                        <ChevronDown size={16} />
                    </motion.button>
                </div>
            </div>

            <FeaturesSection />
            <PreviewSection />
            <ContactSection onGetStarted={onGetStarted} />
        </div>
    );
}

export default GetStarted;
