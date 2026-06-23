package com.huatai.datafoundry.backend.schedule.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.huatai.datafoundry.backend.task.domain.model.FetchTask;
import com.huatai.datafoundry.backend.task.domain.model.TaskGroup;
import com.huatai.datafoundry.backend.task.domain.repository.FetchTaskRepository;
import com.huatai.datafoundry.backend.task.domain.repository.TaskGroupRepository;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class ScheduleDispatchConfirmationAppServiceTest {
  private TaskGroupRepository taskGroupRepository;
  private FetchTaskRepository fetchTaskRepository;
  private ScheduleDispatchConfirmationAppService service;

  @BeforeEach
  void setUp() {
    taskGroupRepository = Mockito.mock(TaskGroupRepository.class);
    fetchTaskRepository = Mockito.mock(FetchTaskRepository.class);
    service =
        new ScheduleDispatchConfirmationAppService(taskGroupRepository, fetchTaskRepository);
  }

  @Test
  void succeedsWhenAllFetchTasksReceiveCollectionTaskIds() {
    TaskGroup taskGroup = new TaskGroup();
    taskGroup.setId("tg-1");
    taskGroup.setStatus("running");
    when(taskGroupRepository.getById("tg-1")).thenReturn(taskGroup);
    when(fetchTaskRepository.listByTaskGroup("tg-1"))
        .thenReturn(
            Arrays.asList(
                fetchTask("ft-1", "running", "ct-1"),
                fetchTask("ft-2", "running", "ct-2")));

    ScheduleDispatchConfirmationAppService.DispatchConfirmation confirmation =
        service.confirmTaskGroupStarted("tg-1", 0L, 50L);

    assertTrue(confirmation.isSuccess());
    assertEquals("ALL_FETCH_TASKS_ACCEPTED", confirmation.getConfirmationSource());
  }

  @Test
  void failsWhenAFetchTaskWasMarkedFailedWithoutCollectionTaskId() {
    TaskGroup taskGroup = new TaskGroup();
    taskGroup.setId("tg-1");
    taskGroup.setStatus("failed");
    when(taskGroupRepository.getById("tg-1")).thenReturn(taskGroup);
    when(fetchTaskRepository.listByTaskGroup("tg-1"))
        .thenReturn(
            Arrays.asList(
                fetchTask("ft-1", "running", "ct-1"),
                fetchTask("ft-2", "failed", null)));

    ScheduleDispatchConfirmationAppService.DispatchConfirmation confirmation =
        service.confirmTaskGroupStarted("tg-1", 0L, 50L);

    assertTrue(confirmation.isTerminalFailure());
    assertEquals("FETCH_TASK_DISPATCH_FAILED", confirmation.getConfirmationSource());
  }

  private static FetchTask fetchTask(String id, String status, String collectionTaskId) {
    FetchTask fetchTask = new FetchTask();
    fetchTask.setId(id);
    fetchTask.setStatus(status);
    fetchTask.setCollectionTaskId(collectionTaskId);
    return fetchTask;
  }
}
