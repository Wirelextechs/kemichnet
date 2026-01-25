import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', { email, password });
            if (res.data.user) {
                if (res.data.user.role === 'admin') navigate('/admin');
                else navigate('/dashboard');
            }
        } catch (err: any) {
            console.error("Login Error Details:", err);
            const msg = err.response?.data?.message || err.message || 'Login failed';
            setError(msg);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border">
                <h2 className="text-3xl font-bold text-center mb-6">Welcome Back</h2>
                {error && <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-lg bg-muted border-none focus:ring-2 focus:ring-primary outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-lg bg-muted border-none focus:ring-2 focus:ring-primary outline-none"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:shadow-lg transition-all">
                        Login
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
}
