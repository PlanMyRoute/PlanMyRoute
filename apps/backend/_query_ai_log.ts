import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Precios Gemini 2.5 Flash (USD por 1M tokens). AJUSTAR si la tarifa real difiere.
const PRICE_INPUT_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 2.5;

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function main() {
  const { data, error } = await supabase
    .from("ai_generation_log")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("ERROR:", error.message);
    process.exit(1);
  }
  const rows = data ?? [];
  const n = rows.length;

  const byOutcome: Record<string, number> = {};
  for (const r of rows) byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;
  const successRows = rows.filter((r) => r.outcome === "success");

  const latencies = rows
    .map((r) => r.latency_ms)
    .filter((x): x is number => typeof x === "number");
  const successLatencies = successRows
    .map((r) => r.latency_ms)
    .filter((x): x is number => typeof x === "number");

  const promptTok = successRows
    .map((r) => r.prompt_tokens)
    .filter((x): x is number => typeof x === "number");
  const complTok = successRows
    .map((r) => r.completion_tokens)
    .filter((x): x is number => typeof x === "number");
  const totalTok = successRows
    .map((r) => r.total_tokens)
    .filter((x): x is number => typeof x === "number");

  // Coste por generación (solo filas con tokens de prompt y completion)
  const costs: number[] = [];
  for (const r of successRows) {
    if (typeof r.prompt_tokens === "number" && typeof r.completion_tokens === "number") {
      const c =
        (r.prompt_tokens / 1e6) * PRICE_INPUT_PER_M +
        (r.completion_tokens / 1e6) * PRICE_OUTPUT_PER_M;
      costs.push(c);
    }
  }

  // Quality flags
  let daysOutOfRange = 0;
  let unverifiedRows = 0;
  const unverifiedNames: string[] = [];
  for (const r of rows) {
    const qf = r.quality_flags as Record<string, unknown> | null;
    if (!qf) continue;
    if (Array.isArray(qf.days_out_of_range) && qf.days_out_of_range.length > 0)
      daysOutOfRange++;
    if (Array.isArray(qf.unverified_places) && qf.unverified_places.length > 0) {
      unverifiedRows++;
      unverifiedNames.push(...(qf.unverified_places as string[]));
    }
  }

  const firstDate = rows[0]?.created_at ?? "-";
  const lastDate = rows[n - 1]?.created_at ?? "-";
  const distinctTrips = new Set(rows.map((r) => r.trip_id).filter((x) => x != null)).size;

  console.log("================ ai_generation_log ================");
  console.log(`Total generaciones registradas : ${n}`);
  console.log(`Rango temporal                 : ${firstDate}  →  ${lastDate}`);
  console.log(`Viajes distintos (trip_id)     : ${distinctTrips}`);
  console.log("--- Outcome ---");
  for (const [k, v] of Object.entries(byOutcome)) {
    console.log(`  ${k.padEnd(18)}: ${v}  (${((v / n) * 100).toFixed(1)}%)`);
  }
  const successRate = n > 0 ? (successRows.length / n) * 100 : 0;
  console.log(`  ÉXITO ESTRUCTURAL : ${successRate.toFixed(1)}%`);
  console.log("--- Latencia (ms) ---");
  console.log(`  mediana (todas)   : ${median(latencies)}  (${median(latencies) != null ? (median(latencies)! / 1000).toFixed(1) : "-"} s)`);
  console.log(`  media   (todas)   : ${mean(latencies)?.toFixed(0)}  (${mean(latencies) != null ? (mean(latencies)! / 1000).toFixed(1) : "-"} s)`);
  console.log(`  mediana (success) : ${median(successLatencies)}  (${median(successLatencies) != null ? (median(successLatencies)! / 1000).toFixed(1) : "-"} s)`);
  console.log(`  min / max (todas) : ${Math.min(...latencies)} / ${Math.max(...latencies)}`);
  console.log("--- Tokens (success) ---");
  console.log(`  prompt      media : ${mean(promptTok)?.toFixed(0)}  (mediana ${median(promptTok)})`);
  console.log(`  completion  media : ${mean(complTok)?.toFixed(0)}  (mediana ${median(complTok)})`);
  console.log(`  total       media : ${mean(totalTok)?.toFixed(0)}  (mediana ${median(totalTok)})`);
  console.log(`--- Coste (Gemini 2.5 Flash @ in $${PRICE_INPUT_PER_M}/M, out $${PRICE_OUTPUT_PER_M}/M) ---`);
  console.log(`  n con tokens      : ${costs.length}`);
  console.log(`  coste medio/viaje : $${mean(costs)?.toFixed(4)}`);
  console.log(`  coste mediano     : $${median(costs)?.toFixed(4)}`);
  console.log("--- Quality flags ---");
  console.log(`  days_out_of_range : ${daysOutOfRange} generacion(es)`);
  console.log(`  unverified_places : ${unverifiedRows} generacion(es)`);
  if (unverifiedNames.length) console.log(`     lugares: ${unverifiedNames.join(" | ")}`);
  console.log("===================================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
