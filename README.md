# Cardia Risk Insights

# PROMPT FRONTEND: ACS Mortality Risk Assistant (untuk Lovable.ai)

Buat aplikasi frontend (React + Tailwind, dashboard medis bersih & profesional, bahasa Indonesia) untuk membantu klinisi memprediksi risiko mortalitas in-hospital pasien SKA (STEMI/NSTEMI).

Backend API FastAPI sudah LIVE di: https://rfapi.berkompeten.id

- Model: Random Forest final tesis (N=1.524, 115 kejadian, 13 fitur, AUC 0,816 ± 0,008, 10 seeds × 5-fold CV)

- CORS sudah terbuka (allow_origins=*) → aman dipanggil langsung dari frontend

ALUR UTAMA 3 LANGKAH:

1. INPUT SOAP — klinisi menempel catatan SOAP lengkap (Subjective/Objective/Assessment/Plan)

2. PARSING DEEPSEEK + VALIDASI MANUAL — DeepSeek mengekstrak 13 fitur klinis dari SOAP → hasil tampil dalam form yang BISA DIEDIT; user WAJIB memvalidasi & melengkapi, lalu konfirmasi sebelum prediksi

3. HASIL — probabilitas mortalitas, kategori triage, label rawat, threshold, rekomendasi, dan visualisasi SHAP

---

## INTEGRASI API

Base URL: https://rfapi.berkompeten.id

| Method | Endpoint | Fungsi | Dipakai untuk |

|---|---|---|---|

| GET | /health | status + metadata model | Banner koneksi di header |

| GET | /thresholds | threshold triage dinamis | Ambil threshold DARI SINI (jangan hardcode) |

| GET | /feature_importance | Gini importance 13 fitur | Info fitur terpenting (opsional) |

| POST | /predict | prediksi 1 pasien + SHAP lengkap | Alur utama |

| POST | /predict/batch | banyak pasien, tanpa SHAP, maks 1000 | Mode batch |

ATURAN PENTING:

- Ambil threshold dari GET /thresholds secara dinamis, JANGAN hardcode di kode (biar sinkron kalau model update).

- POST /predict lambat ±100–300 ms karena SHAP dihitung per request — tampilkan loading state.

- Untuk skrining massal pakai /predict/batch (tanpa SHAP, ringan).

---

## KONTRAK INPUT — 13 FIELD (WAJIB SEMUA)

| field | arti | satuan | rentang valid | contoh |

|---|---|---|---|---|

| usia | umur | tahun | 0–120 | 75 |

| hr | heart rate | bpm | 20–250 | 110 |

| sbp | tekanan darah sistolik | mmHg | 40–300 | 95 |

| rr | respiratory rate | /menit | 4–80 | 28 |

| hb | hemoglobin | g/dL | 1–25 | 9.5 |

| kalium | K+ | mEq/L | 1–9 | 5.8 |

| ureum | ureum darah | mg/dL | 1–500 | 150 |

| egfr | eGFR | mL/mnt/1,73 m² | 0–200 | 20 |

| aptt | aPTT | detik | 10–300 | 60 |

| lvef | LVEF | % | 5–90 | 25 |

| lvot_vti | LVOT VTI | cm | 1–40 | 9 |

| tapse | TAPSE | CM (bukan mm!) | 0,5–5 | 1.0 |

| killip | kelas Killip | kelas | hanya 1, 2, atau 3 | 3 |

PITFALL KRITIS:

1. TAPSE dalam CM — model dilatih dengan cm. Jika catatan menulis mm (mis. 10 mm), konversi ke 1.0 cm. JANGAN kirim mm.

2. killip = 4 DITOLAK (HTTP 422) — model hanya Killip I–III.

3. extra=forbid — field di luar 13 di atas → HTTP 422. Validasi form harus ketat.

4. killip dikirim sebagai integer, sisanya angka desimal.

Contoh payload yang benar:

{

  "usia": 75, "hr": 110, "sbp": 95, "rr": 28, "hb": 9.5,

  "kalium": 5.8, "ureum": 150, "egfr": 20, "aptt": 60,

  "lvef": 25, "lvot_vti": 9, "tapse": 1.0, "killip": 3

}

---

## KONTRAK RESPONSE POST /predict

