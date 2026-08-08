import type { FeatureValues } from "./acs-features";

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "https://rfapi.berkompeten.id";

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  feature_count: number;
  model: string;
  cohort: string;
  auc_mean: number;
}

export interface ThresholdTier {
  risk_category: string;
  label: string;
  range: string;
}

export interface ThresholdsResponse {
  safety: number;
  youden: number;
  source: string;
  tiers: ThresholdTier[];
}

export interface ShapFeature {
  name: string;
  db_column?: string;
  value: number;
  shap_contribution: number;
  direction: "positive" | "negative";
}

export interface PredictResponse {
  probability: number;
  risk_category: string;
  label: string;
  thresholds: string;
  recommendation: string;
  shap_values: {
    base_value: number;
    output_space: string;
    features: ShapFeature[];
  };
  contributors_top3: ShapFeature[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error("Tidak dapat terhubung ke server prediksi. Periksa koneksi internet Anda.");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { detail?: unknown };
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? "");
    } catch {
      /* abaikan */
    }
    if (res.status === 422) {
      throw new Error(
        `Data ditolak server (422). Pastikan Killip hanya 1–3 dan semua nilai dalam rentang valid. ${detail}`.trim(),
      );
    }
    throw new Error(`Server prediksi mengembalikan error ${res.status}. ${detail}`.trim());
  }

  return (await res.json()) as T;
}

export const getHealth = () => request<HealthResponse>("/health");

export const getThresholds = () => request<ThresholdsResponse>("/thresholds");

export const postPredict = (payload: FeatureValues) =>
  request<PredictResponse>("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
