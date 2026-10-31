# DineDesk – Restaurant Ordering Platform

A restaurant ordering and table management system. Customers browse the digital menu, place orders, reserve tables and track their order live. Kitchen staff manage incoming orders from a dedicated dashboard, and admins manage the menu.

**Stack:** Next.js 14 (App Router) · Node.js · PostgreSQL · Prisma · Tailwind CSS · JWT auth (httpOnly cookie) · bcrypt

## Features
- **Customer:** sign up, browse menu, build a cart, place an order, pay (demo), track status (placed → preparing → ready → completed, refreshes every 5 s), book a table
- **Kitchen:** see all orders and move each one through the stages
- **Admin:** add menu items, hide or show items, view all orders and reservations
- Table booking assigns the smallest free table that fits the party and blocks double-booking within a 2-hour window
- Permissions are enforced on the server in `app/api/[resource]/route.js`

> Payment is simulated: "Pay now" only marks the order as paid. No real payment gateway is connected.

## Setup
```bash
npm install
cp .env.example .env      # set DATABASE_URL and JWT_SECRET
npx prisma db push        # create tables
npm run db:seed           # demo menu, tables and users
npm run dev               # http://localhost:3000
```
Demo logins (password `password123`): `admin@dine.com`, `kitchen@dine.com`, `customer@dine.com`

## Structure
```
prisma/schema.prisma      User, MenuItem, Order, OrderItem, DiningTable, Reservation
app/api/auth/[action]/    login, register, logout
app/api/[resource]/       menu, orders, reservations
app/dashboard/Dash.js     role-based dashboard
```
