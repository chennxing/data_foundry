package com.huatai.datafoundry.backend.schedule.application.service;

import com.huatai.datafoundry.backend.task.domain.model.FetchTask;
import com.huatai.datafoundry.backend.task.domain.model.TaskGroup;
import com.huatai.datafoundry.backend.task.domain.repository.FetchTaskRepository;
import com.huatai.datafoundry.backend.task.domain.repository.TaskGroupRepository;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleDispatchConfirmationAppService {
  static final long DEFAULT_TIMEOUT_MILLIS = 60_000L;
  static final long DEFAULT_POLL_INTERVAL_MILLIS = 1_000L;

  private final TaskGroupRepository taskGroupRepository;
  private final FetchTaskRepository fetchTaskRepository;

  public ScheduleDispatchConfirmationAppService(
      TaskGroupRepository taskGroupRepository,
      FetchTaskRepository fetchTaskRepository) {
    this.taskGroupRepository = taskGroupRepository;
    this.fetchTaskRepository = fetchTaskRepository;
  }

  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public DispatchConfirmation confirmTaskGroupStarted(String taskGroupId) {
    return confirmTaskGroupStarted(taskGroupId, DEFAULT_TIMEOUT_MILLIS, DEFAULT_POLL_INTERVAL_MILLIS);
  }

  DispatchConfirmation confirmTaskGroupStarted(
      String taskGroupId, long timeoutMillis, long pollIntervalMillis) {
    String normalizedTaskGroupId = normalize(taskGroupId);
    if (normalizedTaskGroupId == null) {
      return DispatchConfirmation.failed(
          "CONFIRMATION_INPUT_INVALID", "taskGroupId is required for dispatch confirmation");
    }

    long deadline = System.currentTimeMillis() + Math.max(timeoutMillis, 0L);
    while (true) {
      TaskGroup taskGroup = taskGroupRepository.getById(normalizedTaskGroupId);
      List<FetchTask> fetchTasks = fetchTaskRepository.listByTaskGroup(normalizedTaskGroupId);
      DispatchConfirmation snapshot =
          evaluateSnapshot(taskGroup, fetchTasks != null ? fetchTasks : Collections.<FetchTask>emptyList());
      if (snapshot.isSuccess() || snapshot.isTerminalFailure()) {
        return snapshot;
      }
      if (System.currentTimeMillis() >= deadline) {
        return DispatchConfirmation.failed(
            "CONFIRMATION_TIMEOUT",
            "Collection dispatch confirmation timed out after 60s without all fetch tasks entering running");
      }
      sleepQuietly(Math.max(pollIntervalMillis, 50L));
    }
  }

  private DispatchConfirmation evaluateSnapshot(TaskGroup taskGroup, List<FetchTask> fetchTasks) {
    if (taskGroup == null) {
      return DispatchConfirmation.failed(
          "TASK_GROUP_NOT_FOUND", "Task group disappeared before dispatch confirmation completed");
    }
    if (fetchTasks == null || fetchTasks.isEmpty()) {
      return DispatchConfirmation.failed(
          "FETCH_TASKS_NOT_FOUND", "Task group has no fetch tasks to confirm dispatch");
    }

    int acceptedCount = 0;
    int failedWithoutCollectionTaskCount = 0;
    for (FetchTask fetchTask : fetchTasks) {
      String collectionTaskId = normalize(fetchTask != null ? fetchTask.getCollectionTaskId() : null);
      String status = normalize(fetchTask != null ? fetchTask.getStatus() : null);
      if (collectionTaskId != null) {
        acceptedCount++;
        continue;
      }
      if ("failed".equals(status)) {
        failedWithoutCollectionTaskCount++;
      }
    }

    if (failedWithoutCollectionTaskCount > 0) {
      return DispatchConfirmation.failed(
          "FETCH_TASK_DISPATCH_FAILED",
          "Collection API dispatch failed for "
              + failedWithoutCollectionTaskCount
              + " fetch task(s)");
    }
    if (acceptedCount == fetchTasks.size()) {
      return DispatchConfirmation.success("ALL_FETCH_TASKS_ACCEPTED");
    }

    String taskGroupStatus = normalize(taskGroup.getStatus());
    if ("running".equals(taskGroupStatus) && acceptedCount > 0) {
      return DispatchConfirmation.success("TASK_GROUP_RUNNING");
    }
    return DispatchConfirmation.pending();
  }

  private static void sleepQuietly(long millis) {
    try {
      Thread.sleep(millis);
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Dispatch confirmation interrupted", ex);
    }
  }

  private static String normalize(String raw) {
    if (raw == null) {
      return null;
    }
    String normalized = raw.trim();
    if (normalized.isEmpty()) {
      return null;
    }
    return normalized.toLowerCase(Locale.ROOT);
  }

  public static final class DispatchConfirmation {
    private final boolean success;
    private final boolean terminalFailure;
    private final String confirmationSource;
    private final String errorMessage;

    private DispatchConfirmation(
        boolean success, boolean terminalFailure, String confirmationSource, String errorMessage) {
      this.success = success;
      this.terminalFailure = terminalFailure;
      this.confirmationSource = confirmationSource;
      this.errorMessage = errorMessage;
    }

    public static DispatchConfirmation success(String confirmationSource) {
      return new DispatchConfirmation(true, false, confirmationSource, null);
    }

    public static DispatchConfirmation failed(String confirmationSource, String errorMessage) {
      return new DispatchConfirmation(false, true, confirmationSource, errorMessage);
    }

    public static DispatchConfirmation pending() {
      return new DispatchConfirmation(false, false, "PENDING_CONFIRMATION", null);
    }

    public boolean isSuccess() {
      return success;
    }

    public boolean isTerminalFailure() {
      return terminalFailure;
    }

    public String getConfirmationSource() {
      return confirmationSource;
    }

    public String getErrorMessage() {
      return errorMessage;
    }
  }
}
