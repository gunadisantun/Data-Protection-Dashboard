import ExcelJS from "exceljs";
import { writeFile } from "node:fs/promises";
import { basename } from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/import-self-assessment-workbook.mjs <workbook.xlsx>");
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(source);
const sheet = workbook.getWorksheet("Kontrol Asesmen Pengendali");
if (!sheet || !workbook.getWorksheet("Informasi Asesmen")) throw new Error("Required worksheets are missing");
const cellText = (row, column) => row.getCell(column).text.normalize("NFKC").trim();
const answerOptions = [6, 7, 8, 9].map((row) => cellText(sheet.getRow(row), 10));
if (answerOptions.join("|") !== "Sudah Ada|Dalam Proses|Belum Ada|Tidak Relevan") throw new Error("Unexpected status dictionary");
const questions = [];
let chapter = "";
let section = "";
sheet.eachRow((row, sourceRow) => {
  const article = cellText(row, 1);
  if (article.startsWith("BAB ")) {
    chapter = article;
    section = "";
    return;
  }
  if (article.startsWith("Bagian ")) {
    section = article;
    return;
  }
  if (!/^\d/.test(article)) return;
  const control = cellText(row, 3);
  if (!control || !chapter) throw new Error(`Incomplete control at row ${sourceRow}`);
  const evidence = cellText(row, 5);
  const objective = cellText(row, 4);
  const area = section.startsWith("Bagian Ketiga") ? "Kewajiban Prosesor Data Pribadi"
    : section.startsWith("Bagian Keempat") ? "Fungsi Pelindungan Data Pribadi"
    : chapter.startsWith("BAB IV:") ? "Hak Subjek Data Pribadi"
    : chapter.startsWith("BAB V:") ? "Pemrosesan Data Pribadi"
    : chapter.startsWith("BAB VI:") ? "Kewajiban Pengendali Data Pribadi"
    : chapter.startsWith("BAB VII:") ? "Transfer Data Pribadi"
    : "Larangan Penggunaan Data Pribadi";
  questions.push({
    id: `CTRL-PDP-${article.replace(/[^0-9]+/g, "-").replace(/-$/, "")}`,
    kind: "UNIT",
    level: "SINGLE",
    number: questions.length + 1,
    triggerOrOwner: "",
    area,
    chapter,
    section,
    question: control,
    objective,
    articleText: cellText(row, 2),
    applicability: "",
    evidence,
    minimumEvidence: evidence,
    reference: `Pasal ${article}`,
    articleReference: `Pasal ${article}`,
    module: area,
    answerOptions,
    evidenceRequirementFlag: "Opsional",
    suggestedRemediation: `Tindak lanjuti kontrol berikut: ${control}\nTujuan: ${objective}`,
    sourceWorkbook: basename(source),
    sourceSheet: sheet.name,
    sourceRow,
  });
});
if (questions.length !== 56 || new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error("Expected 56 uniquely identified controls");
// Only configuration is imported. Auditee answers, notes, names and contact details stay in the source workbook.
await writeFile(new URL("../src/lib/self-assessment-controller-questions.json", import.meta.url), `${JSON.stringify(questions, null, 2)}\n`);
console.log(`Imported ${questions.length} controls in ${new Set(questions.map((q) => q.area)).size} sections.`);
