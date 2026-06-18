"use client";

import { useEffect, useState } from "react";
import {
  persistWideTablePlan,
  persistWideTablePreview,
  updateRequirementWideTable,
} from "@/lib/api-client";
import {
  annotateCurrentPlanRecords,
  buildIndicatorTaskSignature,
  buildRuntimeIndicatorTaskSignature,
  buildTaskPlanFingerprint,
  reconcileTaskPlanChange,
  resolveCurrentPlanVersion,
} from "@/lib/task-plan-reconciliation";
import { generateWideTablePreviewRecords } from "@/lib/wide-table-preview";
import type {
  FetchTask,
  Requirement,
  TaskGroup,
  WideTable,
  WideTableRecord,
} from "@/lib/types";
import {
  buildDefaultIndicatorGroupId,
  ensureDefaultIndicatorGroup,
} from "@/lib/indicator-groups";
import { formatTaskActionError } from "@/components/requirement-tasks/utils/requirementTaskFormatters";

type Props = {
  requirement: Requirement;
  selectedWt?: WideTable;
  hasIndicatorColumns: boolean;
  isDefinitionSubmitted: boolean;
  isIndicatorGroupingComplete: boolean;
  usesBusinessDateAxis: boolean;
  currentWideTableRecords: WideTableRecord[];
  wideTableRecords: WideTableRecord[];
  taskGroups: TaskGroup[];
  fetchTasks: FetchTask[];
  updateSelectedWideTable: (updater: (wideTable: WideTable) => WideTable) => void;
  onReplaceWideTableRecords?: (wideTableId: string, nextWideTableRecords: WideTableRecord[]) => void;
  onTaskGroupsChange: (nextTaskGroups: TaskGroup[]) => void;
  onFetchTasksChange: (nextFetchTasks: FetchTask[]) => void;
  onTaskRuntimeChange?: (nextTaskGroups: TaskGroup[], nextFetchTasks: FetchTask[]) => void;
  onRequirementChange?: (requirement: Requirement) => void;
  onRefreshData?: () => Promise<void>;
  buildWideTableWithPromptDrafts: (wideTable: WideTable, editedAt: string) => WideTable;
};

