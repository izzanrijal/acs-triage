import { useQuery } from "@tanstack/react-query";
import { Activity, HeartPulse, ShieldAlert } from "lucide-react";
import { getHealth, type ThresholdsResponse } from "@/lib/acs-api";

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "error";
}) {
  const toneClass =
    tone === "ok"
      ? "bg-risk-low-container text-on-risk-low-container"
      : tone === "error"
        ? "bg-error-container text-on-error-container"
        : "bg-surface-container-high text-on-surface-variant";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function AppHeader({ thresholds }: { thresholds?: ThresholdsResponse | undefined }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 60000,
    retry: 1,
  });

  const terhubung = !isError && data?.status === "ok";

  return (
    <header className="bg-surface-container">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-m3-lg bg-primary-container text-on-primary-container">
            <HeartPulse className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="m3-headline-small truncate text-on-surface">
              ACS Mortality Risk Assistant
            </h1>
            <p className="m3-body-medium truncate text-on-surface-variant">
              Prediksi risiko mortalitas in-hospital pasien SKA (STEMI/NSTEMI)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={isLoading ? "neutral" : terhubung ? "ok" : "error"}>
            <Activity className="size-3.5" aria-hidden />
            {isLoading ? "Memeriksa API…" : terhubung ? "API Terhubung" : "API Tidak Terhubung"}
          </Chip>
          <Chip>
            Random Forest · AUC {data?.auc_mean ? data.auc_mean.toFixed(3) : "0.816"} · N=1.524
          </Chip>
          {thresholds && (
            <Chip>
              <ShieldAlert className="size-3.5" aria-hidden />
              Ambang {thresholds.safety.toFixed(4)} / {thresholds.youden.toFixed(4)}
            </Chip>
          )}
        </div>
      </div>
    </header>
  );
}
