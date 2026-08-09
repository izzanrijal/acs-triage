import { useRef } from "react";
import { AlertTriangle, ArrowLeft, Ban, Calculator, Loader2, RotateCcw, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  FEATURE_GROUPS,
  incompleteLabels,
  isExcluded,
  validateAll,
  type FeatureKey,
  type HelperValues,
  type PartialFeatureValues,
  type Sex,
} from "@/lib/acs-features";

interface Props {
  values: PartialFeatureValues;
  helpers: HelperValues;
  onChange: (key: FeatureKey, value: number | null) => void;
  onHelperChange: (patch: Partial<HelperValues>) => void;
  missingFromParse: FeatureKey[];
  egfrAuto: boolean;
  onSubmit: () => void;
  onBack: () => void;
  onNewPatient: () => void;
  isPredicting: boolean;
  error?: string | null;
}

export function FeatureFormStep({
  values,
  helpers,
  onChange,
  onHelperChange,
  missingFromParse,
  egfrAuto,
  onSubmit,
  onBack,
  onNewPatient,
  isPredicting,
  error,
}: Props) {
  const errors = validateAll(values);
  const belum = incompleteLabels(values);
  const isValid = belum.length === 0;
  const excluded = isExcluded(values, helpers);
  const jumlahKosong = missingFromParse.length;
  const formRef = useRef<HTMLDivElement>(null);

  const fokusFieldPertama = () => {
    const first = FEATURES.find((f) => errors[f.key]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`#${first.key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  const renderField = (key: FeatureKey) => {
    const def = FEATURES.find((f) => f.key === key)!;
    const value = values[def.key];
    const err = errors[def.key];
    const missing = missingFromParse.includes(def.key) && (value === null || value === undefined);
    const auto = def.key === "egfr" && egfrAuto && value != null;
    const describedBy = `${def.key}-desc`;

    const stateClass = missing
      ? "border-warning bg-warning/10"
      : err
        ? "border-destructive/60"
        : auto
          ? "border-primary/50 bg-primary/5"
          : undefined;

    return (
      <div key={def.key} className="min-w-0 space-y-1.5">
        <Label htmlFor={def.key} className="text-sm font-medium">
          {def.label} <span className="font-normal text-muted-foreground">({def.unit})</span>
        </Label>

        {def.key === "killip" ? (
          <Select
            value={value != null ? String(value) : ""}
            onValueChange={(v) => onChange("killip", v ? Number(v) : null)}
          >
            <SelectTrigger
              id={def.key}
              aria-describedby={describedBy}
              className={value === 4 ? "border-destructive bg-destructive/10" : stateClass}
            >
              <SelectValue placeholder="Pilih kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Killip I</SelectItem>
              <SelectItem value="2">Killip II</SelectItem>
              <SelectItem value="3">Killip III</SelectItem>
              <SelectItem value="4">Killip IV (eksklusi)</SelectItem>
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
            aria-invalid={err ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) =>
              onChange(def.key, e.target.value === "" ? null : Number(e.target.value))
            }
            className={stateClass}
          />
        )}

        <p id={describedBy} className="text-xs">
          {missing ? (
            <span className="text-warning">Tidak ditemukan di laporan — isi manual</span>
          ) : err ? (
            <span className="text-destructive">{err}</span>
          ) : auto ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Calculator className="size-3" aria-hidden /> Dihitung otomatis dari kreatinin{" "}
              {helpers.kreatinin} mg/dL (CKD-EPI 2021)
            </span>
          ) : def.hint ? (
            <span className="text-muted-foreground">{def.hint}</span>
          ) : (
            <span className="text-muted-foreground">
              Rentang {def.min}–{def.max}
            </span>
          )}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-5" ref={formRef}>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Stethoscope className="size-5 shrink-0 text-primary" aria-hidden />
            Langkah 2 — Validasi &amp; Koreksi Data
          </CardTitle>
          <CardDescription>
            Periksa setiap nilai hasil ekstraksi. Anda bertanggung jawab memastikan data benar
            sebelum prediksi dijalankan.
          </CardDescription>
        </CardHeader>
        {jumlahKosong > 0 && (
          <CardContent>
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                {jumlahKosong} parameter tidak ditemukan di laporan dan ditandai kuning. Mohon
                dilengkapi secara manual.
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {FEATURE_GROUPS.map((g) => (
        <Card key={g.id} className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {g.title}
            </CardTitle>
            <CardDescription className="text-xs">{g.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {FEATURES.filter((f) => f.group === g.id).map((f) => renderField(f.key))}
            </div>

            {g.id === "vital" && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium">Kriteria Eksklusi Penelitian</p>
                <label className="mt-3 flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={helpers.syok === true}
                    onCheckedChange={(c) => onHelperChange({ syok: c === true })}
                    aria-label="Syok saat di IGD"
                    className="mt-0.5"
                  />
                  <span>
                    Syok saat di IGD
                    <span className="block text-xs text-muted-foreground">
                      Syok kardiogenik / butuh vasopresor saat tiba di IGD
                    </span>
                  </span>
                </label>
              </div>
            )}

            {g.id === "lab" && (
              <div className="grid gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="kreatinin" className="text-sm font-medium">
                    Kreatinin <span className="font-normal text-muted-foreground">(mg/dL)</span>
                  </Label>
                  <Input
                    id="kreatinin"
                    type="number"
                    inputMode="decimal"
                    step={0.01}
                    min={0.1}
                    max={30}
                    value={helpers.kreatinin ?? ""}
                    onChange={(e) =>
                      onHelperChange({
                        kreatinin: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Bukan input model — hanya untuk menghitung eGFR
                  </p>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="jenis-kelamin" className="text-sm font-medium">
                    Jenis Kelamin
                  </Label>
                  <Select
                    value={helpers.jenisKelamin ?? ""}
                    onValueChange={(v) => onHelperChange({ jenisKelamin: (v || null) as Sex | null })}
                  >
                    <SelectTrigger id="jenis-kelamin">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Diperlukan formula CKD-EPI 2021 bila eGFR dihitung otomatis
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {excluded && (
        <div className="flex items-start gap-3 rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <Ban className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="space-y-3">
            <p className="font-semibold">
              Pasien termasuk kriteria eksklusi penelitian (syok kardiogenik / Killip IV).
            </p>
            <p>Model tidak dapat digunakan pada populasi ini, sehingga prediksi dihentikan.</p>
            <Button variant="outline" size="sm" onClick={onNewPatient}>
              <RotateCcw className="size-4" aria-hidden /> Mulai Pasien Baru
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        {!isValid && !excluded && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{belum.length} parameter</span> belum
            lengkap: {belum.join(", ")}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span onClick={!isValid && !excluded ? fokusFieldPertama : undefined} className="contents">
            <Button
              onClick={onSubmit}
              disabled={!isValid || excluded || isPredicting}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isPredicting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Menghitung risiko &amp;
                  SHAP…
                </>
              ) : (
                "Kirim untuk Prediksi"
              )}
            </Button>
          </span>
          {!isValid && !excluded && (
            <Button variant="ghost" size="lg" className="w-full sm:w-auto" onClick={fokusFieldPertama}>
              Sorot parameter pertama yang kosong
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={isPredicting}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="size-4" aria-hidden /> Kembali &amp; Parsing Ulang
          </Button>
        </div>
      </div>
    </div>
  );
}
