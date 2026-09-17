import { requireViewer, toAccessScope } from "@/lib/access";
import { getDepartments } from "@/lib/data";
import { getRopaFlow } from "@/lib/ropa-flow";
import { RopaFlowWorkspace } from "@/components/ropa-flow-workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const scope = toAccessScope(await requireViewer());
  return (
    <RopaFlowWorkspace
      initial={await getRopaFlow(scope)}
      departments={await getDepartments(scope)}
    />
  );
}
