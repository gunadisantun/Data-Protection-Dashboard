import ExcelJS from "exceljs";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/import-self-assessment-pp.mjs <mapping.xlsx>");
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(source);
const mapping = workbook.getWorksheet("Mapping UU ke PP");
const documents = workbook.getWorksheet("Mapping Dokumen");
if (!mapping || !documents) throw new Error("Required mapping sheets are missing");
const controls = JSON.parse(await readFile(new URL("../src/lib/self-assessment-controller-questions.json", import.meta.url), "utf8"));
const text = (row, col) => row.getCell(col).text.normalize("NFKC").trim();
const articleNumber = (value) => Number(value.match(/^Pasal\s+(\d+)\b/i)?.[1]) || null;
const byArticle = new Map();
const unmapped = [];
let currentUu = null;
let topic = "";
let note = "";
mapping.eachRow((row, sourceRow) => {
  if (sourceRow === 1) return;
  if (text(row, 3)) {
    currentUu = articleNumber(text(row, 3));
    topic = text(row, 1);
    note = text(row, 7);
  }
  const ppText = text(row, 4);
  const ppArticle = articleNumber(ppText);
  if (!ppArticle) {
    if (currentUu && ppText) unmapped.push({ uuArticle: currentUu, note: ppText, sourceRow });
    return;
  }
  const linkedControls = controls.filter((q) => articleNumber(q.reference) === currentUu);
  if (!linkedControls.length) return;
  let record = byArticle.get(ppArticle);
  if (!record) {
    record = {
      id: `PP-PDP-${ppArticle}`,
      number: ppArticle, articleText: ppText,
      officialExplanation: text(row, 6),
      reference: `PP No. 33 Tahun 2026 - Pasal ${ppArticle}`,
      mappedUuArticles: [], mappedUuQuestionIds: [], mappingNotes: [], documentReferences: [],
      sourceWorkbook: basename(source), sourceSheet: mapping.name, sourceRow,
    };
    byArticle.set(ppArticle, record);
  } else if (record.articleText !== ppText) {
    throw new Error(`Conflicting text for PP article ${ppArticle}, row ${sourceRow}`);
  }
  if (!record.mappedUuArticles.includes(currentUu)) record.mappedUuArticles.push(currentUu);
  for (const control of linkedControls) if (!record.mappedUuQuestionIds.includes(control.id)) record.mappedUuQuestionIds.push(control.id);
  record.mappingNotes.push({ uuArticle: currentUu, topic, note: text(row, 7) || note, sourceRow });
});
let document = null;
documents.eachRow((row, sourceRow) => {
  if (sourceRow === 1) return;
  if (text(row, 2)) document = { name: text(row, 2), status: text(row, 3), trigger: text(row, 4) };
  const ppArticle = articleNumber(text(row, 8));
  const record = byArticle.get(ppArticle);
  if (!document || !record) return;
  const existing = record.documentReferences.find((item) => item.name === document.name);
  if (existing) {
    existing.sourceRows.push(sourceRow);
    return;
  }
  record.documentReferences.push({ ...document, relevance: text(row, 11), sourceRows: [sourceRow] });
});
const articles = [...byArticle.values()].sort((a, b) => a.number - b.number);
if (articles.length !== 162) throw new Error(`Expected 162 unique mapped PP articles; found ${articles.length}`);
await writeFile(new URL("../src/lib/self-assessment-pp-guidance.json", import.meta.url), `${JSON.stringify({ sourceWorkbook: basename(source), articles, unmapped }, null, 2)}\n`);
console.log(`Imported ${articles.length} PP guidance articles, ${articles.reduce((n, q) => n + q.mappingNotes.length, 0)} source mappings. No assessment questions generated.`);
