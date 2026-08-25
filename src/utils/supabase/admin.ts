import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE config missing. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSopBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET_SOP?.trim() || "privacy-sop";
}

export function getReferenceBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET_REFERENCES?.trim() || "privacy-references";
}

export function getSelfAssessmentEvidenceBucketName() {
  return (
    process.env.SUPABASE_STORAGE_BUCKET_SELF_ASSESSMENT?.trim() ||
    "privacy-self-assessment-evidence"
  );
}
