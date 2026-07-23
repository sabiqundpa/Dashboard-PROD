-- Machine, Analytic, dan Breakdown adalah sisa fitur Maintenance dari
-- Dashboard-MTN yang tidak dipakai sama sekali di Dashboard-PROD (tidak
-- ada menu/halaman yang mengaksesnya) -- tabelnya sendiri sudah hilang
-- dari database ini sejak restrukturisasi manual sebelumnya, jadi tidak
-- ada yang perlu di-DROP untuk ketiganya di sini.
--
-- WorkingCalendar masih ada (0 baris) tapi juga tidak dipakai fitur apa
-- pun di Dashboard-PROD -- aman dihapus.
DROP TABLE IF EXISTS "WorkingCalendar";
