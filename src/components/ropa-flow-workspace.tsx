"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Background,
  Controls,
  MarkerType,
  Position,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  ArrowLeft,
  Database,
  ExternalLink,
  Link2,
  Plus,
  Search,
  Server,
  Trash2,
  X,
  Network,
  List,
  RotateCcw,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
import {
  connectedNodes,
  missingAssetMetadata,
  traceCategory,
  type FlowGraph,
  type FlowKind,
  type FlowNode,
} from "@/lib/ropa-flow-types";

const kinds: FlowKind[] = [
  "SOURCE",
  "ACTIVITY",
  "SYSTEM",
  "STORAGE",
  "RECIPIENT",
];
const ReactFlow = dynamic(
  () => import("@xyflow/react").then((module) => module.ReactFlow),
  { ssr: false },
);
const colors: Record<FlowKind, string> = {
  SOURCE: "#0f766e",
  ACTIVITY: "#2563eb",
  SYSTEM: "#7c3aed",
  STORAGE: "#b45309",
  RECIPIENT: "#be123c",
};
const field =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const button =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";

export function RopaFlowWorkspace({
  initial,
  departments,
}: {
  initial: FlowGraph;
  departments: { id: string; name: string }[];
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const t = (id: string, english: string) => (en ? english : id);
  const label = (kind: FlowKind) =>
    ({
      SOURCE: t("Sumber", "Source"),
      ACTIVITY: t("Aktivitas", "Activity"),
      SYSTEM: t("Sistem", "System"),
      STORAGE: t("Penyimpanan", "Storage"),
      RECIPIENT: t("Penerima", "Recipient"),
    })[kind];
  const [graph, setGraph] = useState(initial);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [focus, setFocus] = useState(false);
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [measurements, setMeasurements] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [mode, setMode] = useState<"asset" | "link" | "update">("asset");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const [display, setDisplay] = useState<"map" | "inventory">("map");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [direction, setDirection] = useState<
    "both" | "upstream" | "downstream"
  >("both");
  const dialog = useRef<HTMLDialogElement>(null);
  const node = graph.nodes.find((n) => n.id === selected);
  const edge = graph.links.find((e) => e.id === selected);
  const categories = [
    ...new Set([
      ...graph.nodes.flatMap((n) => n.categories),
      ...graph.links.flatMap((e) => e.dataCategories),
    ]),
  ].sort();
  const assets = graph.nodes.filter(
    (n) =>
      n.kind !== "ACTIVITY" &&
      (!category || traceCategory(graph, category).ids.has(n.id)) &&
      (!incompleteOnly || missingAssetMetadata(n).length) &&
      (!query ||
        [n.name, n.location, n.country, n.owner]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const view = useMemo(() => {
    const trace = category ? traceCategory(graph, category) : null;
    const connected =
      focus && graph.nodes.some((n) => n.id === selected)
        ? connectedNodes(graph, selected, direction)
        : null;
    const visible = graph.nodes.filter(
      (n) =>
        (!trace || trace.ids.has(n.id)) &&
        (!connected || connected.has(n.id)) &&
        (!query ||
          [n.name, n.owner, n.location, n.country, ...n.categories]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
    const ids = new Set(visible.map((n) => n.id));
    const row: Record<string, number> = {};
    const nodes: Node[] = visible.map((n) => {
      const y = row[n.kind] || 0;
      row[n.kind] = y + 1;
      return {
        id: n.id,
        width: 230,
        height: 110,
        measured: measurements[n.id] || { width: 230, height: 110 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: positions[n.id] || {
          x: kinds.indexOf(n.kind) * 420,
          y: y * 180,
        },
        data: {
          label: (
            <div className="text-left">
              <div
                className="mb-1 text-[11px] font-semibold uppercase"
                style={{ color: colors[n.kind] }}
              >
                {label(n.kind)}
              </div>
              <div className="line-clamp-2 font-semibold">{n.name}</div>
              <div className="mt-2 truncate text-xs text-slate-500">
                {n.location ||
                  n.owner ||
                  departments.find((d) => d.id === n.departmentId)?.name}
              </div>
            </div>
          ),
        },
        selected: selected === n.id,
        style: {
          width: 230,
          height: 110,
          borderRadius: 8,
          borderColor: colors[n.kind],
          borderTopWidth: 4,
          padding: 12,
        },
      };
    });
    return {
      nodes,
      edges: graph.links
        .filter(
          (e) =>
            ids.has(e.source) &&
            ids.has(e.target) &&
            (!trace || trace.linkIds.has(e.id)),
        )
        .map((e) => ({
          ...e,
          ariaLabel: e.label,
          label: e.label.length > 24 ? `${e.label.slice(0, 21)}...` : e.label,
          selected: e.id === selected,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: e.id === selected ? "#2563eb" : "#64748b",
            strokeWidth: 2,
          },
          labelStyle: { fontSize: 11 },
          labelBgPadding: [6, 4] as [number, number],
        })),
    };
    // Labels follow the global language selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    graph,
    query,
    category,
    focus,
    direction,
    selected,
    positions,
    measurements,
    locale,
    departments,
  ]);
  function changeNodes(changes: NodeChange[]) {
    const moved = changes
      .filter((change) => change.type === "position")
      .filter((change) => change.position);
    setPositions((old) => ({
      ...old,
      ...Object.fromEntries(
        moved.map((change) => [change.id, change.position!]),
      ),
    }));
    const resized = changes
      .filter((change) => change.type === "dimensions")
      .filter((change) => change.dimensions);
    if (resized.length)
      setMeasurements((old) => ({
        ...old,
        ...Object.fromEntries(
          resized.map((change) => [change.id, change.dimensions!]),
        ),
      }));
  }
  function open(next: typeof mode) {
    setMode(next);
    setFormVersion((v) => v + 1);
    setError("");
    dialog.current?.showModal();
  }
  async function save(payload: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ropa/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Save failed");
      setGraph(result);
      dialog.current?.close();
      if (
        !result.nodes.some((n: FlowNode) => n.id === selected) &&
        !result.links.some((e: { id: string }) => e.id === selected)
      )
        setSelected("");
    } catch (cause) {
      setError(
        `${t("Gagal menyimpan. Isian tetap tersedia.", "Unable to save. Your inputs are preserved.")} ${cause instanceof Error ? cause.message : ""}`,
      );
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    void save(
      mode === "link"
        ? {
            operation: mode,
            ...data,
            dataCategories: String(data.dataCategories || "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          }
        : {
            operation: mode,
            ...data,
            ...(mode === "update" && node
              ? { id: node.recordId, version: node.version }
              : {}),
          },
    );
  }
  function info(title: string, value?: string) {
    return (
      <div>
        <dt className="text-xs font-semibold text-slate-500">{title}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
          {value || t("Belum dicatat", "Not recorded")}
        </dd>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/ropa"
            className="inline-flex items-center gap-1 text-sm text-slate-500"
          >
            <ArrowLeft size={14} /> RoPA
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            {t("Peta Alur Data Pribadi", "Personal Data Flow Map")}
          </h1>
        </div>
        <div className="flex gap-2">
          <button className={button} onClick={() => open("asset")}>
            <Plus size={16} />
            {t("Tambah Aset", "Add Asset")}
          </button>
          <button
            className={button}
            disabled={graph.nodes.length < 2}
            onClick={() => open("link")}
          >
            <Link2 size={16} />
            {t("Hubungkan", "Connect")}
          </button>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-48 flex-1">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={17}
          />
          <input
            aria-label={t("Cari alur data", "Search data flow")}
            className={`${field} pl-10`}
            placeholder={t(
              "Cari aktivitas, sistem, lokasi...",
              "Search activities, systems, locations...",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label={t("Kategori data", "Data category")}
          className={`${field} sm:max-w-64`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">
            {t("Semua kategori data", "All data categories")}
          </option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={focus}
            onChange={(e) => setFocus(e.target.checked)}
          />
          {t("Alur terkait pilihan", "Connected to selection")}
        </label>
      </div>
      {focus && (
        <select
          className={`${field} max-w-64`}
          aria-label={t("Arah penelusuran", "Trace direction")}
          value={direction}
          onChange={(e) => setDirection(e.target.value as typeof direction)}
        >
          <option value="both">{t("Semua hubungan", "All connections")}</option>
          <option value="upstream">
            {t("Asal data (upstream)", "Data origins (upstream)")}
          </option>
          <option value="downstream">
            {t("Tujuan data (downstream)", "Data destinations (downstream)")}
          </option>
        </select>
      )}
      {graph.truncated && (
        <p role="status" className="text-sm text-amber-800">
          {t(
            "Peta mencapai batas tampilan (500 aktivitas, 500 aset, 2.000 hubungan); sebagian data tidak ditampilkan.",
            "Display limit reached (500 activities, 500 assets, 2,000 connections); some records are not shown.",
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div
          role="tablist"
          aria-label={t("Tampilan", "View")}
          className="flex gap-2"
        >
          {(["map", "inventory"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={display === value}
              onClick={() => setDisplay(value)}
              className={`${button} ${display === value ? "!border-blue-600 !text-blue-700" : ""}`}
            >
              {value === "map" ? <Network size={16} /> : <List size={16} />}{" "}
              {value === "map"
                ? t("Peta Alur", "Flow Map")
                : t("Inventaris Aset", "Asset Inventory")}
            </button>
          ))}
        </div>
        <button
          className={button}
          title={t("Reset filter dan tata letak", "Reset filters and layout")}
          onClick={() => {
            setQuery("");
            setCategory("");
            setFocus(false);
            setIncompleteOnly(false);
            setPositions({});
            setSelected("");
          }}
        >
          <RotateCcw size={16} />
          <span className="sr-only">{t("Reset", "Reset")}</span>
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {display === "map" ? (
          <section
            className="relative h-[540px] overflow-hidden rounded-lg border border-slate-200 bg-white xl:h-[680px]"
            aria-label={t("Kanvas alur data", "Data flow canvas")}
          >
            <ReactFlow
              nodes={view.nodes}
              edges={view.edges}
              onNodesChange={changeNodes}
              onNodeClick={(_, n) => setSelected(n.id)}
              onEdgeClick={(_, e) => setSelected(e.id)}
              onPaneClick={() => setSelected("")}
              nodesConnectable={false}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
              minZoom={0.15}
              maxZoom={2}
              aria-label={t(
                "Peta aktivitas dan penyimpanan",
                "Activity and storage map",
              )}
            >
              <Background gap={22} color="#e2e8f0" />
              <Controls
                showInteractive={false}
                fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
              />
            </ReactFlow>
            {!view.nodes.length && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10 text-center text-sm text-slate-500">
                {graph.nodes.length
                  ? t("Tidak ada hasil sesuai filter.", "No matching results.")
                  : t(
                      "Belum ada aktivitas atau aset yang dipetakan.",
                      "No activities or assets mapped yet.",
                    )}
              </div>
            )}
          </section>
        ) : (
          <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">
                {t("Sistem & Lokasi Data", "Systems & Data Locations")}
              </h2>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={incompleteOnly}
                  onChange={(e) => setIncompleteOnly(e.target.checked)}
                />
                {t("Belum lengkap", "Incomplete metadata")}
              </label>
            </div>
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600">
                  <tr>
                    {[
                      t("Aset", "Asset"),
                      t("Lokasi / Negara", "Location / Country"),
                      "Owner",
                      t("Retensi", "Retention"),
                      t("Metadata", "Metadata"),
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b border-slate-100">
                      <td className="max-w-52 p-3">
                        <button
                          className="break-words text-left font-semibold text-blue-700"
                          onClick={() => setSelected(asset.id)}
                        >
                          {asset.name}
                        </button>
                        <div className="mt-1 text-xs text-slate-500">
                          {label(asset.kind)}
                        </div>
                      </td>
                      <td className="max-w-40 break-words p-3">
                        {[asset.location, asset.country]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </td>
                      <td className="max-w-36 break-words p-3">
                        {asset.owner || "-"}
                      </td>
                      <td className="max-w-32 break-words p-3">
                        {asset.retention || "-"}
                      </td>
                      <td className="p-3 text-xs">
                        <span
                          className={
                            missingAssetMetadata(asset).length
                              ? "text-amber-800"
                              : "text-teal-700"
                          }
                        >
                          {missingAssetMetadata(asset).length
                            ? t("Perlu dilengkapi", "Incomplete")
                            : t("Lengkap", "Complete")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!assets.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-slate-500"
                      >
                        {t(
                          "Tidak ada aset sesuai filter.",
                          "No matching assets.",
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <aside className="max-h-[680px] space-y-5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5">
          {node ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: colors[node.kind] }}
                  >
                    {label(node.kind)}
                  </span>
                  <h2 className="mt-2 break-words text-lg font-semibold">
                    {node.name}
                  </h2>
                </div>
                {node.kind === "STORAGE" ? (
                  <Database size={20} />
                ) : (
                  <Server size={20} />
                )}
              </div>
              <dl className="space-y-4">
                {info(
                  t("Unit kerja", "Department"),
                  departments.find((d) => d.id === node.departmentId)?.name,
                )}
                {info("Owner / PIC", node.owner)}
                {info(t("Lokasi", "Location"), node.location)}
                {info(t("Negara", "Country"), node.country)}
                {info(t("Retensi", "Retention"), node.retention)}
                {info(
                  t("Proses / keterangan", "Process / description"),
                  node.description,
                )}
                {info(
                  t("Kategori data", "Data categories"),
                  node.categories.join(", "),
                )}
                {node.legacyStorage &&
                  info(
                    t(
                      "Penyimpanan dari RoPA (referensi)",
                      "Storage from RoPA (reference)",
                    ),
                    node.legacyStorage,
                  )}
                {node.legacyPrevious &&
                  info(
                    t(
                      "Proses sebelumnya (referensi)",
                      "Previous process (reference)",
                    ),
                    node.legacyPrevious,
                  )}
                {node.legacyNext &&
                  info(
                    t(
                      "Proses berikutnya (referensi)",
                      "Next process (reference)",
                    ),
                    node.legacyNext,
                  )}
              </dl>
              {node.kind === "ACTIVITY" ? (
                <Link className={button} href={`/ropa/${node.recordId}/result`}>
                  <ExternalLink size={15} />
                  {t("Buka RoPA", "Open RoPA")}
                </Link>
              ) : (
                <button className={button} onClick={() => open("update")}>
                  {t("Edit Aset", "Edit Asset")}
                </button>
              )}
            </>
          ) : edge ? (
            <>
              <h2 className="text-lg font-semibold">{edge.label}</h2>
              <dl className="space-y-4">
                {info(
                  t("Dari", "From"),
                  graph.nodes.find((n) => n.id === edge.source)?.name,
                )}
                {info(
                  t("Ke", "To"),
                  graph.nodes.find((n) => n.id === edge.target)?.name,
                )}
                {info(
                  t(
                    "Kategori data yang mengalir",
                    "Transferred data categories",
                  ),
                  edge.dataCategories.join(", "),
                )}
                {info(t("Catatan", "Notes"), edge.note)}
              </dl>
              <button
                className={`${button} text-red-700`}
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      t(
                        "Hapus hubungan ini? Aktivitas dan aset tidak dihapus.",
                        "Remove this connection? Activities and assets remain unchanged.",
                      ),
                    )
                  )
                    void save({ operation: "deleteLink", id: edge.id });
                }}
              >
                <Trash2 size={16} />
                {t("Hapus hubungan", "Remove connection")}
              </button>
            </>
          ) : (
            <>
              <h2 className="font-semibold">
                {t("Ringkasan Peta", "Map Summary")}
              </h2>
              <dl className="space-y-4">
                {kinds.map((k) => (
                  <div
                    key={k}
                    className="flex justify-between border-b border-slate-100 pb-3"
                  >
                    <dt className="text-sm" style={{ color: colors[k] }}>
                      {label(k)}
                    </dt>
                    <dd className="font-semibold">
                      {graph.nodes.filter((n) => n.kind === k).length}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <dt>{t("Hubungan tercatat", "Recorded connections")}</dt>
                  <dd>{graph.links.length}</dd>
                </div>
              </dl>
            </>
          )}
          {node && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold">
                {t("Hubungan Langsung", "Direct Connections")}
              </h3>
              {graph.links
                .filter(
                  (link) => link.source === node.id || link.target === node.id,
                )
                .map((link) => (
                  <button
                    key={link.id}
                    className="block w-full rounded-md border border-slate-200 p-3 text-left text-xs hover:bg-slate-50"
                    onClick={() => setSelected(link.id)}
                  >
                    <span className="font-semibold">
                      {link.source === node.id
                        ? t("Keluar: ", "Outgoing: ")
                        : t("Masuk: ", "Incoming: ")}
                      {
                        graph.nodes.find(
                          (n) =>
                            n.id ===
                            (link.source === node.id
                              ? link.target
                              : link.source),
                        )?.name
                      }
                    </span>
                    <span className="mt-1 block text-slate-500">
                      {link.label}
                    </span>
                  </button>
                ))}
              {!graph.links.some(
                (link) => link.source === node.id || link.target === node.id,
              ) && (
                <p className="text-xs text-slate-500">
                  {t(
                    "Belum ada hubungan tercatat.",
                    "No recorded connections.",
                  )}
                </p>
              )}
              {node.kind !== "ACTIVITY" && (
                <>
                  <p className="text-xs text-amber-800">
                    {missingAssetMetadata(node).length
                      ? `${t("Metadata belum lengkap: ", "Missing metadata: ")}${missingAssetMetadata(
                          node,
                        )
                          .map(
                            (key) =>
                              ({
                                owner: "Owner",
                                location: t("Lokasi", "Location"),
                                country: t("Negara", "Country"),
                                retention: t("Retensi", "Retention"),
                              })[key],
                          )
                          .join(", ")}`
                      : ""}
                  </p>
                  <button
                    disabled={busy}
                    className={`${button} text-red-700`}
                    onClick={() => {
                      if (
                        confirm(
                          t(
                            "Hapus aset ini? Aset yang masih terhubung tidak dapat dihapus.",
                            "Delete this asset? Connected assets cannot be deleted.",
                          ),
                        )
                      )
                        void save({
                          operation: "deleteAsset",
                          id: node.recordId,
                          version: node.version,
                        });
                    }}
                  >
                    <Trash2 size={16} />
                    {t("Hapus aset", "Delete asset")}
                  </button>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
      <div className="flex flex-wrap gap-5 text-xs text-slate-600">
        {kinds.map((k) => (
          <span key={k} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: colors[k] }}
            />
            {label(k)}
          </span>
        ))}
        <span className="ml-auto">
          {view.nodes.length} {t("titik", "nodes")} / {view.edges.length}{" "}
          {t("hubungan", "connections")}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[min(620px,calc(100%-32px))] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/30"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "link"
              ? t("Hubungkan Alur", "Connect Flow")
              : mode === "update"
                ? t("Edit Aset", "Edit Asset")
                : t("Tambah Aset", "Add Asset")}
          </h2>
          <button
            disabled={busy}
            aria-label={t("Tutup", "Close")}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <form
          key={`${mode}-${selected}-${formVersion}`}
          onSubmit={submit}
          className="space-y-4"
        >
          {mode === "link" ? (
            <>
              {["source", "target"].map((key, i) => (
                <label key={key} className="block text-sm">
                  {i ? t("Tujuan", "Destination") : t("Sumber", "Source")}
                  <select
                    name={key}
                    required
                    className={`${field} mt-1`}
                    defaultValue={i ? "" : node?.id || ""}
                  >
                    <option value="">{t("Pilih", "Select")}</option>
                    {graph.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {label(n.kind)}: {n.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <TextInput
                name="label"
                title={t("Nama alur", "Flow name")}
                required
              />
              <TextInput
                name="dataCategories"
                title={t(
                  "Kategori data (pisahkan dengan koma)",
                  "Data categories (comma separated)",
                )}
              />
              <label className="block text-sm">
                {t("Catatan", "Notes")}
                <textarea
                  name="note"
                  maxLength={3000}
                  className={`${field} mt-1`}
                  rows={3}
                />
              </label>
            </>
          ) : (
            <AssetFields
              node={mode === "update" ? node : undefined}
              departments={departments}
              en={en}
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className={`${button} w-full !border-blue-600 !bg-blue-600 !text-white`}
          >
            {busy ? t("Menyimpan...", "Saving...") : t("Simpan", "Save")}
          </button>
        </form>
      </dialog>
    </div>
  );
}
function TextInput({
  name,
  title,
  value,
  required,
}: {
  name: string;
  title: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      {title}
      <input
        name={name}
        defaultValue={value || ""}
        required={required}
        maxLength={240}
        className={`${field} mt-1`}
      />
    </label>
  );
}
function AssetFields({
  node,
  departments,
  en,
}: {
  node?: FlowNode;
  departments: { id: string; name: string }[];
  en: boolean;
}) {
  return (
    <>
      <TextInput
        name="name"
        title={en ? "Asset name" : "Nama aset"}
        required
        value={node?.name}
      />
      <label className="block text-sm">
        {en ? "Type" : "Tipe"}
        <select
          className={`${field} mt-1`}
          name="kind"
          defaultValue={node?.kind || "SYSTEM"}
        >
          {["SOURCE", "SYSTEM", "STORAGE", "RECIPIENT"].map((k, i) => (
            <option key={k} value={k}>
              {
                (en
                  ? ["Source", "System", "Storage", "Recipient"]
                  : ["Sumber", "Sistem", "Penyimpanan", "Penerima"])[i]
              }
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {en ? "Department" : "Unit kerja"}
        <select
          className={`${field} mt-1`}
          name="departmentId"
          required
          defaultValue={node?.departmentId || departments[0]?.id || ""}
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="owner" title="Owner / PIC" value={node?.owner} />
        <TextInput
          name="location"
          title={en ? "Location" : "Lokasi"}
          value={node?.location}
        />
        <TextInput
          name="country"
          title={en ? "Country" : "Negara"}
          value={node?.country}
        />
        <TextInput
          name="retention"
          title={en ? "Retention" : "Retensi"}
          value={node?.retention}
        />
      </div>
      <label className="block text-sm">
        {en ? "Description" : "Keterangan"}
        <textarea
          name="description"
          defaultValue={node?.description || ""}
          maxLength={3000}
          className={`${field} mt-1`}
          rows={3}
        />
      </label>
    </>
  );
}
