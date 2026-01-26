import { useEffect, useState } from 'react';
import api from '../lib/api';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface Product {
    id: number;
    name: string;
    serviceType: string;
    price: string;
    dataAmount: string;
}

interface Order {
    id: number;
    status: string;
    serviceType: string;
    amount: string;
    createdAt: string;
    paymentReference: string;
    beneficiaryPhone: string;
}

export default function Dashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [activeTab, setActiveTab] = useState('MTN_UP2U');
    const [activeView, setActiveView] = useState<'single' | 'bulk' | 'history'>('single');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    // Bulk Purchase State
    const [bulkInput, setBulkInput] = useState('');
    const [bulkOrders, setBulkOrders] = useState<{ phone: string, amount: string, productId?: number, productName?: string, price?: string, valid: boolean, error?: string }[]>([]);

    const [beneficiary, setBeneficiary] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProducts();
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/api/products');
            setProducts(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchOrders = async () => {
        try {
            const res = await api.get('/api/orders/my-orders');
            setOrders(res.data);
        } catch (error) { console.error(error); }
    };

    const handleBuy = async () => {
        if (!selectedProduct) return;
        if (!beneficiary) return alert('Please enter a beneficiary number');

        setLoading(true);
        try {
            const res = await api.post('/api/orders/init', {
                productId: selectedProduct.id,
                beneficiaryPhone: beneficiary
            });
            const authUrl = res.data.authorizationUrl;
            if (authUrl) {
                // Redirect to Paystack
                window.location.href = authUrl;
            } else {
                alert('Failed to initialize payment');
            }
        } catch (error: any) {
            alert(`Order Failed: ${error.response?.data?.message || error.message}`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Bulk Logic ---
    const processBulkInput = () => {
        const lines = bulkInput.split('\n').filter(line => line.trim() !== '');
        const processed = lines.map(line => {
            // Split by space/tab
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return { phone: line, amount: '?', valid: false, error: 'Invalid Format (Use: Phone Amount)' };

            const phone = parts[0];
            const amount = parts[1]; // e.g. "5" or "1"

            const networkProducts = products.filter(p => p.serviceType === activeTab);
            // Match product where dataAmount contains amount (e.g. "1" matches "1GB" or "10GB" - risky, better exact or stripped)
            // Let's strip non-digits from dataAmount and compare
            const product = networkProducts.find(p => p.dataAmount.replace(/\D/g, '') === amount || p.dataAmount === amount);

            if (!product) return { phone, amount, valid: false, error: `No ${amount}GB package found` };

            return { phone, amount, productId: product.id, productName: product.name, price: product.price, valid: true };
        });
        setBulkOrders(processed);
    };

    const handleBulkBuy = async () => {
        const validOrders = bulkOrders.filter(o => o.valid);
        if (validOrders.length === 0) return alert("No valid orders to place.");

        try {
            const payload = validOrders.map(o => ({
                productId: o.productId,
                beneficiaryPhone: o.phone
            }));

            const res = await api.post('/api/orders/bulk-init', { orders: payload });
            const total = res.data.totalAmount;
            const authUrl = res.data.authorizationUrl;

            if (confirm(`Confirm bulk payment of GHS ${total}?`)) {
                if (authUrl) {
                    window.location.href = authUrl;
                } else {
                    alert('Failed to initialize payment');
                }
            }
        } catch (error: any) {
            console.error(error);
            alert(`Bulk Order Failed: ${error.response?.data?.message || error.message}`);
        }
    };

    const filteredProducts = products
        .filter(p => p.serviceType === activeTab)
        .sort((a, b) => {
            const priceA = Number(a.price) || 0;
            const priceB = Number(b.price) || 0;
            return priceA - priceB || a.name.localeCompare(b.name);
        });

    const filteredOrders = orders.filter(order => {
        const s = searchQuery.toLowerCase();
        const matchesSearch =
            (order.serviceType && order.serviceType.toLowerCase().includes(s)) ||
            (order.amount && String(order.amount).includes(s)) ||
            (order.status && order.status.toLowerCase().includes(s)) ||
            (order.paymentReference && order.paymentReference.toLowerCase().includes(s));

        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // ... state ...

    // Brand Colors Helper
    const getTheme = (service: string) => {
        if (service.includes('MTN')) return {
            primary: 'bg-[#FFCC00]',
            hover: 'hover:bg-[#E6B800]',
            text: 'text-black',
            subtext: 'text-gray-800',
            border: 'border-[#FFCC00]',
            light: 'bg-[#FFCC00]/10',
            badge: 'bg-[#FFCC00] text-black',
            gradient: 'from-[#FFCC00]/20 to-transparent'
        };
        if (service === 'TELECEL') return {
            primary: 'bg-[#E42320]',
            hover: 'hover:bg-[#C91F1C]',
            text: 'text-white',
            subtext: 'text-red-100',
            border: 'border-[#E42320]',
            light: 'bg-[#E42320]/10',
            badge: 'bg-[#E42320] text-white',
            gradient: 'from-[#E42320]/20 to-transparent'
        };
        if (service === 'AT') return {
            primary: 'bg-[#0056B3]', // Blue for AT to distinguish
            hover: 'hover:bg-[#004494]',
            text: 'text-white',
            subtext: 'text-blue-100',
            border: 'border-[#0056B3]',
            light: 'bg-[#0056B3]/10',
            badge: 'bg-[#0056B3] text-white',
            gradient: 'from-[#0056B3]/20 to-transparent'
        };
        return {
            primary: 'bg-primary',
            hover: 'hover:bg-primary/90',
            text: 'text-white',
            subtext: 'text-gray-200',
            border: 'border-primary',
            light: 'bg-primary/10',
            badge: 'bg-primary text-white',
            gradient: 'from-primary/20 to-transparent'
        }; // Default
    };

    const theme = getTheme(activeTab);

    return (
        <div className={`min-h-screen bg-gray-50 flex flex-col transition-colors duration-500`}>
            {/* Header */}
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10 transition-colors">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {/* Dynamic Logo/Text Color */}
                        <h1 className={`text-2xl font-black tracking-tighter ${theme.primary.replace('bg-', 'text-')}`}>
                            KemichNet
                        </h1>
                    </div>
                    <button onClick={() => { api.post('/auth/logout'); navigate('/login'); }} className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">Logout</button>
                </div>
            </header>

            {/* Dynamic Background Gradient */}
            <div className={`fixed inset-0 pointer-events-none bg-gradient-to-b ${theme.gradient} opacity-50 z-0`} />

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-8 z-1 relative">

                {/* View Selection (Tabs) */}
                <div className="flex bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-sm border border-gray-100 mb-6 w-fit mx-auto md:mx-0">
                    {['single', 'bulk', 'history'].map((view) => (
                        <button
                            key={view}
                            onClick={() => setActiveView(view as any)}
                            className={clsx(
                                "px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300",
                                activeView === view
                                    ? `${theme.primary} ${theme.text} shadow-lg shadow-${theme.primary}/20`
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            {view.charAt(0).toUpperCase() + view.slice(1)} {view === 'single' ? 'Bundle' : view === 'bulk' ? 'Purchase' : ''}
                        </button>
                    ))}
                </div>

                {/* Service Selection (Only for Buying Views) */}
                {activeView !== 'history' && (
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {['MTN_UP2U', 'MTN_EXPRESS', 'AT', 'TELECEL'].map(service => {
                            const btnTheme = getTheme(service);
                            const isActive = activeTab === service;
                            return (
                                <button
                                    key={service}
                                    onClick={() => setActiveTab(service)}
                                    className={clsx(
                                        "px-6 py-4 rounded-2xl whitespace-nowrap text-sm font-bold transition-all duration-300 border-2 flex items-center gap-2 min-w-[140px] justify-center",
                                        isActive
                                            ? `${btnTheme.primary} ${btnTheme.text} ${btnTheme.border} shadow-xl scale-105`
                                            : "bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    <span className={clsx("w-3 h-3 rounded-full", activeTab === service ? "bg-white" : btnTheme.primary)} />
                                    {service.replace('_', ' ')}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* VIEW: Single Purchase */}
                {activeView === 'single' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="group bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${theme.light} ${theme.primary.replace('bg-', 'text-')}`}>
                                            {product.serviceType.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className={`text-xl font-black tracking-tight leading-none ${theme.primary.replace('bg-', 'text-')}`}>
                                        {product.dataAmount}
                                    </div>
                                    <h3 className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">{product.name}</h3>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <div className="text-base font-bold text-gray-900">₵{product.price}</div>
                                    <button
                                        onClick={() => setSelectedProduct(product)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${theme.primary} ${theme.text} ${theme.hover}`}
                                    >
                                        Buy
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                                <div className={`w-16 h-16 rounded-full ${theme.light} mb-4 flex items-center justify-center`}>
                                    <span className="text-2xl">📦</span>
                                </div>
                                <p>No products available for {activeTab.replace('_', ' ')}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW: Bulk Purchase */}
                {activeView === 'bulk' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-1 ${theme.primary}`} />
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <span className={`p-2 rounded-lg ${theme.light} ${theme.primary.replace('bg-', 'text-')}`}>📝</span>
                                Paste Numbers
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">Format: <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-800 font-mono">0551234567 1</code> (Phone Space Amount)</p>
                            <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                className={`w-full h-80 border-2 border-gray-100 rounded-2xl p-4 font-mono text-sm focus:border-${theme.primary.replace('bg-', '')} focus:ring-4 focus:ring-${theme.primary.replace('bg-', '')}/10 outline-none transition-all resize-none`}
                                placeholder={`0551234567 1\n0240000000 2.5\n0509999999 5`}
                            />
                            <button onClick={processBulkInput} className={`mt-4 w-full py-4 rounded-xl font-bold transition-all shadow-xl active:scale-95 ${theme.primary} ${theme.text} ${theme.hover}`}>
                                Process List
                            </button>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-1 ${theme.primary}`} />
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <span className={`p-2 rounded-lg ${theme.light} ${theme.primary.replace('bg-', 'text-')}`}>🧾</span>
                                Order Summary
                            </h3>
                            <div className="flex-1 overflow-y-auto max-h-[400px] border border-gray-100 rounded-2xl bg-gray-50/50 p-2">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100/50 sticky top-0 text-gray-500">
                                        <tr>
                                            <th className="p-3 rounded-tl-lg">Phone</th>
                                            <th className="p-3">Data</th>
                                            <th className="p-3 rounded-tr-lg">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {bulkOrders.map((o, i) => (
                                            <tr key={i} className={o.valid ? "bg-white" : "bg-red-50/50"}>
                                                <td className="p-3 font-mono text-gray-700">{o.phone}</td>
                                                <td className="p-3 font-bold">{o.amount}GB</td>
                                                <td className="p-3 text-xs">
                                                    {o.valid
                                                        ? <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">OK (₵{o.price})</span>
                                                        : <span className="text-red-500 font-medium">{o.error}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {bulkOrders.length === 0 && <tr><td colSpan={3} className="p-10 text-center text-gray-400">Paste numbers to preview</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <div className="text-sm text-gray-500 mb-1">Total Valid Orders</div>
                                        <div className="text-3xl font-black text-gray-900">{bulkOrders.filter(o => o.valid).length}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500 mb-1">Total Cost</div>
                                        <div className="text-3xl font-black text-gray-900">₵{bulkOrders.filter(o => o.valid).reduce((sum, o) => sum + parseFloat(o.price as any), 0).toFixed(2)}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleBulkBuy}
                                    disabled={bulkOrders.filter(o => o.valid).length === 0}
                                    className={`w-full py-4 rounded-xl font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${theme.primary} ${theme.text} ${theme.hover}`}
                                >
                                    Proceed to Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: History */}
                {activeView === 'history' && (
                    <section>
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <h2 className="text-xl font-bold">Order History</h2>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="border-gray-200 border rounded-xl px-4 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-gray-200 outline-none bg-gray-50"
                                    />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="border-gray-200 border rounded-xl px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-gray-200 outline-none"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PAID">Paid</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="FULFILLED">Fulfilled</option>
                                        <option value="FAILED">Failed</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 text-gray-400 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="p-6 font-medium">Service</th>
                                        <th className="p-6 font-medium">Number</th>
                                        <th className="p-6 font-medium">Amount</th>
                                        <th className="p-6 font-medium">Status</th>
                                        <th className="p-6 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredOrders.map(order => {
                                        // Row specific theme? Maybe overkill. Just simple text.
                                        const statusColor = order.status === 'FULFILLED' ? 'bg-green-100 text-green-700' :
                                            order.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                order.status === 'PAID' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';

                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-6 font-bold text-gray-900">{order.serviceType.replace('_', ' ')}</td>
                                                <td className="p-6 font-mono text-gray-600">{order.beneficiaryPhone}</td>
                                                <td className="p-6 font-medium">₵{order.amount}</td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-gray-400">{new Date(order.createdAt).toLocaleDateString()} <span className="text-xs">{new Date(order.createdAt).toLocaleTimeString()}</span></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {filteredOrders.length === 0 && <div className="p-10 text-center text-gray-400">No orders found</div>}
                        </div>
                    </section>
                )}
            </main >

            {/* Purchase Modal - Themed */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-sm w-full rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-2 ${theme.primary}`} />

                        <div className="text-center">
                            <div className={`w-16 h-16 mx-auto rounded-full ${theme.light} mb-4 flex items-center justify-center`}>
                                <span className="text-2xl">📱</span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">Confirm Purchase</h3>
                            <p className="text-gray-500 mt-2">Buying <span className={`font-bold ${theme.primary.replace('bg-', 'text-')}`}>{selectedProduct.name}</span></p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Price</span>
                                <span className="text-xl font-bold">₵{selectedProduct.price}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Data</span>
                                <span className="text-sm font-bold">{selectedProduct.dataAmount}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Beneficiary Number</label>
                            <input
                                type="tel"
                                placeholder="05XXXXXXXX"
                                value={beneficiary}
                                onChange={(e) => setBeneficiary(e.target.value)}
                                className={`w-full p-4 border-2 border-gray-100 rounded-xl outline-none font-mono text-lg transition-colors focus:border-${theme.primary.replace('bg-', '')} focus:ring-4 focus:ring-${theme.primary.replace('bg-', '')}/10`}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setSelectedProduct(null)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 text-gray-600 transition-colors">Cancel</button>
                            <button onClick={handleBuy} disabled={loading} className={`flex-1 py-4 rounded-xl font-bold shadow-lg ${theme.primary} ${theme.text} ${theme.hover} disabled:opacity-50`}>
                                {loading ? 'Processing...' : 'Pay Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
