
import axios from 'axios';

async function testLogin() {
    try {
        console.log("Attempting login via script...");
        const res = await axios.post('http://localhost:3000/auth/login', {
            email: 'prosperwedam4424@gmail.com',
            password: 'password'
        }, {
            withCredentials: true // Important for cookies, though meaningless in node script without a jar
        });

        console.log("Login Status:", res.status);
        console.log("Login Data:", res.data);
        console.log("Headers:", res.headers['set-cookie']);
    } catch (error: any) {
        console.error("Login Failed:", error.response?.status, error.response?.data);
    }
}

testLogin();
