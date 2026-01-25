import axios from 'axios';


export const initializePayment = async (email: string, amount: number, reference: string, callbackUrl?: string) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Paystack Secret Key is missing");

    try {
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email,
            amount: amount * 100, // Paystack takes kobo/pesewas
            reference,
            callback_url: callbackUrl
        }, {
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error: any) {
        console.error("Paystack init error:", error.response?.data || error);
        throw new Error("Payment initialization failed");
    }
};

export const verifyPayment = async (reference: string) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Paystack Secret Key is missing");

    try {
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${secretKey}`
            }
        });
        return response.data;
    } catch (error: any) {
        console.error("Paystack verification error:", error.response?.data || error);
        throw new Error("Payment verification failed");
    }
};
