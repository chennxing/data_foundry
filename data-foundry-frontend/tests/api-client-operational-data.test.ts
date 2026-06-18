import { afterEach, describe, expect, it, vi } from "vitest";

import { loadRequirementOperationalData } from "@/lib/api-client";
import type { WideTable } from "@/lib/types";

function buildWideTable(): WideTable {
  return {
    id: "WT1",
    requirementId: "R1",
    name: "wide_table_demo",
    description: "",
    schema: {
      columns: [
        {
          id: "COL_ID",
          name: "id",
          chineseName: "ID",
          type: "INTEGER",
          category: "id",
          description: "",
          required: true,
        },
        {
          id: "COL_BIZ_DATE",
          name: "biz_date",
          chineseName: "业务日期",
          type: "DATE",
          category: "dimension",
          description: "",
          required: true,
          isBusinessDate: true,
        },
      ],
    },
    dimensionRanges: [],
    businessDateRange: {
      start: "2026-01-31",
      end: "2026-06-30",
      frequency: "monthly",
    },
    semanticTimeAxis: "business_date",
    collectionCoverageMode: "incremental_by_business_date",
    indicatorGroups: [],
    recordCount: 0,
    status: "initialized",
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
}

describe("loadRequirementOperationalData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("falls back to task-groups and tasks when task-runtime fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/projects/P1/requirements/R1/task-runtime?include_collection_rows=false")) {
        throw new Error("runtime down");
      }
      if (url.endsWith("/api/projects/P1/requirements/R1/task-groups")) {
        return jsonResponse([
          {
            id: "TG1",
            requirement_id: "R1",
            wide_table_id: "WT1",
            business_date: "2026-06-30",
            business_date_label: "2026-06",
            partition_type: "indicator_group",
            partition_key: "ig-active",
            partition_label: "Active",
            plan_version: 3,
            status: "running",
            total_tasks: 1,
            pending_tasks: 0,
            running_tasks: 1,
            completed_tasks: 0,
            failed_tasks: 0,
            cancelled_tasks: 0,
            invalidated_tasks: 0,
            triggered_by: "schedule",
            created_at: "2026-06-18T00:00:00.000Z",
            updated_at: "2026-06-18T00:00:00.000Z",
          },
        ]);
      }
      if (url.endsWith("/api/projects/P1/requirements/R1/tasks?include_collection_rows=false")) {
        return jsonResponse([
          {
            id: "FT1",
            task_group_id: "TG1",
            wide_table_id: "WT1",
            row_id: 1,
            plan_version: 3,
            indicator_group_id: "ig-active",
            indicator_group_name: "Active",
            indicator_keys: ["metric_a"],
            business_date: "2026-06-30",
            status: "running",
            created_at: "2026-06-18T00:00:00.000Z",
            updated_at: "2026-06-18T00:00:00.000Z",
          },
        ]);
      }
      if (url.endsWith("/api/acceptance-tickets?requirement_id=R1")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schedule-jobs?task_group_ids=TG1")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/wide-tables/WT1/rows")) {
        return jsonResponse([]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadRequirementOperationalData("P1", "R1", [buildWideTable()]);

    expect(result.taskGroups).toHaveLength(1);
    expect(result.taskGroups[0]?.id).toBe("TG1");
    expect(result.fetchTasks).toHaveLength(1);
    expect(result.fetchTasks[0]?.id).toBe("FT1");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("throws the combined runtime error when both primary and fallback endpoints fail", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/task-runtime")) {
        throw new Error("runtime down");
      }
      if (url.includes("/task-groups")) {
        throw new Error("groups down");
      }
      if (url.includes("/tasks")) {
        throw new Error("tasks down");
      }
      if (url.endsWith("/api/acceptance-tickets?requirement_id=R1")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/wide-tables/WT1/rows")) {
        return jsonResponse([]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadRequirementOperationalData("P1", "R1", [buildWideTable()])).rejects.toThrow(
      "/task-runtime=runtime down",
    );
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}
