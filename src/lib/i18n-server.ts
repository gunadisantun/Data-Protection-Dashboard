import { cookies } from "next/headers";
import { isLocale, localeCookieName } from "@/lib/i18n";

export async function getCurrentLocale() {
  const value = (await cookies()).get(localeCookieName)?.value;
  return isLocale(value) ? value : "en";
}
