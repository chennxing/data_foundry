import type { ColumnDefinition, WideTable } from "@/lib/types";

export const DEFAULT_INDICATOR_GROUP_PREFIX = "ig_default_";
export const DEFAULT_INDICATOR_GROUP_NAME = "默认指标组";

export const buildDefaultIndicatorGroupId = (wideTableId: string) =>
  `${DEFAULT_INDICATOR_GROUP_PREFIX}${wideTableId}`;

export function buildDefaultIndicatorGroup(
  wideTable: WideTable,
  indicatorColumns: ColumnDefinition[],
): WideTable["indicatorGroups"][number] {
  return {
    id: buildDefaultIndicatorGroupId(wideTable.id),
    wideTableId: wideTable.id,
    name: DEFAULT_INDICATOR_GROUP_NAME,
    indicatorColumns: indicatorColumns.map((column) => column.name),
    priority: 1,
    description: "",
  };
}

export function ensureDefaultIndicatorGroup(wideTable: WideTable): WideTable {
  const indicatorColumns = wideTable.schema.columns.filter((column) => column.category === "indicator");
  if (indicatorColumns.length === 0 || wideTable.indicatorGroups.length > 0) {
    return wideTable;
  }

  return {
    ...wideTable,
    indicatorGroups: [buildDefaultIndicatorGroup(wideTable, indicatorColumns)],
  };
}

export function hydrateDefaultIndicatorGroupAssignments(wideTable: WideTable): WideTable {
  const normalizedWideTable = ensureDefaultIndicatorGroup(wideTable);
  const indicatorColumns = normalizedWideTable.schema.columns.filter((column) => column.category === "indicator");
  if (indicatorColumns.length === 0) {
    return normalizedWideTable;
  }

  const defaultIndicatorGroupId = buildDefaultIndicatorGroupId(normalizedWideTable.id);
  const defaultGroupIndex = normalizedWideTable.indicatorGroups.findIndex(
    (group) => group.id === defaultIndicatorGroupId,
  );
  if (defaultGroupIndex < 0) {
    return normalizedWideTable;
  }

  const assignedColumns = new Set(
    normalizedWideTable.indicatorGroups.flatMap((group) => group.indicatorColumns),
  );
  if (assignedColumns.size > 0) {
    return normalizedWideTable;
  }

  const nextIndicatorColumns = indicatorColumns.map((column) => column.name);
  return {
    ...normalizedWideTable,
    indicatorGroups: normalizedWideTable.indicatorGroups.map((group, index) => (
      index === defaultGroupIndex
        ? {
            ...group,
            indicatorColumns: nextIndicatorColumns,
          }
        : group
    )),
  };
}
