package com.huatai.datafoundry.backend.schedule.application.service;

import com.huatai.datafoundry.backend.task.application.service.TaskAppService;
import java.util.Collections;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleTaskGroupDispatchExecutorAppService {
  private final TaskAppService taskAppService;

  public ScheduleTaskGroupDispatchExecutorAppService(TaskAppService taskAppService) {
    this.taskAppService = taskAppService;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void executeTaskGroup(String taskGroupId, String idempotencyKey) {
    taskAppService.executeTaskGroup(
        taskGroupId, Collections.<String, Object>emptyMap(), idempotencyKey);
  }
}
