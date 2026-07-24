import { useEffect, useRef } from 'react';

// Tabel lebar (banyak kolom) butuh scroll horizontal, tapi scroll mouse
// biasanya cuma vertikal -- hook ini bikin scroll wheel di atas tabel
// langsung geser horizontal (kiri-kanan), sementara scroll di luar tabel
// tetap scroll halaman seperti biasa (listener-nya cuma nempel di elemen
// tabelnya sendiri, bukan global).
export default function useHorizontalWheelScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onWheel(e) {
      const canScrollH = el.scrollWidth > el.clientWidth;
      if (!canScrollH) return;
      // Kalau user memang lagi geser horizontal (trackpad/shift+wheel),
      // biarkan behavior aslinya jalan.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return ref;
}
