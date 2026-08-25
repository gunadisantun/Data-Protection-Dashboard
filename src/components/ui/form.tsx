import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  children,
  help,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { help?: React.ReactNode }) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {help ? <FieldHelp>{help}</FieldHelp> : null}
    </label>
  );
}

export function FieldHelp({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex align-middle">
      <input
        type="checkbox"
        aria-label="Tampilkan penjelasan field"
        className="peer sr-only"
      />
      <span
        className="flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[10px] font-bold leading-none text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-100 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200"
        aria-hidden="true"
      >
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 top-6 z-40 hidden w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium leading-5 text-slate-600 shadow-xl peer-checked:block peer-focus-visible:block">
        {children}
      </span>
    </span>
  );
}

export function defaultFieldHelp(label: string) {
  const normalized = label.toLowerCase();
  const matches = (patterns: string[]) =>
    patterns.some((pattern) => normalized.includes(pattern));

  if (matches(["nama aktivitas", "activity name"])) {
    return "Pertanyaan ini mengidentifikasi kegiatan pemrosesan secara spesifik agar mudah ditelusuri, dibedakan dari aktivitas lain, dan dikaitkan dengan kewajiban PDP yang relevan.";
  }

  if (matches(["unit kerja", "department", "departemen", "unit"])) {
    return "Pertanyaan ini menentukan unit yang bertanggung jawab atas proses, keputusan, dan tindak lanjut kepatuhan terhadap aktivitas atau laporan ini.";
  }

  if (matches(["pic", "person in charge", "penanggung jawab", "responsible"])) {
    return "Pertanyaan ini menunjukkan pihak yang dapat dimintai klarifikasi, bukti, dan koordinasi atas pemrosesan atau asesmen yang sedang didokumentasikan.";
  }

  if (matches(["pengendali", "prosesor", "controller", "processor"])) {
    return "Pertanyaan ini memetakan peran para pihak dalam ekosistem pemrosesan data pribadi, termasuk siapa yang menentukan tujuan/cara pemrosesan dan siapa yang memproses atas instruksi.";
  }

  if (matches(["dpo", "pelindung data pribadi"])) {
    return "Pertanyaan ini menghubungkan aktivitas dengan fungsi DPO/Petugas PDP sebagai kontak tata kelola, konsultasi, dan eskalasi kepatuhan.";
  }

  if (matches(["deskripsi aktivitas", "description"])) {
    return "Pertanyaan ini menjelaskan konteks nyata pemrosesan: apa yang dilakukan, sistem atau pihak yang terlibat, dan bagaimana data pribadi digunakan dalam kegiatan tersebut.";
  }

  if (matches(["tujuan pemrosesan", "processing purpose"])) {
    return "Pertanyaan ini menguji alasan substantif pemrosesan data pribadi. Tujuannya harus jelas, spesifik, sah, dan tidak lebih luas dari kebutuhan aktivitas.";
  }

  if (matches(["dasar pemrosesan", "lawful basis", "legal basis"])) {
    return "Pertanyaan ini menentukan dasar hukum yang membenarkan pemrosesan data pribadi. Dasar ini mempengaruhi kewajiban pembuktian, hak subjek data, dan kebutuhan asesmen lanjutan.";
  }

  if (matches(["sumber pengumpulan", "collection source", "sumber data"])) {
    return "Pertanyaan ini menelusuri asal data pribadi diperoleh, misalnya langsung dari subjek data, sistem internal, vendor, atau integrasi lain, untuk menilai transparansi dan akurasi.";
  }

  if (matches(["kategori subjek", "subject categor"])) {
    return "Pertanyaan ini mengidentifikasi kelompok orang yang datanya diproses, karena risiko, hak, dan ekspektasi perlindungan dapat berbeda untuk karyawan, pelanggan, anak, pasien, atau pihak lain.";
  }

  if (matches(["data pribadi umum", "jenis data pribadi", "personal data"])) {
    return "Pertanyaan ini memetakan jenis informasi yang dapat mengidentifikasi seseorang. Informasi ini menjadi dasar untuk menilai minimisasi data, transparansi, retensi, dan risiko.";
  }

  if (matches(["data pribadi spesifik", "specific personal", "sensitive"])) {
    return "Pertanyaan ini menilai apakah terdapat data yang lebih sensitif menurut UU PDP, seperti kesehatan, biometrik, genetika, data anak, atau catatan kejahatan, yang dapat memicu kewajiban DPIA.";
  }

  if (matches(["hak subjek", "data subject rights"])) {
    return "Pertanyaan ini memastikan organisasi memahami hak apa saja yang dapat dipenuhi dalam aktivitas tersebut, termasuk akses, perbaikan, penghapusan, pembatasan, keberatan, dan portabilitas.";
  }

  if (matches(["transfer", "pengiriman", "penerima", "recipient"])) {
    return "Pertanyaan ini memetakan apakah data pribadi dibagikan kepada pihak lain, untuk tujuan apa, kepada siapa, dan dengan mekanisme apa, sehingga akuntabilitas dan pengamanan transfer dapat dinilai.";
  }

  if (matches(["cross-border", "lintas negara", "negara transfer", "destination"])) {
    return "Pertanyaan ini menilai apakah data pribadi keluar dari Indonesia atau diakses dari negara lain. Jawaban ini menentukan kebutuhan TIA dan perlindungan transfer lintas negara.";
  }

  if (matches(["mekanisme pelindungan", "safeguard", "scc", "dpa"])) {
    return "Pertanyaan ini menjelaskan instrumen perlindungan yang digunakan untuk mengurangi risiko transfer, misalnya klausul kontrak, DPA, persetujuan, penilaian negara tujuan, atau approval DPO.";
  }

  if (matches(["retensi", "retention"])) {
    return "Pertanyaan ini menilai berapa lama data pribadi disimpan dan kapan harus dihapus atau dimusnahkan, agar pemrosesan tidak berlangsung lebih lama dari tujuan yang sah.";
  }

  if (matches(["langkah teknis", "technical", "kontrol teknis"])) {
    return "Pertanyaan ini menilai kontrol keamanan berbasis teknologi yang melindungi data pribadi, seperti enkripsi, akses berbasis peran, logging, masking, backup, dan monitoring.";
  }

  if (matches(["langkah organisasi", "organizational", "kontrol organisasi"])) {
    return "Pertanyaan ini menilai tata kelola non-teknis yang mendukung perlindungan data, seperti SOP, pelatihan, approval, review akses, vendor due diligence, dan pembagian tanggung jawab.";
  }

  if (matches(["risiko tinggi", "high risk", "pasal 34"])) {
    return "Pertanyaan ini menilai apakah aktivitas memenuhi kriteria pemrosesan berisiko tinggi berdasarkan Pasal 34 UU PDP, yang dapat memicu kewajiban DPIA.";
  }

  if (matches(["risk description", "kejadian risiko", "risk event", "risk source"])) {
    return "Pertanyaan ini merumuskan skenario risiko secara jelas: sumber risiko, peristiwa yang mungkin terjadi, dan dampaknya terhadap hak atau kepentingan subjek data.";
  }

  if (matches(["impact", "dampak", "akibat hukum"])) {
    return "Pertanyaan ini menilai konsekuensi yang mungkin timbul bagi subjek data, organisasi, atau kepatuhan hukum apabila risiko atau insiden terjadi.";
  }

  if (matches(["likelihood", "kemungkinan"])) {
    return "Pertanyaan ini menilai seberapa mungkin risiko atau dampak terjadi, dengan mempertimbangkan konteks pemrosesan, kontrol yang ada, dan riwayat kejadian.";
  }

  if (matches(["existing treatment", "existing control", "kontrol yang sudah ada"])) {
    return "Pertanyaan ini mencatat kontrol yang sudah berjalan saat ini agar residual risk dapat dinilai secara realistis, bukan hanya berdasarkan risiko awal.";
  }

  if (matches(["treatment plan", "rencana mitigasi", "recommended action"])) {
    return "Pertanyaan ini menjelaskan tindakan tambahan yang perlu dilakukan untuk menurunkan risiko ke tingkat yang dapat diterima.";
  }

  if (matches(["target date", "due date", "target waktu"])) {
    return "Pertanyaan ini menetapkan batas waktu pelaksanaan agar tindak lanjut risiko atau kewajiban tidak hanya menjadi catatan, tetapi bisa dimonitor sampai selesai.";
  }

  if (matches(["status", "monitoring", "approval", "persetujuan"])) {
    return "Pertanyaan ini menunjukkan posisi tindak lanjut saat ini, apakah masih terbuka, sedang diproses, sudah disetujui, atau sudah selesai.";
  }

  if (matches(["legitimate interest", "kepentingan sah", "balancing"])) {
    return "Pertanyaan ini menilai apakah kepentingan pengendali seimbang dengan hak dan kebebasan subjek data sebelum dasar kepentingan sah dapat digunakan.";
  }

  if (matches(["necessity", "necessity test", "kebutuhan"])) {
    return "Pertanyaan ini menilai apakah pemrosesan benar-benar diperlukan untuk mencapai tujuan, atau ada cara lain yang lebih minim menggunakan data pribadi.";
  }

  if (matches(["mitigation", "safeguard", "langkah mitigasi"])) {
    return "Pertanyaan ini menjelaskan perlindungan tambahan untuk mengurangi risiko terhadap subjek data dan memperkuat akuntabilitas organisasi.";
  }

  if (matches(["kronologi", "chronology"])) {
    return "Pertanyaan ini membangun urutan kejadian insiden agar penyebab, waktu, pihak yang terlibat, dan tindakan awal dapat dipahami secara objektif.";
  }

  if (matches(["mengetahui kebocoran", "discovery"])) {
    return "Pertanyaan ini menjelaskan bagaimana insiden pertama kali diketahui, sehingga organisasi dapat menilai kecepatan deteksi dan kualitas mekanisme monitoring.";
  }

  if (matches(["insiden siber", "cyber"])) {
    return "Pertanyaan ini membedakan apakah kegagalan PDP berasal dari serangan/insiden siber atau faktor non-siber, karena tindak lanjut teknis dan bukti yang dibutuhkan bisa berbeda.";
  }

  if (matches(["jumlah pengguna", "jumlah record", "terkena dampak", "affected"])) {
    return "Pertanyaan ini memperkirakan skala subjek data dan data yang terdampak untuk menilai tingkat urgensi, prioritas notifikasi, dan kebutuhan pelaporan.";
  }

  if (matches(["pemulihan", "recovery"])) {
    return "Pertanyaan ini menilai sejauh mana sistem, data, dan layanan sudah dapat dipulihkan setelah insiden, termasuk apakah masih ada dampak lanjutan.";
  }

  if (matches(["pemberitahuan", "notification"])) {
    return "Pertanyaan ini menilai apakah subjek data sudah atau akan diberitahu mengenai insiden, termasuk isi komunikasi dan langkah perlindungan yang disarankan.";
  }

  if (matches(["pelatihan", "training"])) {
    return "Pertanyaan ini menilai kesiapan organisasi dari sisi awareness dan kompetensi orang yang memproses data pribadi.";
  }

  if (matches(["organisasi", "system name", "sistem elektronik"])) {
    return "Pertanyaan ini mengidentifikasi organisasi atau sistem yang terkait dengan pemrosesan atau insiden agar dokumen dapat ditautkan ke pemilik proses yang benar.";
  }

  return `Pertanyaan ini meminta konteks substantif dari "${label}" agar risiko, dasar kepatuhan, dan tanggung jawab PDP dapat dinilai dengan tepat.`;
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-[color:var(--pv-border)] bg-white/80 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100/70",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-[color:var(--pv-border)] bg-white/80 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100/70",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-[color:var(--pv-border)] bg-white/80 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100/70",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function CheckboxRow({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "flex min-h-14 items-start gap-3 rounded-xl border border-[color:var(--pv-border)] bg-white/80 px-3.5 py-3 text-sm transition hover:border-blue-200 hover:bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
