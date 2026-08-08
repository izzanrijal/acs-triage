import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/acs/AppHeader";
import { SoapInputStep } from "@/components/acs/SoapInputStep";
import { FeatureFormStep } from "@/components/acs/FeatureFormStep";
import { ResultStep } from "@/components/acs/ResultStep";
import { HistoryPanel } from "@/components/acs/HistoryPanel";
import { getThresholds, postPredict, type PredictResponse } from "@/lib/acs-api";
import {
  FEATURE_KEYS,
  toPayload,
  type FeatureKey,
  type PartialFeatureValues,
} from "@/lib/acs-features";
import { parseSoap } from "@/lib/soap-parse.functions";
import {
  addHistory,
  loadHistory,
  removeHistory,
  type HistoryEntry,
} from "@/lib/acs-history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ACS Mortality Risk Assistant — Prediksi Risiko Mortalitas SKA" },
      {
        name: "description",
        content:
          "Alat bantu klinis berbasis Random Forest untuk memprediksi risiko mortalitas in-hospital pasien SKA (STEMI/NSTEMI) dari catatan SOAP, lengkap dengan triage dan penjelasan SHAP.",
      },
      { property: "og:title", content: "ACS Mortality Risk Assistant" },
      {
        property: "og:description",
        content:
          "Prediksi risiko mortalitas in-hospital pasien SKA dari catatan SOAP: parsing AI, validasi klinis, triage Ward/HCU/ICU, dan penjelasan SHAP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Beranda,
});

type Step = 1 | 2 | 3;

const emptyValues: PartialFeatureValues = {};

function Beranda() {
  const [step, setStep] = useState<Step>(1);
  const [soap, setSoap] = useState("");
  const [values, setValues] = useState<PartialFeatureValues>(emptyValues);
  const [missing, setMissing] = useState<FeatureKey[]>([]);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const { data: thresholds } = useQuery({
    queryKey: ["thresholds"],
    queryFn: getThresholds,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const parse = useServerFn(parseSoap);

  const parseMutation = useMutation({
    mutationFn: (text: string) => parse({ data: { soap: text } }),
    onSuccess: ({ features }) => {
      const next: PartialFeatureValues = {};
      const kosong: FeatureKey[] = [];
      for (const key of FEATURE_KEYS) {
        const v = features[key];
        if (v === null || v === undefined || Number.isNaN(v)) {
          kosong.push(key);
        } else {
          next[key] = key === "killip" ? Math.round(v) : v;
        }
      }
      setValues(next);
      setMissing(kosong);
      setStep(2);
    },
  });

  const predictMutation = useMutation({
    mutationFn: () => postPredict(toPayload(values)),
    onSuccess: (res) => {
      setResult(res);
      setSaved(false);
      setStep(3);
    },
  });

  const handleManual = useCallback(() => {
    setValues({});
    setMissing([...FEATURE_KEYS]);
    setStep(2);
  }, []);

  const handleChange = useCallback((key: FeatureKey, value: number | null) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (value !== null) setMissing((prev) => prev.filter((k) => k !== key));
  }, []);

  const handleReset = () => {
    setStep(1);
    setResult(null);
    setValues({});
    setMissing([]);
    setSaved(false);
    predictMutation.reset();
    parseMutation.reset();
  };

  const handleSave = () => {
    if (!result) return;
    const payload = toPayload(values);
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      patientLabel: `Usia ${payload.usia} th · Killip ${payload.killip} · EF ${payload.lvef}%`,
      input: payload,
      result,
    };
    setHistory(addHistory(entry));
    setSaved(true);
  };

  const openHistory = (entry: HistoryEntry) => {
    setValues(entry.input);
    setMissing([]);
    setResult(entry.result);
    setSaved(true);
    setStep(3);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const parseError =
    parseMutation.error instanceof Error ? parseMutation.error.message : null;
  const predictError =
    predictMutation.error instanceof Error ? predictMutation.error.message : null;

  const langkah = [
    { n: 1, label: "Input Laporan" },
    { n: 2, label: "Validasi Data" },
    { n: 3, label: "Hasil Prediksi" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader thresholds={thresholds} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {langkah.map((l, i) => (
            <li key={l.n} className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step === l.n
                    ? "bg-primary text-primary-foreground"
                    : step > l.n
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {l.n}
              </span>
              <span className={step === l.n ? "font-medium text-foreground" : "text-muted-foreground"}>
                {l.label}
              </span>
              {i < langkah.length - 1 && <span className="mx-1 text-muted-foreground">›</span>}
            </li>
          ))}
        </ol>

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,300px)]">
          <div className="space-y-6">
            {step === 1 && (
              <SoapInputStep
                value={soap}
                onChange={setSoap}
                onParse={() => parseMutation.mutate(soap)}
                onManual={handleManual}
                isParsing={parseMutation.isPending}
                error={parseError}
              />
            )}

            {step === 2 && (
              <FeatureFormStep
                values={values}
                onChange={handleChange}
                missingFromParse={missing}
                onSubmit={() => predictMutation.mutate()}
                onBack={() => setStep(1)}
                isPredicting={predictMutation.isPending}
                error={predictError}
              />
            )}

            {step === 3 && result && (
              <ResultStep
                result={result}
                thresholds={thresholds}
                onReset={handleReset}
                onSave={handleSave}
                saved={saved}
              />
            )}
          </div>

          <aside className="space-y-6">
            <HistoryPanel
              entries={history}
              onOpen={openHistory}
              onDelete={(id) => setHistory(removeHistory(id))}
            />
          </aside>
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
          Alat bantu keputusan klinis — bukan pengganti penilaian dokter. Prediksi berbasis model
          statistik; keputusan akhir tetap pada klinisi.
        </div>
      </footer>
    </div>
  );
}