export default function useIndicatorGroups({
  requirement,
  selectedWt,
  hasIndicatorColumns,
  isDefinitionSubmitted,
  isIndicatorGroupingComplete,
  usesBusinessDateAxis,
  currentWideTableRecords,
  wideTableRecords,
  taskGroups,
  fetchTasks,
  updateSelectedWideTable,
  onReplaceWideTableRecords,
  onTaskGroupsChange,
  onFetchTasksChange,
  onTaskRuntimeChange,
  onRequirementChange,
  onRefreshData,
  buildWideTableWithPromptDrafts,
}: Props) {
  const [indicatorGroupMessage, setIndicatorGroupMessage] = useState("");
  const [isIndicatorGroupModalOpen, setIsIndicatorGroupModalOpen] = useState(false);
  const [isPersistingIndicatorGroups, setIsPersistingIndicatorGroups] = useState(false);

  useEffect(() => {
    setIndicatorGroupMessage("");
    setIsIndicatorGroupModalOpen(false);
  }, [selectedWt?.id]);

  const handleAddIndicatorGroup = () => {
    if (!selectedWt) {
      return;
    }

    updateSelectedWideTable((wideTable) => ({
      ...wideTable,
      indicatorGroups: (() => {
        const normalizedWideTable = ensureDefaultIndicatorGroup(wideTable);
        const nextIndex = normalizedWideTable.indicatorGroups.length + 1;
        return [
          ...normalizedWideTable.indicatorGroups,
          {
            id: `ig_${wideTable.id}_${Date.now()}`,
            wideTableId: wideTable.id,
            name: `新指标组${nextIndex}`,
            indicatorColumns: [],
            priority: nextIndex,
            description: "",
          },
        ];
      })(),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteIndicatorGroup = (groupId: string) => {
    updateSelectedWideTable((wideTable) => ({
      ...wideTable,
      indicatorGroups: (() => {
        const defaultGroupId = buildDefaultIndicatorGroupId(wideTable.id);
        return ensureDefaultIndicatorGroup(wideTable).indicatorGroups
          .filter((group) => group.id === defaultGroupId || group.id !== groupId)
          .map((group, index) => ({
            ...group,
            priority: index + 1,
          }));
      })(),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleIndicatorGroupChange = (
    groupId: string,
    patch: Partial<WideTable["indicatorGroups"][number]>,
  ) => {
    updateSelectedWideTable((wideTable) => ({
      ...wideTable,
      indicatorGroups: ensureDefaultIndicatorGroup(wideTable).indicatorGroups.map((group) => (
        group.id === groupId ? { ...group, ...patch } : group
      )),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAssignIndicatorColumnToGroup = (columnName: string, groupId: string) => {
    updateSelectedWideTable((wideTable) => ({
      ...wideTable,
      indicatorGroups: (() => {
        return ensureDefaultIndicatorGroup(wideTable).indicatorGroups
          .map((group) => {
            const nextColumns = group.indicatorColumns.filter((column) => column !== columnName);
            if (group.id === groupId) {
              return {
                ...group,
                indicatorColumns: [...nextColumns, columnName],
              };
            }
            return {
              ...group,
              indicatorColumns: nextColumns,
            };
          });
      })(),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleClearIndicatorColumnGroup = (columnName: string) => {
    updateSelectedWideTable((wideTable) => ({
      ...wideTable,
      indicatorGroups: (() => {
        return ensureDefaultIndicatorGroup(wideTable).indicatorGroups
          .map((group) => ({
            ...group,
            indicatorColumns: group.indicatorColumns.filter((column) => column !== columnName),
          }));
      })(),
      updatedAt: new Date().toISOString(),
    }));
  };

  const ensurePreviewRows = async (wideTable: WideTable, now: string) => {
    if (currentWideTableRecords.length > 0) {
      return { wideTable, records: currentWideTableRecords };
    }

    const { records, totalCount } = generateWideTablePreviewRecords(
      wideTable,
      currentWideTableRecords,
      wideTableRecords,
    );
    if (totalCount === 0) {
      const hasConfiguredTimeRange = Boolean(
        wideTable.businessDateRange.start?.trim()
        && String(wideTable.businessDateRange.end ?? "").trim(),
      );
      const hasConfiguredParameterRows = Boolean(wideTable.parameterRows?.length);
      const previewMissingReason = !hasConfiguredTimeRange
        ? "当前时间范围为空，无法生成预览行。请先回到【需求】完善数据范围。"
        : !hasConfiguredParameterRows
          ? "当前采集参数表为空，无法生成预览行。请先回到【需求】完善数据范围。"
          : "当前数据范围配置不足，无法生成预览行。请先回到【需求】完善数据范围。";
      throw new Error(previewMissingReason);
    }
    if (totalCount === 0) {
      throw new Error(
        usesBusinessDateAxis
          ? "当前业务日期范围或维度取值不足，无法生成预览行。请先回到【需求】完善数据范围。"
          : "当前维度取值不足，无法生成快照预览行。请先回到【需求】完善数据范围。",
      );
    }

    const reconciliation = reconcileTaskPlanChange({
      requirement,
      wideTable,
      previousRecords: currentWideTableRecords,
      nextRecords: records,
      taskGroups,
      fetchTasks,
    });
    const nextPlanVersion = reconciliation.nextPlanVersion || Math.max(
      1,
      resolveCurrentPlanVersion(wideTable, currentWideTableRecords, taskGroups),
    );
    const nextPlanFingerprint = reconciliation.nextPlanFingerprint || buildTaskPlanFingerprint(wideTable, records);
    const recordsToPersist = records.map((record) => ({
      ...record,
      _metadata: {
        ...record._metadata,
        planVersion: nextPlanVersion,
        snapshotKind: "baseline" as const,
      },
    }));
    const persistedWideTable: WideTable = {
      ...wideTable,
      currentPlanVersion: nextPlanVersion,
      currentPlanFingerprint: nextPlanFingerprint,
      recordCount: totalCount,
      status: wideTable.status === "active" ? "active" : "initialized",
      updatedAt: now,
    };

    await persistWideTablePreview(requirement.id, persistedWideTable, recordsToPersist);
    updateSelectedWideTable(() => persistedWideTable);
    onReplaceWideTableRecords?.(wideTable.id, recordsToPersist);
    return { wideTable: persistedWideTable, records: recordsToPersist };
  };

  const handlePersistIndicatorGroups = async () => {
    if (!selectedWt) {
      return;
    }

    if (!isDefinitionSubmitted) {
      setIndicatorGroupMessage("请先在【需求】Tab 提交需求后再配置指标分组并生成任务组。");
      return;
    }

    const now = new Date().toISOString();
    const nextWideTable = buildWideTableWithPromptDrafts(ensureDefaultIndicatorGroup(selectedWt), now);

    if (!hasIndicatorColumns) {
      setIndicatorGroupMessage("当前宽表没有指标列，无需配置指标分组。");
      return;
    }

    setIsPersistingIndicatorGroups(true);
    try {
      await updateRequirementWideTable(requirement.id, nextWideTable);

      if (!isIndicatorGroupingComplete) {
        updateSelectedWideTable(() => nextWideTable);
        setIndicatorGroupMessage("已保存指标分组草稿。请把所有指标分配到分组后，再保存并生成任务组。");
        return;
      }

      const persistedTaskGroups = taskGroups.filter(
        (taskGroup) =>
          taskGroup.wideTableId === selectedWt.id
          && taskGroup.status !== "invalidated"
          && taskGroup.triggeredBy !== "trial",
      );
      const desiredTaskSignature = buildIndicatorTaskSignature(nextWideTable.indicatorGroups);
      const runtimeTaskSignature = buildRuntimeIndicatorTaskSignature({
        wideTableId: selectedWt.id,
        taskGroups,
        fetchTasks,
      });
      const shouldSyncTaskGroups =
        persistedTaskGroups.length === 0 || desiredTaskSignature !== runtimeTaskSignature;

      if (!shouldSyncTaskGroups) {
        updateSelectedWideTable(() => nextWideTable);
        setIndicatorGroupMessage("指标分组未变化，无需重建任务组。");
        return;
      }

      const ensuredPreview = await ensurePreviewRows(nextWideTable, now);
      const previewWideTable = ensuredPreview.wideTable;
      const previewRecords = ensuredPreview.records;

      const reconciliation = reconcileTaskPlanChange({
        requirement,
        wideTable: previewWideTable,
        previousRecords: previewRecords,
        nextRecords: previewRecords,
        taskGroups,
        fetchTasks,
      });
      const nextPlanVersion = reconciliation.nextPlanVersion || Math.max(
        1,
        resolveCurrentPlanVersion(previewWideTable, previewRecords, taskGroups),
      );
      const nextPlanFingerprint = reconciliation.nextPlanFingerprint || buildTaskPlanFingerprint(
        previewWideTable,
        previewRecords,
      );
      const annotatedRecords = annotateCurrentPlanRecords(previewRecords, nextPlanVersion);
      const persistedWideTable: WideTable = {
        ...previewWideTable,
        currentPlanVersion: nextPlanVersion,
        currentPlanFingerprint: nextPlanFingerprint,
        recordCount: previewWideTable.recordCount > 0 ? previewWideTable.recordCount : annotatedRecords.length,
        status: previewWideTable.status === "active" ? "active" : "initialized",
        updatedAt: now,
      };

      const syncResult = await persistWideTablePlan(
        requirement.id,
        persistedWideTable,
        annotatedRecords,
        reconciliation.taskGroups.filter((taskGroup) => taskGroup.wideTableId === selectedWt.id),
        { rebuildTaskGroups: true },
      );
      if (syncResult.taskGroups.length === 0) {
        throw new Error("后端未返回生成后的任务组，请检查任务运行态接口。");
      }
      if (onTaskRuntimeChange) {
        onTaskRuntimeChange(syncResult.taskGroups, syncResult.fetchTasks);
      } else {
        onTaskGroupsChange(syncResult.taskGroups);
        onFetchTasksChange(syncResult.fetchTasks);
      }
      onReplaceWideTableRecords?.(selectedWt.id, annotatedRecords);
      const syncedPlanVersion = Math.max(
        nextPlanVersion,
        ...syncResult.taskGroups
          .filter((taskGroup) => taskGroup.wideTableId === selectedWt.id)
          .map((taskGroup) => taskGroup.planVersion ?? 1),
      );
      updateSelectedWideTable(() => ({
        ...persistedWideTable,
        currentPlanVersion: syncedPlanVersion,
      }));
      setIndicatorGroupMessage(
        persistedTaskGroups.length === 0
          ? `已生成 ${syncResult.taskGroupCount} 个任务组及 ${syncResult.fetchTaskCount} 个采集任务。`
          : `已重建 ${syncResult.taskGroupCount} 个任务组及 ${syncResult.fetchTaskCount} 个采集任务。`,
      );
      /* Legacy local-plan messaging is intentionally disabled. The backend
       * response above is now the authoritative task runtime snapshot.
        setIndicatorGroupMessage(
          usesBusinessDateAxis
            ? `已保存指标分组，并生成 ${reconciliation.generatedTaskGroupCount} 个任务组及对应采集任务。`
            : `已保存指标分组，并生成当前快照的 ${reconciliation.generatedTaskGroupCount} 个任务组及对应采集任务。`,
        );
      } else {
        await persistWideTablePreview(
          requirement.id,
          persistedWideTable,
          annotatedRecords,
        );
        setIndicatorGroupMessage("已保存指标分组配置，当前任务计划无需重建。");
      }

      */
      if (requirement.status !== "running") {
        onRequirementChange?.({
          ...requirement,
          status: "running",
          schemaLocked: true,
          updatedAt: now,
        });
      }
      try {
        await onRefreshData?.();
      } catch {
        // The command response already contains the committed runtime state.
      }
    } catch (error) {
      setIndicatorGroupMessage(`保存失败：${formatTaskActionError(error)}`);
    } finally {
      setIsPersistingIndicatorGroups(false);
    }
  };

  return {
    indicatorGroupMessage,
    isIndicatorGroupModalOpen,
    isPersistingIndicatorGroups,
    openIndicatorGroupModal: () => setIsIndicatorGroupModalOpen(true),
    closeIndicatorGroupModal: () => setIsIndicatorGroupModalOpen(false),
    handleAddIndicatorGroup,
    handleDeleteIndicatorGroup,
    handleIndicatorGroupChange,
    handleAssignIndicatorColumnToGroup,
    handleClearIndicatorColumnGroup,
    handlePersistIndicatorGroups,
  };
}