{

  "probability": 0.716005,

  "risk_category": "HIGH RISK",

  "label": "ICU",

  "thresholds": "p >= 0.103981",

  "recommendation": "Rawat ICU, monitoring intensif, pertimbangkan tatalaksana agresif",

  "shap_values": {

    "base_value": 0.075545,

    "output_space": "probability",

    "features": [

      {

        "name": "eGFR",

        "db_column": "egfr_igd",

        "value": 20.0,

        "shap_contribution": 0.14292,

        "direction": "positive"

      }

    ]

  },

  "contributors_top3": [

    {"name": "eGFR", "value": 20.0, "shap_contribution": 0.14292, "direction": "positive"}

  ]

}

Interpretasi SHAP:

- shap_contribution positif (direction: "positive") = fitur MEMPERBERAT risiko (dorong proba naik dari base_value).

- shap_contribution negatif (direction: "negative") = fitur MERINGANKAN risiko.

- base_value = probabilitas dasar sebelum kontribusi fitur.

Response /predict/batch:

{

  "count": 1,

  "results": [

    {"probability": 0.716005, "risk_category": "HIGH RISK", "label": "ICU", "thresholds": "p >= 0.103981", "recommendation": "..."}

  ]

}

Response /health:

{"status": "ok", "model_loaded": true, "feature_count": 13, "model": "RandomForestClassifier(n_estimators=500, max_depth=6, min_samples_leaf=5)", "cohort": "N=1.524, deaths=115 (7,5%), Killip I-III", "auc_mean": 0.8157}

Response /thresholds:

{

  "safety": 0.018455242140851154,

  "youden": 0.10398051716909251,

  "source": "validation_results.json schema v2 (10 seeds x 5-fold OOF)",

  "tiers": [

    {"risk_category": "LOW RISK", "label": "Ward", "range": "p < 0.018455"},

    {"risk_category": "INTERMEDIATE RISK", "label": "HCU/ICVCU", "range": "0.018455 <= p < 0.103981"},

    {"risk_category": "HIGH RISK", "label": "ICU", "range": "p >= 0.103981"}

  ]

}

---

## THRESHOLD TRIAGE (final tesis — sinkronkan dengan /thresholds)

| Kategori | Label Rawat | Rentang Probabilitas | Basis |

|---|---|---|---|

| LOW RISK | Ward | p < 0.018455 | safety: FN ≤ 2, sens 98,3% |

| INTERMEDIATE RISK | HCU/ICVCU | 0.018455 ≤ p < 0.103981 | — |

| HIGH RISK | ICU | p ≥ 0.103981 | Youden: sens 71,3%, spec 82,0% |

---

## PARSING SOAP DENGAN DEEPSEEK (WAJIB SERVER-SIDE)

PENTING: Panggil DeepSeek dari SERVER (Lovable server action / Supabase Edge Function / backend Node), JANGAN dari browser — API key harus tersembunyi. Frontend hanya mengirim teks SOAP, menerima hasil JSON.

Konfigurasi DeepSeek:

- Base URL: https://api.deepseek.com

- Endpoint: POST /chat/completions

- Model: deepseek-chat

- Aktifkan JSON mode: "response_format": {"type": "json_object"}

- Header: Authorization: Bearer YOUR_DEEPSEEK_API_KEY

- Body contoh:

{

  "model": "deepseek-chat",

  "response_format": {"type": "json_object"},

  "temperature": 0,

  "messages": [

    {"role": "system", "content": "SYSTEM_PROMPT_DI_BAWAH"},

    {"role": "user", "content": "SOAP pasien:\n[teks SOAP lengkap]"}

  ]

}

System prompt DeepSeek (Bahasa Indonesia):

"""

Kamu adalah asisten dokter untuk ekstraksi data klinis. Dari catatan SOAP pasien SKA (STEMI/NSTEMI), ekstrak 13 fitur berikut sebagai JSON dengan key persis: usia, hr, sbp, rr, hb, kalium, ureum, egfr, aptt, lvef, lvot_vti, tapse, killip.

Aturan:

1. Jika nilai TIDAK disebutkan di SOAP → null. JANGAN menebak atau mengarang nilai.

2. TAPSE: laporkan dalam cm. Jika SOAP menulis mm, bagi 10. (contoh: TAPSE 10 mm → tapse: 1.0)

3. killip hanya boleh 1, 2, atau 3. Jika tidak jelas dari SOAP → null.

4. Perhatikan satuan: tekanan darah sistolik mmHg, hemoglobin g/dL, kalium mEq/L, ureum mg/dL, eGFR mL/mnt/1,73 m², aPTT detik, LVEF %, LVOT VTI cm, umur tahun.

5. Keluarkan HANYA JSON, tanpa teks lain.

"""

Penanganan hasil parsing:

