import { describe, expect, it } from "vitest";

import {
  buildDefaultIndicatorGroupId,
  DEFAULT_INDICATOR_GROUP_NAME,
  ensureDefaultIndicatorGroup,
  hydrateDefaultIndicatorGroupAssignments,
} from "@/lib/indicator-groups";
import type { WideTable } from "@/lib/types";

function buildWideTable(overrides: Partial<WideTable> = {}): WideTable {
  return {
    id: "wt_indicator_groups",
    requirementId: "req_indicator_groups",
    name: "indicator_groups",
    description: "",
    schema: {
      columns: [
        {
          id: "dim_company",
          name: "company",
          type: "STRING",
          category: "dimension",
          description: "",
          required: true,
        },
        {
          id: "metric_sales",
          name: "sales",
          type: "NUMBER",
          category: "indicator",
          description: "",
          required: false,
        },
        {
          id: "metric_profit",
          name: "profit",
          type: "NUMBER",
          category: "indicator",
          description: "",
          required: false,
        },
      ],
    },
    dimensionRanges: [],
    parameterRows: [],
    businessDateRange: {
      start: "2026-01",
      end: "2026-06",
      frequency: "monthly",
    },
    semanticTimeAxis: "business_date",
    collectionCoverageMode: "incremental_by_business_date",
    indicatorGroups: [],
    recordCount: 0,
    status: "draft",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("ensureDefaultIndicatorGroup", () => {
  it("hydrates a default indicator group when indicator columns exist but no groups are stored", () => {
    const wideTable = buildWideTable();

    const normalized = ensureDefaultIndicatorGroup(wideTable);

    expect(normalized.indicatorGroups).toEqual([
      {
        id: buildDefaultIndicatorGroupId(wideTable.id),
        wideTableId: wideTable.id,
        name: DEFAULT_INDICATOR_GROUP_NAME,
        indicatorColumns: ["sales", "profit"],
        priority: 1,
        description: "",
      },
    ]);
  });

  it("keeps existing indicator groups unchanged", () => {
    const wideTable = buildWideTable({
      indicatorGroups: [
        {
          id: "ig_custom",
          wideTableId: "wt_indicator_groups",
          name: "custom group",
          indicatorColumns: ["sales"],
          priority: 1,
          description: "",
        },
      ],
    });

    const normalized = ensureDefaultIndicatorGroup(wideTable);

    expect(normalized.indicatorGroups).toEqual(wideTable.indicatorGroups);
  });
});

describe("hydrateDefaultIndicatorGroupAssignments", () => {
  it("hydrates all indicator columns into the default group when the loaded default group is empty", () => {
    const wideTable = buildWideTable({
      indicatorGroups: [
        {
          id: buildDefaultIndicatorGroupId("wt_indicator_groups"),
          wideTableId: "wt_indicator_groups",
          name: DEFAULT_INDICATOR_GROUP_NAME,
          indicatorColumns: [],
          priority: 1,
          description: "",
        },
      ],
    });

    const normalized = hydrateDefaultIndicatorGroupAssignments(wideTable);

    expect(normalized.indicatorGroups[0]?.indicatorColumns).toEqual(["sales", "profit"]);
  });

  it("does not override existing explicit indicator assignments", () => {
    const wideTable = buildWideTable({
      indicatorGroups: [
        {
          id: buildDefaultIndicatorGroupId("wt_indicator_groups"),
          wideTableId: "wt_indicator_groups",
          name: DEFAULT_INDICATOR_GROUP_NAME,
          indicatorColumns: [],
          priority: 1,
          description: "",
        },
        {
          id: "ig_custom",
          wideTableId: "wt_indicator_groups",
          name: "custom group",
          indicatorColumns: ["sales"],
          priority: 2,
          description: "",
        },
      ],
    });

    const normalized = hydrateDefaultIndicatorGroupAssignments(wideTable);

    expect(normalized.indicatorGroups).toEqual(wideTable.indicatorGroups);
  });
});
