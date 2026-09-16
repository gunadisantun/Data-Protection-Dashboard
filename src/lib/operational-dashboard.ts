import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import type { AccessScope } from "@/lib/data";
import { getDemoDepartmentId, getDemoUserId } from "@/lib/demo";
import { allowedKindsForRole, selfAssessmentQuestions } from "@/lib/self-assessment";

export const OPERATIONAL_PAGE_SIZE = 50;
export const inboxReasons = ["all", "submitted", "revision", "evidence", "overdue", "DPIA", "TIA", "LIA", "ai"] as const;
export type InboxReason = (typeof inboxReasons)[number];
export type SearchValues = Record<string, string | string[] | undefined>;

export function positivePage(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? Math.min(page, 1_000_000) : 1;
}

export function parseInboxFilters(values: SearchValues = {}) {
  return {
    page: positivePage(values.inboxPage),
    reason: inboxReasons.includes(values.inbox as InboxReason) ? values.inbox as InboxReason : "all" as const,
  };
}

// Mandatory scope, including a fail-closed demo binding. Only RoPA-derived data
// has the additional creator restriction in the existing access model.
export function operationalScopePredicate(scope: AccessScope | undefined, department: SQLWrapper, ropaOwner?: SQLWrapper): SQL {
  if (!scope) return sql`false`;
  if (scope.isDemo) {
    if (!scope.demoSessionId || scope.userId !== getDemoUserId(scope.demoSessionId) || scope.departmentId !== getDemoDepartmentId(scope.demoSessionId)) return sql`false`;
    return sql`${department} = ${scope.departmentId}${ropaOwner ? sql` and ${ropaOwner} = ${scope.userId}` : sql``}`;
  }
  if (scope.role === "DPO" || scope.role === "MasterAdmin") return sql`true`;
  if (scope.role !== "User" || !scope.departmentId?.trim()) return sql`false`;
  return sql`${department} = ${scope.departmentId}`;
}

export type OperationalKpis = {
  totalRopa: number; activeRopa: number; drafts: number;
  pendingTasks: number; criticalRisks: number; activeAssessments: number;
  assessmentByType: { DPIA: number; TIA: number; LIA: number };
};

export function operationalKpiQuery(scope: AccessScope) {
  return sql`with r as (
    select r.status from ropa_activities r join departments d on d.id = r.department_id
    where ${operationalScopePredicate(scope, sql`r.department_id`, sql`r.user_id`)}
  ), a as (
    select a.status, a.severity, a.task_type from assessments a
    join ropa_activities r on r.id = a.ropa_id join departments d on d.id = a.department_id
    where ${operationalScopePredicate(scope, sql`a.department_id`, sql`r.user_id`)}
      and ${operationalScopePredicate(scope, sql`r.department_id`, sql`r.user_id`)}
  ) select jsonb_build_object(
    'totalRopa', (select count(*) from r),
    'activeRopa', (select count(*) from r where status = 'Active'),
    'drafts', (select count(*) from r where status = 'Draft'),
    'pendingTasks', (select count(*) from a where status in ('Todo', 'Open', 'In Progress')),
    'activeAssessments', (select count(*) from a where status in ('Todo', 'Open', 'In Progress')),
    'criticalRisks', (select count(*) from a where severity = 'Critical'),
    'assessmentByType', jsonb_build_object(
      'DPIA', (select count(*) from a where task_type = 'DPIA'),
      'TIA', (select count(*) from a where task_type = 'TIA'),
      'LIA', (select count(*) from a where task_type = 'LIA'))
  ) as data`;
}

export type InboxRow = {
  id: string; source: "self-assessment" | "breach" | "assessment" | "ai-impact";
  title: string; reference: string; department: string | null; status: string;
  updatedAt: string; dueDate: string | null; taskType: string | null;
  submitted: boolean; revision: boolean; pendingEvidence: number; overdueActions: number;
};
export type OperationalInboxData = {
  rows: InboxRow[]; total: number; filteredTotal: number; page: number; pages: number;
  counts: Record<Exclude<InboxReason, "all">, number>;
};

export function inboxSourceHref(row: Pick<InboxRow, "source" | "id" | "taskType">) {
  const id = encodeURIComponent(row.id);
  if (row.source === "self-assessment") return `/self-assessment/${id}`;
  if (row.source === "breach") return `/breach-reports/${id}`;
  if (row.source === "ai-impact") return `/assessments/ai-impact/${id}`;
  const kind = row.taskType?.toLowerCase();
  return kind && ["dpia", "tia", "lia"].includes(kind) ? `/assessments/${id}/${kind}` : "/tasks";
}

function reasonPredicate(reason: InboxReason) {
  if (reason === "submitted") return sql`submitted`;
  if (reason === "revision") return sql`revision`;
  if (reason === "evidence") return sql`"pendingEvidence" > 0`;
  if (reason === "overdue") return sql`"overdueActions" > 0`;
  if (reason === "ai") return sql`source = 'ai-impact'`;
  if (["DPIA", "TIA", "LIA"].includes(reason)) return sql`"taskType" = ${reason}`;
  return sql`true`;
}

