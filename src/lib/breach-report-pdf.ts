import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

type BreachReportPdfInput = {
  reportNumber: string;
  title: string;
  status: string;
  createdAt: string;
  finalizedAt?: string | null;
  departmentName?: string | null;
  answers: Record<string, string | string[]>;
};

const templatePath = path.join(process.cwd(), "templates", "formulir-laporan-kegagalan-pdp.pdf");

export async function generateBreachReportPdf(input: BreachReportPdfInput) {
  const templateBytes = await readFile(templatePath);
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const answers = input.answers;

  fillText(form, "Jelaskan darimana dan kapan Anda mengetahui kebocoran data pribadi", text(answers.discoverySource));
  fillText(form, "Jelaskan kronologi kejadian insiden", text(answers.chronology));
  fillRadio(
    form,
    "3 Apakah kebocoran data pribadi disebabkan oleh insiden siber",
    text(answers.cyberIncident),
    {
      Ya: "Ya",
      Tidak: "Tidak",
      "Tidak tahu": "Tidak tahu",
    },
  );
  fillText(form, "Awal insiden [dd-mmm-yyyy]", formatPdfDate(text(answers.attackStart)));
  fillText(form, "Akhir insiden [dd-mmm-yyyy]", formatPdfDate(text(answers.attackEnd)));

  const generalData = text(answers.generalDataDetails);
  const specificData = text(answers.specificDataDetails);
  setCheck(form, "Data pribadi yang bersifat umum", Boolean(generalData));
  setCheck(form, "Data pribadi lainnya", Boolean(specificData));
  fillText(
    form,
    "Jelaskan field apa saja yang bocor dari setiap kategori yang Anda pilih",
    [
      generalData ? `Data pribadi umum: ${generalData}` : "",
      specificData ? `Data pribadi lainnya/spesifik: ${specificData}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  fillText(form, "Jumlah pengguna yang terkena dampak kebocoran data pribadi", text(answers.affectedUsersEstimate));
  fillText(form, "Jumlah record data pribadi yang mengalami kebocoran data pribadi", text(answers.affectedRecordsEstimate));

  const subjectCategories = array(answers.affectedSubjectCategories);
  setCheck(form, "Kategori Data Pribadi - Pengguna", subjectCategories.includes("Pengguna"));
  setCheck(form, "Kategori Data Pribadi - Karyawan", subjectCategories.includes("Karyawan"));
  setCheck(form, "Kategori Data Pribadi - Subscriber", subjectCategories.includes("Subscriber"));
  setCheck(form, "Kategori Data Pribadi - Murid Mahasiswa", subjectCategories.includes("Murid/Mahasiswa"));
  setCheck(
    form,
    "Kategori Data Pribadi - Pelanggan Calon Pelanggan",
    subjectCategories.includes("Pelanggan/Calon pelanggan"),
  );
  setCheck(form, "Kategori Data Pribadi - Pasien", subjectCategories.includes("Pasien"));
  setCheck(form, "Kategori Data Pribadi - Lainnya", subjectCategories.includes("Lainnya"));
  fillText(form, "Lainnya", text(answers.affectedSubjectOther));

  fillRadio(
    form,
    "Kemungkinan terjadinya dampak kebocoran data pribadi",
    text(answers.impactLikelihood),
    {
      "Sangat mungkin": "Dampak - Sangat Mungkin",
      Netral: "Dampak - Netral",
      "Tidak mungkin": "Dampak - Tidak Mungkin",
      "Belum diketahui": "Dampak - Belum diketahui",
    },
  );
  fillText(form, "Dampak kebocoran data pribadi", text(answers.impactDetails));

  fillRadio(
    form,
    "Apakah aspek keamanan sistem elektronik Anda terkena dampaknya",
    text(answers.securityImpacted),
    {
      Ya: "Ya_2",
      Tidak: "Tidak_2",
      "Tidak tahu": "Tidak tahu_2",
    },
  );
  const securityAspects = array(answers.securityAspects);
  setCheck(
    form,
    "Aspek keamanan yang terganggu - Kerahasiaan / Confidentiality",
    securityAspects.includes("Kerahasiaan (Confidentiality)"),
  );
  setCheck(
    form,
    "Aspek keamanan yang terganggu - Keutuhan/Integrity",
    securityAspects.includes("Keutuhan (Integrity)"),
  );
  setCheck(
    form,
    "Aspek keamanan yang terganggu - Ketersediaan/Availability",
    securityAspects.includes("Ketersediaan (Availability)"),
  );

  fillRadio(form, "Waktu Pemulihan", text(answers.recoveryTime), {
    Regular: "Waktu Pemulihan - Regular",
    Supplemented: "Waktu Pemulihan - Supplemented",
    Extended: "Waktu Pemulihan - Extended",
    "Not recoverable": "Waktu Pemulihan - Not Recoverable",
    Complete: "Waktu Pemulihan - Waktu Pemulihan - Complete",
    "Belum diketahui": "Belum diketahui_3",
  });
  fillText(form, "Jelaskan lebih detail menenai waktu pemulihan", text(answers.cyberIncidentDetails));
  fillRadio(form, "Dampak bagi perusahaan Anda", text(answers.companyImpact), {
    Tinggi: "Dampak Tinggi",
    Sedang: "Dampak Sedang",
    Rendah: "Dampak Rendah",
    "Belum diketahui": "Belum diketahui_2",
  });

  fillText(
    form,
    "Langkah yang telah dilakukan untuk mencegah kebocoran data pribadi sebelum insiden",
    text(answers.preventiveStepsBefore),
  );
  fillRadio(form, "Pelatihan PDP", text(answers.trainingLastTwoYears), {
    Ya: "Ya_3",
    Tidak: "Tidak_3",
    "Tidak tahu": "Tidak tahu_3",
  });
  fillText(
    form,
    "Tindakan atau rencana tindakan yang dilakukan untuk menutup celah kebocoran data pribadi",
    text(answers.containmentActions),
  );
  fillText(
    form,
    "Langkah yang ditempuh untuk mencegah kembali terjadinya insiden, rencana waktu dan bukti penutupan celah telah ditutup dengan efektif",
    text(answers.recurrencePreventionPlan),
  );
  fillRadio(form, "Pemberitahuan kepada pemilik data pribadi", text(answers.subjectNotificationStatus), {
    "Ya, kami telah memberitahu pemilik data pribadi yang mengalami kebocoran":
      "Ya kami telah memberitahu pemilik data pribadi yang mengalami kebocoran",
    "Kami sedang dalam proses pemberitahuan kepada pemilik data pribadi":
      "Kami sedang dalam proses pemberitahuan kepada pemilik data pribadi",
    "Tidak, mereka sudah mengetahui kebocoran data pribadi":
      "Tidak mereka sudah mengetahui kebocoran data pribadi",
    "Tidak, namun kami berencana melakukan hal tersebut":
      "Tidak namun kami berencana melakukan hal tersebut",
    "Tidak, kami memutuskan untuk tidak melakukan hal tersebut":
      "Tidak kami memutuskan untuk tidak melakukan hal tersebut",
    Lainnya: "undefined",
  });
  fillText(
    form,
    "Detail mengenai pemberitahuan kepada pemilik data pribadi",
    text(answers.subjectNotificationDetails),
  );

  fillText(form, "Nama Organisasi", text(answers.organizationName));
  fillText(form, "Alamat Organisasi", text(answers.organizationAddress));
  fillText(form, "Nama Sistem Elektronik", text(answers.systemName));
  fillText(form, "Tujuan Pemrosesan Data Pribadi", text(answers.processingPurpose));
  fillText(form, "Nama Penanggungjawab", text(answers.responsibleName));
  fillText(form, "Email Penanggungjawab", text(answers.responsibleEmail));
  fillText(form, "Nama DPO", text(answers.dpoName));
  fillText(form, "Email DPO", text(answers.dpoEmail));

  const signingPlaceDate = text(answers.signingPlaceDate);
  const { place, date } = splitSigningPlaceDate(signingPlaceDate);
  fillText(form, "Tempat ttd", place);
  fillText(form, "Tanggal ttd", date);
  fillText(
    form,
    "Nama dan jabatan",
    [text(answers.authorizedSigner), text(answers.signerPosition)].filter(Boolean).join(" - "),
  );

  form.updateFieldAppearances(font);
  form.flatten();

  return pdf.save();
}

function fillText(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, value: string) {
  if (!value.trim()) {
    return;
  }

  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch {
    // Ignore missing template fields so export remains resilient to template revisions.
  }
}

function setCheck(
  form: ReturnType<PDFDocument["getForm"]>,
  fieldName: string,
  checked: boolean,
) {
  try {
    const field = form.getCheckBox(fieldName);
    if (checked) {
      field.check();
    } else {
      field.uncheck();
    }
  } catch {
    // Ignore missing template fields so export remains resilient to template revisions.
  }
}

function fillRadio(
  form: ReturnType<PDFDocument["getForm"]>,
  fieldName: string,
  value: string,
  optionMap: Record<string, string>,
) {
  const option = optionMap[value];

  if (!option) {
    return;
  }

  try {
    form.getRadioGroup(fieldName).select(option);
  } catch {
    // Ignore missing or changed option values in template revisions.
  }
}

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : String(value ?? "").trim();
}

function array(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function formatPdfDate(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(parsed)
    .replace(/ /g, "-");
}

function splitSigningPlaceDate(value: string) {
  if (!value) {
    return { place: "", date: "" };
  }

  const parts = value.split(",").map((part) => part.trim());

  if (parts.length >= 2) {
    return {
      place: parts[0],
      date: parts.slice(1).join(", "),
    };
  }

  return {
    place: value,
    date: "",
  };
}
