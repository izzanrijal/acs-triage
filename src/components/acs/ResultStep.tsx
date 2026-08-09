import { RotateCcw, Save, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShapChart } from "./ShapChart";
import type { PredictResponse, ThresholdsResponse } from "@/lib/acs-api";

interface Props {
  result: PredictResponse;
  thresholds?: ThresholdsResponse | undefined;
  onReset: () => void;
  onSave: () => void;
  saved: boolean;
}

function riskClasses(category: string) {
  const c = category.toUpperCase();
  if (c.includes("HIGH")) return "bg-risk-high/10 text-risk-high border-risk-high/40";
  if (c.includes("INTERMEDIATE")) return "bg-risk-medium/10 text-risk-medium border-risk-medium/40";
  return "bg-risk-low/10 text-risk-low border-risk-low/40";
}

export function ResultStep({ result, thresholds, onReset, onSave, saved }: Props) {
  const p = result.probability;
  const persen = (p * 100).toFixed(1);
  const base = result.shap_values.base_value;

  return (
    <div className="space-y-6">
      <Card className={`border-2 shadow-sm ${riskClasses(result.risk_category)}`}>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-[minmax(0,220px)_1fr] md:items-center">
          <div className="min-w-0 text-center md:text-left">
            <p className="text-sm font-medium opacity-80">Probabilitas mortalitas in-hospital</p>
            <p className="mt-1 text-5xl font-bold leading-none tabular-nums sm:text-6xl">
              {persen}%
            </p>
            <p className="mt-1 font-mono text-sm opacity-80">p = {p.toFixed(6)}</p>
            <p className="mt-2 text-lg font-semibold">{result.risk_category}</p>
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm opacity-80">Label rawat:</span>
              <Badge variant="outline" className="border-current text-base font-semibold">
                {result.label}
              </Badge>
              <span className="rounded bg-background/60 px-2 py-0.5 font-mono text-xs">
                {result.thresholds}
              </span>
            </div>
            <div className="rounded-md bg-background/70 p-3 text-sm text-foreground">
              <p className="font-medium">Rekomendasi</p>
              <p className="mt-1 text-muted-foreground">{result.recommendation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {thresholds && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Perbandingan dengan Ambang Keputusan</CardTitle>
            <CardDescription className="text-xs">{thresholds.source}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { nama: "Ambang safety", nilai: thresholds.safety },
                  { nama: "Ambang Youden", nilai: thresholds.youden },
                ] as const
              ).map((t) => {
                const diatas = p >= t.nilai;
                return (
                  <div key={t.nama} className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">{t.nama}</p>
                    <p className="font-mono text-lg font-semibold tabular-nums">
                      {t.nilai.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ {(t.nilai * 100).toFixed(2)}% probabilitas
                    </p>
                    <p
                      className={`mt-1 text-xs font-medium ${
                        diatas ? "text-risk-high" : "text-risk-low"
                      }`}
                    >
                      p pasien {p.toFixed(6)} {diatas ? "≥" : "<"} {t.nilai.toFixed(6)} →{" "}
                      {diatas ? "di atas ambang" : "di bawah ambang"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              {thresholds.tiers.map((t) => {
                const aktif = t.risk_category.toUpperCase() === result.risk_category.toUpperCase();
                return (
                  <div
                    key={t.risk_category}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 ${
                      aktif ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span>
                      {t.risk_category} · {t.label}
                      {aktif && <span className="ml-2 text-xs text-primary">(tier pasien ini)</span>}
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
        <Card className="min-w-0 border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Kontribusi Fitur (SHAP)</CardTitle>
            <CardDescription>
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
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">3 Kontributor Teratas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.contributors_top3.map((c) => {
                const naik = c.shap_contribution >= 0;
                return (
                  <div
                    key={c.name}
                    className="flex items-start gap-3 rounded-md border border-border/70 p-3"
                  >
                    {naik ? (
                      <TrendingUp className="mt-0.5 size-4 shrink-0 text-risk-high" aria-hidden />
                    ) : (
                      <TrendingDown className="mt-0.5 size-4 shrink-0 text-risk-low" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {c.name} = {c.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
          variant="outline"
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
