import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                    KemichNet
                </div>
                <nav className="space-x-4">
                    <Link to="/login" className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Login</Link>
                    <Link to="/register" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Get Started</Link>
                </nav>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-8">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight"
                >
                    Premium Data <br />
                    <span className="text-primary">Instant Delivery</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-muted-foreground max-w-2xl"
                >
                    Experience the fastest, most reliable mobile data vending platform.
                    Seamless payments, automated delivery, and carrier-grade reliability.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-4"
                >
                    <Link to="/register" className="px-8 py-3 bg-primary text-primary-foreground text-lg font-medium rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all">
                        Create Account
                    </Link>
                    <Link to="/login" className="px-8 py-3 bg-secondary text-secondary-foreground text-lg font-medium rounded-xl hover:bg-secondary/80 transition-all">
                        Sign In
                    </Link>
                </motion.div>
            </main>

            <footer className="p-6 text-center text-sm text-muted-foreground">
                © 2026 KemichNet. secured by Paystack.
            </footer>
        </div>
    );
}
