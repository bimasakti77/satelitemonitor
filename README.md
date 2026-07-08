# SuperApps Executive Monitoring System

Production-ready executive dashboard for monitoring SuperApps development roadmap across all UKE I (Unit Kerja Eselon I).

## Tech Stack

- **Next.js 15+** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **PostgreSQL** + **Prisma ORM**
- **Recharts** for analytics
- **React Hook Form** + **Zod** validation
- **Server Actions** for mutations
- **JWT** session authentication

## Features

- **Authentication** — Administrator, Operator UKE, Executive (read-only)
- **Dashboard** — KPI cards and 6 interactive charts
- **Master Data** — CRUD for UKE, Kelompok Layanan, Existing Applications
- **Service Management** — Full CRUD with search, filter, pagination, sorting
- **Spreadsheet Import** — Excel upload with preview, duplicate detection, rollback
- **Service History** — GitHub-style timeline for every change
- **Executive Report** — Printable PDF with KPIs and progress
- **Audit Log** — Complete user activity tracking
- **Notification Center** — Real-time service change alerts
- **Dark Mode** — Premium Vercel/Linear-inspired UI

## Docker (Recommended)

Pastikan **Docker Desktop** sudah berjalan.

```bash
# 1. Salin env Docker
cp .env.docker .env

# 2. Jalankan development (hot reload + PostgreSQL)
npm run docker:up

# 3. Buka aplikasi
# http://localhost:3000
```

### Perintah Docker

| Perintah | Fungsi |
|----------|--------|
| `npm run docker:up` | Build & jalankan (dev mode) |
| `npm run docker:down` | Stop semua container |
| `npm run docker:logs` | Lihat log aplikasi |
| `npm run docker:restart` | Restart container |
| `npm run docker:seed` | Jalankan ulang seed data |
| `npm run docker:shell` | Masuk ke shell container |
| `npm run docker:prod` | Jalankan mode production |
| `npm run docker:prod:down` | Stop production stack |

### Mode Production

```bash
cp .env.docker .env
npm run docker:prod
```

### Login Default

| Email | Password |
|-------|----------|
| admin@kemenkumham.go.id | password123 |

---

## Manual Setup (tanpa Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET in .env

# Create database and run migrations
npm run db:push

# Seed sample data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@kemenkumham.go.id | password123 | Administrator |
| executive@kemenkumham.go.id | password123 | Executive |
| operator-{kode-uke}@kemenkumham.go.id | password123 | Operator UKE (per UKE I) |

Contoh operator UKE: `operator-itjen@kemenkumham.go.id`, `operator-bsk@kemenkumham.go.id`, `operator-setjen@kemenkumham.go.id`, dan seterusnya untuk setiap kode UKE.

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles |
| `uke` | Unit Kerja Eselon I |
| `service_groups` | Kelompok Layanan |
| `applications` | Existing Applications |
| `services` | Service records |
| `service_histories` | Change history per service |
| `audit_logs` | User activity log |
| `imports` | Spreadsheet import records |
| `notifications` | System notifications |

## Excel Import Format

| Column | Required | Example |
|--------|----------|---------|
| External ID | No | SRV-001 |
| UKE | Yes | DITJEN_PP |
| Kelompok Layanan | Yes | LAY-PUBLIK |
| Nama Layanan | Yes | Pendaftaran Kunjungan |
| Tahun Pekerjaan | Yes | 2025 |
| Internal/Eksternal | Yes | Internal |
| Tipe Internal | No | Web |
| Sudah SuperApps | No | Ya |
| Kesiapan Integrasi | No | Q1 |
| Existing Application | No | SIPP |
| Detail Aplikasi | No | ... |
| Uraian | No | ... |
| Keterangan | No | ... |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected routes
│   ├── login/           # Auth page
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── dashboard/       # Charts & KPI cards
│   ├── services/        # Service management
│   ├── master/          # Master data tables
│   └── layout/          # Sidebar, headers
├── lib/
│   ├── actions/         # Server Actions
│   ├── validations/     # Zod schemas
│   ├── auth.ts          # JWT session
│   └── prisma.ts        # DB client
prisma/
├── schema.prisma
└── seed.ts
```

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:migrate   # Run migrations
npm run db:seed      # Seed sample data
npm run db:studio    # Prisma Studio
```

## License

Internal use — Kemenkumham
