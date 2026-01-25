
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Verify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Verifying payment...');

    useEffect(() => {
        const reference = searchParams.get('reference');
        if (!reference) {
            setStatus('No payment reference found.');
            return;
        }
        verify(reference);
    }, [searchParams]);

    const verify = async (ref: string) => {
        try {
            const res = await api.post('/api/orders/verify', { reference: ref });
            setStatus(`Success! ${res.data.message}`);
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        } catch (err: any) {
            console.error(err);
            setStatus(`Verification Failed: ${err.response?.data?.message || err.message}`);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
            <h2 className="text-2xl font-bold">Payment Verification</h2>
            <p className="text-gray-600">{status}</p>
        </div>
    );
}
