import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ShapFeature } from "@/lib/acs-api";

interface Props {
  features: ShapFeature[];
}

export function ShapChart({ features }: Props) {
  const data = [...features]
    .sort((a, b) => Math.abs(b.shap_contribution) - Math.abs(a.shap_contribution))
    .map((f) => ({
      name: f.name,
      value: f.value,
      kontribusi: Number(f.shap_contribution.toFixed(5)),
      positif: f.shap_contribution >= 0,
    }));

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <ReferenceLine x={0} stroke="var(--border)" />
          <Tooltip
            cursor={{ fill: "color-mix(in oklab, var(--muted) 60%, transparent)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--popover-foreground)",
            }}
            formatter={(val: number, _n, item) => [
              `${val > 0 ? "+" : ""}${val.toFixed(4)} (${val >= 0 ? "memperberat" : "meringankan"})`,
              `Nilai: ${(item?.payload as { value: number } | undefined)?.value ?? "-"}`,
            ]}
          />
          <Bar dataKey="kontribusi" radius={[3, 3, 3, 3]}>
            {data.map((d) => (
              <Cell
                key={d.name}
                fill={d.positif ? "var(--risk-high)" : "var(--risk-low)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
