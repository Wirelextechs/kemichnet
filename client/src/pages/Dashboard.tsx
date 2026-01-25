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

    const filteredProducts = products.filter(p => p.serviceType === activeTab);

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

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-primary">KemichNet</h1>
                    <button onClick={() => { api.post('/auth/logout'); navigate('/login'); }} className="text-sm text-red-500">Logout</button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-8">
                {/* View Selection (Tabs) */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6 w-fit">
                    <button
                        onClick={() => setActiveView('single')}
                        className={clsx("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeView === 'single' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        Single Purchase
                    </button>
                    <button
                        onClick={() => setActiveView('bulk')}
                        className={clsx("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeView === 'bulk' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        Bulk Purchase
                    </button>
                    <button
                        onClick={() => setActiveView('history')}
                        className={clsx("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeView === 'history' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        Order History
                    </button>
                </div>

                {/* Service Selection (Only for Buying Views) */}
                {activeView !== 'history' && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {['MTN_UP2U', 'MTN_EXPRESS', 'AT', 'TELECEL'].map(service => (
                            <button
                                key={service}
                                onClick={() => setActiveTab(service)}
                                className={clsx(
                                    "px-6 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors",
                                    activeTab === service ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                {service.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                )}

                {/* VIEW: Single Purchase */}
                {activeView === 'single' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                                    <div className="text-3xl font-bold text-primary mt-2">{product.dataAmount}</div>
                                </div>
                                <div className="mt-6 flex items-center justify-between">
                                    <span className="text-xl font-bold">GHS {product.price}</span>
                                    <button
                                        onClick={() => setSelectedProduct(product)}
                                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && <div className="col-span-full text-center py-10 text-gray-400">No products available in this category.</div>}
                    </div>
                )}

                {/* VIEW: Bulk Purchase */}
                {activeView === 'bulk' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold mb-2">Paste Numbers</h3>
                            <p className="text-sm text-gray-500 mb-4">Format: <code className="bg-gray-100 px-1 rounded">Phone Amount</code> (e.g. 0551234567 1)</p>
                            <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                className="w-full h-64 border rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder={`0551234567 1\n0240000000 2.5`}
                            />
                            <button onClick={processBulkInput} className="mt-4 w-full py-2 bg-gray-900 text-white rounded-lg">Process List</button>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="font-bold mb-4">Order Summary</h3>
                            <div className="flex-1 overflow-y-auto max-h-64 border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="p-2">Phone</th>
                                            <th className="p-2">Data</th>
                                            <th className="p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bulkOrders.map((o, i) => (
                                            <tr key={i} className={o.valid ? "bg-white" : "bg-red-50"}>
                                                <td className="p-2">{o.phone}</td>
                                                <td className="p-2">{o.amount}GB</td>
                                                <td className="p-2 text-xs">
                                                    {o.valid ? <span className="text-green-600 font-bold">OK (₵{o.price})</span> : <span className="text-red-600">{o.error}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        {bulkOrders.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400">No data processed</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-gray-500">Valid Orders: {bulkOrders.filter(o => o.valid).length}</div>
                                    <div className="text-xl font-bold">Total: GHS {bulkOrders.filter(o => o.valid).reduce((sum, o) => sum + parseFloat(o.price as any), 0).toFixed(2)}</div>
                                </div>
                                <button onClick={handleBulkBuy} disabled={bulkOrders.filter(o => o.valid).length === 0} className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">Pay Bulk</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: History */}
                {activeView === 'history' && (
                    <section>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                            <h2 className="text-lg font-bold">Recent Orders</h2>
                            <div className="flex gap-2 w-full md:w-auto">
                                <input
                                    type="text"
                                    placeholder="Search orders..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border rounded-lg px-3 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-primary outline-none"
                                />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PAID">Paid</option>
                                    <option value="PROCESSING">Processing</option>
                                    <option value="FULFILLED">Fulfilled</option>
                                    <option value="FAILED">Failed</option>
                                </select>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="p-4">Service</th>
                                        <th className="p-4">Number</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrders.map(order => (
                                        <tr key={order.id}>
                                            <td className="p-4 font-medium">{order.serviceType}</td>
                                            <td className="p-4">{order.beneficiaryPhone}</td>
                                            <td className="p-4">GHS {order.amount}</td>
                                            <td className="p-4">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-xs font-bold",
                                                    order.status === 'FULFILLED' ? "bg-green-100 text-green-700" :
                                                        order.status === 'FAILED' ? "bg-red-100 text-red-700" :
                                                            "bg-yellow-100 text-yellow-700"
                                                )}>{order.status}</span>
                                            </td>
                                            <td className="p-4 text-gray-500">{new Date(order.createdAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main >

            {/* Purchase Modal */}
            {
                selectedProduct && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white max-w-sm w-full rounded-2xl p-6 space-y-4">
                            <h3 className="text-xl font-bold">Confirm Purchase</h3>
                            <p className="text-gray-600">You are buying <span className="font-bold">{selectedProduct.name}</span> for <span className="font-bold">{selectedProduct.price} GHS</span></p>

                            <div>
                                <label className="block text-sm font-medium mb-1">Beneficiary Number</label>
                                <input
                                    type="tel"
                                    placeholder="05XXXXXXXX"
                                    value={beneficiary}
                                    onChange={(e) => setBeneficiary(e.target.value)}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setSelectedProduct(null)} className="flex-1 py-3 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                                <button onClick={handleBuy} disabled={loading} className="flex-1 py-3 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                                    {loading ? 'Processing...' : 'Pay'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
