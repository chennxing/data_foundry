"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ChevronRight, X } from "lucide-react";
import type { ScheduleJob, ScheduleTriggerLog } from "@/lib/domain";
import { getCurrentUser } from "@/lib/auth-permissions";
import type { FetchTask, Project, Requirement, TaskGroup, WideTable } from "@/lib/types";
import {
  createScheduleJob,
  fetchCollectionTasksOverview,
  fetchScheduleJobs,
  fetchScheduleTriggerLogs,
} from "@/lib/api-client";
import {
  buildSchedulingCollectionTaskRows,
  formatScheduleListTime,
  getScheduleJobStatusLabel,
  getScheduleJobTriggerLabel,
  normalizeScheduleJobStatus,
  type ScheduleStatusFilter,
  type ScheduleTriggerFilter,
} from "@/lib/scheduling-list-view";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-slate-100 text-slate-700",
  dispatched: "bg-amber-100 text-amber-700",
};

type TriggerRecordModalState = {
  collectionTaskLabel: string;
  periodLabel: string;
  requirementTitle: string;
  job: ScheduleJob;
};

export default function SchedulingPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [wideTables, setWideTables] = useState<WideTable[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [fetchTasks, setFetchTasks] = useState<FetchTask[]>([]);
  const [scheduleJobs, setScheduleJobs] = useState<ScheduleJob[]>([]);
  const [filterTrigger, setFilterTrigger] = useState<ScheduleTriggerFilter>("");
  const [filterStatus, setFilterStatus] = useState<ScheduleStatusFilter>("");
  const [expandedCollectionTaskKey, setExpandedCollectionTaskKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTriggerRecord, setSelectedTriggerRecord] = useState<TriggerRecordModalState | null>(null);
  const [selectedTriggerLogs, setSelectedTriggerLogs] = useState<ScheduleTriggerLog[]>([]);
  const [triggerLogsLoading, setTriggerLogsLoading] = useState(false);
  const [triggerLogsError, setTriggerLogsError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, jobs] = await Promise.all([
        fetchCollectionTasksOverview(),
        fetchScheduleJobs(),
      ]);
      setProjects(overview.projects);
      setRequirements(overview.requirements);
      setWideTables(overview.wideTables);
      setTaskGroups(overview.taskGroups);
      setFetchTasks(overview.fetchTasks);
      setScheduleJobs(jobs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo(
    () =>
      buildSchedulingCollectionTaskRows({
        projects,
        requirements,
        wideTables,
        taskGroups,
        fetchTasks,
        scheduleJobs,
        triggerFilter: filterTrigger,
        statusFilter: filterStatus,
      }),
    [projects, requirements, wideTables, taskGroups, fetchTasks, scheduleJobs, filterTrigger, filterStatus],
  );

  const handleManualTrigger = async (taskGroupId: string) => {
    const currentUser = getCurrentUser();
    await createScheduleJob({
      taskGroupId,
      triggerType: "MANUAL",
      operator: currentUser?.account || currentUser?.name || "system",
    });
    await loadData();
  };

  const handleOpenTriggerRecord = async (
    row: {
      collectionTaskLabel: string;
      requirementTitle: string;
    },
    periodLabel: string,
    job: ScheduleJob,
  ) => {
    setSelectedTriggerRecord({
      collectionTaskLabel: row.collectionTaskLabel,
      requirementTitle: row.requirementTitle,
      periodLabel,
      job,
    });
    setSelectedTriggerLogs([]);
    setTriggerLogsError("");
    setTriggerLogsLoading(true);
    try {
      const logs = await fetchScheduleTriggerLogs(job.id);
      setSelectedTriggerLogs(logs);
    } catch (error: any) {
      setTriggerLogsError(error?.message ? String(error.message) : "触发日志加载失败");
    } finally {
      setTriggerLogsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CalendarClock className="h-5 w-5 text-primary" />
          调度
        </h1>
        <p className="text-sm text-muted-foreground">
          从采集任务视角查看调度执行记录，按时间周期展开调度任务，并查看每次触发记录。
        </p>
      </header>

      <section className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">调度执行记录</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              以采集任务为主视角展示，展开后查看对应时间周期下的调度运行记录。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterTrigger}
              onChange={(event) => setFilterTrigger(event.target.value as ScheduleTriggerFilter)}
              aria-label="筛选触发方式"
            >
              <option value="">全部触发方式</option>
              <option value="scheduled">定时调度</option>
              <option value="manual">手动执行</option>
              <option value="backfill">补采重跑</option>
              <option value="trial">试运行</option>
            </select>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as ScheduleStatusFilter)}
              aria-label="筛选状态"
            >
              <option value="">全部状态</option>
              <option value="running">运行中</option>
              <option value="success">调度成功</option>
              <option value="failed">调度失败</option>
              <option value="skipped">已跳过</option>
            </select>
            <button
              type="button"
              className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:opacity-90"
              onClick={() => void loadData()}
              disabled={loading}
            >
              {loading ? "加载中..." : "刷新"}
            </button>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.8fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_auto] gap-4 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <div>采集任务</div>
            <div>关联需求</div>
            <div>调度任务</div>
            <div>运行状态</div>
            <div>最近更新</div>
            <div className="text-right">操作</div>
          </div>

          <div className="divide-y divide-slate-200/80">
            {rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                {loading ? "加载中..." : "暂无调度记录"}
              </div>
            ) : (
              rows.map((item) => {
                const isExpanded = expandedCollectionTaskKey === item.row.key;
                const normalizedStatus = normalizeScheduleJobStatus(item.latestStatus);

                return (
                  <div key={item.row.key} className="px-4 py-3">
                    <div className="grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.8fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_auto] items-start gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCollectionTaskKey((current) => (current === item.row.key ? null : item.row.key))
                        }
                        className="flex min-w-0 items-start gap-2 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium">{item.row.collectionTaskLabel}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.scheduleJobCount} 次调度 · {item.periods.length} 个周期
                          </div>
                        </div>
                      </button>

                      <div className="min-w-0">
                        <div className="truncate text-sm">{item.row.requirementTitle}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{item.row.requirementId}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm">{item.row.scheduleLabel}</div>
                        <div className="mt-1 text-xs text-muted-foreground">展开后按时间周期查看调度任务</div>
                      </div>

                      <div className="min-w-0">
                        <span
                          className={cn(
                            "inline-flex rounded px-2 py-1 text-xs",
                            statusStyle[normalizedStatus] ?? "bg-slate-100 text-slate-700",
                          )}
                        >
                          {getScheduleJobStatusLabel(item.latestStatus)}
                        </span>
                        <div className="mt-1 text-xs text-muted-foreground">{item.statusSummary}</div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {formatScheduleListTime(item.latestStartedAt)}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCollectionTaskKey((current) => (current === item.row.key ? null : item.row.key))
                          }
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? "收起调度" : "展开调度"}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 border-t border-slate-200/70 bg-muted/10 pb-1 pl-7 pt-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">调度任务</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              按时间周期平铺查看当前采集任务下的调度运行记录，并通过弹窗查看触发记录详情。
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            共 {item.periods.length} 个周期 · {item.scheduleJobCount} 条运行记录
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border bg-background/70">
                          <table className="w-full text-sm">
                            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left">时间周期</th>
                                <th className="px-3 py-2 text-left">采集任务实例</th>
                                <th className="px-3 py-2 text-left">运行ID</th>
                                <th className="px-3 py-2 text-left">触发方式</th>
                                <th className="px-3 py-2 text-left">状态</th>
                                <th className="px-3 py-2 text-left">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {item.periods.flatMap((period) =>
                                period.jobs.map((job) => {
                                  const jobStatus = normalizeScheduleJobStatus(job.status);
                                  const periodLabel =
                                    period.taskGroup.businessDateLabel ||
                                    period.taskGroup.businessDate ||
                                    period.taskGroup.id;

                                  return (
                                    <tr key={job.id}>
                                      <td className="px-3 py-2 font-medium">{periodLabel}</td>
                                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                                        {period.taskGroup.id}
                                      </td>
                                      <td className="px-3 py-2 font-mono text-xs">{job.id}</td>
                                      <td className="px-3 py-2">{getScheduleJobTriggerLabel(job.triggerType)}</td>
                                      <td className="px-3 py-2">
                                        <span
                                          className={cn(
                                            "inline-flex rounded px-2 py-1 text-xs",
                                            statusStyle[jobStatus] ?? "bg-slate-100 text-slate-700",
                                          )}
                                        >
                                          {getScheduleJobStatusLabel(job.status)}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <button
                                            type="button"
                                            className="text-xs text-primary hover:underline"
                                            onClick={() =>
                                              void handleOpenTriggerRecord(
                                                {
                                                  collectionTaskLabel: item.row.collectionTaskLabel,
                                                  requirementTitle: item.row.requirementTitle,
                                                },
                                                periodLabel,
                                                job,
                                              )
                                            }
                                          >
                                            查看触发记录
                                          </button>
                                          <button
                                            type="button"
                                            className="text-xs text-primary hover:underline"
                                            onClick={() => void handleManualTrigger(job.taskGroupId)}
                                          >
                                            重新触发
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <TriggerRecordModal
        state={selectedTriggerRecord}
        logs={selectedTriggerLogs}
        loading={triggerLogsLoading}
        error={triggerLogsError}
        onClose={() => {
          setSelectedTriggerRecord(null);
          setSelectedTriggerLogs([]);
          setTriggerLogsError("");
          setTriggerLogsLoading(false);
        }}
      />
    </div>
  );
}

function TriggerRecordModal({
  state,
  logs,
  loading,
  error,
  onClose,
}: {
  state: TriggerRecordModalState | null;
  logs: ScheduleTriggerLog[];
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  if (!state) {
    return null;
  }

  const latestLog = logs[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-base font-semibold">查看触发记录</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {state.collectionTaskLabel} · {state.periodLabel} · {state.requirementTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <TriggerField label="开始" value={formatScheduleListTime(state.job.startedAt)} />
            <TriggerField label="结束" value={formatScheduleListTime(state.job.endedAt)} />
            <TriggerField label="触发者" value={state.job.operator || "-"} />
          </div>

          {state.job.errorMessage ? (
            <div className="space-y-1">
              <div className="text-sm font-semibold">调度失败原因</div>
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                {state.job.errorMessage}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-sm font-semibold">触发日志</div>
            {loading ? (
              <div className="rounded-md border bg-muted/10 px-3 py-6 text-center text-sm text-muted-foreground">
                触发日志加载中...
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : latestLog ? (
              <div className="space-y-3 rounded-md border bg-muted/10 p-4 text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <TriggerField label="日志ID" value={latestLog.id} />
                  <TriggerField label="触发状态" value={latestLog.triggerStatus} />
                  <TriggerField label="触发来源" value={latestLog.triggerSource} />
                  <TriggerField label="触发类型" value={latestLog.triggerType} />
                  <TriggerField label="业务日期" value={latestLog.businessDate || "-"} />
                  <TriggerField label="创建时间" value={formatScheduleListTime(latestLog.createdAt)} />
                </div>

                <LogBlock title="触发参数" value={latestLog.triggerParamJson} emptyText="暂无触发参数" />
                <LogBlock title="跳过原因" value={latestLog.skipReason} emptyText="无" />
                <LogBlock title="错误信息" value={latestLog.errorMessage} emptyText="无" />
              </div>
            ) : (
              <div className="rounded-md border bg-muted/10 px-3 py-6 text-center text-sm text-muted-foreground">
                暂无触发日志
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t bg-muted/10 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function TriggerField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-all text-sm">{value || "-"}</div>
    </div>
  );
}

function LogBlock({
  title,
  value,
  emptyText,
}: {
  title: string;
  value?: string;
  emptyText: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
        <pre className="whitespace-pre-wrap break-all font-sans">{value?.trim() ? value : emptyText}</pre>
      </div>
    </div>
  );
}
