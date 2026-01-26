import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { motion } from 'framer-motion';
import { Wifi, ArrowRight, Lock, UserPlus } from 'lucide-react';

const SignalWave = ({ delay }: { delay: number }) => (
    <motion.div
        className="absolute rounded-full border border-green-500/20"
        initial={{ width: 0, height: 0, opacity: 0.5 }}
        animate={{ width: 800, height: 800, opacity: 0 }}
        transition={{ duration: 4, repeat: Infinity, delay, ease: "easeOut" }}
        style={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
    />
);

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/register', { email, password, phone });
            if (res.data.user) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Registration failed';
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050B14] text-white overflow-hidden relative flex items-center justify-center selection:bg-yellow-500/30">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-[#050B14]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
                    <SignalWave delay={0.5} />
                    <SignalWave delay={1.8} />
                    <SignalWave delay={3.1} />
                </div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="w-full max-w-md p-6 relative z-10">

                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                            <Wifi className="text-black w-5 h-5" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white">
                            Këmich<span className="text-yellow-400">Nët</span>
                        </span>
                    </Link>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">Create Account</h2>
                    <p className="text-gray-400 mt-2 text-sm">Join the fastest data network today</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
                >
                    {/* Glow effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2"
                        >
                            <Lock className="w-4 h-4" /> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all font-mono"
                                placeholder="05XXXXXXXX"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-lg rounded-xl hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? 'Creating...' : (
                                <>Sign Up <UserPlus className="w-5 h-5" /></>
                            )}
                        </button>
                    </form>
                </motion.div>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Already have an account? <Link to="/login" className="text-green-500 hover:text-green-400 font-semibold transition-colors">Login</Link>
                </p>
            </div>
        </div>
    );
}
