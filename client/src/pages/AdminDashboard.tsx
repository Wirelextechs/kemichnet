import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, Plus, Shield, User, BarChart3, Search, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Interfaces ---
interface Order {
    id: number;
    userId: number;
    status: string;
    serviceType: string;
    amount: string;
    createdAt: string;
    beneficiaryPhone: string;
    paymentReference: string;
}

interface Product {
    id: number;
    name: string;
    serviceType: string;
    price: string;
    dataAmount: string;
    wirenetPackageId?: number;
    costPrice?: string;
    isActive: boolean;
}

interface UserData {
    id: number;
    email: string;
    role: string;
    createdAt: string;
}

interface StatsData {
    revenue: number;
    totalOrders: number;
    failedOrders: number;
    period: string;
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'reports'>('orders');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-gray-900 text-white shadow-sm p-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">KemichNet <span className="text-xs bg-red-600 px-2 py-0.5 rounded ml-2">ADMIN</span></h1>
                    <div className="flex gap-4 text-sm">
                        <button onClick={() => navigate('/dashboard')} className="hover:text-gray-300">User View</button>
                        <button onClick={() => { api.post('/auth/logout'); navigate('/login'); }} className="text-red-400 hover:text-red-300">Logout</button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
                    <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="Orders" />
                    <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} label="Products & Packages" />
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Customers" />
                    <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label="Reports & Analytics" />
                </div>

                <div className="min-h-[400px]">
                    {activeTab === 'orders' && <OrdersTab />}
                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'users' && <UsersTab />}
                    {activeTab === 'reports' && <ReportsTab />}
                </div>

            </main>
        </div>
    );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative top-[1px] whitespace-nowrap",
                active ? "bg-white text-primary border border-gray-200 border-b-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
        >
            {label}
        </button>
    );
}

// --- Theme Helper ---
function getTheme(service: string) {
    if (service && service.includes('MTN')) return {
        primary: 'bg-[#FFCC00]',
        text: 'text-black',
        subtext: 'text-gray-800',
        border: 'border-[#FFCC00]',
        light: 'bg-[#FFCC00]/10',
        badge: 'bg-[#FFCC00] text-black',
        gradient: 'from-[#FFCC00]/20 to-transparent'
    };
    if (service === 'TELECEL') return {
        primary: 'bg-[#E42320]',
        text: 'text-white',
        subtext: 'text-red-100',
        border: 'border-[#E42320]',
        light: 'bg-[#E42320]/10',
        badge: 'bg-[#E42320] text-white',
        gradient: 'from-[#E42320]/20 to-transparent'
    };
    if (service === 'AT') return {
        primary: 'bg-[#0056B3]',
        text: 'text-white',
        subtext: 'text-blue-100',
        border: 'border-[#0056B3]',
        light: 'bg-[#0056B3]/10',
        badge: 'bg-[#0056B3] text-white',
        gradient: 'from-[#0056B3]/20 to-transparent'
    };
    return {
        primary: 'bg-primary',
        text: 'text-white',
        subtext: 'text-gray-200',
        border: 'border-primary',
        light: 'bg-primary/10',
        badge: 'bg-primary text-white',
        gradient: 'from-primary/20 to-transparent'
    };
}

// --- SUB-COMPONENTS ---

