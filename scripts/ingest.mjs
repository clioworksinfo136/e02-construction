/**
 * Ingest the daily construction reports into the "Construction" Amplify table.
 *
 * Reads scripts/data/construction.json (generated from construction-report.xlsx)
 * and creates one record per spreadsheet row.
 *
 * Requires a deployed backend (amplify_outputs.json in the project root):
 *   npx ampx sandbox --once
 *   node scripts/ingest.mjs [--wipe]
 *
 * Pass --outputs <path> (or set AMPLIFY_OUTPUTS) to target another environment,
 * e.g. outputs generated for a deployed branch.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const flag = process.argv.indexOf("--outputs");
const outputsPath =
  (flag !== -1 ? process.argv[flag + 1] : process.env.AMPLIFY_OUTPUTS) ??
  join(root, "amplify_outputs.json");

console.log(`Using outputs: ${outputsPath}`);
const outputs = JSON.parse(readFileSync(outputsPath, "utf-8"));
Amplify.configure(outputs);
const client = generateClient({ authMode: "apiKey" });

const rows = JSON.parse(
  readFileSync(join(here, "data", "construction.json"), "utf-8")
);

async function listAll() {
  const all = [];
  let nextToken = null;
  do {
    const res = await client.models.Construction.list({ limit: 200, nextToken });
    all.push(...res.data);
    nextToken = res.nextToken;
  } while (nextToken);
  return all;
}

const existing = await listAll();

if (process.argv.includes("--wipe")) {
  console.log(`Deleting ${existing.length} existing records...`);
  for (const r of existing) {
    await client.models.Construction.delete({ id: r.id });
  }
  existing.length = 0;
}

// Skip rows already ingested (sourceFile is unique per daily report).
const seen = new Set(existing.map((r) => r.sourceFile));

let created = 0;
let skipped = 0;
let failed = 0;

for (const row of rows) {
  if (seen.has(row.sourceFile)) {
    skipped++;
    continue;
  }
  const { data, errors } = await client.models.Construction.create(row);
  if (errors) {
    failed++;
    console.error(`FAILED ${row.sourceFile}:`, JSON.stringify(errors));
  } else {
    created++;
    seen.add(data.sourceFile);
  }
}

console.log(
  `Done. created=${created} skipped(existing)=${skipped} failed=${failed} total_rows=${rows.length}`
);
