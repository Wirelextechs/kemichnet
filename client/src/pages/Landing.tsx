import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wifi, Zap, Smartphone, Globe, ShieldCheck, CreditCard } from 'lucide-react';

const SignalWave = ({ delay }: { delay: number }) => (
    <motion.div
        className="absolute rounded-full border border-green-500/30"
        initial={{ width: 0, height: 0, opacity: 0.8 }}
        animate={{ width: 600, height: 600, opacity: 0 }}
        transition={{ duration: 4, repeat: Infinity, delay, ease: "easeOut" }}
        style={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
    />
);

const FloatingParticle = ({ x, y, duration }: { x: number | string, y: number | string, duration: number }) => (
    <motion.div
        className="absolute w-1 h-1 bg-yellow-400 rounded-full blur-[1px]"
        initial={{ x: 0, y: 0, opacity: 0 }}
        animate={{ x, y, opacity: [0, 1, 0] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
    />
);

export default function Landing() {
    return (
        <div className="min-h-screen bg-[#050B14] text-white overflow-hidden relative selection:bg-yellow-500/30">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-green-900/10 to-[#050B14]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-green-500/5 blur-[120px] rounded-full point-events-none" />

                {/* Signal Waves */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
                    <SignalWave delay={0} />
                    <SignalWave delay={1.3} />
                    <SignalWave delay={2.6} />
                </div>

                {/* Grid Effect */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            {/* Navbar */}
            <header className="relative z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                        <Wifi className="text-black w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-white">
                        Këmich<span className="text-yellow-400">Nët</span>
                    </span>
                </div>
                <nav className="flex items-center gap-6">
                    <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Login</Link>
                    <Link to="/register" className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        Get Started
                    </Link>
                </nav>
            </header>

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center p-6 space-y-12">

                {/* Hero Text */}
                <div className="space-y-6 max-w-4xl relative">
                    {/* Floating Particles around text */}
                    <div className="absolute inset-0 pointer-events-none">
                        <FloatingParticle x={100} y={-100} duration={5} />
                        <FloatingParticle x={-200} y={50} duration={7} />
                        <FloatingParticle x={200} y={150} duration={6} />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-900/30 border border-green-500/30 text-green-400 text-sm font-medium mb-4 backdrop-blur-md"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Network Status: Excellent
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 leading-[1.1]"
                    >
                        Connect at the <br />
                        <span className="bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                            Speed of Light
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        Your ultimate gateway for instant mobile data and airtime.
                        Carrier-grade reliability with ultramodern fulfillment technology.
                    </motion.p>
                </div>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 w-full justify-center"
                >
                    <Link to="/register" className="px-10 py-5 bg-gradient-to-r from-green-600 to-green-500 text-white text-lg font-bold rounded-2xl hover:scale-105 transition-transform shadow-[0_20px_40px_-10px_rgba(34,197,94,0.3)] flex items-center justify-center gap-3">
                        <Zap className="w-5 h-5 fill-current" />
                        Start Now
                    </Link>
                    <Link to="/login" className="px-10 py-5 bg-[#0A121E] border border-gray-800 text-white text-lg font-bold rounded-2xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-3">
                        Customer Login
                    </Link>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-20"
                >
                    {[
                        { icon: Smartphone, title: "Instant Top-up", desc: "Automated delivery within seconds of payment." },
                        { icon: ShieldCheck, title: "Secure Payments", desc: "Bank-grade encryption via Paystack." },
                        { icon: Globe, title: "All Networks", desc: "MTN, Telecel, and AT supported." }
                    ].map((feature, i) => (
                        <div key={i} className="group p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all backdrop-blur-sm text-left relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 via-green-500/0 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <feature.icon className="w-6 h-6 text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-gray-400">{feature.desc}</p>
                        </div>
                    ))}
                </motion.div>
            </main>

            <footer className="relative z-10 p-8 text-center text-sm text-gray-600 border-t border-white/5 mt-20">
                <div className="flex flex-col items-center gap-4">
                    <p>© 2026 KëmichNet Digital Hub. All rights reserved.</p>
                    <div className="flex gap-4 opacity-50">
                        <CreditCard className="w-5 h-5" />
                        <Wifi className="w-5 h-5" />
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>
            </footer>
        </div>
    );
}
