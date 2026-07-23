-- "Komentar Penutupan" jadi field "Notes" umum, tidak lagi terikat ke aksi
-- tutup problem -- status open/closed sekarang murni toggle terpisah.
ALTER TABLE "ProblemLog" RENAME COLUMN "close_comment" TO "notes";
