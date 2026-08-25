import { NextResponse } from "next/server";
import { getViewerFromRequest } from "@/lib/access";
import { answerFaqQuestion } from "@/lib/faq-ai";
import { faqAskSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = faqAskSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Pertanyaan tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = await answerFaqQuestion(parsed.data.question);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI FAQ gagal menjawab pertanyaan.",
      },
      { status: 500 },
    );
  }
}
