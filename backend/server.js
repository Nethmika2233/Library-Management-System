const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// ==========================================
// LOAN POLICY — DB-backed (settings table, single row) so staff can edit it
// from the UI instead of it being a hardcoded constant. Cached in memory
// and refreshed whenever it's updated.
// ==========================================
let policy = { loanPeriodDays: 14, maxLoanPeriodDays: 30, finePerDay: 20 };

async function loadPolicy() {
    const row = await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, loanPeriodDays: 14, maxLoanPeriodDays: 30, finePerDay: 20 },
    });
    policy = { loanPeriodDays: row.loanPeriodDays, maxLoanPeriodDays: row.maxLoanPeriodDays, finePerDay: row.finePerDay };
}

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const toDateOnly = (date) => new Date(new Date(date).toDateString());

const daysBetween = (from, to) => Math.round((toDateOnly(to) - toDateOnly(from)) / (1000 * 60 * 60 * 24));

const formatLocalDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ==========================================
// EMAIL (no-op until RESEND_API_KEY is set)
// ==========================================
async function sendEmail(to, subject, html) {
    if (!process.env.RESEND_API_KEY || !to) {
        console.log(`[email skipped — no RESEND_API_KEY] To: ${to} | ${subject}`);
        return;
    }
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM || 'Bookshelf <onboarding@resend.dev>',
                to,
                subject,
                html,
            }),
        });
    } catch (err) {
        console.error('Error sending email:', err);
    }
}

// ==========================================
// SERIALIZERS — keep the JSON shape the frontend already expects
// ==========================================
const serializeUser = (user, member) => ({
    user_id: user.userId,
    username: user.username,
    role: user.role,
    member_ref_id: user.memberRefId,
    member_code: member ? member.memberId : null,
    member_name: member ? member.name : null,
});

const serializeBook = (b) => ({
    book_id: b.bookId,
    title: b.title,
    author: b.author,
    category: b.category,
    isbn: b.isbn,
    cover_url: b.coverUrl,
    quantity: b.quantity,
});

const serializeMember = (m) => ({
    id: m.id,
    member_id: m.memberId,
    name: m.name,
    email: m.email,
    phone: m.phone,
    address: m.address,
    created_at: m.createdAt,
});

const withLoanStatus = (record) => {
    const today = toDateOnly(new Date());
    const dueDate = toDateOnly(record.due_date);
    const referenceDate = record.status === 'returned' && record.return_date
        ? toDateOnly(record.return_date)
        : today;

    const overdueDays = record.status === 'borrowed'
        ? Math.max(0, daysBetween(dueDate, today))
        : Math.max(0, daysBetween(dueDate, referenceDate));

    const isOverdue = record.status === 'borrowed' && overdueDays > 0;
    const daysRemaining = record.status === 'borrowed' ? daysBetween(today, dueDate) : null;
    const currentFine = record.status === 'returned'
        ? Number(record.fine_amount || 0)
        : overdueDays * policy.finePerDay;

    return { ...record, isOverdue, daysRemaining, overdueDays, fine: currentFine };
};

const serializeBorrowing = (b) => withLoanStatus({
    id: b.id,
    book_id: b.bookId,
    member_id: b.memberId,
    borrow_date: b.borrowDate,
    due_date: b.dueDate,
    return_date: b.returnDate,
    status: b.status,
    fine_amount: Number(b.fineAmount),
    book_title: b.book ? b.book.title : null,
    book_author: b.book ? b.book.author : null,
    member_name: b.member ? b.member.name : null,
    member_code: b.member ? b.member.memberId : null,
});

const serializeReservation = (r) => ({
    id: r.id,
    book_id: r.bookId,
    member_id: r.memberId,
    reserved_at: r.reservedAt,
    status: r.status,
    notified_at: r.notifiedAt,
    book_title: r.book ? r.book.title : null,
    book_author: r.book ? r.book.author : null,
    book_available_copies: r.book ? r.book.quantity : null,
    member_name: r.member ? r.member.name : null,
    member_code: r.member ? r.member.memberId : null,
});

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
}

