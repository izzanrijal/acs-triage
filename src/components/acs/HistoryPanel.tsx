import { History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWaktu, type HistoryEntry } from "@/lib/acs-history";

interface Props {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

function riskText(category: string) {
  const c = category.toUpperCase();
  if (c.includes("HIGH")) return "text-risk-high";
  if (c.includes("INTERMEDIATE")) return "text-risk-medium";
  return "text-risk-low";
}

export function HistoryPanel({ entries, onOpen, onDelete }: Props) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-primary" aria-hidden /> Riwayat Prediksi
        </CardTitle>
        <CardDescription>
          Tersimpan lokal di perangkat ini saja ({entries.length} entri).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat tersimpan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onOpen(e)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium">{e.patientLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWaktu(e.createdAt)} ·{" "}
                    <span className={riskText(e.result.risk_category)}>
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
                  <Trash2 className="size-4 text-muted-foreground" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
