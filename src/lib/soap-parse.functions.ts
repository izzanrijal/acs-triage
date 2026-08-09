import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const numOrNull = z.union([z.number(), z.null()]).catch(null);

const ParsedSchema = z.object({
  usia: numOrNull,
  hr: numOrNull,
  sbp: numOrNull,
  rr: numOrNull,
  hb: numOrNull,
  kalium: numOrNull,
  ureum: numOrNull,
  egfr: numOrNull,
  aptt: numOrNull,
  lvef: numOrNull,
  lvot_vti: numOrNull,
  tapse: numOrNull,
  killip: numOrNull,
  kreatinin: numOrNull,
  jenis_kelamin: z.union([z.literal("L"), z.literal("P"), z.null()]).catch(null),
  syok: z.union([z.boolean(), z.null()]).catch(null),
});

export type ParsedFeatures = z.infer<typeof ParsedSchema>;

const SYSTEM_PROMPT = `Kamu adalah asisten dokter untuk ekstraksi data klinis. Dari laporan jaga / catatan SOAP pasien SKA (STEMI/NSTEMI) yang formatnya bebas (gaya WhatsApp, ada tanda bintang, singkatan, tabel lab, hasil echo), ekstrak JSON dengan key persis: usia, hr, sbp, rr, hb, kalium, ureum, egfr, aptt, lvef, lvot_vti, tapse, killip, kreatinin, jenis_kelamin, syok.

Aturan:
1. Jika nilai TIDAK disebutkan → null. JANGAN menebak atau mengarang nilai.
2. Jika ada beberapa set nilai (mis. lab RS perujuk dan lab RS saat ini, beberapa EKG, beberapa tensi), ambil yang TERBARU / saat pasien di IGD rumah sakit penerima.
3. Pemetaan umum:
   - usia: dari identitas pasien (tahun).
   - hr: nadi atau HR (bpm).
   - sbp: angka pertama tekanan darah (mis. "141/95 mmHg" → 141).
   - rr: nafas / respirasi (x/menit).
   - hb: hemoglobin / Hb (g/dL).
   - kalium: nilai K pada "Na/K/Cl" atau kalium (mEq/L).
   - ureum: nilai Ur pada "Ur/Cr" atau ureum (mg/dL).
   - kreatinin: nilai Cr pada "Ur/Cr" atau kreatinin / creatinine (mg/dL).
   - egfr: nilai eGFR bila tertulis. Jika hanya kreatinin yang ada tanpa eGFR → null (aplikasi akan menghitung sendiri).
   - aptt: nilai APTT pada "PT/INR/APTT" (detik).
   - lvef: EF dari echocardiography (%). Jika ada EF Teich dan EF Biplane, pilih BIPLANE.
   - lvot_vti: LVOT VTI (cm).
   - tapse: TAPSE dalam CM. Jika ditulis mm, bagi 10 (contoh: 22 mm → 2.2).
   - killip: dari teks diagnosis, angka Romawi ikut dibaca ("KILLIP II" → 2). Nilai 1, 2, 3, atau 4. Killip IV → 4. Jika tidak jelas → null.
   - jenis_kelamin: "L" untuk laki-laki (Tn., Sdr., male), "P" untuk perempuan (Ny., Nn., female). Jika tidak jelas → null.
   - syok: true bila laporan menyebut syok / shock / syok kardiogenik / cardiogenic shock aktif saat di IGD, atau pasien butuh vasopresor/inotropik karena syok. Jika tidak disebut → false.
4. Perhatikan satuan: sistolik mmHg, hemoglobin g/dL, kalium mEq/L, ureum mg/dL, kreatinin mg/dL, eGFR mL/mnt/1,73 m², aPTT detik, LVEF %, LVOT VTI cm, TAPSE cm, umur tahun.
5. Keluarkan HANYA JSON, tanpa teks lain.`;

export const parseSoap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ soap: z.string().min(20).max(30000) }).parse(input))
  .handler(async ({ data }): Promise<{ features: ParsedFeatures }> => {
    const apiKey = process.env["DEEPSEEK_API_KEY"];
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY belum dikonfigurasi di server.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let res: Response;
    try {
      res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          response_format: { type: "json_object" },
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Laporan pasien:\n${data.soap}` },
          ],
        }),
      });
    } catch {
      throw new Error("Parsing AI gagal atau melebihi batas waktu. Silakan isi form secara manual.");
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const body = await res.text();
      console.error("DeepSeek error", res.status, body);
      throw new Error(`Parsing AI gagal (status ${res.status}). Silakan isi form secara manual.`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Parsing AI tidak mengembalikan data. Silakan isi form manual.");

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      throw new Error("Hasil parsing AI tidak valid. Silakan isi form manual.");
    }

    const parsed = ParsedSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Hasil parsing AI tidak sesuai format. Silakan isi form manual.");
    }

    const features = parsed.data;
    if (features.killip !== null && ![1, 2, 3, 4].includes(Math.round(features.killip))) {
      features.killip = null;
    }

    return { features };
  });
