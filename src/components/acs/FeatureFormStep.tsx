import { AlertTriangle, ArrowLeft, Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FEATURES,
  validateAll,
  type FeatureKey,
  type PartialFeatureValues,
} from "@/lib/acs-features";

interface Props {
  values: PartialFeatureValues;
  onChange: (key: FeatureKey, value: number | null) => void;
  missingFromParse: FeatureKey[];
  onSubmit: () => void;
  onBack: () => void;
  isPredicting: boolean;
  error?: string | null;
}

export function FeatureFormStep({
  values,
  onChange,
  missingFromParse,
  onSubmit,
  onBack,
  isPredicting,
  error,
}: Props) {
  const errors = validateAll(values);
  const isValid = Object.keys(errors).length === 0;
  const jumlahKosong = missingFromParse.length;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Stethoscope className="size-5 text-primary" aria-hidden />
          Langkah 2 — Validasi &amp; Koreksi Data
        </CardTitle>
        <CardDescription>
          Periksa setiap nilai hasil ekstraksi. Anda bertanggung jawab memastikan data benar sebelum
          prediksi dijalankan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {jumlahKosong > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              {jumlahKosong} parameter tidak ditemukan di laporan dan ditandai kuning. Mohon
              dilengkapi secara manual.
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((def) => {
            const value = values[def.key];
            const err = errors[def.key];
            const missing = missingFromParse.includes(def.key) && (value === null || value === undefined);

            return (
              <div key={def.key} className="space-y-1.5">
                <Label htmlFor={def.key} className="text-sm font-medium">
                  {def.label}{" "}
                  <span className="font-normal text-muted-foreground">({def.unit})</span>
                </Label>

                {def.key === "killip" ? (
                  <Select
                    value={value != null ? String(value) : ""}
                    onValueChange={(v) => onChange("killip", v ? Number(v) : null)}
                  >
                    <SelectTrigger
                      id={def.key}
                      className={missing ? "border-warning bg-warning/10" : undefined}
                    >
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Killip I</SelectItem>
                      <SelectItem value="2">Killip II</SelectItem>
                      <SelectItem value="3">Killip III</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={def.key}
                    type="number"
                    inputMode="decimal"
                    step={def.step}
                    min={def.min}
                    max={def.max}
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange(def.key, e.target.value === "" ? null : Number(e.target.value))
                    }
                    className={missing ? "border-warning bg-warning/10" : undefined}
                  />
                )}

                {missing ? (
                  <p className="text-xs text-warning">Tidak ditemukan di laporan — isi manual</p>
                ) : err ? (
                  <p className="text-xs text-destructive">{err}</p>
                ) : def.hint ? (
                  <p className="text-xs text-muted-foreground">{def.hint}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Rentang {def.min}–{def.max}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={onSubmit} disabled={!isValid || isPredicting} size="lg">
            {isPredicting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Menghitung risiko &amp; SHAP…
              </>
            ) : (
              "Kirim untuk Prediksi"
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={onBack} disabled={isPredicting}>
            <ArrowLeft className="size-4" aria-hidden /> Kembali &amp; Parsing Ulang
          </Button>
          {!isValid && (
            <span className="text-xs text-muted-foreground">
              Lengkapi semua parameter dengan nilai valid untuk mengaktifkan tombol prediksi.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
