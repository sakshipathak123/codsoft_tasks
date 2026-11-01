# MarketHub – Multi-Vendor E-Commerce Marketplace

A marketplace where customers shop from many sellers, vendors manage their own products and orders, delivery partners complete deliveries, and admins see sales and commission.

**Stack:** Next.js 14 (frontend) · NestJS (API) · PostgreSQL · Prisma · Redis (optional cache) · AWS S3 (optional image uploads)

## Features
- **Customer:** search products from all sellers, compare up to 3 products side by side, order, pay (demo), track each item (placed → shipped → delivered)
- **Vendor:** sign up as a seller, add products with images, edit price, stock and promotion %, ship orders, see earnings after commission
- **Delivery partner:** see shipped items and mark them delivered
- **Admin:** total sales, commission earned, order and user counts
- **Separated data:** every order item stores its own vendor, price and 10% commission, and vendors can only change their own products and items
- **Safe stock:** stock is reduced inside a database transaction with a `stock >= qty` check, so the last unit can't be sold twice
- **Role-based access:** one `AuthGuard` + `@Roles()` decorator in `backend/src/auth.ts`

> Payment is simulated ("Pay" marks the order paid). Redis and S3 switch on only when their values are in `.env`.

## Run it
You need Node.js 18+ and PostgreSQL.
```bash
# 1. API
cd backend
npm install
cp .env.example .env      # set DATABASE_URL and JWT_SECRET
npx prisma db push
npm run db:seed
npm run dev               # http://localhost:4000

# 2. Website (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```
Demo logins (password `password123`): `customer@market.com`, `vendor1@market.com`, `delivery@market.com`, `admin@market.com`

## Structure
```
backend/prisma/schema.prisma   User, Product, Order, OrderItem
backend/src/app.controller.ts  all API routes, grouped by role
backend/src/auth.ts            JWT + role guard
backend/src/services.ts        Prisma and optional Redis cache
frontend/app/page.js           role-based UI
```
