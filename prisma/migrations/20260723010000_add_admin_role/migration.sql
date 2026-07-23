-- Migrasi awal Admin (20260619014754_add_admin_auth) tidak pernah menambahkan
-- kolom "role" walaupun sudah ada di schema.prisma sejak awal (schema drift).
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'maintenance';
