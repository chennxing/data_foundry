import { describe, expect, it } from "vitest";

import {
  buildIndicatorTaskSignature,
  buildRuntimeIndicatorTaskSignature,
  resolveCurrentPlanVersion,
} from "@/lib/task-plan-reconciliation";
import type { FetchTask, TaskGroup, WideTable, WideTableRecord } from "@/lib/types";

function buildWideTable(): WideTable {
  return {
    id: "WT-AD-SAFE",
    requirementId: "REQ-2026-004",
    name: "ads_autodrive_safety",
    description: "自动驾驶安全宽表",
    schema: {
      columns: [
        {
          id: "COL_ID",
          name: "id",
          chineseName: "行ID",
          type: "INTEGER",
          category: "id",
          description: "行主键",
          required: true,
        },
        {
          id: "COL_BIZ_DATE",
          name: "biz_date",
          chineseName: "业务日期",
          type: "DATE",
          category: "dimension",
          description: "业务日期",
          required: true,
          isBusinessDate: true,
        },
      ],
    },
    dimensionRanges: [],
    businessDateRange: {
      start: "2025-11-30",
      end: "2026-03-31",
      frequency: "monthly",
    },
    semanticTimeAxis: "business_date",
    collectionCoverageMode: "incremental_by_business_date",
    indicatorGroups: [],
    recordCount: 10,
    status: "initialized",
    createdAt: "2026-03-26T00:00:00Z",
    updatedAt: "2026-03-26T00:00:00Z",
  };
}

function buildRecord(id: number, planVersion: number, businessDate: string): WideTableRecord {
  return {
    id,
    wideTableId: "WT-AD-SAFE",
    ROW_ID: id,
    biz_date: businessDate,
    BIZ_DATE: businessDate,
    _metadata: {
      planVersion,
    },
  };
}

function buildTaskGroup(id: string, planVersion: number, businessDate: string): TaskGroup {
  return {
    id,
    wideTableId: "WT-AD-SAFE",
    businessDate,
    businessDateLabel: businessDate,
    planVersion,
    status: "completed",
    totalTasks: 4,
    pendingTasks: 0,
    runningTasks: 0,
    completedTasks: 4,
    failedTasks: 0,
    cancelledTasks: 0,
    invalidatedTasks: 0,
    triggeredBy: "backfill",
    createdAt: "2026-03-26T00:00:00Z",
    updatedAt: "2026-03-26T00:00:00Z",
  };
}

describe("resolveCurrentPlanVersion", () => {
  it("prefers the latest row plan version when task groups are stale", () => {
    const wideTable = buildWideTable();
    const records = [
      buildRecord(1, 1, "2025-01-31"),
      buildRecord(2, 3, "2025-12-31"),
      buildRecord(3, 3, "2026-01-31"),
    ];
    const taskGroups = [
      buildTaskGroup("TG-WT-AD-SAFE-202501", 1, "2025-01-31"),
    ];

    expect(resolveCurrentPlanVersion(wideTable, records, taskGroups)).toBe(3);
  });
});

describe("indicator task signatures", () => {
  it("ignores empty indicator groups when building the desired signature", () => {
    const signature = buildIndicatorTaskSignature([
      {
        id: "ig-active",
        wideTableId: "WT-AD-SAFE",
        name: "Active",
        indicatorColumns: ["metric_b", "metric_a"],
        priority: 1,
        description: "",
      },
      {
        id: "ig-empty",
        wideTableId: "WT-AD-SAFE",
        name: "Empty",
        indicatorColumns: [],
        priority: 2,
        description: "",
      },
    ]);

    expect(signature).toBe("[{\"id\":\"ig-active\",\"name\":\"Active\",\"indicatorColumns\":[\"metric_a\",\"metric_b\"]}]");
  });

  it("builds the runtime signature from the latest persisted task groups only", () => {
    const taskGroups: TaskGroup[] = [
      {
        ...buildTaskGroup("TG-OLD", 1, "2025-12-31"),
        partitionKey: "ig-old",
        partitionLabel: "Old Group",
        status: "completed",
      },
      {
        ...buildTaskGroup("TG-CURRENT-A", 3, "2026-01-31"),
        partitionKey: "ig-a",
        partitionLabel: "Current A",
        status: "pending",
      },
      {
        ...buildTaskGroup("TG-CURRENT-B", 3, "2026-01-31"),
        partitionKey: "ig-b",
        partitionLabel: "Current B",
        status: "running",
      },
      {
        ...buildTaskGroup("TG-INVALID", 4, "2026-02-28"),
        partitionKey: "ig-invalid",
        partitionLabel: "Invalid",
        status: "invalidated",
      },
    ];
    const fetchTasks: FetchTask[] = [
      buildFetchTask("FT-A1", "TG-CURRENT-A", "ig-a", 3, ["metric_a", "metric_b"]),
      buildFetchTask("FT-A2", "TG-CURRENT-A", "ig-a", 3, ["metric_b"]),
      buildFetchTask("FT-B1", "TG-CURRENT-B", "ig-b", 3, ["metric_c"]),
      buildFetchTask("FT-OLD", "TG-OLD", "ig-old", 1, ["metric_old"]),
      buildFetchTask("FT-INVALID", "TG-INVALID", "ig-invalid", 4, ["metric_invalid"]),
    ];

    expect(buildRuntimeIndicatorTaskSignature({
      wideTableId: "WT-AD-SAFE",
      taskGroups,
      fetchTasks,
    })).toBe(
      "[{\"id\":\"ig-a\",\"name\":\"Current A\",\"indicatorColumns\":[\"metric_a\",\"metric_b\"]},{\"id\":\"ig-b\",\"name\":\"Current B\",\"indicatorColumns\":[\"metric_c\"]}]",
    );
  });
});

function buildFetchTask(
  id: string,
  taskGroupId: string,
  indicatorGroupId: string,
  planVersion: number,
  indicatorKeys: string[],
): FetchTask {
  return {
    id,
    taskGroupId,
    wideTableId: "WT-AD-SAFE",
    rowId: 1,
    planVersion,
    indicatorGroupId,
    indicatorGroupName: indicatorGroupId,
    indicatorKeys,
    status: "pending",
    executionRecords: [],
    createdAt: "2026-03-26T00:00:00Z",
    updatedAt: "2026-03-26T00:00:00Z",
  };
}
