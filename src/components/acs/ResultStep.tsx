import { RotateCcw, Save, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShapChart } from "./ShapChart";
import type { PredictResponse, ThresholdsResponse } from "@/lib/acs-api";

interface Props {
  result: PredictResponse;
  thresholds?: ThresholdsResponse | undefined;
  onReset: () => void;
  onSave: () => void;
  saved: boolean;
}

function riskContainer(category: string) {
  const c = category.toUpperCase();
  if (c.includes("HIGH")) return "bg-risk-high-container text-on-risk-high-container";
  if (c.includes("INTERMEDIATE"))
    return "bg-risk-medium-container text-on-risk-medium-container";
  return "bg-risk-low-container text-on-risk-low-container";
}

export function ResultStep({ result, thresholds, onReset, onSave, saved }: Props) {
  const p = result.probability;
  const persen = (p * 100).toFixed(1);
  const base = result.shap_values.base_value;

  return (
    <div className="space-y-6">
      <section
        className={`rounded-m3-xxl px-6 py-8 ${riskContainer(result.risk_category)}`}
        aria-label="Ringkasan risiko"
      >
        <div className="grid gap-8 md:grid-cols-[minmax(0,260px)_1fr] md:items-center">
          <div className="min-w-0">
            <p className="m3-label-large opacity-80">Probabilitas mortalitas in-hospital</p>
            <p className="m3-display-large mt-2 tabular-nums">{persen}%</p>
            <p className="mt-1 font-mono text-sm opacity-80">p = {p.toFixed(6)}</p>
            <span className="mt-4 inline-flex rounded-full bg-surface/70 px-3 py-1 text-sm font-semibold text-on-surface">
              {result.risk_category}
            </span>
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm opacity-80">Label rawat:</span>
              <span className="rounded-full bg-surface px-4 py-1.5 text-base font-semibold text-on-surface">
                {result.label}
              </span>
              <span className="rounded-full bg-surface/60 px-3 py-1 font-mono text-xs text-on-surface">
                {result.thresholds}
              </span>
            </div>
            <div className="rounded-m3-lg bg-surface p-4 text-sm text-on-surface">
              <p className="m3-title-medium">Rekomendasi</p>
              <p className="mt-1 text-on-surface-variant">{result.recommendation}</p>
            </div>
          </div>
        </div>
      </section>

      {thresholds && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="m3-title-medium">Perbandingan dengan Ambang Keputusan</CardTitle>
            <CardDescription className="text-xs text-on-surface-variant">
              {thresholds.source}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { nama: "Ambang safety", nilai: thresholds.safety },
                  { nama: "Ambang Youden", nilai: thresholds.youden },
                ] as const
              ).map((t) => {
                const diatas = p >= t.nilai;
                return (
                  <div key={t.nama} className="rounded-m3-lg bg-surface-container-high p-4">
                    <p className="text-xs text-on-surface-variant">{t.nama}</p>
                    <p className="font-mono text-lg font-semibold tabular-nums text-on-surface">
                      {t.nilai.toFixed(6)}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      ≈ {(t.nilai * 100).toFixed(2)}% probabilitas
                    </p>
                    <p
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        diatas
                          ? "bg-risk-high-container text-on-risk-high-container"
                          : "bg-risk-low-container text-on-risk-low-container"
                      }`}
                    >
                      p {p.toFixed(6)} {diatas ? "≥" : "<"} {t.nilai.toFixed(6)} →{" "}
                      {diatas ? "di atas ambang" : "di bawah ambang"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              {thresholds.tiers.map((t) => {
                const aktif = t.risk_category.toUpperCase() === result.risk_category.toUpperCase();
                return (
                  <div
                    key={t.risk_category}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-full px-4 py-2 ${
                      aktif
                        ? "bg-primary-container font-medium text-on-primary-container"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    <span>
                      {t.risk_category} · {t.label}
                      {aktif && <span className="ml-2 text-xs">(tier pasien ini)</span>}
                    </span>
                    <span className="font-mono text-xs">{t.range}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="m3-title-medium">Kontribusi Fitur (SHAP)</CardTitle>
            <CardDescription className="text-on-surface-variant">
              Merah = memperberat risiko, hijau = meringankan. Probabilitas dasar (base value) ={" "}
              <span className="font-mono">{(base * 100).toFixed(2)}%</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[320px]">
              <ShapChart features={result.shap_values.features} />
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="m3-title-medium">3 Kontributor Teratas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.contributors_top3.map((c) => {
                const naik = c.shap_contribution >= 0;
                return (
                  <div
                    key={c.name}
                    className="flex items-start gap-3 rounded-m3-lg bg-surface-container-high p-4"
                  >
                    {naik ? (
                      <TrendingUp className="mt-0.5 size-4 shrink-0 text-risk-high" aria-hidden />
                    ) : (
                      <TrendingDown className="mt-0.5 size-4 shrink-0 text-risk-low" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface">
                        {c.name} = {c.value}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {naik ? "Memperberat" : "Meringankan"} risiko sebesar{" "}
                        <span className="font-mono">
                          {(Math.abs(c.shap_contribution) * 100).toFixed(2)} poin persen
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button onClick={onReset} size="lg" className="w-full sm:w-auto">
          <RotateCcw className="size-4" aria-hidden /> Prediksi Pasien Baru
        </Button>
        <Button
          variant="tonal"
          size="lg"
          onClick={onSave}
          disabled={saved}
          className="w-full sm:w-auto"
        >
          <Save className="size-4" aria-hidden /> {saved ? "Tersimpan di Riwayat" : "Simpan Riwayat"}
        </Button>
      </div>
    </div>
  );
}
