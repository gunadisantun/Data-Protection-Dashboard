import { NextResponse } from "next/server";
import { getAssessmentById } from "@/lib/data";
import {
  buildDpiaWorkbook,
  buildLiaWorkbook,
  buildTiaWorkbook,
  excelFileName,
} from "@/lib/excel-export";
import {
  buildDpiaDraft,
  mergeSavedDpiaDraft,
} from "@/lib/dpia-draft";
import {
  buildLiaDraft,
  mergeSavedLiaDraft,
} from "@/lib/lia-draft";
import {
  buildTiaDraft,
  mergeSavedTiaDraft,
  recalculateTiaDraft,
} from "@/lib/tia-draft";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const assessment = getAssessmentById(id);

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  try {
    if (assessment.taskType === "DPIA") {
      const draft = mergeSavedDpiaDraft(buildDpiaDraft(assessment), assessment.notes);
      const buffer = await buildDpiaWorkbook(assessment, draft);
      return excelResponse(buffer, excelFileName("DPIA", draft.activityName));
    }

    if (assessment.taskType === "TIA") {
      const draft = recalculateTiaDraft(
        mergeSavedTiaDraft(buildTiaDraft(assessment), assessment.notes),
      );
      const buffer = await buildTiaWorkbook(draft);
      return excelResponse(buffer, excelFileName("TIA", draft.activityName));
    }

    const draft = mergeSavedLiaDraft(buildLiaDraft(assessment), assessment.notes);
    const buffer = await buildLiaWorkbook(draft);
    return excelResponse(buffer, excelFileName("LIA", draft.activityName));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat export assessment Excel",
      },
      { status: 500 },
    );
  }
}

function excelResponse(buffer: Buffer, fileName: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
