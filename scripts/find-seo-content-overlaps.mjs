#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import {
  loadSeoContentMetadata,
  rankSimilarSeoContent,
} from "./seo-content-reference-tools.mjs";

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
if (args[0] === "--") args.shift();
const options = { query: "", additionalQueries: [], limit: 12, minScore: 0.12, json: false };

function usage() {
  console.log(`الاستخدام:
  pnpm --filter @workspace/scripts run seo:find-overlaps -- --query "موضوع مقترح"
  pnpm --filter @workspace/scripts run seo:find-overlaps -- --query "المسابح" --also "فلاتر المسبح"

الخيارات:
  --query <عبارة>       العبارة الأساسية (مطلوبة)
  --also <عبارة>        مرادف/صياغة إضافية؛ يمكن تكرارها
  --limit <عدد>         أقصى عدد نتائج (1–100، الافتراضي 12)
  --min-score <0..1>    أدنى درجة تشابه لغوي (الافتراضي 0.12)
  --db <مسار>           قاعدة SQLite بديلة؛ الافتراضي data/sabaik.db
  --json                إخراج النتائج بصيغة JSON`);
}

function readValue(index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`قيمة الخيار ${name} مطلوبة.`);
  return value;
}

let dbPath;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--help" || arg === "-h") {
    usage();
    process.exit(0);
  } else if (arg === "--query") {
    options.query = readValue(index, arg);
    index += 1;
  } else if (arg === "--also") {
    options.additionalQueries.push(readValue(index, arg));
    index += 1;
  } else if (arg === "--limit") {
    options.limit = Number(readValue(index, arg));
    index += 1;
  } else if (arg === "--min-score") {
    options.minScore = Number(readValue(index, arg));
    index += 1;
  } else if (arg === "--db") {
    dbPath = resolve(readValue(index, arg));
    index += 1;
  } else if (arg === "--json") {
    options.json = true;
  } else {
    throw new Error(`خيار غير معروف: ${arg}`);
  }
}

if (!options.query.trim()) {
  usage();
  process.exitCode = 2;
} else {
  try {
    const records = loadSeoContentMetadata(dbPath ? { dbPath } : undefined);
    const queries = [options.query, ...options.additionalQueries];
    const byRecord = new Map();

    for (const query of queries) {
      for (const match of rankSimilarSeoContent(query, records, options)) {
        const key = `${match.kind}:${match.id}`;
        const previous = byRecord.get(key);
        if (!previous || match.score > previous.score) {
          byRecord.set(key, { ...match, matchedQueries: [query] });
        } else if (!previous.matchedQueries.includes(query)) {
          previous.matchedQueries.push(query);
        }
      }
    }

    const matches = [...byRecord.values()]
      .sort((left, right) => right.score - left.score || String(left.title).localeCompare(String(right.title), "ar"))
      .slice(0, options.limit);

    if (options.json) {
      console.log(JSON.stringify({
        databaseRecordsSearched: records.length,
        contentBodiesRead: 0,
        queries,
        matches,
      }, null, 2));
    } else {
      console.log(`فُحصت بيانات العناوين والكلمات والمسارات فقط في ${records.length} سجلًا؛ لم تُقرأ أجسام الصفحات أو المقالات.`);
      console.log(`عبارات البحث: ${queries.join(" | ")}`);
      if (!matches.length) {
        console.log("لم تظهر نتائج فوق حد التشابه المحدد. هذا لا يثبت وحده اختلاف نية البحث.");
      } else {
        for (const match of matches) {
          const state = [
            match.active === null ? "" : match.active ? "نشط" : "غير نشط",
            match.status || "",
          ].filter(Boolean).join("/");
          const route = match.route ? `/${match.route}` : "—";
          console.log(
            `${String(match.scorePercent).padStart(3, " ")}% | ${match.kind}${state ? ` (${state})` : ""} | ${match.title} | ${route} | مطابق: ${match.matchedTerms.join("، ")}`,
          );
        }
      }
      console.log("النتائج قائمة مرشحين لغوية للمراجعة، وليست حكمًا آليًا على تطابق نية البحث.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
