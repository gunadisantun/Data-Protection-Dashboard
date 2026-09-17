import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildReportMetrics, type PdfAssessment } from "./self-assessment-pdf";
import { calculateSelfAssessmentSummary, generateSelfAssessmentActionPlan, selfAssessmentMethodologyVersion, selfAssessmentTemplateVersion } from "./self-assessment";

const W = 595.28, H = 841.89, M = 42, CW = W - M * 2;
const ink = rgb(.09, .15, .23), teal = rgb(.02, .43, .43), muted = rgb(.36, .42, .49);
const light = rgb(.95, .97, .98), line = rgb(.84, .88, .90), white = rgb(1, 1, 1);
const colors = [teal, rgb(.9, .56, .12), rgb(.79, .22, .25), rgb(.35, .46, .64), rgb(.70, .74, .78)];
const clean = (s: unknown) => String(s ?? "-").normalize("NFKC").replace(/[\u2010-\u2015]/g, "-").replace(/[\u0000-\u0008\u000B-\u001F]/g, "");

class Layout {
  page!: PDFPage;
  y = 0;
  section = "";
  constructor(readonly pdf: PDFDocument, readonly regular: PDFFont, readonly bold: PDFFont) {}
  newPage(section: string) {
    this.section = section;
    this.page = this.pdf.addPage([W, H]);
    this.page.drawRectangle({ x: M, y: H - 39, width: 23, height: 3, color: teal });
    this.text("PRIVACY BRO", M + 33, H - 40, 9, true, teal);
    this.text(section, M, H - 66, 9, false, muted);
    this.y = H - 91;
  }
  text(s: unknown, x: number, y: number, size = 10, bold = false, color = ink) {
    this.page.drawText(clean(s), { x, y, size, font: bold ? this.bold : this.regular, color });
  }
  wrap(s: unknown, width: number, size = 10, bold = false) {
    const font = bold ? this.bold : this.regular;
    const result: string[] = [];
    for (const paragraph of clean(s).split(/\r?\n/)) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) { current = candidate; continue; }
        if (current) result.push(current);
        current = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(current + char, size) > width && current) { result.push(current); current = ""; }
          current += char;
        }
      }
      result.push(current);
    }
    return result;
  }
  room(height: number) { if (this.y - height < 52) this.newPage(this.section); }
  paragraph(s: unknown, size = 10, color = ink) {
    for (const row of this.wrap(s, CW, size)) { this.room(16); this.text(row, M, this.y, size, false, color); this.y -= 16; }
    this.y -= 10;
  }
  heading(s: string, newPage = true) {
    if (newPage) this.newPage(s); else this.room(70);
    for (const row of this.wrap(s, CW, 20, true)) { this.text(row, M, this.y, 20, true); this.y -= 28; }
    this.y -= 10;
  }
  table(headers: string[], rows: string[][], widths: number[]) {
    const header = () => {
      const cells = headers.map((v, i) => this.wrap(v, widths[i] - 14, 8, true));
      const height = Math.max(...cells.map(v => v.length)) * 12 + 16;
      this.room(height + 32);
      this.page.drawRectangle({ x: M, y: this.y - height, width: CW, height, color: teal });
      let x = M;
      cells.forEach((values, i) => { values.forEach((v, n) => this.text(v, x + 7, this.y - 14 - n * 12, 8, true, white)); x += widths[i]; });
      this.y -= height;
    };
    header();
    rows.forEach((row, index) => {
      const cells = row.map((v, i) => this.wrap(v, widths[i] - 14, 8.5));
      let offset = 0;
      const length = Math.max(...cells.map(v => v.length));
      const rowHeight = length * 12 + 14;
      if (rowHeight < 600 && this.y - rowHeight < 52) { this.newPage(this.section); header(); }
      while (offset < length) {
        if (this.y - 30 < 52) { this.newPage(this.section); header(); }
        const take = Math.min(length - offset, Math.floor((this.y - 52 - 14) / 12));
        const height = take * 12 + 14;
        this.page.drawRectangle({ x: M, y: this.y - height, width: CW, height, color: index % 2 ? white : light });
        let x = M;
        cells.forEach((values, i) => {
          const visible = i === 0 && offset >= values.length ? values.slice(0, take) : values.slice(offset, offset + take);
          visible.forEach((v, n) => this.text(v, x + 7, this.y - 13 - n * 12, 8.5)); x += widths[i];
        });
        this.y -= height;
        offset += take;
        if (offset < length) { this.newPage(this.section); header(); }
      }
    });
    this.y -= 18;
  }
}

