# Production deployment (database in Docker)

Saya tidak bisa mengakses server Anda dari sini; ikuti langkah di bawah **di server** (VPS / cloud).

## Ringkasan

- **PostgreSQL** jalan di container `postgres` dengan volume `servia_pg_data` → data tetap ada walau container di-recreate.
- **Aplikasi** (backend + frontend statis) jalan di container `servia-bracket`, bind ke `127.0.0.1:8400`.
- HTTPS biasanya lewat **Nginx** atau **Caddy** di host (reverse proxy ke `127.0.0.1:8400`).

## Langkah di server

1. Install **Docker** + **Docker Compose plugin** (v2).
2. Clone repo ke server (SSH key / token Anda).
3. Di root repo:

   ```bash
   cp deploy/prod.env.example deploy/prod.env
   ```

   Edit `deploy/prod.env`: password DB kuat, `JWT_SECRET` panjang/acak, `BASE_URL` dan `CORS_ORIGINS` sesuai domain HTTPS Anda. Pastikan `PG_DSN` memakai host **`postgres`** dan kredensial sama dengan blok `POSTGRES_*`.

4. Jalankan:

   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```

5. **Migrasi**: setelah container jalan, sekali saja (dari server):

   ```bash
   docker exec -it servia-bracket uv run alembic upgrade head
   ```

   (Backend `auto_run_migrations` di production bisa juga menjalankan migrasi saat start—cek log container.)

6. **HTTPS**: pasang reverse proxy yang mengarah ke `http://127.0.0.1:8400`, set header Host, dan gunakan sertifikat Let’s Encrypt.

## Update versi baru

```bash
cd /path/to/repo
git pull
./deploy/deploy.sh
```

## Cadangan database

Volume Docker `servia_pg_data` menyimpan data. Backup rutin:

```bash
docker exec servia-postgres pg_dump -U bracket_prod bracket_prod > backup.sql
```

(Ubah `bracket_prod` jika `POSTGRES_USER` / `POSTGRES_DB` Anda beda.)