function requireStaff(req, res, next) {
    if (req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Staff access required' });
    }
    next();
}

// ==========================================
// LOAN POLICY (public read, staff-only write)
// ==========================================
app.get('/api/loan-policy', (req, res) => {
    res.json({ loanPeriodDays: policy.loanPeriodDays, maxLoanPeriodDays: policy.maxLoanPeriodDays, finePerDay: policy.finePerDay });
});

app.put('/api/loan-policy', authenticate, requireStaff, async (req, res) => {
    const loanPeriodDays = Number(req.body.loanPeriodDays);
    const maxLoanPeriodDays = Number(req.body.maxLoanPeriodDays);
    const finePerDay = Number(req.body.finePerDay);

    if (![loanPeriodDays, maxLoanPeriodDays, finePerDay].every((n) => Number.isInteger(n) && n >= 0)) {
        return res.status(400).json({ error: 'All policy values must be non-negative whole numbers' });
    }
    if (loanPeriodDays > maxLoanPeriodDays) {
        return res.status(400).json({ error: 'Standard loan period cannot exceed the maximum loan period' });
    }

    try {
        await prisma.settings.update({ where: { id: 1 }, data: { loanPeriodDays, maxLoanPeriodDays, finePerDay } });
        await loadPolicy();
        res.json({ message: 'Loan policy updated', ...policy });
    } catch (err) {
        console.error('Error updating loan policy:', err);
        res.status(500).json({ error: 'Failed to update loan policy' });
    }
});

