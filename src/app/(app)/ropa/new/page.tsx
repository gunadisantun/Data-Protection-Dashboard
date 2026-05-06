import { getDepartments } from "@/lib/data";
import { RopaWizard } from "@/components/ropa-wizard";

export default function NewRopaPage() {
  const departments = getDepartments();

  return <RopaWizard departments={departments} />;
}
