import { getDepartments } from "@/lib/data";
import { RopaWizard } from "@/components/ropa-wizard";

export const dynamic = "force-dynamic";

export default async function NewRopaPage() {
  const departments = await getDepartments();

  return <RopaWizard departments={departments} />;
}
