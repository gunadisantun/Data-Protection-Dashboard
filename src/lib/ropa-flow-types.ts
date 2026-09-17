export type FlowKind =
  | "ACTIVITY"
  | "SOURCE"
  | "SYSTEM"
  | "STORAGE"
  | "RECIPIENT";
export type FlowNode = {
  id: string;
  recordId: string;
  kind: FlowKind;
  name: string;
  departmentId: string;
  owner: string;
  location: string;
  country: string;
  retention: string;
  description: string;
  categories: string[];
  version: number;
  legacyStorage?: string;
  legacyPrevious?: string;
  legacyNext?: string;
};
export type FlowLink = {
  id: string;
  source: string;
  target: string;
  label: string;
  dataCategories: string[];
  note: string;
};
export type FlowGraph = {
  nodes: FlowNode[];
  links: FlowLink[];
  truncated: boolean;
};

export function missingAssetMetadata(node: FlowNode) {
  if (node.kind === "ACTIVITY") return [];
  const fields: Array<"owner" | "location" | "country" | "retention"> = [
    "owner",
  ];
  if (node.kind === "STORAGE" || node.kind === "SYSTEM")
    fields.push("location", "country", "retention");
  return fields.filter((field) => !node[field].trim());
}

// Trace only links explicitly marked with the selected category; do not infer onward transfers.
export function traceCategory(graph: FlowGraph, category: string) {
  const same = (value: string) =>
    value.trim().toLowerCase() === category.trim().toLowerCase();
  const links = graph.links.filter((edge) => edge.dataCategories.some(same));
  const ids = new Set(links.flatMap((edge) => [edge.source, edge.target]));
  graph.nodes
    .filter((node) => node.categories.some(same))
    .forEach((node) => ids.add(node.id));
  return { ids, linkIds: new Set(links.map((edge) => edge.id)) };
}

export function connectedNodes(
  graph: FlowGraph,
  root: string,
  direction: "both" | "upstream" | "downstream" = "both",
) {
  const found = new Set([root]);
  const queue = [root];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of graph.links) {
      const next =
        edge.source === current && direction !== "upstream"
          ? edge.target
          : edge.target === current && direction !== "downstream"
            ? edge.source
            : null;
      if (next && !found.has(next)) {
        found.add(next);
        queue.push(next);
      }
    }
  }
  return found;
}
