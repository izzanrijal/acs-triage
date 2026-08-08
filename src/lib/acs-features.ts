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

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
}

export const FEATURES: FeatureDef[] = [
  { key: "usia", label: "Usia", unit: "tahun", min: 0, max: 120, step: 1 },
  { key: "hr", label: "Heart Rate", unit: "bpm", min: 20, max: 250, step: 1 },
  { key: "sbp", label: "Tekanan Darah Sistolik", unit: "mmHg", min: 40, max: 300, step: 1 },
  { key: "rr", label: "Respiratory Rate", unit: "x/menit", min: 4, max: 80, step: 1 },
  { key: "hb", label: "Hemoglobin", unit: "g/dL", min: 1, max: 25, step: 0.1 },
  { key: "kalium", label: "Kalium (K+)", unit: "mEq/L", min: 1, max: 9, step: 0.1 },
  { key: "ureum", label: "Ureum", unit: "mg/dL", min: 1, max: 500, step: 1 },
  { key: "egfr", label: "eGFR", unit: "mL/mnt/1,73 m²", min: 0, max: 200, step: 1 },
  { key: "aptt", label: "aPTT", unit: "detik", min: 10, max: 300, step: 0.1 },
  { key: "lvef", label: "LVEF", unit: "%", min: 5, max: 90, step: 1 },
  { key: "lvot_vti", label: "LVOT VTI", unit: "cm", min: 1, max: 40, step: 0.1 },
  {
    key: "tapse",
    label: "TAPSE",
    unit: "cm",
    min: 0.5,
    max: 5,
    step: 0.1,
    hint: "Dalam sentimeter — jika catatan menulis mm, bagi 10 (22 mm → 2,2 cm)",
  },
  { key: "killip", label: "Kelas Killip", unit: "kelas", min: 1, max: 3, step: 1, hint: "Model hanya menerima Killip I–III" },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

export type FeatureValues = Record<FeatureKey, number>;
export type PartialFeatureValues = Partial<Record<FeatureKey, number | null>>;

export function validateFeature(def: FeatureDef, value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return "Wajib diisi";
  if (def.key === "killip" && ![1, 2, 3].includes(value)) return "Hanya kelas 1, 2, atau 3";
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

export function toPayload(values: PartialFeatureValues): FeatureValues {
  const payload = {} as FeatureValues;
  for (const def of FEATURES) {
    const v = Number(values[def.key]);
    payload[def.key] = def.key === "killip" ? Math.round(v) : v;
  }
  return payload;
}
