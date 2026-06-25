package com.huatai.datafoundry.backend.task.application.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.huatai.datafoundry.backend.schedule.domain.repository.ScheduleRuleRepository;
import com.huatai.datafoundry.backend.task.domain.model.FetchTask;
import com.huatai.datafoundry.backend.task.domain.model.TaskGroup;
import com.huatai.datafoundry.backend.task.domain.model.TaskStatus;
import com.huatai.datafoundry.backend.task.domain.repository.FetchTaskRepository;
import com.huatai.datafoundry.backend.task.domain.repository.TaskGroupRepository;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

public class TaskGroupAggregateServiceTest {

  @Test
  void marksScheduleRulePendingWhenScheduledTaskGroupLeavesPending() {
    TaskGroupRepository taskGroupRepository = Mockito.mock(TaskGroupRepository.class);
    FetchTaskRepository fetchTaskRepository = Mockito.mock(FetchTaskRepository.class);
    ScheduleRuleRepository scheduleRuleRepository = Mockito.mock(ScheduleRuleRepository.class);
    TaskGroupAggregateService service =
        new TaskGroupAggregateService(
            taskGroupRepository, fetchTaskRepository, scheduleRuleRepository);

    TaskGroup taskGroup = new TaskGroup();
    taskGroup.setId("TG1");
    taskGroup.setScheduleRuleId("sr-1");
    taskGroup.setStatus(TaskStatus.PENDING);
    taskGroup.setTotalTasks(Integer.valueOf(1));
    when(taskGroupRepository.getById("TG1")).thenReturn(taskGroup);

    FetchTask fetchTask = new FetchTask();
    fetchTask.setTaskGroupId("TG1");
    fetchTask.setStatus(TaskStatus.COMPLETED);
    when(fetchTaskRepository.listByTaskGroup("TG1"))
        .thenReturn(Collections.singletonList(fetchTask));

    service.refreshTaskGroup("TG1");

    verify(taskGroupRepository).upsert(taskGroup);
    verify(scheduleRuleRepository).markXxlSyncPending("sr-1");
  }
}
