import { describe, expect, it } from "vitest";

import type { ScheduleJob } from "@/lib/domain";
import {
  buildSchedulingCollectionTaskRows,
  getScheduleJobStatusLabel,
  getScheduleJobTriggerLabel,
  normalizeScheduleJobTriggerType,
} from "@/lib/scheduling-list-view";
import type { FetchTask, Project, Requirement, TaskGroup, WideTable } from "@/lib/types";

function buildProject(): Project {
  return {
    id: "P1",
    name: "测试项目",
    description: "",
    status: "active",
    ownerTeam: "team",
    dataSource: {
      search: { engines: [], sites: [], sitePolicy: "preferred" },
      knowledgeBases: [],
      fixedUrls: [],
    },
    createdAt: "2026-06-22T09:00:00.000Z",
  };
}

function buildWideTable(): WideTable {
  return {
    id: "WT1",
    requirementId: "REQ1",
    name: "测试宽表",
    description: "",
    schema: {
      columns: [
        {
          id: "metric_a",
          name: "metric_a",
          chineseName: "指标A",
          type: "NUMBER",
          category: "indicator",
          description: "",
          required: false,
        },
      ],
    },
    dimensionRanges: [],
    businessDateRange: {
      start: "2026-01-01",
      end: "never",
      frequency: "monthly",
    },
    indicatorGroups: [
      {
        id: "IG1",
        wideTableId: "WT1",
        name: "默认分组",
        indicatorColumns: ["metric_a"],
        priority: 1,
        description: "",
      },
    ],
    recordCount: 0,
    status: "initialized",
    createdAt: "2026-06-22T09:00:00.000Z",
    updatedAt: "2026-06-22T09:00:00.000Z",
  };
}

function buildRequirement(): Requirement {
  return {
    id: "REQ1",
    projectId: "P1",
    requirementType: "production",
    title: "测试需求",
    status: "running",
    owner: "tester",
    assignee: "tester",
    businessGoal: "",
    wideTable: buildWideTable(),
    createdAt: "2026-06-22T09:00:00.000Z",
    updatedAt: "2026-06-22T09:00:00.000Z",
  };
}

function buildTaskGroups(): TaskGroup[] {
  return [
    {
      id: "TG1",
      requirementId: "REQ1",
      wideTableId: "WT1",
      businessDate: "2026-06-30",
      businessDateLabel: "2026-06",
      partitionType: "indicator_group",
      partitionKey: "IG1",
      partitionLabel: "默认分组",
      status: "completed",
      totalTasks: 1,
      pendingTasks: 0,
      runningTasks: 0,
      completedTasks: 1,
      failedTasks: 0,
      cancelledTasks: 0,
      invalidatedTasks: 0,
      triggeredBy: "schedule",
      createdAt: "2026-06-22T09:00:00.000Z",
      updatedAt: "2026-06-22T09:00:00.000Z",
    },
    {
      id: "TG2",
      requirementId: "REQ1",
      wideTableId: "WT1",
      businessDate: "2026-05-31",
      businessDateLabel: "2026-05",
      partitionType: "indicator_group",
      partitionKey: "IG1",
      partitionLabel: "默认分组",
      status: "completed",
      totalTasks: 1,
      pendingTasks: 0,
      runningTasks: 0,
      completedTasks: 1,
      failedTasks: 0,
      cancelledTasks: 0,
      invalidatedTasks: 0,
      triggeredBy: "schedule",
      createdAt: "2026-06-20T09:00:00.000Z",
      updatedAt: "2026-06-20T09:00:00.000Z",
    },
  ];
}

function buildFetchTasks(): FetchTask[] {
  return [
    {
      id: "FT1",
      taskGroupId: "TG1",
      wideTableId: "WT1",
      rowId: 1,
      indicatorGroupId: "IG1",
      indicatorGroupName: "默认分组",
      indicatorKeys: ["metric_a"],
      status: "completed",
      executionRecords: [],
      createdAt: "2026-06-22T09:00:00.000Z",
      updatedAt: "2026-06-22T09:00:00.000Z",
    },
  ];
}

function buildScheduleJobs(): ScheduleJob[] {
  return [
    {
      id: "SJ1",
      taskGroupId: "TG1",
      triggerType: "SCHEDULE",
      status: "DISPATCHED",
      startedAt: "2026-06-22T10:00:00.000Z",
      endedAt: "2026-06-22T10:01:00.000Z",
      operator: "xxl-job-auto-sync",
    },
    {
      id: "SJ2",
      taskGroupId: "TG1",
      triggerType: "manual",
      status: "failed",
      startedAt: "2026-06-22T11:00:00.000Z",
      endedAt: "2026-06-22T11:01:00.000Z",
      operator: "tester",
    },
    {
      id: "SJ3",
      taskGroupId: "TG2",
      triggerType: "backfill",
      status: "completed",
      startedAt: "2026-05-31T10:00:00.000Z",
      endedAt: "2026-05-31T10:01:00.000Z",
      operator: "system",
    },
  ];
}

describe("scheduling-list-view", () => {
  it("groups schedule jobs under collection tasks by period", () => {
    const rows = buildSchedulingCollectionTaskRows({
      projects: [buildProject()],
      requirements: [buildRequirement()],
      wideTables: [buildWideTable()],
      taskGroups: buildTaskGroups(),
      fetchTasks: buildFetchTasks(),
      scheduleJobs: buildScheduleJobs(),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.row.collectionTaskLabel).toBe("默认分组");
    expect(rows[0]?.scheduleJobCount).toBe(3);
    expect(rows[0]?.periods).toHaveLength(2);
    expect(rows[0]?.periods[0]?.taskGroup.id).toBe("TG1");
    expect(rows[0]?.periods[0]?.jobs.map((job) => job.id)).toEqual(["SJ2", "SJ1"]);
  });

  it("filters scheduled trigger types across legacy aliases", () => {
    const rows = buildSchedulingCollectionTaskRows({
      projects: [buildProject()],
      requirements: [buildRequirement()],
      wideTables: [buildWideTable()],
      taskGroups: buildTaskGroups(),
      fetchTasks: buildFetchTasks(),
      scheduleJobs: buildScheduleJobs(),
      triggerFilter: "scheduled",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.scheduleJobCount).toBe(1);
    expect(rows[0]?.periods[0]?.jobs[0]?.id).toBe("SJ1");
  });

  it("formats labels for trigger type and status", () => {
    expect(normalizeScheduleJobTriggerType("cron")).toBe("scheduled");
    expect(getScheduleJobTriggerLabel("SCHEDULE")).toBe("定时调度");
    expect(getScheduleJobStatusLabel("DISPATCHED")).toBe("已派发");
  });
});
