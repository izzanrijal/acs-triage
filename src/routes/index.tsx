import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
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
  calculateEgfr2021,
  toPayload,
  type FeatureKey,
  type HelperValues,
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

const emptyHelpers: HelperValues = { kreatinin: null, jenisKelamin: null, syok: false };

function Beranda() {
  const [step, setStep] = useState<Step>(1);
  const [soap, setSoap] = useState("");
  const [values, setValues] = useState<PartialFeatureValues>({});
  const [helpers, setHelpers] = useState<HelperValues>(emptyHelpers);
  const [egfrAuto, setEgfrAuto] = useState(false);
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

  const resetPatientState = useCallback(() => {
    setSoap("");
    setValues({});
    setHelpers(emptyHelpers);
    setEgfrAuto(false);
    setMissing([]);
    setResult(null);
    setSaved(false);
  }, []);

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

      const nextHelpers: HelperValues = {
        kreatinin: features.kreatinin ?? null,
        jenisKelamin: features.jenis_kelamin ?? null,
        syok: features.syok === true,
      };

      let auto = false;
      if (next.egfr == null) {
        const hitung = calculateEgfr2021(
          nextHelpers.kreatinin,
          next.usia ?? null,
          nextHelpers.jenisKelamin ?? null,
        );
        if (hitung != null) {
          next.egfr = hitung;
          auto = true;
          const i = kosong.indexOf("egfr");
          if (i >= 0) kosong.splice(i, 1);
        }
      }

      setValues(next);
      setHelpers(nextHelpers);
      setEgfrAuto(auto);
      setMissing(kosong);
      setResult(null);
      setSaved(false);
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
    setHelpers(emptyHelpers);
    setEgfrAuto(false);
    setMissing([...FEATURE_KEYS]);
    setStep(2);
  }, []);

  const handleChange = useCallback((key: FeatureKey, value: number | null) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === "egfr") setEgfrAuto(false);
    if (value !== null) setMissing((prev) => prev.filter((k) => k !== key));
  }, []);

  const handleHelperChange = useCallback(
    (patch: Partial<HelperValues>) => {
      const next = { ...helpers, ...patch };
      setHelpers(next);
      if (values.egfr == null || egfrAuto) {
        const hitung = calculateEgfr2021(
          next.kreatinin,
          values.usia ?? null,
          next.jenisKelamin ?? null,
        );
        if (hitung != null) {
          setValues((v) => ({ ...v, egfr: hitung }));
          setEgfrAuto(true);
          setMissing((m) => m.filter((k) => k !== "egfr"));
        }
      }
    },
    [helpers, values.egfr, values.usia, egfrAuto],
  );


  const handleNewPatient = () => {
    resetPatientState();
    predictMutation.reset();
    parseMutation.reset();
    setStep(1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
    setHelpers(emptyHelpers);
    setEgfrAuto(false);
    setMissing([]);
    setResult(entry.result);
    setSaved(true);
    setStep(3);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const parseError = parseMutation.error instanceof Error ? parseMutation.error.message : null;
  const predictError =
    predictMutation.error instanceof Error ? predictMutation.error.message : null;

  const langkah = [
    { n: 1, label: "Input Laporan" },
    { n: 2, label: "Validasi Data" },
    { n: 3, label: "Hasil Prediksi" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AppHeader thresholds={thresholds} />

      <div className="sticky top-0 z-30 bg-surface-container/95 backdrop-blur supports-[backdrop-filter]:bg-surface-container/85">
        <nav
          aria-label="Langkah alur prediksi"
          className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6"
        >
          {langkah.map((l, i) => {
            const aktif = step === l.n;
            const selesai = step > l.n;
            return (
              <div key={l.n} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={`flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 transition-colors duration-200 ease-m3-emphasized ${
                    aktif
                      ? "bg-primary text-on-primary"
                      : selesai
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface/25 text-xs font-semibold">
                    {selesai ? <Check className="size-3.5" aria-hidden /> : l.n}
                  </span>
                  <span
                    className={`m3-label-large truncate ${aktif ? "" : "hidden sm:inline"}`}
                  >
                    {l.label}
                  </span>
                </div>
                {i < langkah.length - 1 && (
                  <span
                    aria-hidden
                    className={`h-1 flex-1 rounded-full ${
                      selesai ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <div className="min-w-0 space-y-6">
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
                helpers={helpers}
                onChange={handleChange}
                onHelperChange={handleHelperChange}
                missingFromParse={missing}
                egfrAuto={egfrAuto}
                onSubmit={() => predictMutation.mutate()}
                onBack={() => setStep(1)}
                onNewPatient={handleNewPatient}
                isPredicting={predictMutation.isPending}
                error={predictError}
              />
            )}

            {step === 3 && result && (
              <ResultStep
                result={result}
                thresholds={thresholds}
                onReset={handleNewPatient}
                onSave={handleSave}
                saved={saved}
              />
            )}
          </div>

          <aside className="min-w-0 space-y-6">
            <HistoryPanel
              entries={history}
              onOpen={openHistory}
              onDelete={(id) => setHistory(removeHistory(id))}
            />
          </aside>
        </div>
      </main>

      <footer className="mt-8 bg-surface-container">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 text-xs text-on-surface-variant sm:px-6">
          <div className="space-y-1">
            <p className="m3-title-medium text-on-surface">
              Model dikembangkan dari tesis Izzan Rijal Muslim, et al.
            </p>
            <p className="uppercase leading-relaxed tracking-wide">
              “Model Random Forest untuk Prediksi Mortalitas In-Hospital pada Pasien Infark Miokard
              dengan Elevasi Segmen ST (STEMI) dan Tanpa Elevasi Segmen ST (NSTEMI) di Instalasi
              Gawat Darurat”
            </p>
          </div>
          <p className="rounded-m3-lg bg-surface-container-high px-4 py-3">
            Alat bantu keputusan klinis — bukan pengganti penilaian dokter. Prediksi berbasis model
            statistik; keputusan akhir tetap pada klinisi.
          </p>
        </div>
      </footer>
    </div>
  );
}