function ReportsTab() {
    const [period, setPeriod] = useState('all_time');
    const [customDate, setCustomDate] = useState('');
    const [stats, setStats] = useState<StatsData | null>(null);
    const [chartData, setChartData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    useEffect(() => {
        fetchData();
    }, [period, customDate]);

    const fetchData = async () => {
        try {
            const params = { period, date: customDate };
            const [statsRes, chartRes, topRes] = await Promise.all([
                api.get('/api/reports/stats', { params }),
                api.get('/api/reports/sales-chart', { params }),
                api.get('/api/reports/top-products', { params })
            ]);
            setStats(statsRes.data);
            setChartData(chartRes.data.map((d: any) => ({ ...d, revenue: parseFloat(d.revenue), time: new Date(d.time_point).toLocaleDateString() })));
            setTopProducts(topRes.data);
        } catch (error) { console.error('Error fetching reports', error); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 size={20} /> Sales Analytics</h2>
                <div className="flex flex-wrap gap-2 items-center">
                    <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border p-2 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-primary outline-none">
                        <option value="all_time">All Time</option>
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                        <option value="hourly">Hourly (Today)</option>
                        <option value="specific">Specific Date</option>
                    </select>
                    {period === 'specific' && (
                        <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="border p-2 rounded-lg text-sm" />
                    )}
                    <button onClick={fetchData} className="p-2 bg-primary text-white rounded-lg hover:opacity-90"><Calendar size={18} /></button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500 font-medium">Total Sales ({period.replace('_', ' ')})</div>
                        <div className="text-3xl font-bold text-gray-900 mt-2">GHS {stats.revenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500 font-medium">Successful Orders</div>
                        <div className="text-3xl font-bold text-green-600 mt-2">{stats.totalOrders}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500 font-medium">Failed Attempts</div>
                        <div className="text-3xl font-bold text-red-600 mt-2">{stats.failedOrders}</div>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                    <h3 className="font-bold mb-6">Revenue Trend</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(Val) => `₵${Val}`} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-4">Top Packages</h3>
                    <div className="space-y-4">
                        {topProducts.map((p: any, i) => (
                            <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                <div>
                                    <div className="font-medium">{p.service_type}</div>
                                    <div className="text-xs text-gray-500">₵{p.amount} Bundle</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{p.sales_count} sold</div>
                                    <div className="text-xs text-green-600">₵{p.total_revenue}</div>
                                </div>
                            </div>
                        ))}
                        {topProducts.length === 0 && <div className="text-gray-400 text-sm">No data available</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function OrdersTab() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/orders/all-orders')
            .then(res => setOrders(res.data))
            .finally(() => setLoading(false));
    }, []);

    const filteredOrders = orders.filter(order => statusFilter === 'ALL' || order.status === statusFilter);

    if (loading) return <div>Loading orders...</div>;

    return (
        <div>
            <div className="flex justify-end mb-4">
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">User</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Service</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50/50">
                                <td className="p-4 text-gray-500">#{order.id}</td>
                                <td className="p-4 text-xs">User {order.userId}<br /><span className="text-gray-400">{order.paymentReference}</span></td>
                                <td className="p-4 font-mono">{order.beneficiaryPhone}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getTheme(order.serviceType).badge.replace('text-', 'text-xs text-')}`}>
                                        {order.serviceType.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4">GHS {order.amount}</td>
                                <td className="p-4">
                                    <span className={clsx("px-2 py-1 rounded text-xs font-bold",
                                        order.status === 'FULFILLED' ? "bg-green-100 text-green-700" :
                                            order.status === 'FAILED' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                                    )}>{order.status}</span>
                                </td>
                                <td className="p-4 text-gray-500">{new Date(order.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProductsTab() {
    const [products, setProducts] = useState<Product[]>([]);
    const [editing, setEditing] = useState<Product | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<{ name: string, serviceType: string, price: string, dataAmount: string, wirenetPackageId?: any, costPrice?: string }>({ name: '', serviceType: 'MTN_UP2U', price: '', dataAmount: '', wirenetPackageId: '', costPrice: '' });

    // WireNet Sync State
    const [showSync, setShowSync] = useState(false);
    const [wirenetPackages, setWirenetPackages] = useState<any[]>([]);
    const [loadingSync, setLoadingSync] = useState(false);
    const [globalProfit, setGlobalProfit] = useState('5');
    const [profitMap, setProfitMap] = useState<Record<string, string>>({});
    const [isImportingAll, setIsImportingAll] = useState(false);

    const formRef = useRef<HTMLDivElement>(null);

    const fetchProducts = () => {
        api.get('/api/products')
            .then(res => {
                if (Array.isArray(res.data)) {
                    setProducts(res.data);
                } else {
                    console.error("API returned non-array:", res.data);
                    setProducts([]);
                }
            })
            .catch(err => console.error(err));
    };

    useEffect(() => { fetchProducts(); }, []);

    const fetchWirenetPackages = async () => {
        setLoadingSync(true);
        try {
            const res = await api.get('/api/products/wirenet-list');
            const packages = res.data;
            setWirenetPackages(packages);

            // Initialize profit map
            const initialProfits: Record<string, string> = {};
            packages.forEach((pid: any) => initialProfits[pid.id] = globalProfit);
            setProfitMap(initialProfits);

            setShowSync(true);
        } catch (error) { alert("Failed to fetch WireNet packages"); }
        setLoadingSync(false);
    };

    const handleGlobalProfitChange = (val: string) => {
        setGlobalProfit(val);
        // Bulk update all
        const newMap: Record<string, string> = {};
        wirenetPackages.forEach(p => newMap[p.id] = val);
        setProfitMap(newMap);
    };

    const handleIndividualProfitChange = (id: string, val: string) => {
        setProfitMap(prev => ({ ...prev, [id]: val }));
    };

    const importPackage = async (pkg: any, profit: string, customCost?: string) => {
        const cost = customCost || String(pkg.price);
        const sellingPrice = (parseFloat(cost) + parseFloat(profit || '0')).toFixed(2);

        const provider = pkg.provider?.toLowerCase() || '';
        let svc = 'MTN_UP2U'; // Default fallback
        if (provider === 'datagod') svc = 'MTN_UP2U';
        if (provider === 'fastnet') svc = 'MTN_EXPRESS';
        if (provider === 'at') svc = 'AT';
        if (provider === 'telecel') svc = 'TELECEL';

        const payload = {
            name: pkg.delivery_time ? `${pkg.name} - ${pkg.delivery_time}` : pkg.name,
            serviceType: svc,
            price: sellingPrice,
            costPrice: cost,
            dataAmount: pkg.name,
            wirenetPackageId: pkg.id
        };

        return api.post('/api/products', payload);
    };

    const handleImport = async (pkg: any, profit: string, customCost: string) => {
        try {
            await importPackage(pkg, profit, customCost);
            alert(`Imported ${pkg.name}!`);
            fetchProducts();
        } catch (error) { alert("Failed to import"); }
    };

    const handleImportAll = async () => {
        if (!confirm(`Are you sure you want to import ALL ${wirenetPackages.length} packages?`)) return;
        setIsImportingAll(true);
        let successCount = 0;
        let failCount = 0;
        let firstError = "";

        for (const pkg of wirenetPackages) {
            try {
                // Use the specific profit for this package from the map
                const profitToUse = profitMap[pkg.id] || globalProfit;
                await importPackage(pkg, profitToUse);
                successCount++;
            } catch (err: any) {
                failCount++;
                const msg = err.response?.data?.message || err.message;
                console.error(`Failed to import ${pkg.name}:`, msg);
                if (!firstError) firstError = msg;
            }
        }

        setIsImportingAll(false);
        alert(`Master Import Complete!\nSuccess: ${successCount}\nFailed: ${failCount}\n\nFirst Error: ${firstError}`);
        fetchProducts();
        setShowSync(false);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/api/products/${editing.id}`, formData);
            } else {
                await api.post('/api/products', formData);
            }
            setIsCreating(false);
            setEditing(null);
            fetchProducts();
            setFormData({ name: '', serviceType: 'MTN_UP2U', price: '', dataAmount: '', wirenetPackageId: '', costPrice: '' });
        } catch (err: any) { alert(`Failed: ${err.response?.data?.message || err.message}`); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        try { await api.delete(`/api/products/${id}`); fetchProducts(); } catch (err) { alert('Failed'); }
    };

    const scrollToForm = () => {
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    if (showSync) {
        // Group packages by provider
        const groupedPackages = wirenetPackages.reduce((acc: any, pkg: any) => {
            const provider = pkg.provider || 'others';
            if (!acc[provider]) acc[provider] = [];
            acc[provider].push(pkg);
            return acc;
        }, {});

        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 py-2 border-b">
                    <h3 className="text-xl font-bold">Import from WireNet</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border">
                            <span className="text-sm font-medium whitespace-nowrap">Global Profit:</span>
                            <div className="flex items-center gap-0.5">
                                <span className="text-xs text-gray-500">₵</span>
                                <input
                                    type="number"
                                    value={globalProfit}
                                    onChange={(e) => handleGlobalProfitChange(e.target.value)}
                                    className="w-16 bg-transparent outline-none text-sm font-bold text-center"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleImportAll}
                            disabled={isImportingAll}
                            className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
                        >
                            {isImportingAll ? 'Importing...' : 'Import All Packages'}
                        </button>
                        <button onClick={() => setShowSync(false)} className="text-sm bg-gray-100 px-3 py-1 rounded">Close</button>
                    </div>
                </div>

                {Object.entries(groupedPackages).map(([provider, pkgs]) => (
                    <div key={provider} className="mb-6">
                        <h4 className="font-bold text-base capitalize mb-2 text-primary">{provider} Packages</h4>
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase tracking-tighter">
                                    <tr className="border-b">
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Package</th>
                                        <th className="p-3">Cost</th>
                                        <th className="p-3">Profit</th>
                                        <th className="p-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(pkgs as any[]).map((pkg: any) => (
                                        <WireNetRow
                                            key={`${provider}-${pkg.id}`}
                                            pkg={pkg}
                                            onImport={handleImport}
                                            profit={profitMap[pkg.id] ?? globalProfit}
                                            onProfitChange={(val) => handleIndividualProfitChange(pkg.id, val)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Manage Packages</h2>
                <div className="flex gap-2">
                    <button onClick={fetchWirenetPackages} disabled={loadingSync} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                        {loadingSync ? 'Loading...' : 'Sync WireNet'}
                    </button>
                    <button onClick={() => { setIsCreating(true); setEditing(null); scrollToForm(); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">
                        <Plus size={16} /> Add Package
                    </button>
                </div>
            </div>

            {(isCreating || editing) && (
                <div ref={formRef} className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
                    <h3 className="font-bold mb-4">{editing ? 'Edit Package' : 'New Package'}</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className="border p-2 rounded" placeholder="Package Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <select className="border p-2 rounded" value={formData.serviceType} onChange={e => setFormData({ ...formData, serviceType: e.target.value })}>
                            <option value="MTN_UP2U">MTN UP2U</option>
                            <option value="MTN_EXPRESS">MTN EXPRESS</option>
                            <option value="AT">AT</option>
                            <option value="TELECEL">TELECEL</option>
                        </select>
                        <input className="border p-2 rounded" placeholder="Selling Price (GHS)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                        <input
                            className="border p-2 rounded disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Cost Price (GHS)"
                            type="number"
                            step="0.01"
                            value={formData.costPrice || ''}
                            onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                            disabled={!!formData.wirenetPackageId}
                            title={formData.wirenetPackageId ? "Managed by WireNet Sync" : ""}
                        />
                        <input className="border p-2 rounded" placeholder="Data (1000MB)" value={formData.dataAmount} onChange={e => setFormData({ ...formData, dataAmount: e.target.value })} required />

                        <div className="col-span-full flex gap-2 justify-end mt-2">
                            <button type="button" onClick={() => { setIsCreating(false); setEditing(null); }} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-black text-white rounded">Save</button>
                        </div>
                    </form>
                </div>
            )}

            {products.length === 0 && !loadingSync && (
                <div className="p-8 text-center text-gray-500 border border-dashed rounded-xl mt-8">
                    <p>No packages found.</p>
                    <p className="text-xs mt-2">Click "Sync WireNet" or "Add Package" to get started.</p>
                </div>
            )}

            {['MTN_UP2U', 'MTN_EXPRESS', 'AT', 'TELECEL'].map(service => {
                const serviceProducts = products.filter(p => p.serviceType === service);
                if (serviceProducts.length === 0) return null;
                const theme = getTheme(service);

                return (
                    <div key={service} className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className={`text-lg font-black tracking-tight uppercase ${theme.primary.replace('bg-', 'text-')}`}>{service.replace('_', ' ')}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${theme.light} ${theme.primary.replace('bg-', 'text-')}`}>{serviceProducts.length} packages</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {serviceProducts.map(p => (
                                <div key={p.id} className={`bg-white p-1.5 pl-2.5 rounded-lg border-l-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow ${theme.border} border-y-gray-100 border-r-gray-100 border-t border-r border-b group`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h4 className="font-bold text-xs text-gray-900 truncate max-w-[150px]">{p.name}</h4>
                                        <div className={`font-black text-xs px-1.5 py-0.5 rounded ${theme.light} ${theme.primary.replace('bg-', 'text-')}`}>
                                            ₵{p.price}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditing(p); setFormData({ name: p.name, price: p.price, dataAmount: p.dataAmount, serviceType: p.serviceType, wirenetPackageId: p.wirenetPackageId, costPrice: p.costPrice }); scrollToForm(); }} className={`p-1.5 rounded-md transition-colors ${theme.light} ${theme.primary.replace('bg-', 'text-')} hover:opacity-80`}><Edit size={12} /></button>
                                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function WireNetRow({ pkg, onImport, profit, onProfitChange }: { pkg: any, onImport: (p: any, profit: string, cost: string) => void, profit: string, onProfitChange: (v: string) => void }) {
    return (
        <tr className="border-b last:border-0 hover:bg-gray-50">
            <td className="p-3">{pkg.id}</td>
            <td className="p-3 font-medium">{pkg.name} <span className="text-xs text-gray-400 block">{pkg.delivery_time}</span></td>
            <td className="p-3">
                <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-xs">₵</span>
                    <span className="text-sm font-bold text-gray-700">{pkg.price}</span>
                </div>
            </td>
            <td className="p-3">
                <input
                    type="number"
                    value={profit}
                    onChange={(e) => onProfitChange(e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-sm bg-white"
                    placeholder="Profit"
                />
            </td>
            <td className="p-3">
                <button
                    onClick={() => onImport(pkg, profit, String(pkg.price))}
                    className="text-xs bg-black text-white px-3 py-1.5 rounded hover:opacity-80"
                >
                    Import (₵{(parseFloat(String(pkg.price) || '0') + parseFloat(profit || '0')).toFixed(2)})
                </button>
            </td>
        </tr>
    );
}

function UsersTab() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [search, setSearch] = useState('');

    const fetchUsers = () => { api.get('/api/users').then(res => setUsers(res.data)); };
    useEffect(() => { fetchUsers(); }, []);

    const toggleRole = async (user: UserData) => {
        if (!confirm(`Promote/Demote ${user.email}?`)) return;
        try { await api.put(`/api/users/${user.id}`, { role: user.role === 'admin' ? 'customer' : 'admin' }); fetchUsers(); } catch (err) { alert('Failed'); }
    };
    const handleDelete = async (id: number) => {
        if (!confirm('Delete user?')) return;
        try { await api.delete(`/api/users/${id}`); fetchUsers(); } catch (err) { alert('Failed'); }
    };

    const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toString().includes(search));

    return (
        <div>
            <div className="flex justify-between items-center mb-4 gap-4">
                <h2 className="text-lg font-bold">Customer Accounts</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="text" placeholder="Search by email or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm w-64" />
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Joined</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50/50">
                                <td className="p-4 text-gray-500">#{u.id}</td>
                                <td className="p-4 font-medium">{u.email}</td>
                                <td className="p-4">
                                    {u.role === 'admin'
                                        ? <span className="flex items-center gap-1 text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-xs font-bold w-fit"><Shield size={12} /> Admin</span>
                                        : <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs font-bold w-fit"><User size={12} /> Customer</span>
                                    }
                                </td>
                                <td className="p-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 flex gap-2 justify-end">
                                    <button onClick={() => toggleRole(u)} className="text-xs border px-2 py-1 rounded hover:bg-gray-50">Change Role</button>
                                    <button onClick={() => handleDelete(u.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
