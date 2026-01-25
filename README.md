
# KemichNet - VTU & Data Bundle Platform

KemichNet is a modern web application for purchasing data bundles and airtime (VTU). It features a secure authentication system, Paystack payment integration, and automated fulfillment via the WireNet API.

## 🚀 Features

-   **User Authentication**: Secure Login/Registration with Passport.js & bcrypt.
-   **Dashboard**: Customer dashboard to view products, buy bundles, and view order history.
-   **Bulk Purchase**: Ability to buy data for multiple numbers at once.
-   **Admin Panel**: Manage users, products, and view all orders.
-   **Payments**: Integrated Paystack Gateway for secure payments.
-   **Order Fulfillment**: Automated order placement to WireNet API upon successful payment.
-   **Real-time Updates**: Order status polling and updates.

## 🛠️ Tech Stack

### Frontend (Client)
-   **Framework**: React (Vite)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **State/Routing**: React Router DOM

### Backend (Server)
-   **Runtime**: Node.js
-   **Framework**: Express
-   **Language**: TypeScript
-   **Database**: PostgreSQL
-   **ORM**: Drizzle ORM
-   **Authentication**: Passport.js (Session-based)

## 📦 Installation & Setup

### Prerequisites
-   Node.js (v18+)
-   PostgreSQL Database

### 1. Clone the Repository
```bash
git clone https://github.com/Wirelextechs/kemichnet.git
cd kemichnet
```

### 2. Setup Server
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:
```env
DATABASE_URL=postgres://user:password@localhost:5432/kemichnet
PORT=3000
SESSION_SECRET=your_secret_key
PAYSTACK_SECRET_KEY=sk_test_xxxx...
WIRENET_API_KEY=wirenet_live_xxxx...
```

Run Database Migrations:
```bash
npx drizzle-kit push
```

Start Development Server:
```bash
npm run dev
```

### 3. Setup Client
Open a new terminal:
```bash
cd client
npm install
npm run dev
```

The application should now be running at `http://localhost:5173`.

## 📂 Project Structure

```
KemichNet/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── pages/          # Application Pages
│   │   ├── components/     # Reusable Components
│   │   └── lib/            # Utilities & API Client
│
├── server/                 # Express Backend
│   ├── src/
│   │   ├── db/             # Database Schema (Drizzle)
│   │   ├── routes/         # API Routes
│   │   ├── services/       # External Services (Paystack, WireNet)
│   │   └── auth/           # Passport Auth Config
│   ├── scripts/            # Utility Scripts (Seeds, Fixes)
```

## 🔐 API Reference (Key Endpoints)

-   `POST /auth/login` - User Login
-   `POST /auth/register` - User Registration
-   `POST /api/orders/init` - Initialize Single Order
-   `POST /api/orders/bulk-init` - Initialize Bulk Order
-   `POST /api/orders/verify` - Verify Payment & Fulfill
-   `GET /api/products` - List Products