import { History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWaktu, type HistoryEntry } from "@/lib/acs-history";

interface Props {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

function riskChip(category: string) {
  const c = category.toUpperCase();
  if (c.includes("HIGH")) return "bg-risk-high-container text-on-risk-high-container";
  if (c.includes("INTERMEDIATE")) return "bg-risk-medium-container text-on-risk-medium-container";
  return "bg-risk-low-container text-on-risk-low-container";
}

export function HistoryPanel({ entries, onOpen, onDelete }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="m3-title-medium flex items-center gap-2">
          <History className="size-4 text-primary" aria-hidden /> Riwayat Prediksi
        </CardTitle>
        <CardDescription className="text-xs text-on-surface-variant">
          Tersimpan lokal di perangkat ini saja ({entries.length} entri).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-m3-md bg-surface-container-high px-4 py-6 text-center text-sm text-on-surface-variant">
            Belum ada riwayat tersimpan.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-m3-md bg-surface-container-high px-3 py-2.5 transition-colors duration-200 ease-m3-emphasized hover:bg-surface-container-highest"
              >
                <button
                  type="button"
                  onClick={() => onOpen(e)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <p className="truncate text-sm font-medium text-on-surface">{e.patientLabel}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                    {formatWaktu(e.createdAt)}
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${riskChip(e.result.risk_category)}`}
                    >
                      {(e.result.probability * 100).toFixed(1)}% · {e.result.label}
                    </span>
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(e.id)}
                  aria-label={`Hapus riwayat ${e.patientLabel}`}
                >
                  <Trash2 className="size-4 text-on-surface-variant" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
