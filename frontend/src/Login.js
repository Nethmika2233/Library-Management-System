import React, { useState } from 'react';
import { ArrowLeft, GraduationCap, Library, Lock, Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';
import './Login.css';

const EMPTY_SIGNUP = { name: '', email: '', phone: '', username: '', password: '', confirmPassword: '' };

function Login({ onLoginSuccess, initialRole = 'staff', initialMode = 'signin', onBack }) {
    const [loginRole, setLoginRole] = useState(initialRole);
    const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [signupData, setSignupData] = useState(EMPTY_SIGNUP);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRoleToggle = (role) => {
        setLoginRole(role);
        setError('');
        setInfo('');
        if (role === 'staff') setMode('signin');
    };

    const handleSignupChange = (event) => {
        const { name, value } = event.target;
        setSignupData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const actualRole = data.user.role === 'staff' ? 'staff' : 'student';
                if (actualRole !== loginRole) {
                    setError(
                        `This account is a ${actualRole} account. Switch the toggle to "${actualRole === 'staff' ? 'Staff' : 'Student'}" and sign in again.`
                    );
                    return;
                }
                onLoginSuccess(data.user, data.token);
            } else {
                setError(data.message || 'Login failed!');
            }
        } catch (err) {
            console.error('Login Error:', err);
            setError('Server connection failed. Make sure the backend is running.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');

        if (signupData.password !== signupData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (signupData.password.length < 4) {
            setError('Password must be at least 4 characters.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: signupData.username,
                    password: signupData.password,
                    name: signupData.name,
                    email: signupData.email,
                    phone: signupData.phone,
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                onLoginSuccess(data.user, data.token);
            } else {
                setError(data.error || 'Could not create your account.');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError('Server connection failed. Make sure the backend is running.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-panel">
                <div className="login-brand">
                    <span className="login-brand-mark">
                        <Library size={22} />
                    </span>
                    <span>
                        <strong>Bookshelf</strong>
                    </span>
                </div>
                <p className="login-tagline">
                    Catalogue, members and borrowings — all in one place.
                </p>
                <ul className="login-highlights">
                    <li>Browse and manage the full book collection</li>
                    <li>Standard 14-day loans with automatic due-date tracking</li>
                    <li>Overdue fines calculated automatically, no manual math</li>
                </ul>
            </div>

            <div className="login-card-wrap">
                <div className="login-card">
                    <div className="mb-4 flex items-center justify-between">
                        {onBack ? (
                            <button type="button" className="login-back" onClick={onBack}>
                                <ArrowLeft size={14} /> Back to home
                            </button>
                        ) : <span />}
                        <ThemeToggle />
                    </div>
                    <p className="eyebrow">{mode === 'signup' ? 'New here' : 'Welcome back'}</p>
                    <h1>{mode === 'signup' ? 'Create your student account' : 'Sign in to continue'}</h1>
                    <p className="login-subtitle">
                        {mode === 'signup'
                            ? 'Register as a student to browse the catalogue and track your own loans.'
                            : 'Use your library account to access the system.'}
                    </p>

                    <div className="role-switch" role="group" aria-label="Sign in as">
                        <span
                            className="role-switch-thumb"
                            style={{ transform: loginRole === "student" ? "translateX(100%)" : "translateX(0)" }}
                        />
                        <button
                            type="button"
                            className={`role-switch-option ${loginRole === "staff" ? "active" : ""}`}
                            onClick={() => handleRoleToggle("staff")}
                            aria-pressed={loginRole === "staff"}
                        >
                            <ShieldCheck size={15} />
                            Staff
                        </button>
                        <button
                            type="button"
                            className={`role-switch-option ${loginRole === "student" ? "active" : ""}`}
                            onClick={() => handleRoleToggle("student")}
                            aria-pressed={loginRole === "student"}
                        >
                            <GraduationCap size={15} />
                            Student
                        </button>
                    </div>

                    {error && <div className="error-banner" role="alert">{error}</div>}
                    {info && <div className="success-banner" role="status">{info}</div>}

                    {mode === 'signin' ? (
                        <form onSubmit={handleLogin} className="login-form">
                            <label className="field-group">
                                <span>Username</span>
                                <div className="input-icon">
                                    <UserIcon size={16} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder={loginRole === "staff" ? "e.g. admin" : "e.g. student"}
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="field-group">
                                <span>Password</span>
                                <div className="input-icon">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                            </label>

                            <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                            </button>

                            {loginRole === 'student' && (
                                <p className="login-switch-mode">
                                    New student?{' '}
                                    <button type="button" onClick={() => { setMode('signup'); setError(''); }}>
                                        Create an account
                                    </button>
                                </p>
                            )}
                        </form>
                    ) : (
                        <form onSubmit={handleSignup} className="login-form">
                            <label className="field-group">
                                <span>Full name</span>
                                <div className="input-icon">
                                    <UserIcon size={16} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={signupData.name}
                                        onChange={handleSignupChange}
                                        placeholder="e.g. Nethmika Athukorala"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="field-group">
                                <span>Email</span>
                                <div className="input-icon">
                                    <Mail size={16} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={signupData.email}
                                        onChange={handleSignupChange}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="field-group">
                                <span>Phone (optional)</span>
                                <div className="input-icon">
                                    <Phone size={16} />
                                    <input
                                        type="text"
                                        name="phone"
                                        value={signupData.phone}
                                        onChange={handleSignupChange}
                                        placeholder="07XXXXXXXX"
                                    />
                                </div>
                            </label>

                            <label className="field-group">
                                <span>Username</span>
                                <div className="input-icon">
                                    <UserIcon size={16} />
                                    <input
                                        type="text"
                                        name="username"
                                        value={signupData.username}
                                        onChange={handleSignupChange}
                                        placeholder="Choose a username"
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="field-group">
                                <span>Password</span>
                                <div className="input-icon">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        name="password"
                                        value={signupData.password}
                                        onChange={handleSignupChange}
                                        placeholder="At least 4 characters"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="field-group">
                                <span>Confirm password</span>
                                <div className="input-icon">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={signupData.confirmPassword}
                                        onChange={handleSignupChange}
                                        placeholder="Re-enter password"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </label>

                            <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating account...' : 'Create account'}
                            </button>

                            <p className="login-switch-mode">
                                Already registered?{' '}
                                <button type="button" onClick={() => { setMode('signin'); setError(''); setSignupData(EMPTY_SIGNUP); }}>
                                    Sign in instead
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login;
