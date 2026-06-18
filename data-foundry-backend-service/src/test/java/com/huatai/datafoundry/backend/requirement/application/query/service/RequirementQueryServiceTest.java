package com.huatai.datafoundry.backend.requirement.application.query.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huatai.datafoundry.backend.requirement.application.query.dto.FetchTaskReadDto;
import com.huatai.datafoundry.backend.requirement.application.query.dto.TaskGroupReadDto;
import com.huatai.datafoundry.backend.requirement.domain.model.Requirement;
import com.huatai.datafoundry.backend.requirement.domain.model.WideTable;
import com.huatai.datafoundry.backend.requirement.domain.repository.RequirementRepository;
import com.huatai.datafoundry.backend.requirement.infrastructure.persistence.mybatis.mapper.RequirementSearchMapper;
import com.huatai.datafoundry.backend.requirement.infrastructure.persistence.mybatis.mapper.WideTableScopeImportMapper;
import com.huatai.datafoundry.backend.task.domain.model.FetchTask;
import com.huatai.datafoundry.backend.task.domain.model.TaskGroup;
import com.huatai.datafoundry.backend.task.domain.repository.FetchTaskRepository;
import com.huatai.datafoundry.backend.task.domain.repository.TaskGroupRepository;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class RequirementQueryServiceTest {

  @Test
  void listTaskGroupsIgnoresHigherInvalidatedVersionWhenResolvingCurrentPlan() {
    RequirementRepository requirementRepository = Mockito.mock(RequirementRepository.class);
    TaskGroupRepository taskGroupRepository = Mockito.mock(TaskGroupRepository.class);
    RequirementQueryService service =
        newService(requirementRepository, taskGroupRepository, Mockito.mock(FetchTaskRepository.class));

    when(requirementRepository.getByProjectAndId("P1", "R1")).thenReturn(requirement("P1", "R1"));
    when(requirementRepository.getWideTableByIdForRequirement("R1", "WT1"))
        .thenReturn(wideTable("WT1", "[{\"id\":\"ig-default\",\"indicator_columns\":[\"metric_a\"]}]"));
    TaskGroup current = taskGroup("TG-CURRENT", "WT1", "2026-06", "ig-default", 3, "pending");
    TaskGroup staleInvalidated = taskGroup("TG-STALE", "WT1", "2026-06", "ig-default", 4, "invalidated");
    when(taskGroupRepository.listByRequirement("R1")).thenReturn(Arrays.asList(current, staleInvalidated));

    List<TaskGroupReadDto> result = service.listTaskGroups("P1", "R1");

    assertEquals(1, result.size());
    assertEquals("TG-CURRENT", result.get(0).getId());
    assertEquals(Integer.valueOf(3), result.get(0).getPlanVersion());
  }

  @Test
  void listFetchTasksMatchesTaskGroupByIndicatorGroupIdWhenPartitionKeyIsMissing() {
    RequirementRepository requirementRepository = Mockito.mock(RequirementRepository.class);
    TaskGroupRepository taskGroupRepository = Mockito.mock(TaskGroupRepository.class);
    FetchTaskRepository fetchTaskRepository = Mockito.mock(FetchTaskRepository.class);
    RequirementQueryService service =
        newService(requirementRepository, taskGroupRepository, fetchTaskRepository);

    when(requirementRepository.getByProjectAndId("P1", "R1")).thenReturn(requirement("P1", "R1"));
    when(requirementRepository.getWideTableByIdForRequirement("R1", "WT1"))
        .thenReturn(
            wideTable(
                "WT1",
                "[{\"id\":\"ig-a\",\"indicator_columns\":[\"metric_a\"]},"
                    + "{\"id\":\"ig-b\",\"indicator_columns\":[\"metric_b\"]}]"));

    TaskGroup taskGroup = taskGroup("TG-B", "WT1", "2026-06", "ig-b", 2, "pending");
    taskGroup.setPartitionKey(null);
    when(taskGroupRepository.listByRequirement("R1")).thenReturn(Collections.singletonList(taskGroup));

    FetchTask fetchTask = new FetchTask();
    fetchTask.setId("FT-B");
    fetchTask.setRequirementId("R1");
    fetchTask.setWideTableId("WT1");
    fetchTask.setTaskGroupId("TG-B");
    fetchTask.setBusinessDate("2026-06");
    fetchTask.setIndicatorGroupId("ig-b");
    fetchTask.setIndicatorKeysJson("[\"metric_b\"]");
    fetchTask.setPlanVersion(2);
    fetchTask.setStatus("pending");
    when(fetchTaskRepository.listByRequirement("R1")).thenReturn(Collections.singletonList(fetchTask));

    List<TaskGroupReadDto> taskGroups = service.listTaskGroups("P1", "R1");
    List<FetchTaskReadDto> fetchTasks = service.listFetchTasks("P1", "R1", false);

    assertEquals(1, taskGroups.size());
    assertEquals("TG-B", taskGroups.get(0).getId());
    assertEquals(1, fetchTasks.size());
    assertEquals("FT-B", fetchTasks.get(0).getId());
  }

  @Test
  void listTaskRuntimeKeepsRunningAndCompletedHistoryForRemovedIndicatorGroups() {
    RequirementRepository requirementRepository = Mockito.mock(RequirementRepository.class);
    TaskGroupRepository taskGroupRepository = Mockito.mock(TaskGroupRepository.class);
    FetchTaskRepository fetchTaskRepository = Mockito.mock(FetchTaskRepository.class);
    RequirementQueryService service =
        newService(requirementRepository, taskGroupRepository, fetchTaskRepository);

    when(requirementRepository.getByProjectAndId("P1", "R1")).thenReturn(requirement("P1", "R1"));
    when(requirementRepository.getWideTableByIdForRequirement("R1", "WT1"))
        .thenReturn(wideTable("WT1", "[{\"id\":\"ig-active\",\"indicator_columns\":[\"metric_a\"]}]"));

    TaskGroup current = taskGroup("TG-CURRENT", "WT1", "2026-06", "ig-active", 5, "pending");
    TaskGroup completedHistory = taskGroup("TG-HISTORY", "WT1", "2026-05", "ig-removed", 4, "completed");
    when(taskGroupRepository.listByRequirement("R1")).thenReturn(Arrays.asList(current, completedHistory));

    FetchTask currentTask = fetchTask("FT-CURRENT", "TG-CURRENT", "WT1", "ig-active", 5, "pending", "[\"metric_a\"]");
    FetchTask historyTask = fetchTask("FT-HISTORY", "TG-HISTORY", "WT1", "ig-removed", 4, "completed", "[\"metric_old\"]");
    when(fetchTaskRepository.listByRequirement("R1")).thenReturn(Arrays.asList(currentTask, historyTask));

    List<TaskGroupReadDto> taskGroups = service.listTaskGroups("P1", "R1");
    List<FetchTaskReadDto> fetchTasks = service.listFetchTasks("P1", "R1", false);

    assertEquals(2, taskGroups.size());
    assertEquals(Arrays.asList("TG-CURRENT", "TG-HISTORY"), Arrays.asList(taskGroups.get(0).getId(), taskGroups.get(1).getId()));
    assertEquals(2, fetchTasks.size());
    assertEquals(Arrays.asList("FT-CURRENT", "FT-HISTORY"), Arrays.asList(fetchTasks.get(0).getId(), fetchTasks.get(1).getId()));
  }

  private static RequirementQueryService newService(
      RequirementRepository requirementRepository,
      TaskGroupRepository taskGroupRepository,
      FetchTaskRepository fetchTaskRepository) {
    return new RequirementQueryService(
        requirementRepository,
        Mockito.mock(RequirementSearchMapper.class),
        Mockito.mock(WideTableScopeImportMapper.class),
        taskGroupRepository,
        fetchTaskRepository,
        null,
        null,
        null,
        new ObjectMapper());
  }

  private static Requirement requirement(String projectId, String requirementId) {
    Requirement requirement = new Requirement();
    requirement.setProjectId(projectId);
    requirement.setId(requirementId);
    requirement.setTitle("Requirement");
    return requirement;
  }

  private static WideTable wideTable(String wideTableId, String indicatorGroupsJson) {
    WideTable wideTable = new WideTable();
    wideTable.setId(wideTableId);
    wideTable.setRequirementId("R1");
    wideTable.setIndicatorGroupsJson(indicatorGroupsJson);
    return wideTable;
  }

  private static TaskGroup taskGroup(
      String id,
      String wideTableId,
      String businessDate,
      String indicatorGroupId,
      int planVersion,
      String status) {
    TaskGroup taskGroup = new TaskGroup();
    taskGroup.setId(id);
    taskGroup.setRequirementId("R1");
    taskGroup.setWideTableId(wideTableId);
    taskGroup.setBusinessDate(businessDate);
    taskGroup.setIndicatorGroupId(indicatorGroupId);
    taskGroup.setPartitionKey(indicatorGroupId);
    taskGroup.setPlanVersion(Integer.valueOf(planVersion));
    taskGroup.setStatus(status);
    taskGroup.setTotalTasks(Integer.valueOf(1));
    taskGroup.setPendingTasks(Integer.valueOf(1));
    return taskGroup;
  }

  private static FetchTask fetchTask(
      String id,
      String taskGroupId,
      String wideTableId,
      String indicatorGroupId,
      int planVersion,
      String status,
      String indicatorKeysJson) {
    FetchTask fetchTask = new FetchTask();
    fetchTask.setId(id);
    fetchTask.setRequirementId("R1");
    fetchTask.setWideTableId(wideTableId);
    fetchTask.setTaskGroupId(taskGroupId);
    fetchTask.setBusinessDate("2026-06");
    fetchTask.setIndicatorGroupId(indicatorGroupId);
    fetchTask.setIndicatorKeysJson(indicatorKeysJson);
    fetchTask.setPlanVersion(Integer.valueOf(planVersion));
    fetchTask.setStatus(status);
    return fetchTask;
  }
}
