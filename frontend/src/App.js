import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    BarChart3,
    Bookmark,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    Clock,
    Layers,
    LayoutDashboard,
    Library,
    LogOut,
    Loader2,
    Menu,
    Pencil,
    Plus,
    Search,
    Settings as SettingsIcon,
    Trash2,
    Users,
    X,
    XCircle,
} from "lucide-react";
import Login from "./Login";
import GetStarted from "./GetStarted";
import api from "./lib/api";
import { Button } from "./components/ui/button";
import ThemeToggle from "./components/ThemeToggle";
import { cn } from "./lib/utils";
import "./App.css";

const DEFAULT_LOAN_POLICY = { loanPeriodDays: 14, maxLoanPeriodDays: 30, finePerDay: 20 };
const EMPTY_FORM = { title: "", author: "", category: "", isbn: "", cover_url: "", quantity: 1 };
const EMPTY_MEMBER_FORM = { member_id: "", name: "", email: "", phone: "", address: "" };
const EMPTY_BORROW_FORM = { book_id: "", member_id: "", due_date: "" };

const formatDateInput = (date) => new Date(date).toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const card = "bg-card rounded-2xl border border-border shadow-sm";
const input =
    "w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
const statCardVariant = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

function StatusPill({ tone = "neutral", children }) {
    const tones = {
        good: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
        bad: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
        warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
        neutral: "bg-secondary text-muted-foreground",
        brand: "bg-primary/10 text-primary",
    };
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", tones[tone])}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {children}
        </span>
    );
}

function EmptyState({ icon: Icon = BookOpen, title, hint }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Icon size={28} className="text-border" />
            <p className="font-medium text-foreground">{title}</p>
            {hint && <p className="max-w-xs text-sm">{hint}</p>}
        </div>
    );
}

function Modal({ title, eyebrow, onClose, children }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl sm:p-7"
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
                        <h2 className="font-display text-2xl text-foreground">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-0 bg-transparent text-muted-foreground hover:bg-secondary"
                    >
                        <X size={18} />
                    </button>
                </div>
                {children}
            </motion.div>
        </motion.div>
    );
}

