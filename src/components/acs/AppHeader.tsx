import { useQuery } from "@tanstack/react-query";
import { Activity, HeartPulse, ShieldAlert } from "lucide-react";
import { getHealth, type ThresholdsResponse } from "@/lib/acs-api";

export function AppHeader({ thresholds }: { thresholds?: ThresholdsResponse }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 60000,
    retry: 1,
  });

  const terhubung = !isError && data?.status === "ok";

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HeartPulse className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              ACS Mortality Risk Assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              Prediksi risiko mortalitas in-hospital pasien SKA (STEMI/NSTEMI)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              isLoading
                ? "border-border text-muted-foreground"
                : terhubung
                  ? "border-risk-low/40 bg-risk-low/10 text-risk-low"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            <Activity className="size-3.5" aria-hidden />
            {isLoading ? "Memeriksa API…" : terhubung ? "API Terhubung" : "API Tidak Terhubung"}
          </span>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
            Random Forest 500 trees | AUC{" "}
            {data?.auc_mean ? data.auc_mean.toFixed(3) : "0.816"} | N=1.524 | Killip I–III
          </span>
          {thresholds && (
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground lg:inline-flex">
              <ShieldAlert className="size-3.5" aria-hidden />
              Ambang: {thresholds.safety.toFixed(4)} / {thresholds.youden.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