export function operationalInboxQuery(scope: AccessScope, input: SearchValues = {}, now = new Date()) {
  const filters = parseInboxFilters(input);
  const today = now.toISOString().slice(0, 10);
  const kinds = allowedKindsForRole(scope.role);
  const questionIds = selfAssessmentQuestions.filter((q) => kinds.includes(q.kind)).map((q) => q.id);
  const questions = questionIds.length ? sql.join(questionIds.map((id) => sql`${id}`), sql`, `) : sql`null`;
  // Keep JSON traversal in SQL; no answers, evidence URLs, or action payloads leave the DB.
  return sql`with self_queue as (
    select s.id, 'self-assessment'::text as source, s.title, s.assessment_number as reference,
      d.name as department, s.status, s.updated_at as "updatedAt", actions.due as "dueDate", null::text as "taskType",
      s.status = 'Submitted' as submitted, s.status = 'Draft' and s.revision > 1 as revision,
      case when s.status <> 'Finalized' then evidence.n else 0 end as "pendingEvidence", actions.n as "overdueActions"
    from self_assessments s left join departments d on d.id = s.department_id
    cross join lateral (
      select count(*) as n from jsonb_each(case when jsonb_typeof(s.answers) = 'object' then s.answers else '{}'::jsonb end) e
      where e.key in (${questions}) and jsonb_array_length(case when jsonb_typeof(e.value->'evidenceFiles') = 'array' then e.value->'evidenceFiles' else '[]'::jsonb end) > 0
        and coalesce(e.value->'evidenceReview'->>'status', 'Pending') = 'Pending'
    ) evidence
    cross join lateral (
      select count(*) as n, min(item->>'targetDate') as due
      from jsonb_array_elements(case when jsonb_typeof(s.action_plan) = 'array' then s.action_plan else '[]'::jsonb end) item
      where item->>'questionId' in (${questions}) and coalesce(item->>'status', '') not in ('Done', 'Closed')
        and item->>'targetDate' ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
        and item->>'targetDate' < ${today}
    ) actions
    where ${operationalScopePredicate(scope, sql`s.department_id`)}
  ), queue as (
    select * from self_queue where submitted or revision or "pendingEvidence" > 0 or "overdueActions" > 0
    union all
    select b.id, 'breach', b.title, b.report_number, d.name, b.status, b.updated_at, null, null,
      true, false, 0, 0 from breach_reports b left join departments d on d.id = b.department_id
      where b.status = 'Submitted' and ${operationalScopePredicate(scope, sql`b.department_id`)}
    union all
    select a.id, 'assessment', a.title, r.activity_name, d.name, a.status, a.updated_at, nullif(a.due_date, ''), a.task_type,
      false, false, 0, case when a.due_date ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' and a.due_date < ${today} then 1 else 0 end
      from assessments a join ropa_activities r on r.id = a.ropa_id join departments d on d.id = a.department_id
      where a.status in ('Todo', 'Open', 'In Progress') and a.task_type in ('DPIA', 'TIA', 'LIA')
        and ${operationalScopePredicate(scope, sql`a.department_id`, sql`r.user_id`)}
        and ${operationalScopePredicate(scope, sql`r.department_id`, sql`r.user_id`)}
    union all
    select i.id, 'ai-impact', i.ai_system, i.assessment_number, d.name, i.status, i.updated_at, null, null,
      false, false, 0, 0 from ai_impact_assessments i join departments d on d.id = i.department_id
      where i.status in ('Draft', 'In Progress') and ${operationalScopePredicate(scope, sql`i.department_id`)}
  ), filtered as (select * from queue where ${reasonPredicate(filters.reason)}),
  stats as (select count(*) as n, greatest(1, ceil(count(*)::numeric / ${OPERATIONAL_PAGE_SIZE}))::integer as pages from filtered),
  page_rows as (
    select * from filtered order by
      case when source = 'breach' then 0 when "overdueActions" > 0 then 1 when submitted then 2 when "pendingEvidence" > 0 then 3 when revision then 4 else 5 end,
      "dueDate" asc nulls last, "updatedAt" asc, source, id
    limit ${OPERATIONAL_PAGE_SIZE} offset (select (least(${filters.page}, pages) - 1) * ${OPERATIONAL_PAGE_SIZE} from stats)
  ) select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(p)) from page_rows p), '[]'::jsonb),
    'total', (select count(*) from queue), 'filteredTotal', stats.n,
    'page', least(${filters.page}, stats.pages), 'pages', stats.pages,
    'counts', (select jsonb_build_object(
      'submitted', count(*) filter (where submitted), 'revision', count(*) filter (where revision),
      'evidence', coalesce(sum("pendingEvidence"), 0), 'overdue', coalesce(sum("overdueActions"), 0),
      'DPIA', count(*) filter (where "taskType" = 'DPIA'), 'TIA', count(*) filter (where "taskType" = 'TIA'),
      'LIA', count(*) filter (where "taskType" = 'LIA'), 'ai', count(*) filter (where source = 'ai-impact')
    ) from queue)
  ) as data from stats`;
}

// Postgres-js returns rows directly; the offline PGlite driver wraps them.
export async function readOperationalQuery<T>(query: SQL): Promise<T> {
  const { db } = await import("@/db/client");
  const result = await db.execute(query);
  const rows = "rows" in result ? result.rows : result;
  if (!rows[0] || !("data" in rows[0])) throw new Error("Missing operational query result");
  return rows[0].data as T;
}

export async function getOperationalDashboard(scope: AccessScope, input: SearchValues = {}) {
  await (await import("@/db/init")).ensureDatabase();
  const kpis = await readOperationalQuery<OperationalKpis>(operationalKpiQuery(scope));
  const inbox = await readOperationalQuery<OperationalInboxData>(operationalInboxQuery(scope, input));
  return { kpis, inbox };
}