function BorrowTrendChart({ trend }) {
    if (!trend || trend.length === 0) return null;
    const max = Math.max(1, ...trend.map((d) => d.count));
    const w = 600;
    const h = 140;
    const stepX = w / (trend.length - 1 || 1);
    const points = trend.map((d, i) => [i * stepX, h - (d.count / max) * (h - 20) - 10]);
    const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C8CE0" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#7C8CE0" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#trendGradient)" />
            <path d={linePath} fill="none" stroke="#7C8CE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function Sidebar({ activeTab, onNavigate, user, onLogout, isOpen, onCloseMobile }) {
    const navigationItems =
        user?.role === "staff"
            ? [
                { id: "overview", label: "Overview", icon: LayoutDashboard },
                { id: "catalog", label: "Book catalogue", icon: BookOpen },
                { id: "borrowings", label: "Issue &amp; history".replace("&amp;", "&"), icon: ClipboardList },
                { id: "members", label: "Members", icon: Users },
                { id: "reservations", label: "Reservations", icon: Bookmark },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
                { id: "settings", label: "Settings", icon: SettingsIcon },
            ]
            : [
                { id: "catalog", label: "Book catalogue", icon: BookOpen },
                { id: "myloans", label: "My loans &amp; history".replace("&amp;", "&"), icon: Clock },
                { id: "myreservations", label: "My reservations", icon: Bookmark },
            ];

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-30 bg-foreground/40 md:hidden"
                        onClick={onCloseMobile}
                    />
                )}
            </AnimatePresence>
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-6 border-r border-border bg-card p-5 transition-transform md:static md:z-0 md:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/90 to-primary text-white">
                            <Library size={16} />
                        </span>
                        <span className="font-display text-lg text-foreground">Bookshelf</span>
                    </div>
                    <button className="border-0 bg-transparent text-muted-foreground md:hidden" onClick={onCloseMobile} aria-label="Close menu">
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex flex-col gap-1" aria-label="Main navigation">
                    {navigationItems.map(({ id, label: navLabel, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onNavigate(id)}
                            aria-current={activeTab === id ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-sm font-medium transition-colors",
                                activeTab === id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <Icon size={17} />
                            {navLabel}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto border-t border-border pt-4 text-xs text-muted-foreground">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                            <p>
                                Signed in as <strong className="text-foreground">{user?.username}</strong>
                            </p>
                            <p className="capitalize">{user?.role}</p>
                        </div>
                        <ThemeToggle />
                    </div>
                    <Button variant="outline" size="sm" onClick={onLogout} className="w-full justify-center gap-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40">
                        <LogOut size={14} /> Logout
                    </Button>
                </div>
            </aside>
        </>
    );
}

function App() {
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [authView, setAuthView] = useState("landing");
    const [authIntent, setAuthIntent] = useState({ role: "staff", mode: "signin" });
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const [books, setBooks] = useState([]);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All categories");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [cardFilter, setCardFilter] = useState(null);

    const [members, setMembers] = useState([]);
    const [memberFormData, setMemberFormData] = useState(EMPTY_MEMBER_FORM);
    const [memberEditingId, setMemberEditingId] = useState(null);
    const [memberSearchTerm, setMemberSearchTerm] = useState("");
    const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
    const [isMemberLoading, setIsMemberLoading] = useState(false);
    const [isMemberSaving, setIsMemberSaving] = useState(false);
    const [memberError, setMemberError] = useState("");

    const [borrowings, setBorrowings] = useState([]);
    const [borrowFormData, setBorrowFormData] = useState(EMPTY_BORROW_FORM);
    const [borrowSearchTerm, setBorrowSearchTerm] = useState("");
    const [borrowStatusFilter, setBorrowStatusFilter] = useState("all");
    const [borrowMemberFilter, setBorrowMemberFilter] = useState(null);
    const [myLoansStatusFilter, setMyLoansStatusFilter] = useState("all");
    const [isBorrowFormOpen, setIsBorrowFormOpen] = useState(false);
    const [isBorrowingLoading, setIsBorrowingLoading] = useState(false);
    const [isBorrowingSaving, setIsBorrowingSaving] = useState(false);
    const [borrowError, setBorrowError] = useState("");
    const [borrowSuccess, setBorrowSuccess] = useState("");

    const [reservations, setReservations] = useState([]);
    const [isReservationLoading, setIsReservationLoading] = useState(false);
    const [reservationError, setReservationError] = useState("");
    const [reservationSuccess, setReservationSuccess] = useState("");

    const [analytics, setAnalytics] = useState(null);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

    const [loanPolicy, setLoanPolicy] = useState(DEFAULT_LOAN_POLICY);
    const [policyForm, setPolicyForm] = useState(DEFAULT_LOAN_POLICY);
    const [isPolicySaving, setIsPolicySaving] = useState(false);
    const [policyError, setPolicyError] = useState("");
    const [policySuccess, setPolicySuccess] = useState("");

    const [isIsbnLookupLoading, setIsIsbnLookupLoading] = useState(false);
    const [isbnLookupError, setIsbnLookupError] = useState("");

    useEffect(() => {
        api.get("/loan-policy")
            .then((response) => {
                setLoanPolicy(response.data);
                setPolicyForm(response.data);
            })
            .catch((err) => console.error("Error fetching loan policy:", err));
    }, []);

    const handleLoginSuccess = (user, token) => {
        localStorage.setItem("user", JSON.stringify(user));
        if (token) localStorage.setItem("token", token);
        setCurrentUser(user);
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setCurrentUser(null);
        setAuthView("landing");
    };

    const handleCardClick = (cardType) => {
        const nextFilter = cardFilter === cardType ? null : cardType;
        if (nextFilter) {
            setActiveTab("catalog");
            if (cardType === "titles" || cardType === "copies") {
                setSearchTerm("");
                setCategoryFilter("All categories");
            }
        }
        setCardFilter(nextFilter);
    };

    const fetchBooks = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/books");
            setBooks(response.data);
            setError("");
        } catch (err) {
            console.error("Error fetching books:", err);
            setError("Could not connect to the library database. Start the backend and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        setIsMemberLoading(true);
        try {
            const response = await api.get("/members");
            setMembers(response.data);
            setMemberError("");
        } catch (err) {
            console.error("Error fetching members:", err);
            setMemberError("Could not connect to the member database. Start the backend and try again.");
        } finally {
            setIsMemberLoading(false);
        }
    };

    const fetchBorrowings = async (user) => {
        setIsBorrowingLoading(true);
        try {
            // Staff always fetch the full list — "view history for member" is a
            // client-side filter (see filteredBorrowings) so clearing it doesn't
            // require a refetch. Students are scoped to their own records
            // server-side regardless of query params.
            const response = await api.get("/borrowings");
            setBorrowings(response.data);
            setBorrowError("");
        } catch (err) {
            console.error("Error fetching borrowings:", err);
            setBorrowError("Could not connect to the borrowing database. Start the backend and try again.");
        } finally {
            setIsBorrowingLoading(false);
        }
    };

    const fetchReservations = async () => {
        setIsReservationLoading(true);
        try {
            const response = await api.get("/reservations");
            setReservations(response.data);
            setReservationError("");
        } catch (err) {
            console.error("Error fetching reservations:", err);
            setReservationError("Could not load reservations. Please try again.");
        } finally {
            setIsReservationLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        setIsAnalyticsLoading(true);
        try {
            const response = await api.get("/analytics/overview");
            setAnalytics(response.data);
        } catch (err) {
            console.error("Error fetching analytics:", err);
        } finally {
            setIsAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchBooks();
            fetchReservations();
            if (currentUser.role === "staff") {
                fetchMembers();
                fetchBorrowings(currentUser);
                setActiveTab("overview");
            } else {
                fetchBorrowings(currentUser);
                setActiveTab("catalog");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    useEffect(() => {
        if (currentUser?.role === "staff" && activeTab === "analytics") {
            fetchAnalytics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: name === "quantity" ? (value === "" ? "" : Number(value)) : value }));
    };

    const handleIsbnLookup = async () => {
        if (!formData.isbn) {
            setIsbnLookupError("Enter an ISBN first.");
            return;
        }
        setIsIsbnLookupLoading(true);
        setIsbnLookupError("");
        try {
            const response = await api.get(`/books/lookup/${encodeURIComponent(formData.isbn)}`);
            setFormData((prev) => ({
                ...prev,
                title: response.data.title || prev.title,
                author: response.data.author || prev.author,
                category: response.data.category || prev.category,
                cover_url: response.data.coverUrl || prev.cover_url,
            }));
        } catch (err) {
            setIsbnLookupError(err.response?.data?.error || "Could not find a book for that ISBN.");
        } finally {
            setIsIsbnLookupLoading(false);
        }
    };

    const handlePolicyChange = (event) => {
        const { name, value } = event.target;
        setPolicyForm((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
    };

    const handlePolicySubmit = async (event) => {
        event.preventDefault();
        setIsPolicySaving(true);
        setPolicyError("");
        setPolicySuccess("");
        try {
            const response = await api.put("/loan-policy", policyForm);
            const updated = {
                loanPeriodDays: response.data.loanPeriodDays,
                maxLoanPeriodDays: response.data.maxLoanPeriodDays,
                finePerDay: response.data.finePerDay,
            };
            setLoanPolicy(updated);
            setPolicyForm(updated);
            setPolicySuccess("Loan policy updated.");
        } catch (err) {
            setPolicyError(err.response?.data?.error || "Could not update the loan policy.");
        } finally {
            setIsPolicySaving(false);
        }
    };

    const handleMemberChange = (event) => {
        const { name, value } = event.target;
        setMemberFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleMemberEdit = (member) => {
        setMemberEditingId(member.id);
        setMemberFormData({
            member_id: member.member_id || "",
            name: member.name || "",
            email: member.email || "",
            phone: member.phone || "",
            address: member.address || "",
        });
        setMemberError("");
        setIsMemberFormOpen(true);
    };

    const handleMemberDelete = async (id) => {
        if (!window.confirm("Remove this member from the system?")) return;
        try {
            await api.delete(`/members/${id}`);
            await fetchMembers();
        } catch (err) {
            console.error("Error deleting member:", err);
            setMemberError("The member could not be deleted. Please try again.");
        }
    };

    const handleMemberCancel = () => {
        setMemberEditingId(null);
        setMemberFormData(EMPTY_MEMBER_FORM);
        setIsMemberFormOpen(false);
    };

    const handleMemberSubmit = async (event) => {
        event.preventDefault();
        setIsMemberSaving(true);
        setMemberError("");
        try {
            if (memberEditingId) {
                await api.put(`/members/${memberEditingId}`, memberFormData);
            } else {
                await api.post("/members", memberFormData);
            }
            setMemberFormData(EMPTY_MEMBER_FORM);
            setMemberEditingId(null);
            setIsMemberFormOpen(false);
            await fetchMembers();
        } catch (err) {
            console.error("Error saving member:", err);
            setMemberError(err.response?.data?.error || "The member could not be saved. Please try again.");
        } finally {
            setIsMemberSaving(false);
        }
    };

    const handleBorrowChange = (event) => {
        const { name, value } = event.target;
        setBorrowFormData((prev) => ({ ...prev, [name]: value }));
    };

    const openIssueForm = () => {
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + loanPolicy.loanPeriodDays);
        setBorrowFormData({ ...EMPTY_BORROW_FORM, due_date: formatDateInput(defaultDueDate) });
        setBorrowError("");
        setBorrowSuccess("");
        setIsBorrowFormOpen(true);
    };

    const handleBorrowCancel = () => {
        setBorrowFormData(EMPTY_BORROW_FORM);
        setIsBorrowFormOpen(false);
        setBorrowError("");
        setBorrowSuccess("");
    };

    const handleBorrowSubmit = async (event) => {
        event.preventDefault();
        setIsBorrowingSaving(true);
        setBorrowError("");
        setBorrowSuccess("");
        const payload = {
            book_id: Number(borrowFormData.book_id) || null,
            member_id: Number(borrowFormData.member_id) || null,
            due_date: borrowFormData.due_date,
        };
        try {
            const response = await api.post("/borrowings", payload);
            setBorrowFormData(EMPTY_BORROW_FORM);
            setIsBorrowFormOpen(false);
            await fetchBooks();
            await fetchBorrowings(currentUser);
            const dueDateLabel = response.data.due_date ? new Date(response.data.due_date).toLocaleDateString() : "";
            setBorrowSuccess(dueDateLabel ? `Book issued successfully. Due back by ${dueDateLabel}.` : "Book issued successfully.");
        } catch (err) {
            console.error("Error issuing book:", err);
            setBorrowError(err.response?.data?.error || "The borrowing could not be created. Please try again.");
        } finally {
            setIsBorrowingSaving(false);
        }
    };

    const handleReturn = async (borrowingId) => {
        setIsBorrowingSaving(true);
        setBorrowError("");
        setBorrowSuccess("");
        try {
            const response = await api.put(`/borrowings/${borrowingId}`);
            await fetchBooks();
            await fetchBorrowings(currentUser);
            await fetchReservations();
            setBorrowSuccess(
                response.data.fine > 0 ? `Book returned successfully. Overdue fine: Rs. ${response.data.fine}.` : "Book returned successfully."
            );
        } catch (err) {
            console.error("Error returning book:", err);
            setBorrowError(err.response?.data?.error || "The book could not be returned. Please try again.");
        } finally {
            setIsBorrowingSaving(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError("");
        const payload = { ...formData, quantity: Number(formData.quantity) || 0 };
        try {
            if (editingId) {
                await api.put(`/books/${editingId}`, payload);
            } else {
                await api.post("/books", payload);
            }
            setFormData(EMPTY_FORM);
            setEditingId(null);
            setIsFormOpen(false);
            await fetchBooks();
        } catch (err) {
            console.error("Error saving book:", err);
            setError(err.response?.data?.error || "The book could not be saved. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (book) => {
        setEditingId(book.book_id);
        setFormData({
            title: book.title || "",
            author: book.author || "",
            category: book.category || "",
            isbn: book.isbn || "",
            cover_url: book.cover_url || "",
            quantity: book.quantity ?? 1,
        });
        setError("");
        setIsbnLookupError("");
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this book from the library catalogue?")) return;
        try {
            await api.delete(`/books/${id}`);
            await fetchBooks();
        } catch (err) {
            console.error("Error deleting book:", err);
            setError("The book could not be deleted. Please try again.");
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setIsbnLookupError("");
        setIsFormOpen(false);
    };

    const handleReserve = async (bookId) => {
        setReservationError("");
        setReservationSuccess("");
        try {
            await api.post("/reservations", { book_id: bookId });
            setReservationSuccess("Book reserved. We'll flag it for you as soon as it's returned.");
            await fetchReservations();
        } catch (err) {
            setReservationError(err.response?.data?.error || "Could not reserve this book.");
        }
    };

    const handleCancelReservation = async (id) => {
        try {
            await api.put(`/reservations/${id}/cancel`);
            await fetchReservations();
        } catch (err) {
            setReservationError(err.response?.data?.error || "Could not cancel this reservation.");
        }
    };

    const handleFulfillReservation = async (id) => {
        try {
            await api.put(`/reservations/${id}/fulfill`);
            await fetchReservations();
            await fetchBooks();
            await fetchBorrowings(currentUser);
        } catch (err) {
            setReservationError(err.response?.data?.error || "Could not fulfill this reservation.");
        }
    };

    const categories = useMemo(() => ["All categories", ...new Set(books.map((b) => b.category).filter(Boolean))], [books]);

    const filteredBooks = useMemo(() => {
        return books.filter((book) => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = [book.title, book.author, book.isbn, book.category].some((v) => String(v || "").toLowerCase().includes(search));
            const matchesCategory = categoryFilter === "All categories" || book.category === categoryFilter;
            let matchesCard = true;
            if (cardFilter === "available") matchesCard = Number(book.quantity) > 0;
            return matchesSearch && matchesCategory && matchesCard;
        });
    }, [books, categoryFilter, searchTerm, cardFilter]);

    const totalCopies = books.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
    const availableTitles = books.filter((b) => Number(b.quantity) > 0).length;
    const activeLoans = borrowings.filter((r) => r.status === "borrowed").length;
    const overdueCount = borrowings.filter((r) => r.isOverdue).length;
    const totalFinesOwed = borrowings.filter((r) => r.status === "borrowed").reduce((s, r) => s + Number(r.fine || 0), 0);

    const filteredMembers = useMemo(() => {
        const search = memberSearchTerm.toLowerCase();
        return members.filter((m) => [m.member_id, m.name, m.email, m.phone, m.address].some((v) => String(v || "").toLowerCase().includes(search)));
    }, [members, memberSearchTerm]);

    const filteredBorrowings = useMemo(() => {
        const search = borrowSearchTerm.toLowerCase();
        return borrowings.filter((record) => {
            const matchesSearch = [record.book_title, record.member_name, record.status].some((v) => String(v || "").toLowerCase().includes(search));
            const matchesStatus =
                borrowStatusFilter === "all" ||
                (borrowStatusFilter === "active" && record.status === "borrowed") ||
                (borrowStatusFilter === "overdue" && record.isOverdue) ||
                (borrowStatusFilter === "returned" && record.status === "returned");
            const matchesMember = !borrowMemberFilter || record.member_id === borrowMemberFilter.id;
            return matchesSearch && matchesStatus && matchesMember;
        });
    }, [borrowings, borrowSearchTerm, borrowStatusFilter, borrowMemberFilter]);

    const filteredMyLoans = useMemo(() => {
        return borrowings.filter((record) => {
            if (myLoansStatusFilter === "active") return record.status === "borrowed";
            if (myLoansStatusFilter === "returned") return record.status === "returned";
            return true;
        });
    }, [borrowings, myLoansStatusFilter]);

    const myActiveReservationBookIds = useMemo(
        () => new Set(reservations.filter((r) => ["pending", "ready"].includes(r.status)).map((r) => r.book_id)),
        [reservations]
    );

    if (!currentUser) {
        if (authView === "landing") {
            return (
                <GetStarted
                    onGetStarted={() => {
                        setAuthIntent({ role: "student", mode: "signup" });
                        setAuthView("login");
                    }}
                    onSignIn={() => {
                        setAuthIntent({ role: "staff", mode: "signin" });
                        setAuthView("login");
                    }}
                />
            );
        }
        return (
            <Login
                onLoginSuccess={handleLoginSuccess}
                initialRole={authIntent.role}
                initialMode={authIntent.mode}
                onBack={() => setAuthView("landing")}
            />
        );
    }

    const isStaff = currentUser.role === "staff";

    const sectionTitle = {
        overview: ["Overview", "Good day, " + currentUser.username],
        catalog: ["Collection", "Book catalogue"],
        borrowings: ["Issue books & history", "Borrow & return history"],
        members: ["Members", "Member management"],
        reservations: ["Reservations", "Hold requests"],
        analytics: ["Analytics", "Library insights"],
        settings: ["Settings", "Loan policy"],
        myloans: ["My loans & history", "Your borrowing history"],
        myreservations: ["My reservations", "Books you're waiting on"],
    }[activeTab] || ["Bookshelf", "Bookshelf"];

    return (
        <div className="flex min-h-screen bg-secondary/40 font-body text-foreground">
            <Sidebar
                activeTab={activeTab}
                onNavigate={(id) => {
                    setActiveTab(id);
                    setCardFilter(null);
                    setBorrowMemberFilter(null);
                    setIsMobileNavOpen(false);
                }}
                user={currentUser}
                onLogout={handleLogout}
                isOpen={isMobileNavOpen}
                onCloseMobile={() => setIsMobileNavOpen(false)}
            />

            <main className="min-w-0 flex-1">
                <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-card/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
                    <div className="flex items-center gap-3">
                        <button className="border-0 bg-transparent text-muted-foreground md:hidden" onClick={() => setIsMobileNavOpen(true)} aria-label="Open menu">
                            <Menu size={20} />
                        </button>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{sectionTitle[0]}</p>
                            <h1 className="font-display text-xl text-foreground sm:text-2xl">{sectionTitle[1]}</h1>
                        </div>
                    </div>
                    {isStaff && ["overview", "catalog", "members", "borrowings"].includes(activeTab) && (
                        <Button
                            className="gap-2 rounded-full"
                            onClick={() => {
                                if (activeTab === "members") {
                                    setMemberEditingId(null);
                                    setMemberFormData(EMPTY_MEMBER_FORM);
                                    setMemberError("");
                                    setIsMemberFormOpen(true);
                                } else if (activeTab === "borrowings") {
                                    openIssueForm();
                                } else {
                                    setEditingId(null);
                                    setFormData(EMPTY_FORM);
                                    setError("");
                                    setIsbnLookupError("");
                                    setIsFormOpen(true);
                                }
                            }}
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">
                                {activeTab === "members" ? "Add a member" : activeTab === "borrowings" ? "Issue a book" : "Add a book"}
                            </span>
                        </Button>
                    )}
                </header>

                <div className="px-4 py-6 sm:px-6 lg:px-10">
                    {error && (
                        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
                            {error}
                            <button className="border-0 bg-transparent font-semibold underline" onClick={fetchBooks}>Retry</button>
                        </div>
                    )}

                    {/* OVERVIEW */}
                    {isStaff && activeTab === "overview" && (
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
                        >
                            <motion.button
                                variants={statCardVariant}
                                whileHover={{ y: -3 }}
                                type="button"
                                onClick={() => handleCardClick("titles")}
                                className={cn(card, "p-5 text-left shadow-sm transition-shadow hover:shadow-md", cardFilter === "titles" && "border-primary/40 ring-2 ring-primary/10")}
                            >
                                <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen size={17} /></span>
                                <p className="text-xs text-muted-foreground">Total titles</p>
                                <strong className="font-display text-2xl text-foreground">{books.length}</strong>
                            </motion.button>
                            <motion.button
                                variants={statCardVariant}
                                whileHover={{ y: -3 }}
                                type="button"
                                onClick={() => handleCardClick("available")}
                                className={cn(card, "p-5 text-left shadow-sm transition-shadow hover:shadow-md", cardFilter === "available" && "border-primary/40 ring-2 ring-primary/10")}
                            >
                                <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Library size={17} /></span>
                                <p className="text-xs text-muted-foreground">Available titles</p>
                                <strong className="font-display text-2xl text-foreground">{availableTitles}</strong>
                            </motion.button>
                            <motion.button
                                variants={statCardVariant}
                                whileHover={{ y: -3 }}
                                type="button"
                                onClick={() => handleCardClick("copies")}
                                className={cn(card, "p-5 text-left shadow-sm transition-shadow hover:shadow-md", cardFilter === "copies" && "border-primary/40 ring-2 ring-primary/10")}
                            >
                                <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Layers size={17} /></span>
                                <p className="text-xs text-muted-foreground">Total copies</p>
                                <strong className="font-display text-2xl text-foreground">{totalCopies}</strong>
                            </motion.button>
                            <motion.button
                                variants={statCardVariant}
                                whileHover={{ y: -3 }}
                                type="button"
                                onClick={() => { setBorrowMemberFilter(null); setActiveTab("borrowings"); }}
                                className={cn(card, "p-5 text-left shadow-sm transition-shadow hover:shadow-md", overdueCount > 0 && "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30")}
                            >
                                <span className={cn("mb-3 grid h-9 w-9 place-items-center rounded-lg", overdueCount > 0 ? "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400" : "bg-primary/10 text-primary")}>
                                    <ClipboardList size={17} />
                                </span>
                                <p className="text-xs text-muted-foreground">Active loans</p>
                                <strong className="font-display text-2xl text-foreground">{activeLoans}</strong>
                                <p className={cn("mt-1 text-[11px] font-medium", overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                                    {overdueCount > 0 ? `${overdueCount} overdue · Rs. ${totalFinesOwed} owed` : "All loans on schedule"}
                                </p>
                            </motion.button>
                        </motion.div>
                    )}

                    {/* CATALOGUE */}
                    {(activeTab === "overview" || activeTab === "catalog") && (
                        <section className={cn(activeTab === "overview" && "mt-6")}>
                            <div className={cn(card, "p-5 sm:p-6")}>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="font-display text-lg text-foreground">
                                        {cardFilter === "available" ? "Available books only" : cardFilter === "copies" ? "Inventory breakdown" : "Book catalogue"}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        {cardFilter && (
                                            <button onClick={() => setCardFilter(null)} className="inline-flex items-center gap-1 rounded-full border-0 bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-border/60">
                                                Clear filter <X size={12} />
                                            </button>
                                        )}
                                        <span className="text-xs text-muted-foreground">{filteredBooks.length} {filteredBooks.length === 1 ? "title" : "titles"}</span>
                                    </div>
                                </div>

                                {reservationError && <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{reservationError}</p>}
                                {reservationSuccess && <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-400">{reservationSuccess}</p>}

                                <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                                    <label className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                                        <Search size={16} className="text-muted-foreground" />
                                        <input
                                            aria-label="Search books"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search title, author, ISBN..."
                                            className="w-full border-0 bg-transparent text-sm outline-none"
                                        />
                                    </label>
                                    <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            aria-label="Filter by category"
                                            className="bg-transparent text-sm text-muted-foreground outline-none"
                                        >
                                            {categories.map((c) => <option key={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="text-muted-foreground" />
                                    </label>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-border">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead>
                                            <tr className="bg-secondary/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                                                <th className="px-4 py-3 font-semibold">Book</th>
                                                <th className="px-4 py-3 font-semibold">Category</th>
                                                <th className="px-4 py-3 font-semibold">ISBN</th>
                                                <th className="px-4 py-3 font-semibold">Copies</th>
                                                <th className="px-4 py-3 font-semibold">Availability</th>
                                                <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading catalogue...</td></tr>
                                            ) : filteredBooks.length ? (
                                                filteredBooks.map((book) => {
                                                    const hasReservation = myActiveReservationBookIds.has(book.book_id);
                                                    return (
                                                        <tr key={book.book_id} className="border-t border-border hover:bg-secondary/30">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    {book.cover_url ? (
                                                                        <img src={book.cover_url} alt="" className="h-11 w-8 shrink-0 rounded object-cover shadow-sm" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                                    ) : (
                                                                        <span className="grid h-9 w-8 shrink-0 place-items-center rounded border-l-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                                                                            <BookOpen size={15} />
                                                                        </span>
                                                                    )}
                                                                    <div>
                                                                        <p className="font-medium text-foreground">{book.title}</p>
                                                                        <p className="text-xs text-muted-foreground">{book.author}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{book.category || "Uncategorised"}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground">{book.isbn || "—"}</td>
                                                            <td className="px-4 py-3 font-semibold">{book.quantity}</td>
                                                            <td className="px-4 py-3">
                                                                {Number(book.quantity) > 0 ? <StatusPill tone="good">In stock</StatusPill> : <StatusPill tone="bad">Out of stock</StatusPill>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-end gap-1.5">
                                                                    {isStaff ? (
                                                                        <>
                                                                            <button onClick={() => handleEdit(book)} aria-label={`Edit ${book.title}`} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-secondary hover:text-primary">
                                                                                <Pencil size={15} />
                                                                            </button>
                                                                            <button onClick={() => handleDelete(book.book_id)} aria-label={`Delete ${book.title}`} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400">
                                                                                <Trash2 size={15} />
                                                                            </button>
                                                                        </>
                                                                    ) : Number(book.quantity) === 0 ? (
                                                                        hasReservation ? (
                                                                            <span className="text-xs font-medium text-primary">Reserved</span>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleReserve(book.book_id)}
                                                                                className="inline-flex items-center gap-1.5 rounded-full border-0 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                                                                            >
                                                                                <Bookmark size={13} /> Reserve
                                                                            </button>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr><td colSpan={6}><EmptyState title="No books found" hint="Try another search query." /></td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* BORROWINGS / HISTORY (staff) */}
                    {isStaff && activeTab === "borrowings" && (
                        <section className={cn(card, "p-5 sm:p-6")}>
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-display text-lg text-foreground">Borrow &amp; return history</h2>
                                    <p className="text-xs text-muted-foreground">Standard loan: {loanPolicy.loanPeriodDays} days · Fine: Rs. {loanPolicy.finePerDay}/day overdue</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button size="sm" className="gap-2 rounded-full" onClick={openIssueForm}><Plus size={14} /> Issue book</Button>
                                    <span className="text-xs text-muted-foreground">{filteredBorrowings.length} of {borrowings.length} records</span>
                                </div>
                            </div>

                            <div className="my-4 flex flex-wrap items-center gap-2">
                                <div className="inline-flex gap-1 rounded-lg bg-secondary p-1">
                                    {[{ id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "overdue", label: "Overdue" }, { id: "returned", label: "Returned" }].map(({ id, label: l }) => (
                                        <button
                                            key={id}
                                            onClick={() => setBorrowStatusFilter(id)}
                                            className={cn("rounded-md border-0 px-3 py-1.5 text-xs font-semibold transition", borrowStatusFilter === id ? "bg-card text-primary shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground")}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                {borrowMemberFilter && (
                                    <button onClick={() => setBorrowMemberFilter(null)} className="inline-flex items-center gap-1 rounded-full border-0 bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-border/60">
                                        History for {borrowMemberFilter.name} <X size={12} />
                                    </button>
                                )}
                            </div>

                            <label className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 sm:max-w-sm">
                                <Search size={16} className="text-muted-foreground" />
                                <input value={borrowSearchTerm} onChange={(e) => setBorrowSearchTerm(e.target.value)} placeholder="Search by member, book, status..." className="w-full border-0 bg-transparent text-sm outline-none" />
                            </label>

                            {borrowSuccess && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{borrowSuccess}</p>}
                            {borrowError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{borrowError}</p>}

                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead>
                                        <tr className="bg-secondary/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                                            <th className="px-4 py-3 font-semibold">Book</th>
                                            <th className="px-4 py-3 font-semibold">Member</th>
                                            <th className="px-4 py-3 font-semibold">Borrowed</th>
                                            <th className="px-4 py-3 font-semibold">Due date</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                            <th className="px-4 py-3 font-semibold">Fine</th>
                                            <th className="px-4 py-3 font-semibold text-right">Return</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isBorrowingLoading ? (
                                            <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading issue records...</td></tr>
                                        ) : filteredBorrowings.length ? (
                                            filteredBorrowings.map((record) => (
                                                <tr key={record.id} className="border-t border-border hover:bg-secondary/30">
                                                    <td className="px-4 py-3 font-medium">{record.book_title || "Unknown book"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{record.member_name || "Unknown member"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(record.borrow_date)}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(record.due_date)}</td>
                                                    <td className="px-4 py-3">
                                                        {record.status === "returned" ? (
                                                            <StatusPill tone="neutral">Returned</StatusPill>
                                                        ) : record.isOverdue ? (
                                                            <StatusPill tone="bad">Overdue by {record.overdueDays}d</StatusPill>
                                                        ) : record.daysRemaining === 0 ? (
                                                            <StatusPill tone="warn">Due today</StatusPill>
                                                        ) : (
                                                            <StatusPill tone="good">Due in {record.daysRemaining}d</StatusPill>
                                                        )}
                                                    </td>
                                                    <td className={cn("px-4 py-3 font-semibold", Number(record.fine) > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                                                        {Number(record.fine) > 0 ? `Rs. ${record.fine}` : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {record.status === "borrowed" ? (
                                                            <Button size="sm" className="rounded-full" onClick={() => handleReturn(record.id)}>Return</Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">{fmtDate(record.return_date)}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={7}><EmptyState icon={ClipboardList} title="No matching records" hint={borrowings.length === 0 ? "Issue a book to create a record." : "Try a different filter or search term."} /></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* MEMBERS */}
                    {isStaff && activeTab === "members" && (
                        <section className={cn(card, "p-5 sm:p-6")}>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="font-display text-lg text-foreground">Member management</h2>
                                <span className="text-xs text-muted-foreground">{filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}</span>
                            </div>
                            <label className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 sm:max-w-sm">
                                <Search size={16} className="text-muted-foreground" />
                                <input value={memberSearchTerm} onChange={(e) => setMemberSearchTerm(e.target.value)} placeholder="Search member ID, name, email..." className="w-full border-0 bg-transparent text-sm outline-none" />
                            </label>
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full min-w-[720px] text-left text-sm">
                                    <thead>
                                        <tr className="bg-secondary/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                                            <th className="px-4 py-3 font-semibold">Member ID</th>
                                            <th className="px-4 py-3 font-semibold">Name</th>
                                            <th className="px-4 py-3 font-semibold">Email</th>
                                            <th className="px-4 py-3 font-semibold">Phone</th>
                                            <th className="px-4 py-3 font-semibold">Joined</th>
                                            <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isMemberLoading ? (
                                            <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading members...</td></tr>
                                        ) : filteredMembers.length ? (
                                            filteredMembers.map((member) => (
                                                <tr key={member.id} className="border-t border-border hover:bg-secondary/30">
                                                    <td className="px-4 py-3 font-medium">{member.member_id}</td>
                                                    <td className="px-4 py-3">{member.name}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{member.phone || "—"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(member.created_at)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    setBorrowMemberFilter({ id: member.id, name: member.name });
                                                                    setBorrowStatusFilter("all");
                                                                    setBorrowSearchTerm("");
                                                                    setActiveTab("borrowings");
                                                                }}
                                                                aria-label={`View history for ${member.name}`}
                                                                className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-secondary hover:text-primary"
                                                            >
                                                                <Clock size={15} />
                                                            </button>
                                                            <button onClick={() => handleMemberEdit(member)} aria-label={`Edit ${member.name}`} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-secondary hover:text-primary">
                                                                <Pencil size={15} />
                                                            </button>
                                                            <button onClick={() => handleMemberDelete(member.id)} aria-label={`Delete ${member.name}`} className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6}><EmptyState icon={Users} title="No members found" hint="Try another search query or add a member." /></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* RESERVATIONS (staff) */}
                    {isStaff && activeTab === "reservations" && (
                        <section className={cn(card, "p-5 sm:p-6")}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-display text-lg text-foreground">Reservation queue</h2>
                                <span className="text-xs text-muted-foreground">{reservations.length} {reservations.length === 1 ? "record" : "records"}</span>
                            </div>
                            {reservationError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{reservationError}</p>}
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead>
                                        <tr className="bg-secondary/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                                            <th className="px-4 py-3 font-semibold">Book</th>
                                            <th className="px-4 py-3 font-semibold">Member</th>
                                            <th className="px-4 py-3 font-semibold">Reserved</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                            <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isReservationLoading ? (
                                            <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading reservations...</td></tr>
                                        ) : reservations.length ? (
                                            reservations.map((r) => (
                                                <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                                                    <td className="px-4 py-3 font-medium">{r.book_title}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{r.member_name}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.reserved_at)}</td>
                                                    <td className="px-4 py-3">
                                                        {r.status === "ready" ? <StatusPill tone="brand">Ready for pickup</StatusPill>
                                                            : r.status === "pending" ? <StatusPill tone="warn">Waiting</StatusPill>
                                                                : r.status === "fulfilled" ? <StatusPill tone="good">Fulfilled</StatusPill>
                                                                    : <StatusPill tone="neutral">Cancelled</StatusPill>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-1.5">
                                                            {r.status === "ready" && (
                                                                <Button size="sm" className="gap-1.5 rounded-full" onClick={() => handleFulfillReservation(r.id)}>
                                                                    <CheckCircle2 size={14} /> Issue
                                                                </Button>
                                                            )}
                                                            {["pending", "ready"].includes(r.status) && (
                                                                <button onClick={() => handleCancelReservation(r.id)} aria-label="Cancel reservation" className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400">
                                                                    <XCircle size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={5}><EmptyState icon={Bookmark} title="No reservations" hint="Reservations appear here once a student holds a book that's fully checked out." /></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ANALYTICS (staff) */}
                    {isStaff && activeTab === "analytics" && (
                        <div className="space-y-5">
                            {isAnalyticsLoading || !analytics ? (
                                <div className={cn(card, "p-10 text-center text-muted-foreground")}>Loading analytics...</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                                        {[
                                            ["Total members", analytics.totalMembers],
                                            ["Active loans", analytics.activeLoans],
                                            ["Overdue", analytics.overdueCount],
                                            ["Fines collected", `Rs. ${analytics.totalFinesCollected}`],
                                        ].map(([lbl, val]) => (
                                            <div key={lbl} className={cn(card, "p-5")}>
                                                <p className="text-xs text-muted-foreground">{lbl}</p>
                                                <strong className="font-display text-2xl text-foreground">{val}</strong>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={cn(card, "p-5 sm:p-6")}>
                                        <h3 className="mb-1 font-display text-lg">Borrowing activity — last 14 days</h3>
                                        <p className="mb-4 text-xs text-muted-foreground">Number of books issued per day</p>
                                        <BorrowTrendChart trend={analytics.borrowTrend} />
                                    </div>

                                    <div className="grid gap-5 lg:grid-cols-2">
                                        <div className={cn(card, "p-5 sm:p-6")}>
                                            <h3 className="mb-4 font-display text-lg">Top categories</h3>
                                            <div className="space-y-3">
                                                {analytics.topCategories.length ? analytics.topCategories.map((c) => {
                                                    const max = analytics.topCategories[0].count || 1;
                                                    return (
                                                        <div key={c.category}>
                                                            <div className="mb-1 flex justify-between text-xs">
                                                                <span className="font-medium text-foreground">{c.category}</span>
                                                                <span className="text-muted-foreground">{c.count}</span>
                                                            </div>
                                                            <div className="h-2 rounded-full bg-secondary">
                                                                <div className="h-2 rounded-full bg-primary" style={{ width: `${(c.count / max) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                }) : <p className="text-sm text-muted-foreground">No data yet.</p>}
                                            </div>
                                        </div>
                                        <div className={cn(card, "p-5 sm:p-6")}>
                                            <h3 className="mb-4 font-display text-lg">Most borrowed books</h3>
                                            <div className="space-y-2">
                                                {analytics.topBooks.length ? analytics.topBooks.map((b, i) => (
                                                    <div key={b.title} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-secondary/50">
                                                        <span className="flex items-center gap-3 text-sm">
                                                            <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">{i + 1}</span>
                                                            {b.title}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{b.count} loans</span>
                                                    </div>
                                                )) : <p className="text-sm text-muted-foreground">No data yet.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* SETTINGS (staff) */}
                    {isStaff && activeTab === "settings" && (
                        <section className={cn(card, "max-w-lg p-5 sm:p-6")}>
                            <h2 className="mb-1 font-display text-lg text-foreground">Loan policy</h2>
                            <p className="mb-5 text-xs text-muted-foreground">These values control every new loan issued from now on — existing loans keep whatever due date they were given.</p>
                            <form onSubmit={handlePolicySubmit} className="space-y-4">
                                <label className="block space-y-1.5">
                                    <span className={label}>Standard loan period (days)</span>
                                    <input className={input} type="number" name="loanPeriodDays" min="1" value={policyForm.loanPeriodDays} onChange={handlePolicyChange} required />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className={label}>Maximum loan period (days)</span>
                                    <input className={input} type="number" name="maxLoanPeriodDays" min="1" value={policyForm.maxLoanPeriodDays} onChange={handlePolicyChange} required />
                                    <span className="block text-xs text-muted-foreground">The furthest out staff can push a due date when issuing a book.</span>
                                </label>
                                <label className="block space-y-1.5">
                                    <span className={label}>Fine per overdue day (Rs.)</span>
                                    <input className={input} type="number" name="finePerDay" min="0" value={policyForm.finePerDay} onChange={handlePolicyChange} required />
                                </label>
                                {policyError && <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{policyError}</p>}
                                {policySuccess && <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{policySuccess}</p>}
                                <Button type="submit" disabled={isPolicySaving} className="gap-2">
                                    {isPolicySaving ? "Saving..." : <><Check size={16} />Save policy</>}
                                </Button>
                            </form>
                        </section>
                    )}

                    {/* MY LOANS (student) */}
                    {!isStaff && activeTab === "myloans" && (
                        <section className={cn(card, "p-5 sm:p-6")}>
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-display text-lg text-foreground">Your borrowing history</h2>
                                    <p className="text-xs text-muted-foreground">Standard loan: {loanPolicy.loanPeriodDays} days · Fine: Rs. {loanPolicy.finePerDay}/day overdue</p>
                                </div>
                                <span className="text-xs text-muted-foreground">{filteredMyLoans.length} of {borrowings.length} records</span>
                            </div>

                            <div className="my-4 inline-flex gap-1 rounded-lg bg-secondary p-1">
                                {[{ id: "all", label: "All" }, { id: "active", label: "Currently borrowed" }, { id: "returned", label: "Returned" }].map(({ id, label: l }) => (
                                    <button
                                        key={id}
                                        onClick={() => setMyLoansStatusFilter(id)}
                                        className={cn("rounded-md border-0 px-3 py-1.5 text-xs font-semibold transition", myLoansStatusFilter === id ? "bg-card text-primary shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground")}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>

                            {!currentUser.member_ref_id ? (
                                <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">Your account isn't linked to a library membership yet. Ask staff to link your profile.</p>
                            ) : isBorrowingLoading ? (
                                <p className="text-sm text-muted-foreground">Loading your loans...</p>
                            ) : filteredMyLoans.length ? (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredMyLoans.map((record) => (
                                        <div key={record.id} className={cn("rounded-xl border p-4", record.isOverdue ? "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30" : "border-border bg-card")}>
                                            <div className="mb-3 flex items-center gap-3">
                                                <span className="grid h-9 w-8 place-items-center rounded border-l-2 border-primary bg-primary/5 text-primary"><BookOpen size={15} /></span>
                                                <div>
                                                    <p className="font-medium text-foreground">{record.book_title || "Unknown book"}</p>
                                                    <p className="text-xs text-muted-foreground">{record.book_author}</p>
                                                </div>
                                            </div>
                                            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                                                <div><p className="text-muted-foreground">Borrowed</p><p className="font-semibold">{fmtDate(record.borrow_date)}</p></div>
                                                <div><p className="text-muted-foreground">Due date</p><p className="font-semibold">{fmtDate(record.due_date)}</p></div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                {record.status === "returned" ? <StatusPill tone="neutral">Returned</StatusPill>
                                                    : record.isOverdue ? <StatusPill tone="bad">Overdue by {record.overdueDays}d</StatusPill>
                                                        : record.daysRemaining === 0 ? <StatusPill tone="warn">Due today</StatusPill>
                                                            : <StatusPill tone="good">{record.daysRemaining} days left</StatusPill>}
                                                {Number(record.fine) > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">Fine: Rs. {record.fine}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={Clock} title={borrowings.length === 0 ? "No loans yet" : "No matching records"} hint={borrowings.length === 0 ? "Ask staff to issue you a book from the catalogue." : "Try a different filter."} />
                            )}
                        </section>
                    )}

                    {/* MY RESERVATIONS (student) */}
                    {!isStaff && activeTab === "myreservations" && (
                        <section className={cn(card, "p-5 sm:p-6")}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-display text-lg text-foreground">Your reservations</h2>
                                <span className="text-xs text-muted-foreground">{reservations.length} {reservations.length === 1 ? "record" : "records"}</span>
                            </div>
                            {reservationError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{reservationError}</p>}
                            {reservationSuccess && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{reservationSuccess}</p>}
                            {isReservationLoading ? (
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            ) : reservations.length ? (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {reservations.map((r) => (
                                        <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                                            <div className="mb-3 flex items-center gap-3">
                                                <span className="grid h-9 w-8 place-items-center rounded border-l-2 border-primary bg-primary/5 text-primary"><Bookmark size={15} /></span>
                                                <div>
                                                    <p className="font-medium text-foreground">{r.book_title}</p>
                                                    <p className="text-xs text-muted-foreground">Reserved {fmtDate(r.reserved_at)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                {r.status === "ready" ? <StatusPill tone="brand">Ready for pickup</StatusPill>
                                                    : r.status === "pending" ? <StatusPill tone="warn">Waiting</StatusPill>
                                                        : r.status === "fulfilled" ? <StatusPill tone="good">Fulfilled</StatusPill>
                                                            : <StatusPill tone="neutral">Cancelled</StatusPill>}
                                                {["pending", "ready"].includes(r.status) && (
                                                    <button onClick={() => handleCancelReservation(r.id)} className="border-0 bg-transparent text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400">Cancel</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={Bookmark} title="No reservations yet" hint="When a book you want is fully checked out, reserve it from the catalogue and we'll flag it the moment it's back." />
                            )}
                        </section>
                    )}
                </div>
            </main>

            <AnimatePresence>
            {isFormOpen && isStaff && (
                <Modal key="book-form" eyebrow="Catalogue entry" title={editingId ? "Edit book" : "Add a new book"} onClose={handleCancel}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formData.cover_url && (
                            <div className="flex justify-center">
                                <img src={formData.cover_url} alt="" className="h-28 w-20 rounded-lg border border-border object-cover shadow-sm" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input className={input} name="isbn" placeholder="ISBN" value={formData.isbn} onChange={handleChange} />
                            <Button type="button" variant="outline" onClick={handleIsbnLookup} disabled={isIsbnLookupLoading} className="shrink-0 gap-2">
                                {isIsbnLookupLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                                Lookup
                            </Button>
                        </div>
                        {isbnLookupError && <p className="text-xs text-rose-600 dark:text-rose-400">{isbnLookupError}</p>}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input className={input} name="title" placeholder="Title *" value={formData.title} onChange={handleChange} required />
                            <input className={input} name="author" placeholder="Author *" value={formData.author} onChange={handleChange} required />
                            <input className={input} name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
                            <input className={input} type="number" name="quantity" placeholder="Quantity" value={formData.quantity} onChange={handleChange} min="0" required />
                            <input className={cn(input, "sm:col-span-2")} name="cover_url" placeholder="Cover image URL (auto-filled by lookup, or paste your own)" value={formData.cover_url} onChange={handleChange} />
                        </div>
                        {error && <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{error}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                            <Button type="submit" disabled={isSaving} className="gap-2">
                                {isSaving ? "Saving..." : <><Check size={16} />{editingId ? "Save changes" : "Add book"}</>}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isMemberFormOpen && isStaff && (
                <Modal key="member-form" eyebrow="Member record" title={memberEditingId ? "Edit member" : "Add a new member"} onClose={handleMemberCancel}>
                    <form onSubmit={handleMemberSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input className={input} name="member_id" placeholder="Member ID *" value={memberFormData.member_id} onChange={handleMemberChange} required />
                            <input className={input} name="name" placeholder="Name *" value={memberFormData.name} onChange={handleMemberChange} required />
                            <input className={input} type="email" name="email" placeholder="Email *" value={memberFormData.email} onChange={handleMemberChange} required />
                            <input className={input} name="phone" placeholder="Phone" value={memberFormData.phone} onChange={handleMemberChange} />
                            <input className={input} name="address" placeholder="Address" value={memberFormData.address} onChange={handleMemberChange} />
                        </div>
                        {memberError && <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{memberError}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleMemberCancel}>Cancel</Button>
                            <Button type="submit" disabled={isMemberSaving} className="gap-2">
                                {isMemberSaving ? "Saving..." : <><Check size={16} />{memberEditingId ? "Save changes" : "Add member"}</>}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isBorrowFormOpen && isStaff && (
                <Modal key="borrow-form" eyebrow="Issue book" title="Issue a book" onClose={handleBorrowCancel}>
                    <form onSubmit={handleBorrowSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="space-y-1.5">
                                <span className={label}>Book</span>
                                <select className={input} name="book_id" value={borrowFormData.book_id} onChange={handleBorrowChange} required>
                                    <option value="">Select a book</option>
                                    {books.filter((b) => Number(b.quantity) > 0).map((b) => (
                                        <option key={b.book_id} value={b.book_id}>{b.title} — {b.author} ({b.quantity} available)</option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-1.5">
                                <span className={label}>Member</span>
                                <select className={input} name="member_id" value={borrowFormData.member_id} onChange={handleBorrowChange} required>
                                    <option value="">Select a member</option>
                                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.member_id}</option>)}
                                </select>
                            </label>
                            <label className="space-y-1.5 sm:col-span-2">
                                <span className={label}>Due date</span>
                                <input className={input} type="date" name="due_date" value={borrowFormData.due_date} onChange={handleBorrowChange} required />
                            </label>
                        </div>
                        {borrowError && <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{borrowError}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleBorrowCancel}>Cancel</Button>
                            <Button type="submit" disabled={isBorrowingSaving} className="gap-2">
                                {isBorrowingSaving ? "Issuing..." : <><Check size={16} />Issue book</>}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
            </AnimatePresence>
        </div>
    );
}

export default App;
