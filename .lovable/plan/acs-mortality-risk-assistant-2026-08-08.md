# ACS Mortality Risk Assistant

Aplikasi dashboard medis berbahasa Indonesia untuk memprediksi risiko mortalitas in-hospital pasien SKA, terhubung ke API Random Forest di `https://rfapi.berkompeten.id` (sudah saya cek: `/health` dan `/thresholds` aktif dan merespons sesuai kontrak).

## Alur 3 langkah (satu halaman, stepper)

1. **Input laporan** — SATU textarea besar saja: klinisi menempel laporan jaga apa adanya (gaya WhatsApp, S/O/A/P bercampur, ada tanda bintang, tabel lab, echo, dsb). Tombol "Parsing dengan AI (DeepSeek)" dan "Isi Manual". Ada contoh laporan untuk uji cepat.
2. **Validasi & Koreksi** — form 13 field hasil parsing, semua bisa diedit. Field yang tidak ditemukan (null) ditandai kuning "belum ditemukan di SOAP — isi manual". Validasi rentang per field; Killip berupa dropdown 1/2/3. Tombol kirim nonaktif sampai semua valid. Ada tombol "Parsing Ulang".
3. **Hasil** — kartu besar probabilitas (persen) dengan warna kategori (hijau/kuning/merah), label rawat, string threshold, rekomendasi dari API, kartu 3 kontributor teratas, dan bar chart SHAP 13 fitur (merah = memperberat, biru = meringankan) dengan garis referensi base value.

## Elemen tetap

- Header: banner status koneksi API (dari `GET /health`) hijau/merah + info model "Random Forest 500 trees | AUC 0.816 | N=1.524 | Killip I–III".
- Threshold triage diambil dinamis dari `GET /thresholds`, tidak di-hardcode.
- Loading state saat `POST /predict` (SHAP dihitung per request).
- Footer disclaimer permanen: alat bantu keputusan klinis, bukan pengganti penilaian dokter.

## Riwayat prediksi

Tersimpan di localStorage: input 13 field + hasil + waktu. Daftar riwayat bisa dibuka kembali untuk melihat hasilnya, dan bisa dihapus.

## Detail teknis

- **Parsing DeepSeek server-side.** Server function TanStack (`src/lib/soap-parse.functions.ts`) menerima teks SOAP, memanggil `https://api.deepseek.com/chat/completions` model `deepseek-chat` dengan `response_format: json_object`, `temperature: 0`, dan system prompt sesuai spesifikasi (TAPSE dalam cm, Killip 1–3, null jika tidak disebut). Kunci `DEEPSEEK_API_KEY` dibaca dari `process.env` di dalam handler — tidak pernah sampai ke browser. Hasil divalidasi Zod: hanya 13 key, angka atau null; nilai di luar rentang ditandai "perlu konfirmasi", bukan dibuang.
- **Fallback**: jika DeepSeek gagal/timeout, tampilkan peringatan dan lanjutkan ke form manual kosong — alur tidak diblokir.
- **Panggilan API prediksi** langsung dari browser (CORS terbuka), lewat `src/lib/acs-api.ts` dengan tipe TypeScript untuk payload dan response. Base URL dari `VITE_API_BASE_URL` dengan default `https://rfapi.berkompeten.id`. Payload dikirim persis 13 field (killip integer, sisanya number) agar tidak kena `extra=forbid` 422; error 422 ditampilkan sebagai pesan berbahasa Indonesia.
- TanStack Query untuk `/health` dan `/thresholds`; mutation untuk `/predict`.
- Chart SHAP memakai recharts horizontal bar; komponen dipecah kecil (`SoapInputStep`, `FeatureFormStep`, `ResultStep`, `ShapChart`, `HistoryPanel`).
- Design system: token slate/teal medis di `src/styles.css`, bukan warna hardcoded. Halaman utama menggantikan `src/routes/index.tsx` beserta metadata head-nya.

## Yang perlu Anda siapkan

Setelah plan disetujui, saya akan meminta **DEEPSEEK_API_KEY** lewat form aman (didapat dari platform.deepseek.com → API Keys). Fitur mode batch dan ekspor PDF belum termasuk — bisa ditambah kapan saja.

## Aturan ekstraksi dari laporan bebas (contoh Anda)

Prompt DeepSeek diperkuat untuk teks laporan nyata:

- Ambil nilai **terbaru / saat di IGD PJT** jika ada lebih dari satu set (mis. lab RS perujuk vs lab PJT, EKG berulang, tensi).
- Pemetaan: usia dari identitas (52 tahun), hr dari nadi/HR echo hemodinamik (97), sbp dari angka pertama tensi (141), rr dari nafas (24), hb (16.3), kalium dari K pada Na/K/Cl (4.4), ureum dari Ur pada Ur/Cr (30), egfr dari nilai eGFR yang tertulis (56), aptt dari PT/INR/APTT (23.7), lvef pilih EF biplane bila ada (38), lvot_vti (16), tapse dalam cm (2.2), killip dari teks diagnosis "KILLIP II" → 2.
- Killip IV atau tidak jelas → null (form menolak angka 4, hanya 1/2/3).
- TAPSE tertulis mm → dibagi 10.
- Nilai yang tidak ada tetap null, tidak ditebak — user melengkapi di langkah validasi.
