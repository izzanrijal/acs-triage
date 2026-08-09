# Perbaikan ACS Mortality Risk Assistant

&nbsp;

setuju, namun threshold yang saya maksudkan disini bukan hanya resiko berapa persen, namun angka pastinya 0.xxxxx sehingga semua bisa nalar, oh ternyata lebih dari ambang sefety bla bla bla

## 1. Kriteria eksklusi di tahap validasi (Langkah 2)

Tambahkan blok "Kriteria Eksklusi Penelitian" tepat di bawah field Tekanan Darah Sistolik:

- **Checkbox "Syok saat di IGD"**
- **Killip**: dropdown diperluas menjadi Killip I, II, III, dan **IV**

Jika salah satu dicentang/dipilih (syok = ya, atau Killip IV):

- Tombol prediksi dinonaktifkan
- Muncul panel merah: "Pasien termasuk kriteria eksklusi penelitian (syok kardiogenik / Killip IV). Model tidak dapat digunakan pada populasi ini."
- Tersedia tombol "Mulai Pasien Baru" untuk keluar dari alur

## 2. Validasi wajib lengkap

Tombol "Kirim untuk Prediksi" hanya aktif jika seluruh 13 parameter terisi dan berada dalam rentang valid. Bila belum lengkap:

- Tombol tetap nonaktif
- Ringkasan di atas tombol: "3 parameter belum lengkap: eGFR, TAPSE, LVOT VTI"
- Menekan area tombol menyorot (scroll + fokus) field pertama yang bermasalah

## 3. eGFR otomatis (CKD-EPI 2021 Creatinine)

Formula CKD-EPI 2021 butuh **kreatinin, usia, dan jenis kelamin**, jadi:

- Parsing AI ditambah dua field baru: `kreatinin` (mg/dL) dan `jenis_kelamin` (L/P) — keduanya bukan input model, hanya pembantu
- Jika eGFR tidak ditemukan tetapi kreatinin + usia + jenis kelamin tersedia → eGFR dihitung otomatis dan field diberi tanda biru "Dihitung otomatis dari kreatinin (CKD-EPI 2021)" beserta nilai kreatinin yang dipakai
- Nilai hasil hitung tetap bisa ditimpa manual oleh dokter
- Jika kreatinin ada tetapi jenis kelamin tidak terdeteksi → muncul pemilih L/P kecil agar eGFR bisa dihitung
- Rumus: eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.200 × 0.9938^usia × (1.012 jika perempuan), κ = 0.7 (P) / 0.9 (L), α = −0.241 (P) / −0.302 (L)

## 4. Reset state saat pasien baru

Tombol "Prediksi Baru" / "Mulai Pasien Baru" membersihkan seluruh state: teks SOAP, nilai fitur, penanda kosong, kreatinin/jenis kelamin, flag eksklusi, hasil prediksi, status simpan, dan error mutation. Riwayat tersimpan tetap dipertahankan.

## 5. Nilai threshold eksplisit di hasil

Panel hasil menampilkan angka pasti, bukan hanya rentang:

- Ambang keputusan aktif: **safety = x,xxx (x,x%)** dan **youden = y,yyy (y,y%)**
- Baris "Probabilitas pasien x,x% vs ambang safety x,x% → di atas/di bawah ambang"
- Tabel tier menampilkan rentang numerik beserta penanda tier mana yang sedang aktif
- Sumber ambang tetap ditampilkan sebagai catatan kecil

## 6. Atribusi tesis di footer

Footer diperbarui: nama peneliti **Izzan Rijal Muslim, et al.** dan judul tesis lengkap "MODEL RANDOM FOREST UNTUK PREDIKSI MORTALITAS IN-HOSPITAL PADA PASIEN INFARK MIOKARD DENGAN ELEVASI SEGMEN ST (STEMI) DAN TANPA ELEVASI SEGMEN ST (NSTEMI) DI INSTALASI GAWAT DARURAT", di atas disclaimer klinis yang sudah ada.

## 7. Peningkatan UX & responsivitas

- Stepper: versi ringkas (angka + label aktif) di mobile, penuh di desktop; menjadi sticky di bawah header
- Form validasi dikelompokkan jadi tiga seksi berkartu: Demografi & Tanda Vital, Laboratorium, Ekokardiografi — 1 kolom di mobile, 2 di tablet, 3 di desktop
- Header: baris grid `minmax(0,1fr) auto` dengan `min-w-0` + `truncate` agar judul tidak terpotong di layar sempit
- Panel riwayat pindah ke bawah konten di mobile (bukan sidebar sempit), tetap sidebar di ≥ lg
- Tombol aksi utama full-width di mobile, inline di sm ke atas
- Status field lebih jelas: kuning = tidak ditemukan, biru = dihitung otomatis, merah = di luar rentang, dengan `aria-invalid` dan `aria-describedby`
- Kartu hasil: angka probabilitas responsif (text-5xl mobile → text-6xl desktop), grafik SHAP dapat digulir horizontal di layar kecil

## Detail teknis

- `src/lib/acs-features.ts`: Killip 1–4 (4 = eksklusi), helper `calculateEgfr2021`, helper daftar field belum lengkap
- `src/lib/soap-parse.functions.ts`: skema + prompt menambah `kreatinin`, `jenis_kelamin`, `syok` (deteksi kata syok/shock/kardiogenik), Killip IV kini dikembalikan sebagai 4 (bukan null)
- `src/components/acs/FeatureFormStep.tsx`: seksi berkartu, blok eksklusi, gating tombol, badge eGFR terhitung
- `src/components/acs/ResultStep.tsx`: blok ambang numerik
- `src/routes/index.tsx`: state tambahan (kreatinin, jenis kelamin, syok), reset penuh, layout responsif
- `src/components/acs/AppHeader.tsx`: perbaikan grid responsif
- Tanpa perubahan backend; endpoint `/predict` tetap menerima 13 fitur yang sama