- Field bernilai null → tandai "tidak ditemukan di SOAP — isi manual" (highlight kuning/merah, wajib diisi user sebelum submit).

- Field yang nilainya ambigu → tandai "perlu konfirmasi".

- Fallback: jika DeepSeek gagal/timeout → tetap izinkan form manual penuh (jangan blokir alur).

---

## KOMPONEN UI

### Step 1 — Input SOAP

- 4 textarea: Subjective / Objective / Assessment / Plan + opsi "paste satu teks lengkap"

- Tombol: [Parsing dengan AI (DeepSeek)] dan [Isi Manual]

- Status koneksi API di header (GET /health): hijau "API Terhubung" / merah "API Tidak Terhubung"

- Banner info model: "Random Forest 500 trees | AUC 0.816 | N=1.524 | Killip I-III"

### Step 2 — Validasi & Koreksi (WAJIB sebelum prediksi)

- Form 13 field, label dengan satuan, validasi rentang:

  - killip: hanya 1/2/3 (dropdown)

  - tapse: 0,5–5 cm

  - lvef: 5–90 %

  - egfr: 0–200

  - usia: 0–120, hr: 20–250, sbp: 40–300, rr: 4–80, hb: 1–25, kalium: 1–9, ureum: 1–500, aptt: 10–300

- Field hasil parsing terisi otomatis; field null ditandai wajib diisi

- Tombol [Kirim untuk Prediksi] disabled sampai SEMUA field valid

- Tombol [Parsing Ulang] jika user edit SOAP dan coba lagi

### Step 3 — Hasil Prediksi

- Kartu besar: probability (persen, font besar) + risk_category dengan warna:

  - LOW RISK = hijau

  - INTERMEDIATE RISK = kuning

  - HIGH RISK = merah

- Label rawat (Ward / HCU-ICVCU / ICU) + string thresholds + rekomendasi klinis dari API

- Visualisasi SHAP: horizontal bar chart 13 fitur urut dari kontribusi terbesar (recharts atau custom div):

  - positive = merah (memperberat risiko)

  - negative = biru/hijau (meringankan)

  - tampilkan base_value sebagai garis referensi

- Kartu contributors_top3: nama fitur + nilai + interpretasi arah

- Tombol [Prediksi Baru] dan [Simpan Riwayat]

### Fitur Tambahan (nilai plus)

- Riwayat prediksi: localStorage (atau Supabase jika ingin shared) — simpan input + hasil + timestamp, bisa dibuka lagi

- Mode batch: input beberapa pasien → POST /predict/batch → tabel hasil ringkas

- Ekspor laporan per pasien (print-friendly / PDF)

- Indikator loading saat request SHAP (±100–300 ms)

---

## DESAIN & BAHASA

- UI 100% Bahasa Indonesia (kategori risiko boleh tetap "LOW/INTERMEDIATE/HIGH RISK")

- Gaya medis profesional: bersih, kartu shadow lembut, warna konsisten (slate/teal/blue), tidak ramai

- Responsive — dipakai di laptop/tablet klinisi

Disclaimer (WAJIB tampil):

Footer/banner permanen: "Alat bantu keputusan klinis — bukan pengganti penilaian dokter. Prediksi berbasis model statistik; keputusan akhir tetap pada klinisi."

---

## ENVIRONMENT VARIABLES

| Variable | Keterangan |

|---|---|

| DEEPSEEK_API_KEY | Server-side ONLY — jangan pernah expose ke client |

| VITE_API_BASE_URL (atau API_BASE_URL) | Default: https://rfapi.berkompeten.id |

---

## CONTOH UJI CEPAT (untuk verifikasi integrasi)

Cek koneksi:

curl https://rfapi.berkompeten.id/health

Uji prediksi:

curl -X POST https://rfapi.berkompeten.id/predict \

  -H 'Content-Type: application/json' \

  -d '{"usia":75,"hr":110,"sbp":95,"rr":28,"hb":9.5,"kalium":5.8,"ureum":150,"egfr":20,"aptt":60,"lvef":25,"lvot_vti":9,"tapse":1.0,"killip":3}'

Ekspektasi:

- /health → {"status":"ok","model_loaded":true,...}

- /predict → probability: 0.716005, risk_category: "HIGH RISK", label: "ICU", SHAP 13 fitur, top3 = eGFR dkk.

- killip=4 → HTTP 422

- field ekstra → HTTP 422

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://acs-triage.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bdf65b95-d756-48d7-b7d6-bc7543e53158).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
