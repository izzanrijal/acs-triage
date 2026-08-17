import { useState } from "react";
import { Loader2, Sparkles, PencilLine, FileText, Info } from "lucide-react";
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
    <Card className="overflow-hidden">
      <CardHeader className="gap-2 pb-4">
        <span className="flex size-10 items-center justify-center rounded-m3-md bg-tertiary-container text-on-tertiary-container">
          <FileText className="size-5" aria-hidden />
        </span>
        <CardTitle className="m3-headline-small">Langkah 1 — Tempel Laporan Pasien</CardTitle>
        <CardDescription className="m3-body-medium text-on-surface-variant">
          Tempel laporan jaga / catatan SOAP apa adanya dalam satu kolom. AI akan mengekstrak 13
          parameter klinis, lalu Anda validasi sebelum prediksi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Contoh: Assalamualaikum dokter, mohon izin melaporkan pasien baru di IGD ... S: ... O: Tensi 141/95 mmHg, Nadi 97 x/menit ... Echo: EF 38% (BIPLANE), TAPSE 2.2 cm, LVOT VTI 16 cm ..."
          className="min-h-[320px] resize-y bg-surface-container-lowest font-mono text-sm leading-relaxed"
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
            size="lg"
            onClick={() => {
              onChange(CONTOH_LAPORAN);
              setShowSample(true);
            }}
          >
            Muat contoh laporan
          </Button>
        </div>

        {showSample && (
          <p className="text-xs text-on-surface-variant">
            Contoh laporan dimuat. Klik “Parsing dengan AI” untuk mencoba.
          </p>
        )}

        {error && (
          <div className="rounded-m3-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-m3-md bg-surface-container-high px-4 py-3 text-xs text-on-surface-variant">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Teks dikirim ke layanan AI melalui server aplikasi (kunci API tidak pernah tampil di
            browser). Hindari menyertakan identitas pasien bila tidak diperlukan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
