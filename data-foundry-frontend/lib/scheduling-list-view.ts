import type { ScheduleJob } from "@/lib/domain";
import type { FetchTask, Project, Requirement, TaskGroup, WideTable } from "@/lib/types";
import {
  buildCollectionTaskListRows,
  formatCollectionTaskDateTime,
  type CollectionTaskListRowView,
} from "@/lib/collection-task-list-view";

export type ScheduleTriggerFilter =
  | ""
  | "manual"
  | "scheduled"
  | "backfill"
  | "resample"
  | "trial";

export type ScheduleStatusFilter =
  | ""
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "dispatched";

export type SchedulingPeriodView = {
  taskGroup: TaskGroup;
  jobs: ScheduleJob[];
  latestStartedAt: string;
};

export type SchedulingCollectionTaskRowView = {
  row: CollectionTaskListRowView;
  periods: SchedulingPeriodView[];
  scheduleJobCount: number;
  latestStartedAt: string;
  latestStatus: string;
  statusSummary: string;
};

export function buildSchedulingCollectionTaskRows(params: {
  projects: Project[];
  requirements: Requirement[];
  wideTables: WideTable[];
  taskGroups: TaskGroup[];
  fetchTasks: FetchTask[];
  scheduleJobs: ScheduleJob[];
  triggerFilter?: ScheduleTriggerFilter;
  statusFilter?: ScheduleStatusFilter;
}): SchedulingCollectionTaskRowView[] {
  const {
    projects,
    requirements,
    wideTables,
    taskGroups,
    fetchTasks,
    scheduleJobs,
    triggerFilter = "",
    statusFilter = "",
  } = params;
  const baseRows = buildCollectionTaskListRows({
    projects,
    requirements,
    wideTables,
    taskGroups,
    fetchTasks,
  });
  const filteredJobs = scheduleJobs.filter(
    (job) => matchesTriggerFilter(job, triggerFilter) && matchesStatusFilter(job, statusFilter),
  );
  const jobsByTaskGroupId = new Map<string, ScheduleJob[]>();

  for (const job of filteredJobs) {
    const scopedJobs = jobsByTaskGroupId.get(job.taskGroupId) ?? [];
    scopedJobs.push(job);
    jobsByTaskGroupId.set(job.taskGroupId, scopedJobs);
  }

  return baseRows
    .map((row) => {
      const periods = row.taskGroups
        .map((taskGroup) => {
          const jobs = [...(jobsByTaskGroupId.get(taskGroup.id) ?? [])].sort((left, right) =>
            compareIsoDateTime(right.startedAt, left.startedAt),
          );
          if (jobs.length === 0) {
            return null;
          }
          return {
            taskGroup,
            jobs,
            latestStartedAt: jobs[0]?.startedAt ?? "",
          } satisfies SchedulingPeriodView;
        })
        .filter((item): item is SchedulingPeriodView => Boolean(item))
        .sort((left, right) => {
          const periodComparison = compareIsoDateTime(
            right.taskGroup.businessDate || right.latestStartedAt,
            left.taskGroup.businessDate || left.latestStartedAt,
          );
          if (periodComparison !== 0) {
            return periodComparison;
          }
          return compareIsoDateTime(right.latestStartedAt, left.latestStartedAt);
        });

      if (periods.length === 0) {
        return null;
      }

      const jobs = periods.flatMap((period) => period.jobs);
      const latestJob = [...jobs].sort((left, right) => compareIsoDateTime(right.startedAt, left.startedAt))[0];
      const latestStartedAt = latestJob?.startedAt ?? row.lastUpdatedAt;

      return {
        row,
        periods,
        scheduleJobCount: jobs.length,
        latestStartedAt,
        latestStatus: latestJob?.status ?? "pending",
        statusSummary: `${jobs.length} 次调度 · ${periods.length} 个周期`,
      } satisfies SchedulingCollectionTaskRowView;
    })
    .filter((item): item is SchedulingCollectionTaskRowView => Boolean(item))
    .sort((left, right) => {
      const latestComparison = compareIsoDateTime(right.latestStartedAt, left.latestStartedAt);
      if (latestComparison !== 0) {
        return latestComparison;
      }
      if (left.row.requirementTitle !== right.row.requirementTitle) {
        return left.row.requirementTitle.localeCompare(right.row.requirementTitle);
      }
      return left.row.collectionTaskLabel.localeCompare(right.row.collectionTaskLabel);
    });
}

export function normalizeScheduleJobStatus(status?: string): string {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeScheduleJobTriggerType(triggerType?: string): string {
  const normalized = String(triggerType ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "schedule" || normalized === "scheduled" || normalized === "cron") {
    return "scheduled";
  }
  return normalized;
}

export function getScheduleJobTriggerLabel(triggerType?: string): string {
  const normalized = normalizeScheduleJobTriggerType(triggerType);
  if (normalized === "manual") return "手动执行";
  if (normalized === "scheduled") return "定时调度";
  if (normalized === "backfill") return "补采重跑";
  if (normalized === "resample") return "重试";
  if (normalized === "trial") return "试运行";
  return String(triggerType ?? "-");
}

export function getScheduleJobStatusLabel(status?: string): string {
  const normalized = normalizeScheduleJobStatus(status);
  if (normalized === "queued") return "排队中";
  if (normalized === "running") return "运行中";
  if (normalized === "completed") return "已完成";
  if (normalized === "failed") return "失败";
  if (normalized === "skipped") return "已跳过";
  if (normalized === "dispatched") return "已派发";
  return String(status ?? "-");
}

export function formatScheduleListTime(value?: string): string {
  return formatCollectionTaskDateTime(value);
}

function matchesTriggerFilter(job: ScheduleJob, filter: ScheduleTriggerFilter): boolean {
  if (!filter) {
    return true;
  }
  return normalizeScheduleJobTriggerType(job.triggerType) === filter;
}

function matchesStatusFilter(job: ScheduleJob, filter: ScheduleStatusFilter): boolean {
  if (!filter) {
    return true;
  }
  return normalizeScheduleJobStatus(job.status) === filter;
}

function compareIsoDateTime(left?: string, right?: string): number {
  return String(left ?? "").localeCompare(String(right ?? ""));
}
