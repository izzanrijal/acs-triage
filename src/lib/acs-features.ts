export type FeatureKey =
  | "usia"
  | "hr"
  | "sbp"
  | "rr"
  | "hb"
  | "kalium"
  | "ureum"
  | "egfr"
  | "aptt"
  | "lvef"
  | "lvot_vti"
  | "tapse"
  | "killip";

export type FeatureGroup = "vital" | "lab" | "echo";

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  group: FeatureGroup;
  hint?: string;
}

export const FEATURE_GROUPS: { id: FeatureGroup; title: string; description: string }[] = [
  {
    id: "vital",
    title: "Demografi & Tanda Vital",
    description: "Data dasar pasien saat tiba di IGD",
  },
  { id: "lab", title: "Laboratorium", description: "Hasil lab terbaru di rumah sakit penerima" },
  { id: "echo", title: "Ekokardiografi", description: "Parameter fungsi jantung" },
];

export const FEATURES: FeatureDef[] = [
  { key: "usia", label: "Usia", unit: "tahun", min: 0, max: 120, step: 1, group: "vital" },
  { key: "hr", label: "Heart Rate", unit: "bpm", min: 20, max: 250, step: 1, group: "vital" },
  {
    key: "sbp",
    label: "Tekanan Darah Sistolik",
    unit: "mmHg",
    min: 40,
    max: 300,
    step: 1,
    group: "vital",
  },
  { key: "rr", label: "Respiratory Rate", unit: "x/menit", min: 4, max: 80, step: 1, group: "vital" },
  {
    key: "killip",
    label: "Kelas Killip",
    unit: "kelas",
    min: 1,
    max: 4,
    step: 1,
    group: "vital",
    hint: "Killip IV termasuk kriteria eksklusi penelitian",
  },
  { key: "hb", label: "Hemoglobin", unit: "g/dL", min: 1, max: 25, step: 0.1, group: "lab" },
  { key: "kalium", label: "Kalium (K+)", unit: "mEq/L", min: 1, max: 9, step: 0.1, group: "lab" },
  { key: "ureum", label: "Ureum", unit: "mg/dL", min: 1, max: 500, step: 1, group: "lab" },
  {
    key: "egfr",
    label: "eGFR",
    unit: "mL/mnt/1,73 m²",
    min: 0,
    max: 200,
    step: 1,
    group: "lab",
    hint: "Dihitung otomatis dari kreatinin bila tidak tertulis (CKD-EPI 2021)",
  },
  { key: "aptt", label: "aPTT", unit: "detik", min: 10, max: 300, step: 0.1, group: "lab" },
  { key: "lvef", label: "LVEF", unit: "%", min: 5, max: 90, step: 1, group: "echo" },
  { key: "lvot_vti", label: "LVOT VTI", unit: "cm", min: 1, max: 40, step: 0.1, group: "echo" },
  {
    key: "tapse",
    label: "TAPSE",
    unit: "cm",
    min: 0.5,
    max: 5,
    step: 0.1,
    group: "echo",
    hint: "Dalam sentimeter — jika catatan menulis mm, bagi 10 (22 mm → 2,2 cm)",
  },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

export type FeatureValues = Record<FeatureKey, number>;
export type PartialFeatureValues = Partial<Record<FeatureKey, number | null>>;

export type Sex = "L" | "P";

export interface HelperValues {
  kreatinin?: number | null;
  jenisKelamin?: Sex | null;
  syok?: boolean;
}

export function validateFeature(def: FeatureDef, value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return "Wajib diisi";
  if (def.key === "killip" && ![1, 2, 3, 4].includes(value)) return "Hanya kelas 1–4";
  if (value < def.min || value > def.max)
    return `Di luar rentang valid (${def.min}–${def.max} ${def.unit})`;
  return null;
}

export function validateAll(values: PartialFeatureValues): Partial<Record<FeatureKey, string>> {
  const errors: Partial<Record<FeatureKey, string>> = {};
  for (const def of FEATURES) {
    const err = validateFeature(def, values[def.key]);
    if (err) errors[def.key] = err;
  }
  return errors;
}

/** Daftar label parameter yang belum lengkap / tidak valid, urut sesuai form. */
export function incompleteLabels(values: PartialFeatureValues): string[] {
  const errors = validateAll(values);
  return FEATURES.filter((f) => errors[f.key]).map((f) => f.label);
}

export function isExcluded(values: PartialFeatureValues, helpers: HelperValues): boolean {
  return helpers.syok === true || values.killip === 4;
}

export function toPayload(values: PartialFeatureValues): FeatureValues {
  const payload = {} as FeatureValues;
  for (const def of FEATURES) {
    const v = Number(values[def.key]);
    payload[def.key] = def.key === "killip" ? Math.round(v) : v;
  }
  return payload;
}

/**
 * CKD-EPI 2021 Creatinine (tanpa ras).
 * eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^-1.200 × 0.9938^usia × (1.012 bila perempuan)
 */
export function calculateEgfr2021(
  kreatinin: number | null | undefined,
  usia: number | null | undefined,
  sex: Sex | null | undefined,
): number | null {
  if (!kreatinin || !usia || !sex) return null;
  if (kreatinin <= 0 || usia <= 0) return null;
  const kappa = sex === "P" ? 0.7 : 0.9;
  const alpha = sex === "P" ? -0.241 : -0.302;
  const ratio = kreatinin / kappa;
  const egfr =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, usia) *
    (sex === "P" ? 1.012 : 1);
  if (!Number.isFinite(egfr)) return null;
  return Math.round(egfr * 10) / 10;
}
