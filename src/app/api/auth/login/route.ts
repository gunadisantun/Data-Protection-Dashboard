import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { resolveLoginEmailFromDatabase } from "@/lib/data";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Format login tidak valid.",
      },
      { status: 400 },
    );
  }

  const email = await resolveLoginEmailFromDatabase(parsed.data.username).catch(
    () => null,
  );

  if (!email) {
    return NextResponse.json(
      {
        error: "Username tidak dikenali.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await auth.api.signInEmail({
      headers: request.headers,
      body: {
        email,
        password: parsed.data.password,
      },
      asResponse: true,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "Username atau password salah.",
      },
      { status: 401 },
    );
  }
}
