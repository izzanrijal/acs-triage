import { RotateCcw, Save, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShapChart } from "./ShapChart";
import type { PredictResponse, ThresholdsResponse } from "@/lib/acs-api";

interface Props {
  result: PredictResponse;
  thresholds?: ThresholdsResponse;
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
  const persen = (result.probability * 100).toFixed(1);
  const base = result.shap_values.base_value;

  return (
    <div className="space-y-6">
      <Card className={`border-2 shadow-sm ${riskClasses(result.risk_category)}`}>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-[minmax(0,220px)_1fr] md:items-center">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium opacity-80">Probabilitas mortalitas in-hospital</p>
            <p className="mt-1 text-6xl font-bold tabular-nums leading-none">{persen}%</p>
            <p className="mt-2 text-lg font-semibold">{result.risk_category}</p>
          </div>
          <div className="space-y-3">
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

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,340px)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Kontribusi Fitur (SHAP)</CardTitle>
            <CardDescription>
              Merah = memperberat risiko, hijau = meringankan. Probabilitas dasar (base value) ={" "}
              <span className="font-mono">{(base * 100).toFixed(2)}%</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShapChart features={result.shap_values.features} />
          </CardContent>
        </Card>

        <div className="space-y-6">
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

          {thresholds && (
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ambang Triage Aktif</CardTitle>
                <CardDescription className="text-xs">{thresholds.source}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {thresholds.tiers.map((t) => (
                  <div key={t.risk_category} className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {t.risk_category} · {t.label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{t.range}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onReset} size="lg">
          <RotateCcw className="size-4" aria-hidden /> Prediksi Baru
        </Button>
        <Button variant="outline" size="lg" onClick={onSave} disabled={saved}>
          <Save className="size-4" aria-hidden /> {saved ? "Tersimpan di Riwayat" : "Simpan Riwayat"}
        </Button>
      </div>
    </div>
  );
}
