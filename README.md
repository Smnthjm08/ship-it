# 🚀 Ship-It – Dev Setup

## 📥 Clone the repo

```sh
git clone https://github.com/smnthjm08/ship-it.git
cd ship-it
```

## ⚙️ Manual Setup (Local Machine)

```sh
cp .env.example .env     # fill required fields
pnpm install
pnpm db:migrate
pnpm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## 🐳 Docker Setup (DB in Docker)

1. Make sure `.env` and `docker-compose.yml` use the same DB credentials:

   ```sh
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=docker
   DATABASE_URL=postgresql://postgres:postgres@db:5432/docker
   ```

2. Start Docker:

   ```sh
   docker compose up --build
   ```

3. Visit:
   👉 [http://localhost:3000](http://localhost:3000)

---

## ✔️ Useful Commands

```sh
pnpm db:migrate     # run migrations
pnpm db:generate    # regenerate Prisma types
```

<!-- ![DATABASE SCHEMA](image.png) -->
<!-- ![Arch design](image.png) -->
