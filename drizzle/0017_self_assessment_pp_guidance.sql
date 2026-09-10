ALTER TABLE "self_assessments" ADD COLUMN IF NOT EXISTS "pp_guidance_enabled" boolean NOT NULL DEFAULT false;