// ISBN lookup — proxies Open Library's free, keyless API so staff can
// auto-fill title/author/cover instead of typing it all by hand.
app.get('/api/books/lookup/:isbn', authenticate, requireStaff, async (req, res) => {
    const isbn = req.params.isbn.replace(/[^0-9Xx]/g, '');
    if (!isbn) return res.status(400).json({ error: 'A valid ISBN is required' });

    try {
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
        const data = await response.json();
        const book = data[`ISBN:${isbn}`];

        if (!book) return res.status(404).json({ error: 'No book found for that ISBN' });

        res.json({
            title: book.title || '',
            author: (book.authors || []).map((a) => a.name).join(', '),
            category: book.subjects?.[0]?.name || '',
            coverUrl: book.cover?.medium || book.cover?.large || `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
        });
    } catch (err) {
        console.error('Error looking up ISBN:', err);
        res.status(502).json({ error: 'Could not reach the book lookup service' });
    }
});

// ==========================================
// AUTH ROUTES
// ==========================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and Password are required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { username }, include: { member: true } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid Username or Password!' });
        }

        const payload = { userId: user.userId, username: user.username, role: user.role, memberRefId: user.memberRefId };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, message: 'Login successful', token, user: serializeUser(user, user.member) });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, name, email, phone } = req.body;

    if (!username || !password || !name || !email) {
        return res.status(400).json({ error: 'Username, password, name, and email are required' });
    }
    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const memberCode = `STU-${Date.now().toString().slice(-8)}`;

        const result = await prisma.$transaction(async (tx) => {
            const member = await tx.member.create({
                data: { memberId: memberCode, name, email, phone: phone || null },
            });
            const user = await tx.user.create({
                data: { username, password: passwordHash, role: 'student', memberRefId: member.id },
            });
            return { user, member };
        });

        const payload = {
            userId: result.user.userId,
            username: result.user.username,
            role: result.user.role,
            memberRefId: result.user.memberRefId,
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: serializeUser(result.user, result.member),
        });
    } catch (err) {
        console.error('Error creating account:', err);
        if (err.code === 'P2002') {
            const field = err.meta?.target?.[0] || 'field';
            return res.status(409).json({ error: field === 'username' ? 'That username is already taken' : 'An account with this email already exists' });
        }
        res.status(500).json({ error: 'Failed to create account' });
    }
});

app.get('/api/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { userId: req.user.userId }, include: { member: true } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: serializeUser(user, user.member) });
    } catch (err) {
        console.error('Error fetching current user:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// ==========================================
// BOOKS
// ==========================================
app.get('/api/books', async (req, res) => {
    try {
        const books = await prisma.book.findMany({ orderBy: { bookId: 'desc' } });
        res.json(books.map(serializeBook));
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.post('/api/books', authenticate, requireStaff, async (req, res) => {
    const { title, author, category, isbn, quantity, cover_url: coverUrl } = req.body;
    if (!title || !author) {
        return res.status(400).json({ error: 'Title and author are required' });
    }

    try {
        const book = await prisma.book.create({
            data: { title, author, category: category || null, isbn: isbn || null, coverUrl: coverUrl || null, quantity: Number(quantity) || 1 },
        });
        res.status(201).json({ message: 'Book added successfully', bookId: book.bookId });
    } catch (err) {
        console.error('Error inserting book:', err);
        res.status(500).json({ error: 'Failed to add book' });
    }
});

app.put('/api/books/:id', authenticate, requireStaff, async (req, res) => {
    const bookId = Number(req.params.id);
    const { title, author, category, isbn, quantity, cover_url: coverUrl } = req.body;
    if (!title || !author) {
        return res.status(400).json({ error: 'Title and author are required' });
    }

    try {
        await prisma.book.update({
            where: { bookId },
            data: { title, author, category: category || null, isbn: isbn || null, coverUrl: coverUrl || null, quantity: Number(quantity) || 0 },
        });
        res.json({ message: 'Book updated successfully' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ message: 'Book not found' });
        console.error('Error updating book:', err);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

app.delete('/api/books/:id', authenticate, requireStaff, async (req, res) => {
    const bookId = Number(req.params.id);
    try {
        await prisma.book.delete({ where: { bookId } });
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ message: 'Book not found' });
        console.error('Error deleting book:', err);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

// ==========================================
// MEMBERS (staff only)
// ==========================================
app.get('/api/members', authenticate, requireStaff, async (req, res) => {
    try {
        const members = await prisma.member.findMany({ orderBy: { id: 'desc' } });
        res.json(members.map(serializeMember));
    } catch (err) {
        console.error('Error fetching members:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.get('/api/members/:id', authenticate, requireStaff, async (req, res) => {
    try {
        const member = await prisma.member.findUnique({ where: { id: Number(req.params.id) } });
        if (!member) return res.status(404).json({ error: 'Member not found' });
        res.json(serializeMember(member));
    } catch (err) {
        console.error('Error fetching member:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.post('/api/members', authenticate, requireStaff, async (req, res) => {
    const { member_id, name, email, phone, address } = req.body;
    if (!member_id || !name || !email) {
        return res.status(400).json({ error: 'Member ID, name, and email are required' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    try {
        const member = await prisma.member.create({
            data: { memberId: member_id, name, email, phone: phone || null, address: address || null },
        });
        res.status(201).json({ message: 'Member added successfully', memberId: member.id });
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Member ID must be unique' });
        console.error('Error inserting member:', err);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

app.put('/api/members/:id', authenticate, requireStaff, async (req, res) => {
    const { member_id, name, email, phone, address } = req.body;
    if (!member_id || !name || !email) {
        return res.status(400).json({ error: 'Member ID, name, and email are required' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    try {
        await prisma.member.update({
            where: { id: Number(req.params.id) },
            data: { memberId: member_id, name, email, phone: phone || null, address: address || null },
        });
        res.json({ message: 'Member updated successfully' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Member not found' });
        if (err.code === 'P2002') return res.status(409).json({ error: 'Member ID must be unique' });
        console.error('Error updating member:', err);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

app.delete('/api/members/:id', authenticate, requireStaff, async (req, res) => {
    try {
        await prisma.member.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Member not found' });
        console.error('Error deleting member:', err);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// ==========================================
// BORROWINGS
// ==========================================
const borrowingInclude = { book: true, member: true };

app.get('/api/borrowings', authenticate, async (req, res) => {
    try {
        const where = {};

        if (req.user.role === 'staff') {
            if (req.query.memberRefId) where.memberId = Number(req.query.memberRefId);
        } else {
            // Students can only ever see their own history, regardless of query params.
            if (!req.user.memberRefId) return res.json([]);
            where.memberId = req.user.memberRefId;
        }

        const borrowings = await prisma.borrowing.findMany({ where, include: borrowingInclude, orderBy: { id: 'desc' } });
        res.json(borrowings.map(serializeBorrowing));
    } catch (err) {
        console.error('Error fetching borrowings:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.get('/api/borrowings/:id', authenticate, async (req, res) => {
    try {
        const borrowing = await prisma.borrowing.findUnique({ where: { id: Number(req.params.id) }, include: borrowingInclude });
        if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });
        if (req.user.role !== 'staff' && borrowing.memberId !== req.user.memberRefId) {
            return res.status(403).json({ error: 'Not authorized to view this record' });
        }
        res.json(serializeBorrowing(borrowing));
    } catch (err) {
        console.error('Error fetching borrowing:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.put('/api/borrowings/:id', authenticate, requireStaff, async (req, res) => {
    const borrowingId = Number(req.params.id);
    if (Number.isNaN(borrowingId)) return res.status(400).json({ error: 'Invalid borrowing ID' });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const borrowing = await tx.borrowing.findUnique({ where: { id: borrowingId } });
            if (!borrowing) throw { status: 404, message: 'Borrowing record not found' };
            if (borrowing.status !== 'borrowed') throw { status: 400, message: 'This borrowing has already been returned' };

            const overdueDays = Math.max(0, daysBetween(borrowing.dueDate, new Date()));
            const finalFine = overdueDays * policy.finePerDay;

            await tx.borrowing.update({
                where: { id: borrowingId },
                data: { status: 'returned', returnDate: new Date(), fineAmount: finalFine },
            });

            const updatedBook = await tx.book.update({
                where: { bookId: borrowing.bookId },
                data: { quantity: { increment: 1 } },
            });

            // If anyone is waiting on this book, flag the oldest reservation as ready.
            const nextReservation = await tx.reservation.findFirst({
                where: { bookId: borrowing.bookId, status: 'pending' },
                orderBy: { reservedAt: 'asc' },
                include: { member: true, book: true },
            });

            if (nextReservation) {
                await tx.reservation.update({
                    where: { id: nextReservation.id },
                    data: { status: 'ready', notifiedAt: new Date() },
                });
            }

            return { finalFine, nextReservation, book: updatedBook };
        });

        if (result.nextReservation) {
            sendEmail(
                result.nextReservation.member.email,
                `"${result.nextReservation.book.title}" is ready for pickup`,
                `<p>Hi ${result.nextReservation.member.name},</p><p>The book you reserved — <strong>${result.nextReservation.book.title}</strong> — has just been returned and is being held for you. Please visit the library to check it out.</p>`
            );
        }

        res.json({
            message: result.finalFine > 0 ? `Book returned successfully. Overdue fine: ${result.finalFine}` : 'Book returned successfully',
            borrowingId,
            fine: result.finalFine,
        });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('Error returning book:', err);
        res.status(500).json({ error: 'Failed to complete return operation' });
    }
});

app.post('/api/borrowings', authenticate, requireStaff, async (req, res) => {
    const { book_id, member_id } = req.body;
    const borrowDate = new Date();
    const requestedDueDate = req.body.due_date ? new Date(req.body.due_date) : addDays(borrowDate, policy.loanPeriodDays);

    if (!book_id || !member_id) return res.status(400).json({ error: 'Book and member are required' });
    if (Number.isNaN(requestedDueDate.getTime())) return res.status(400).json({ error: 'A valid due date is required' });

    const earliestAllowed = toDateOnly(borrowDate);
    const latestAllowed = addDays(borrowDate, policy.maxLoanPeriodDays);
    if (toDateOnly(requestedDueDate) < earliestAllowed || toDateOnly(requestedDueDate) > toDateOnly(latestAllowed)) {
        return res.status(400).json({ error: `Due date must be between today and ${policy.maxLoanPeriodDays} days from now` });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const book = await tx.book.findUnique({ where: { bookId: Number(book_id) } });
            if (!book) throw { status: 404, message: 'Book not found' };

            const member = await tx.member.findUnique({ where: { id: Number(member_id) } });
            if (!member) throw { status: 404, message: 'Member not found' };

            // Atomic compare-and-set: only decrement if a copy is actually available,
            // which avoids a race between two staff issuing the last copy at once.
            const decremented = await tx.book.updateMany({
                where: { bookId: Number(book_id), quantity: { gt: 0 } },
                data: { quantity: { decrement: 1 } },
            });
            if (decremented.count === 0) throw { status: 400, message: 'No available copies for this book' };

            const borrowing = await tx.borrowing.create({
                data: {
                    bookId: Number(book_id),
                    memberId: Number(member_id),
                    borrowDate,
                    dueDate: requestedDueDate,
                    status: 'borrowed',
                },
            });

            return { borrowing, book, member };
        });

        res.status(201).json({
            message: 'Book issued successfully',
            borrowingId: result.borrowing.id,
            due_date: formatLocalDate(requestedDueDate),
            loanPeriodDays: daysBetween(borrowDate, requestedDueDate),
            book: { id: result.book.bookId, title: result.book.title },
            member: { id: result.member.id, name: result.member.name },
        });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('Error creating borrowing:', err);
        res.status(500).json({ error: 'Failed to create borrowing record' });
    }
});

// ==========================================
// RESERVATIONS
// ==========================================
const reservationInclude = { book: true, member: true };

app.get('/api/reservations', authenticate, async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'staff') {
            if (req.query.memberRefId) where.memberId = Number(req.query.memberRefId);
        } else {
            if (!req.user.memberRefId) return res.json([]);
            where.memberId = req.user.memberRefId;
        }

        const reservations = await prisma.reservation.findMany({ where, include: reservationInclude, orderBy: { reservedAt: 'desc' } });
        res.json(reservations.map(serializeReservation));
    } catch (err) {
        console.error('Error fetching reservations:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.post('/api/reservations', authenticate, async (req, res) => {
    const memberId = req.user.role === 'staff' && req.body.member_id ? Number(req.body.member_id) : req.user.memberRefId;
    const bookId = Number(req.body.book_id);

    if (!bookId || !memberId) return res.status(400).json({ error: 'Book and member are required' });

    try {
        const book = await prisma.book.findUnique({ where: { bookId } });
        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (book.quantity > 0) {
            return res.status(400).json({ error: 'This book has copies available — no need to reserve it, it can be borrowed directly.' });
        }

        const existing = await prisma.reservation.findFirst({
            where: { bookId, memberId, status: { in: ['pending', 'ready'] } },
        });
        if (existing) return res.status(409).json({ error: 'You already have an active reservation for this book' });

        const reservation = await prisma.reservation.create({
            data: { bookId, memberId },
            include: reservationInclude,
        });

        res.status(201).json({ message: 'Book reserved successfully', reservation: serializeReservation(reservation) });
    } catch (err) {
        console.error('Error creating reservation:', err);
        res.status(500).json({ error: 'Failed to create reservation' });
    }
});

app.put('/api/reservations/:id/cancel', authenticate, async (req, res) => {
    try {
        const reservation = await prisma.reservation.findUnique({ where: { id: Number(req.params.id) } });
        if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
        if (req.user.role !== 'staff' && reservation.memberId !== req.user.memberRefId) {
            return res.status(403).json({ error: 'Not authorized to cancel this reservation' });
        }
        await prisma.reservation.update({ where: { id: reservation.id }, data: { status: 'cancelled' } });
        res.json({ message: 'Reservation cancelled' });
    } catch (err) {
        console.error('Error cancelling reservation:', err);
        res.status(500).json({ error: 'Failed to cancel reservation' });
    }
});

// Staff: convert a "ready" reservation into an actual issued borrowing.
app.put('/api/reservations/:id/fulfill', authenticate, requireStaff, async (req, res) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({ where: { id: Number(req.params.id) } });
            if (!reservation) throw { status: 404, message: 'Reservation not found' };
            if (reservation.status !== 'ready') throw { status: 400, message: 'This reservation is not ready for pickup yet' };

            const decremented = await tx.book.updateMany({
                where: { bookId: reservation.bookId, quantity: { gt: 0 } },
                data: { quantity: { decrement: 1 } },
            });
            if (decremented.count === 0) throw { status: 400, message: 'No available copies for this book' };

            const borrowDate = new Date();
            const dueDate = addDays(borrowDate, policy.loanPeriodDays);

            const borrowing = await tx.borrowing.create({
                data: { bookId: reservation.bookId, memberId: reservation.memberId, borrowDate, dueDate, status: 'borrowed' },
            });

            await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'fulfilled' } });

            return { borrowing };
        });

        res.json({ message: 'Reservation fulfilled — book issued', borrowingId: result.borrowing.id });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('Error fulfilling reservation:', err);
        res.status(500).json({ error: 'Failed to fulfill reservation' });
    }
});

// ==========================================
// ANALYTICS (staff only)
// ==========================================
app.get('/api/analytics/overview', authenticate, requireStaff, async (req, res) => {
    try {
        const [books, members, borrowings, reservations] = await Promise.all([
            prisma.book.findMany(),
            prisma.member.count(),
            prisma.borrowing.findMany({ include: borrowingInclude }),
            prisma.reservation.count({ where: { status: { in: ['pending', 'ready'] } } }),
        ]);

        const totalTitles = books.length;
        const totalCopies = books.reduce((sum, b) => sum + b.quantity, 0);
        const availableTitles = books.filter((b) => b.quantity > 0).length;

        const serialized = borrowings.map(serializeBorrowing);
        const activeLoans = serialized.filter((b) => b.status === 'borrowed').length;
        const overdueCount = serialized.filter((b) => b.isOverdue).length;
        const totalFinesOwed = serialized
            .filter((b) => b.status === 'borrowed')
            .reduce((sum, b) => sum + b.fine, 0);
        const totalFinesCollected = serialized
            .filter((b) => b.status === 'returned')
            .reduce((sum, b) => sum + Number(b.fine_amount || 0), 0);

        // Borrow trend for the last 14 days
        const trendDays = 14;
        const trend = [];
        for (let i = trendDays - 1; i >= 0; i--) {
            const day = addDays(new Date(), -i);
            const dayKey = formatLocalDate(day);
            const count = serialized.filter((b) => formatLocalDate(b.borrow_date) === dayKey).length;
            trend.push({ date: dayKey, count });
        }

        // Category breakdown
        const categoryCounts = {};
        books.forEach((b) => {
            const cat = b.category || 'Uncategorised';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        const topCategories = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        // Most borrowed books
        const borrowCounts = {};
        serialized.forEach((b) => {
            borrowCounts[b.book_id] = (borrowCounts[b.book_id] || 0) + 1;
        });
        const topBooks = Object.entries(borrowCounts)
            .map(([bookId, count]) => {
                const book = books.find((b) => b.bookId === Number(bookId));
                return { title: book ? book.title : 'Unknown', count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        res.json({
            totalTitles,
            totalCopies,
            availableTitles,
            totalMembers: members,
            activeLoans,
            overdueCount,
            totalFinesOwed,
            totalFinesCollected,
            pendingReservations: reservations,
            borrowTrend: trend,
            topCategories,
            topBooks,
        });
    } catch (err) {
        console.error('Error building analytics:', err);
        res.status(500).json({ error: 'Failed to compute analytics' });
    }
});

const PORT = process.env.PORT || 5000;
loadPolicy()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to load loan policy on startup:', err);
        process.exit(1);
    });