export async function renderDeclarationReport(input: PdfAssessment) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = (name: string) => readFile(path.join(process.cwd(), "templates", "fonts", name));
  const regular = await pdf.embedFont(await font("Poppins-Regular.ttf"), { subset: true });
  const bold = await pdf.embedFont(await font("Poppins-SemiBold.ttf"), { subset: true });
  const k = new Layout(pdf, regular, bold);
  const en = input.locale === "en";
  const t = (id: string, english: string) => en ? english : id;
  const m = buildReportMetrics(input), s = calculateSelfAssessmentSummary(input.answers);
  const pct = (n: number | null) => n === null ? "N/A" : `${n.toFixed(1)}%`;
  const score = pct(s.percentage === null ? null : s.percentage * 100);
  const status = en ? ({ Baik: "Good", "Perlu Perbaikan": "Needs Improvement", "Prioritas Tinggi": "High Priority", "N/A": "N/A" }[s.status] ?? s.status) : s.status;
  const answer = (value: string) => en ? ({ "Sudah Ada": "In Place", "Dalam Proses": "In Progress", "Belum Ada": "Not in Place", "Tidak Relevan": "Not Applicable" }[value] ?? (value || "Unanswered")) : value || "Belum dijawab";
  const review = input.status === "Finalized" ? t("Final - direview DPO", "Final - DPO reviewed") : input.status === "Submitted" ? t("Telah dikirim - menunggu review", "Submitted - awaiting review") : "Draft";
  const sections = [t("Informasi & Metodologi", "Information & Methodology"), t("Ringkasan Eksekutif", "Executive Summary"), t("Analisis Per Area", "Area Analysis"), t("Temuan & Tindak Lanjut", "Findings & Action Plan"), t("Lampiran: Jawaban Lengkap", "Appendix: Full Responses"), t("Lampiran Pendukung", "Supporting Attachments")];
  pdf.setTitle(t("Laporan Self Assessment Kepatuhan PDP", "PDP Self Assessment Report"));
  pdf.setSubject(`Declaration methodology ${selfAssessmentMethodologyVersion}`);

  k.newPage(t("Untuk Penggunaan Internal", "Internal Use"));
  k.y -= 65;
  k.heading(t("Self Assessment\nKepatuhan PDP", "PDP Compliance\nSelf Assessment"), false);
  k.paragraph(t("Laporan deklarasi unit & rencana tindak lanjut", "Unit declaration report & action plan"), 12, muted);
  k.y -= 20;
  k.paragraph(m.unitName, 17);
  k.paragraph(input.assessmentNumber, 10, muted);
  k.page.drawRectangle({ x: M, y: k.y - 116, width: CW, height: 116, color: light });
  k.text(score, M + 18, k.y - 53, 34, true, teal);
  k.text(t("Skor pemenuhan berdasarkan deklarasi", "Self-Declared Fulfillment Score"), M + 18, k.y - 80, 10);
  k.y -= 146;
  k.paragraph(`${t("Status pemenuhan", "Fulfillment status")}: ${status}`);
  k.paragraph(`${t("Status review", "Review status")}: ${review}`);
  k.paragraph(`${t("Periode", "Period")}: ${input.createdAt.slice(0, 10)} - ${input.updatedAt.slice(0, 10)}`);
  k.paragraph(`${t("Metodologi", "Methodology")}: ${selfAssessmentMethodologyVersion}`);
  k.paragraph(t("Berdasarkan deklarasi unit. Lampiran bersifat opsional. Review DPO tidak berarti seluruh kontrol telah diverifikasi secara independen.", "Based on unit declarations. Attachments are optional. DPO review does not mean every control has been independently verified."), 10, muted);

  k.heading(sections[0]);
  k.table([t("Informasi", "Information"), t("Detail", "Details")], [
    [t("Unit", "Unit"), m.unitName], ["Assessment", input.assessmentNumber],
    [t("Disusun oleh", "Prepared by"), m.preparedBy], [t("Direview oleh", "Reviewed by"), input.finalizer ? m.reviewedBy : t("Belum direview", "Not reviewed")],
    ["Status", review], [t("Versi pertanyaan", "Question version"), selfAssessmentTemplateVersion],
    [t("Metodologi", "Methodology"), selfAssessmentMethodologyVersion],
    [t("Tanggal laporan", "Report date"), new Date().toISOString().slice(0, 10)],
  ], [145, CW - 145]);
  k.paragraph(t("Skor dihitung dari 56 kontrol UU yang applicable: Sudah Ada = 1; Dalam Proses = 0,5; Belum Ada dan belum dijawab = 0. Tidak Relevan hanya dikecualikan jika disertai alasan. Panduan PP tidak memengaruhi skor.", "The score uses applicable controls from the 56 UU controls: In Place = 1; In Progress = 0.5; Not in Place and unanswered = 0. Not Applicable is excluded only with a reason. PP guidance does not affect scoring."));
  k.paragraph(t("Report ini bukan legal opinion atau sertifikasi kepatuhan. Lampiran tidak memengaruhi skor, prioritas, atau finalisasi. Temuan perlu dibaca bersama jawaban unit dan hasil klarifikasi DPO.", "This report is not a legal opinion or compliance certification. Attachments do not affect scores, priorities or finalization. Findings should be read alongside unit declarations and DPO clarification."));
  k.paragraph(t("Teks kontrol dan dasar hukum dipertahankan sesuai sumber Bahasa Indonesia.", "Control and legal source wording is preserved in Indonesian."), 9, muted);
  k.paragraph(t("Daftar isi (urutan bagian)", "Contents (section sequence)"), 11);
  sections.forEach((v, i) => k.paragraph(`${i + 1}. ${v}`, 9));

  k.heading(sections[1]);
  k.paragraph(`${score} | ${status} | ${s.applicable}/${s.totalQuestions} ${t("kontrol applicable", "applicable controls")}`, 12, teal);
  const distribution = [m.counts.compliant, s.partial, s.gaps, s.clarification, m.counts.naValid];
  const labels = [t("Sudah Ada", "In Place"), t("Dalam Proses", "In Progress"), t("Control Gap", "Control Gap"), t("Perlu Klarifikasi", "Clarification"), "N/A"];
  let x = M;
  distribution.forEach((n, i) => { const width = n / Math.max(1, s.totalQuestions) * CW; if (width) k.page.drawRectangle({ x, y: k.y - 26, width, height: 26, color: colors[i] }); x += width; });
  k.y -= 53;
  labels.forEach((label, i) => { k.text(`${label}: ${distribution[i]}`, M, k.y, 10, true, colors[i]); k.y -= 23; });
  k.y -= 12;
  k.paragraph(t("Prioritas tindak lanjut", "Follow-up priorities"), 13);
  const priorities = m.areaRows.filter(r => r.gap || r.partial || r.clarification).sort((a,b) => (b.gap + b.partial + b.clarification) - (a.gap + a.partial + a.clarification)).slice(0,5);
  priorities.forEach((r, i) => k.paragraph(`${i + 1}. ${r.area}: ${r.gap} gap; ${r.partial} ${t("dalam proses", "in progress")}; ${r.clarification} ${t("klarifikasi", "clarification")}.`, 9));
  if (!priorities.length) k.paragraph(t("Tidak ada gap atau klarifikasi berdasarkan deklarasi saat ini.", "No gaps or clarification items based on current declarations."));
  k.paragraph(t("DPO meninjau deklarasi dan menindaklanjuti ketidakjelasan. Tidak adanya lampiran bukan temuan ketidakpatuhan.", "DPO reviews declarations and follows up on ambiguity. Missing attachments are not a non-compliance finding."), 9, muted);

  k.heading(sections[2]);
  for (const r of m.areaRows) {
    const lines = k.wrap(r.area, CW, 10, true);
    k.room(lines.length * 15 + 58);
    for (const v of lines) { k.text(v, M, k.y, 10, true); k.y -= 15; }
    k.page.drawRectangle({ x: M, y: k.y - 14, width: CW - 72, height: 10, color: light });
    if (r.fulfillmentScore !== null && r.fulfillmentScore > 0) k.page.drawRectangle({ x: M, y: k.y - 14, width: (CW - 72) * r.fulfillmentScore / 100, height: 10, color: teal });
    k.text(pct(r.fulfillmentScore), W - M - 62, k.y - 14, 10, true);
    k.y -= 34;
    k.text(`${r.applicable} applicable | ${r.gap} gap | ${r.partial} ${t("dalam proses", "partial")} | ${r.clarification} ${t("klarifikasi", "clarification")}`, M, k.y, 8.5, false, muted);
    k.y -= 27;
  }

  k.heading(sections[3]);
  const generated = generateSelfAssessmentActionPlan(input.answers);
  const actions = generated.map(a => {
    const saved = input.actionPlan.find(p => p.questionId === a.questionId);
    return { ...a, followUp: saved?.followUp || a.followUp, priority: saved?.priority || a.priority, owner: saved?.owner || a.owner, targetDate: saved?.targetDate || a.targetDate, status: saved?.status || a.status };
  }).sort((a,b) => ["High", "Medium", "Low"].indexOf(a.priority) - ["High", "Medium", "Low"].indexOf(b.priority));
  if (actions.length > 8) k.paragraph(t("Delapan tindak lanjut prioritas ditampilkan di sini. Register lengkap tersedia pada appendix.", "Eight priority actions are shown here. The complete register is in the appendix."), 9, muted);
  if (!actions.length) k.paragraph(t("Tidak ada tindak lanjut otomatis berdasarkan jawaban unit.", "No automated follow-up items based on unit answers."));
  for (const [i, a] of actions.slice(0, 8).entries()) {
    const item = m.reportQuestions.find(q => q.question.id === a.questionId)!;
    k.room(170);
    k.paragraph(`${i + 1}. ${item.question.area}`, 12, teal);
    k.table([t("Aspek", "Item"), t("Tindak lanjut", "Follow-up")], [
      [t("Jenis", "Type"), item.isClarification ? t("Klarifikasi", "Clarification") : item.normalized === "PARTIAL" ? t("Pemenuhan sebagian", "Partial Fulfillment") : "Control Gap"],
      [t("Kontrol", "Control"), item.question.question], [t("Deklarasi", "Declaration"), answer(item.answer)],
      [t("Rekomendasi", "Recommendation"), a.followUp], [t("Owner / target", "Owner / target"), `${a.owner || t("Belum ditentukan", "Not assigned")} / ${a.targetDate || t("Belum ditentukan", "Not assigned")}`],
      [t("Prioritas / status", "Priority / status"), `${a.priority} / ${a.status}`],
    ], [112, CW - 112]);
  }
  k.heading(sections[4]);
  k.paragraph(t("Register tindak lanjut lengkap", "Complete action register"), 12, teal);
  if (actions.length) k.table(["ID", t("Tindakan", "Action"), "Owner", t("Target / Status", "Target / Status")], actions.map(a => [a.questionId, a.followUp, a.owner || "-", `${a.targetDate || "-"}\n${a.status}`]), [54, 250, 90, CW - 394]);
  k.paragraph(t("Kode internal disertakan hanya untuk penelusuran teknis. Jawaban, catatan, dan lampiran merupakan informasi unit.", "Internal IDs are included for technical traceability only. Answers, notes and attachments are supplied by the unit."), 9, muted);
  k.table(["ID", t("Kontrol / area", "Control / area"), t("Jawaban", "Answer"), t("Catatan", "Notes")], m.reportQuestions.map(q => [q.question.id, `${q.question.area}\n${q.question.question}`, answer(q.answer), q.note.length > 300 ? t("Lihat catatan lengkap setelah tabel.", "See full notes after the table.") : q.note || "-"]), [54, 220, 85, CW - 359]);
  for (const q of m.reportQuestions.filter(q => q.note.length > 300)) {
    k.room(65);
    k.paragraph(`${t("Catatan lengkap", "Full notes")} - ${q.question.id}`, 11, teal);
    k.paragraph(q.note, 9);
  }
  k.heading(sections[5]);
  const files = m.reportQuestions.flatMap(q => q.evidenceFiles.map(f => [q.question.id, q.question.area, f.fileName]));
  if (!files.length) k.paragraph(t("Tidak ada lampiran; lampiran bersifat opsional.", "No attachments; attachments are optional."));
  else k.table(["ID", t("Area", "Area"), t("Nama file", "File name")], files, [64, 185, CW - 249]);
  pdf.getPages().forEach((page, i, pages) => {
    page.drawLine({ start: { x: M, y: 37 }, end: { x: W - M, y: 37 }, color: line, thickness: .6 });
    page.drawText(`Privacy Bro | ${selfAssessmentMethodologyVersion}`, { x: M, y: 23, size: 8, font: regular, color: muted });
    page.drawText(`${i + 1} / ${pages.length}`, { x: W - M - 42, y: 23, size: 8, font: regular, color: muted });
  });
  return Buffer.from(await pdf.save());
}
