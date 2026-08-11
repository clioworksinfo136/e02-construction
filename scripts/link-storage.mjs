/**
 * Link each Construction record to its source document in S3.
 *
 * Lists everything under `reports/` in the constructionReports bucket and
 * matches objects to records by file name (`sourceFile`), then writes the
 * resolved S3 key to the record's `storageKey` attribute.
 *
 * Matching is by file name, not by the spreadsheet's `filePath`: `filePath`
 * places the five October 2014 reports in an "October 2014" folder, but on
 * disk (and so in the bucket) they live under "November 2014".
 *
 *   node scripts/link-storage.mjs
 *
 * Pass --outputs <path> (or set AMPLIFY_OUTPUTS) to target another environment,
 * e.g. outputs generated for a deployed branch.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { list } from "aws-amplify/storage";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const flag = process.argv.indexOf("--outputs");
const outputsPath =
  (flag !== -1 ? process.argv[flag + 1] : process.env.AMPLIFY_OUTPUTS) ??
  join(root, "amplify_outputs.json");

console.log(`Using outputs: ${outputsPath}`);
Amplify.configure(JSON.parse(readFileSync(outputsPath, "utf-8")));
const client = generateClient({ authMode: "apiKey" });

// --- every object under reports/, keyed by lower-cased file name ---
const byFileName = new Map();
let nextToken;
do {
  const page = await list({ path: "reports/", options: { nextToken } });
  for (const item of page.items) {
    byFileName.set(item.path.split("/").pop().toLowerCase(), item.path);
  }
  nextToken = page.nextToken;
} while (nextToken);
console.log(`Found ${byFileName.size} objects under reports/`);

// --- every Construction record ---
const records = [];
let token = null;
do {
  const res = await client.models.Construction.list({
    limit: 200,
    nextToken: token,
  });
  records.push(...res.data);
  token = res.nextToken;
} while (token);
console.log(`Found ${records.length} Construction records`);

let linked = 0;
let unchanged = 0;
let unmatched = 0;
let failed = 0;
const referenced = new Set();

for (const r of records) {
  const key = byFileName.get((r.sourceFile ?? "").toLowerCase());
  if (!key) {
    unmatched++;
    console.warn(`NO OBJECT for sourceFile=${r.sourceFile}`);
    continue;
  }
  referenced.add(key);
  if (r.storageKey === key) {
    unchanged++;
    continue;
  }
  const { errors } = await client.models.Construction.update({
    id: r.id,
    storageKey: key,
  });
  if (errors) {
    failed++;
    console.error(`FAILED ${r.sourceFile}:`, JSON.stringify(errors));
  } else {
    linked++;
  }
}

const orphans = [...byFileName.values()].filter((k) => !referenced.has(k));

console.log(
  `Done. linked=${linked} already_linked=${unchanged} unmatched=${unmatched} failed=${failed}`
);
if (orphans.length) {
  console.log(`Objects with no matching record (${orphans.length}):`);
  for (const o of orphans) console.log(`  ${o}`);
}
