import Link from "next/link";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { DeleteActionButton } from "@/components/delete-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { listTasks } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default function TaskBoardPage() {
  const tasks = listTasks();
  const done = tasks.filter((task) => task.status === "Done").length;
  const open = tasks.length - done;
  const dueThisWeek = tasks.filter((task) => task.status !== "Done").length;

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Board</h1>
        <p className="mt-1 text-sm text-slate-600">
          Follow-up worklist for PIC teams after automated obligation detection.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <BoardStat label="Open Tasks" value={open} />
        <BoardStat label="Completed" value={done} />
        <BoardStat label="Due This Week" value={dueThisWeek} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Operational Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <tr>
                <TH>Task</TH>
                <TH>Activity</TH>
                <TH>Department</TH>
                <TH>Status</TH>
                <TH>Due Date</TH>
                <TH>PIC</TH>
                <TH>Action</TH>
              </tr>
            </THead>
            <TBody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <TD>
                    <div className="font-bold text-slate-950">{task.taskType}</div>
                    <div className="text-xs text-slate-500">{task.title}</div>
                  </TD>
                  <TD>{task.activityName}</TD>
                  <TD>{task.departmentName}</TD>
                  <TD>
                    <Badge
                      tone={
                        task.status === "Done"
                          ? "green"
                          : task.status === "In Progress"
                            ? "blue"
                            : "yellow"
                      }
                    >
                      {task.status}
                    </Badge>
                  </TD>
                  <TD>{formatDate(task.dueDate)}</TD>
                  <TD>{task.picName}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      <Link href={assessmentHref(task)}>
                        <Button variant="secondary" size="sm">
                          {task.taskType === "DPIA"
                            ? "Isi DPIA"
                            : task.taskType === "TIA"
                              ? "Isi TIA"
                              : task.taskType === "LIA"
                                ? "Isi LIA"
                                : "Open"}
                        </Button>
                      </Link>
                      <DeleteActionButton
                        endpoint={`/api/tasks/${task.id}`}
                        label="Hapus"
                        confirmMessage={`Hapus task ${task.taskType} untuk "${task.activityName}"?`}
                      />
                    </div>
                  </TD>
                </tr>
              ))}
              {tasks.length === 0 ? (
                <tr>
                  <TD colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada task DPIA, TIA, atau LIA.
                  </TD>
                </tr>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function assessmentHref(task: { id: string; taskType: string; ropaId: string }) {
  if (task.taskType === "DPIA") {
    return `/assessments/${task.id}/dpia`;
  }

  if (task.taskType === "TIA") {
    return `/assessments/${task.id}/tia`;
  }

  if (task.taskType === "LIA") {
    return `/assessments/${task.id}/lia`;
  }

  return `/ropa/${task.ropaId}/result`;
}

function BoardStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-5">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
