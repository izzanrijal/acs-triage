import { useState } from "react";
import { Loader2, Sparkles, PencilLine, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTOH_LAPORAN } from "@/lib/acs-sample";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onParse: () => void;
  onManual: () => void;
  isParsing: boolean;
  error?: string | null;
}

export function SoapInputStep({ value, onChange, onParse, onManual, isParsing, error }: Props) {
  const [showSample, setShowSample] = useState(false);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="size-5 text-primary" aria-hidden />
          Langkah 1 — Tempel Laporan Pasien
        </CardTitle>
        <CardDescription>
          Tempel laporan jaga / catatan SOAP apa adanya dalam satu kolom. AI akan mengekstrak 13
          parameter klinis, lalu Anda validasi sebelum prediksi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Contoh: Assalamualaikum dokter, mohon izin melaporkan pasien baru di IGD ... S: ... O: Tensi 141/95 mmHg, Nadi 97 x/menit ... Echo: EF 38% (BIPLANE), TAPSE 2.2 cm, LVOT VTI 16 cm ..."
          className="min-h-[320px] resize-y font-mono text-sm leading-relaxed"
          spellCheck={false}
          aria-label="Teks laporan pasien"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onParse} disabled={isParsing || value.trim().length < 20} size="lg">
            {isParsing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Memproses laporan…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden /> Parsing dengan AI
              </>
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={onManual} disabled={isParsing}>
            <PencilLine className="size-4" aria-hidden /> Isi Manual
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(CONTOH_LAPORAN);
              setShowSample(true);
            }}
          >
            Muat contoh laporan
          </Button>
        </div>

        {showSample && (
          <p className="text-xs text-muted-foreground">
            Contoh laporan dimuat. Klik “Parsing dengan AI” untuk mencoba.
          </p>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Teks dikirim ke layanan AI melalui server aplikasi (kunci API tidak pernah tampil di
          browser). Hindari menyertakan identitas pasien bila tidak diperlukan.
        </p>
      </CardContent>
    </Card>
  );
}
