"use client";

import { useEffect, useState } from "react";
import { parsePromptYaml, updateRequirementWideTable } from "@/lib/api-client";
import type { IndicatorGroup, Requirement, WideTable } from "@/lib/types";
import {
  buildIndicatorGroupPrompt,
  type IndicatorGroupPromptSections,
} from "@/lib/indicator-group-prompt";
import {
  buildDefaultIndicatorGroup,
  buildDefaultIndicatorGroupId,
  ensureDefaultIndicatorGroup,
} from "@/lib/indicator-groups";
import { formatTaskActionError } from "@/components/requirement-tasks/utils/requirementTaskFormatters";

type PromptEditorMode = "sections" | "markdown";
type PromptSectionKey = keyof IndicatorGroupPromptSections;

type Props = {
  requirement: Requirement;
  selectedWt?: WideTable;
  effectiveWideTable?: WideTable | null;
  promptEditorGroups: IndicatorGroup[];
  isDefinitionSubmitted: boolean;
  updateSelectedWideTable: (updater: (wideTable: WideTable) => WideTable) => void;
  onRefreshData?: () => Promise<void>;
};

export default function usePromptEditor({
  requirement,
  selectedWt,
  effectiveWideTable,
  promptEditorGroups,
  isDefinitionSubmitted,
  updateSelectedWideTable,
  onRefreshData,
}: Props) {
  const [promptSaveMessage, setPromptSaveMessage] = useState("");
  const [isPersistingPrompts, setIsPersistingPrompts] = useState(false);
  const [promptYamlImportMessage, setPromptYamlImportMessage] = useState("");
  const [importingPromptYamlGroupId, setImportingPromptYamlGroupId] = useState<string | null>(null);
  const [promptEditorModes, setPromptEditorModes] = useState<Record<string, PromptEditorMode>>({});
  const [promptMarkdownDrafts, setPromptMarkdownDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setPromptSaveMessage("");
    setPromptYamlImportMessage("");
    setImportingPromptYamlGroupId(null);
    setPromptEditorModes({});
    setPromptMarkdownDrafts({});
  }, [selectedWt?.id]);

  useEffect(() => {
    if (!selectedWt) {
      return;
    }

    const baseWideTable = effectiveWideTable ?? selectedWt;
    setPromptEditorModes((current) => {
      const next = { ...current };
      for (const group of promptEditorGroups) {
        next[group.id] = next[group.id] ?? "markdown";
      }
      return next;
    });

    setPromptMarkdownDrafts((current) => {
      const next = { ...current };
      for (const group of promptEditorGroups) {
        next[group.id] = next[group.id] ?? (group.promptTemplate ?? buildIndicatorGroupPrompt(requirement, baseWideTable, group).markdown);
      }
      return next;
    });
  }, [effectiveWideTable, promptEditorGroups, requirement, selectedWt]);

  const handleIndicatorGroupPromptSectionChange = (
    groupId: string,
    key: PromptSectionKey,
    value: string,
  ) => {
    updateSelectedWideTable((wideTable) => ({
      ...wideTable,
      indicatorGroups: (() => {
        const defaultGroupId = buildDefaultIndicatorGroupId(wideTable.id);
        const normalizedWideTable = ensureDefaultIndicatorGroup(wideTable);
        const hasTarget = normalizedWideTable.indicatorGroups.some((group) => group.id === groupId);
        const indicatorColumnsForDefault = wideTable.schema.columns.filter(
          (column) => column.category === "indicator",
        );
        const hydratedGroups = (
          !hasTarget && groupId === defaultGroupId
            ? [...normalizedWideTable.indicatorGroups, buildDefaultIndicatorGroup(wideTable, indicatorColumnsForDefault)]
            : normalizedWideTable.indicatorGroups
        );

        return hydratedGroups.map((group) => (
          group.id === groupId
            ? {
                ...group,
                promptConfig: {
                  ...(group.promptConfig ?? {}),
                  [key]: value,
                  lastEditedAt: new Date().toISOString(),
                },
              }
            : group
        ));
      })(),
      updatedAt: new Date().toISOString(),
    }));
  };

  const buildWideTableWithPromptDrafts = (
    wideTable: WideTable,
    editedAt: string,
  ): WideTable => {
    const baseWideTable = ensureDefaultIndicatorGroup(wideTable);
    const baseGroups = baseWideTable.indicatorGroups;

    const indicatorGroups = baseGroups.map((group) => {
      const editMode = promptEditorModes[group.id] ?? "markdown";
      const markdownDraft = promptMarkdownDrafts[group.id];

      if (editMode === "markdown") {
        const nextTemplate = markdownDraft?.trim()
          ? markdownDraft
          : group.promptTemplate?.trim()
            ? group.promptTemplate
            : buildIndicatorGroupPrompt(requirement, baseWideTable, group).markdown;
        return {
          ...group,
          promptTemplate: nextTemplate,
          promptConfig: {
            ...(group.promptConfig ?? {}),
            lastEditedAt: editedAt,
          },
        };
      }

      return {
        ...group,
        promptTemplate: buildIndicatorGroupPrompt(requirement, baseWideTable, group).markdown,
      };
    });

    return {
      ...baseWideTable,
      indicatorGroups,
      updatedAt: editedAt,
    };
  };

  const handlePersistPromptTemplates = async () => {
    if (!selectedWt) {
      return;
    }

    if (!isDefinitionSubmitted) {
      setPromptSaveMessage("请先在【需求】Tab 提交需求后再配置采集提示词。");
      return;
    }

    setIsPersistingPrompts(true);
    try {
      const now = new Date().toISOString();
      const nextWideTable = buildWideTableWithPromptDrafts(selectedWt, now);
      await updateRequirementWideTable(requirement.id, nextWideTable);
      updateSelectedWideTable(() => nextWideTable);
      setPromptSaveMessage("已保存采集提示词配置。");
      await onRefreshData?.();
    } catch (error) {
      setPromptSaveMessage(`保存失败：${formatTaskActionError(error)}`);
    } finally {
      setIsPersistingPrompts(false);
    }
  };

  const handlePromptYamlImport = async (groupId: string, file: File) => {
    if (!isDefinitionSubmitted) {
      setPromptYamlImportMessage("请先在【需求】Tab 提交需求后再导入 YAML。");
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".yaml") && !fileName.endsWith(".yml")) {
      setPromptYamlImportMessage("仅支持导入 .yaml 或 .yml 文件。");
      return;
    }
    if (file.size > 1024 * 1024) {
      setPromptYamlImportMessage("YAML 文件不能超过 1MB。");
      return;
    }

    setImportingPromptYamlGroupId(groupId);
    setPromptYamlImportMessage("");
    try {
      const payload = await parsePromptYaml(file);
      const importedPrompt = JSON.stringify(payload, null, 2);
      setPromptEditorModes((current) => ({ ...current, [groupId]: "markdown" }));
      setPromptMarkdownDrafts((current) => ({
        ...current,
        [groupId]: importedPrompt,
      }));
      setPromptYamlImportMessage("已导入 YAML 并生成标准采集入参，请确认内容后保存提示词。");
    } catch (error) {
      setPromptYamlImportMessage(`导入失败：${formatTaskActionError(error)}`);
    } finally {
      setImportingPromptYamlGroupId(null);
    }
  };

  return {
    promptSaveMessage,
    isPersistingPrompts,
    promptYamlImportMessage,
    importingPromptYamlGroupId,
    promptEditorModes,
    promptMarkdownDrafts,
    handleIndicatorGroupPromptSectionChange,
    handlePersistPromptTemplates,
    handlePromptYamlImport,
    handleMarkdownModeSelect: (groupId: string, fallbackMarkdown: string) => {
      setPromptEditorModes((current) => ({ ...current, [groupId]: "markdown" }));
      setPromptMarkdownDrafts((current) => ({
        ...current,
        [groupId]: current[groupId] ?? fallbackMarkdown,
      }));
    },
    handleMarkdownDraftChange: (groupId: string, value: string) => {
      setPromptMarkdownDrafts((current) => ({
        ...current,
        [groupId]: value,
      }));
    },
    buildWideTableWithPromptDrafts,
  };
}
