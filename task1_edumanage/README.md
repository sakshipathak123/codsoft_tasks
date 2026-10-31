# EduManage – Student Management System

A full-stack education management platform for managing students, teachers, attendance, examinations and fees, with role-based dashboards for admins, teachers and students. It replaces manual, paper-based student records with one digital system.

**Stack:** Next.js 14 (App Router) · Node.js · PostgreSQL · Prisma · JWT auth (httpOnly cookie) · bcrypt

## Features
- Login with three roles: **Admin**, **Teacher**, **Student**
- Admin: add/remove students, record fees, plus everything a teacher can do
- Teacher: mark attendance and enter exam scores
- Student: read-only view of their own attendance, marks and fees
- Permissions are enforced on the server in `app/api/[resource]/route.js`, not only in the UI

## Setup
```bash
git clone <your-repo-url> && cd edumanage
npm install
cp .env.example .env      # set DATABASE_URL and JWT_SECRET
npx prisma db push        # create tables
npm run db:seed           # demo data
npm run dev               # http://localhost:3000
```
Demo logins (password `password123`): `admin@edu.com`, `teacher@edu.com`, `student1@edu.com`

## Project structure
```
prisma/schema.prisma      data models (User, Student, Attendance, Mark, Fee)
app/api/[resource]/       one REST route for students, attendance, marks, fees
app/api/auth/             login and logout
app/dashboard/Dash.js     role-aware dashboard UI
lib/                      Prisma client and JWT helpers
```

## Ideas to extend
Teacher profiles and subjects, edit forms, pagination and search, fee receipts (PDF), deployment on Vercel + Neon/Supabase.
