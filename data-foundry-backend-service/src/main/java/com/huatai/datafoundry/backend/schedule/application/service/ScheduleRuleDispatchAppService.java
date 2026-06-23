package com.huatai.datafoundry.backend.schedule.application.service;

import com.huatai.datafoundry.backend.schedule.application.command.ScheduleRuleDispatchCommand;
import com.huatai.datafoundry.backend.schedule.application.dto.ScheduleRuleDispatchResult;
import com.huatai.datafoundry.backend.schedule.domain.model.ScheduleRule;
import com.huatai.datafoundry.backend.schedule.domain.repository.ScheduleRuleRepository;
import com.huatai.datafoundry.backend.task.domain.model.TaskGroup;
import com.huatai.datafoundry.backend.task.domain.repository.TaskGroupRepository;
import com.huatai.datafoundry.contract.scheduler.ScheduleFrequency;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScheduleRuleDispatchAppService {
  private final ScheduleRuleRepository scheduleRuleRepository;
  private final TaskGroupRepository taskGroupRepository;
  private final ScheduleTriggerLogAppService triggerLogAppService;
  private final ScheduleDispatchConfirmationAppService dispatchConfirmationAppService;
  private final ScheduleTaskGroupDispatchExecutorAppService dispatchExecutorAppService;

  public ScheduleRuleDispatchAppService(
      ScheduleRuleRepository scheduleRuleRepository,
      TaskGroupRepository taskGroupRepository,
      ScheduleTriggerLogAppService triggerLogAppService,
      ScheduleDispatchConfirmationAppService dispatchConfirmationAppService,
      ScheduleTaskGroupDispatchExecutorAppService dispatchExecutorAppService) {
    this.scheduleRuleRepository = scheduleRuleRepository;
    this.taskGroupRepository = taskGroupRepository;
    this.triggerLogAppService = triggerLogAppService;
    this.dispatchConfirmationAppService = dispatchConfirmationAppService;
    this.dispatchExecutorAppService = dispatchExecutorAppService;
  }

  @Transactional
  public ScheduleRuleDispatchResult dispatch(
      String ruleId, ScheduleRuleDispatchCommand command, String idempotencyKey) {
    if (command == null) command = new ScheduleRuleDispatchCommand();
    ScheduleRule rule = scheduleRuleRepository.getById(requireText(ruleId, "ruleId is required"));
    if (rule == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Schedule rule not found");
    }
    ScheduleFrequency ruleFrequency = ScheduleFrequency.parse(rule.getFrequency());
    String requestedFrequency = firstNonBlank(command.getFrequency());
    if (requestedFrequency != null
        && ruleFrequency != ScheduleFrequency.parse(requestedFrequency)) {
      throw new IllegalArgumentException(
          "Dispatch frequency does not match schedule rule: "
              + requestedFrequency
              + " != "
              + ruleFrequency.name());
    }
    command.setFrequency(ruleFrequency.name());
    String indicatorGroupId =
        requireText(rule.getIndicatorGroupId(), "Schedule rule indicatorGroupId is required");

    String requestedBusinessDate = firstNonBlank(command.getBusinessDate());
    if (requestedBusinessDate != null) {
      requestedBusinessDate = ruleFrequency.normalizeCompatibleBusinessDate(requestedBusinessDate);
    }
    LocalDateTime triggerTime = LocalDateTime.now();
    String triggerLogId = null;
    try {
      if (!Boolean.TRUE.equals(rule.getEnabled())) {
        triggerLogId =
            triggerLogAppService.createRunning(rule.getId(), requestedBusinessDate, command);
        triggerLogAppService.markSkipped(triggerLogId, null, "Schedule rule is disabled");
        scheduleRuleRepository.updateLastTrigger(
            rule.getId(), triggerTime, null, "SKIPPED_DISABLED");
        return result(
            rule.getId(),
            null,
            requestedBusinessDate,
            triggerLogId,
            "SKIPPED_DISABLED",
            "SKIPPED",
            "RULE_DISABLED",
            null);
      }

      TaskGroup taskGroup =
          requestedBusinessDate != null
              ? taskGroupRepository.getByScheduleRulePeriodAndIndicatorGroup(
                  rule.getId(), requestedBusinessDate, indicatorGroupId)
              : taskGroupRepository.findNextPendingByScheduleRule(rule.getId());
      String businessDate =
          taskGroup != null ? taskGroup.getBusinessDate() : requestedBusinessDate;
      triggerLogId = triggerLogAppService.createRunning(rule.getId(), businessDate, command);
      if (taskGroup == null) {
        triggerLogAppService.markSkipped(
            triggerLogId, null, "No existing task group is available for dispatch");
        scheduleRuleRepository.updateLastTrigger(
            rule.getId(), triggerTime, null, "SKIPPED_TASK_GROUP_NOT_FOUND");
        return result(
            rule.getId(),
            null,
            businessDate,
            triggerLogId,
            "SKIPPED_TASK_GROUP_NOT_FOUND",
            "SKIPPED",
            "TASK_GROUP_NOT_FOUND",
            null);
      }

      if (taskGroup.getScheduledAt() == null) {
        triggerLogAppService.markSkipped(
            triggerLogId, taskGroup.getId(), "Task group has no planned schedule time");
        scheduleRuleRepository.updateLastTrigger(
            rule.getId(), triggerTime, null, "SKIPPED_SCHEDULE_NOT_PLANNED");
        return result(
            rule.getId(),
            taskGroup.getId(),
            businessDate,
            triggerLogId,
            "SKIPPED_SCHEDULE_NOT_PLANNED",
            "SKIPPED",
            "SCHEDULE_NOT_PLANNED",
            null);
      }

      if (taskGroup.getScheduledAt().isAfter(triggerTime)) {
        triggerLogAppService.markSkipped(
            triggerLogId, taskGroup.getId(), "Task group has not reached its scheduled time");
        scheduleRuleRepository.updateLastTrigger(
            rule.getId(), triggerTime, null, "SKIPPED_NOT_DUE");
        return result(
            rule.getId(),
            taskGroup.getId(),
            businessDate,
            triggerLogId,
            "SKIPPED_NOT_DUE",
            "SKIPPED",
            "TASK_GROUP_NOT_DUE",
            null);
      }

      String status =
          taskGroup.getStatus() != null
              ? taskGroup.getStatus().trim().toLowerCase(Locale.ROOT)
              : "";
      if (!"pending".equals(status) && !"failed".equals(status)) {
        triggerLogAppService.markSkipped(
            triggerLogId, taskGroup.getId(), "Task group is already dispatched");
        scheduleRuleRepository.updateLastTrigger(
            rule.getId(), triggerTime, null, "SKIPPED_ALREADY_DISPATCHED");
        return result(
            rule.getId(),
            taskGroup.getId(),
            businessDate,
            triggerLogId,
            "SKIPPED_ALREADY_DISPATCHED",
            "SKIPPED",
            "TASK_GROUP_ALREADY_DISPATCHED",
            null);
      }

      dispatchExecutorAppService.executeTaskGroup(
          taskGroup.getId(),
          firstNonBlank(idempotencyKey, "schedule-rule:" + rule.getId() + ":" + businessDate));

      ScheduleDispatchConfirmationAppService.DispatchConfirmation confirmation =
          dispatchConfirmationAppService.confirmTaskGroupStarted(taskGroup.getId());
      if (confirmation.isSuccess()) {
        triggerLogAppService.markDispatched(triggerLogId, taskGroup.getId());
        scheduleRuleRepository.updateLastTrigger(
            rule.getId(), triggerTime, null, "DISPATCHED");
        return result(
            rule.getId(),
            taskGroup.getId(),
            businessDate,
            triggerLogId,
            "DISPATCHED",
            "SUCCESS",
            confirmation.getConfirmationSource(),
            null);
      }

      triggerLogAppService.markFailed(triggerLogId, confirmation.getErrorMessage());
      scheduleRuleRepository.updateLastTrigger(rule.getId(), triggerTime, null, "FAILED");
      return result(
          rule.getId(),
          taskGroup.getId(),
          businessDate,
          triggerLogId,
          "FAILED",
          "FAILED",
          confirmation.getConfirmationSource(),
          confirmation.getErrorMessage());
    } catch (RuntimeException ex) {
      if (triggerLogId == null) {
        triggerLogId =
            triggerLogAppService.createRunning(rule.getId(), requestedBusinessDate, command);
      }
      triggerLogAppService.markFailed(triggerLogId, ex.getMessage());
      scheduleRuleRepository.updateLastTrigger(rule.getId(), triggerTime, null, "FAILED");
      throw ex;
    }
  }

  private static ScheduleRuleDispatchResult result(
      String ruleId,
      String taskGroupId,
      String businessDate,
      String triggerLogId,
      String status,
      String scheduleJobStatus,
      String confirmationSource,
      String errorMessage) {
    ScheduleRuleDispatchResult result = new ScheduleRuleDispatchResult();
    result.setOk(!"FAILED".equals(scheduleJobStatus));
    result.setScheduleRuleId(ruleId);
    result.setTaskGroupId(taskGroupId);
    result.setBusinessDate(businessDate);
    result.setTriggerLogId(triggerLogId);
    result.setStatus(status);
    result.setScheduleJobStatus(scheduleJobStatus);
    result.setConfirmationSource(confirmationSource);
    result.setErrorMessage(errorMessage);
    return result;
  }

  private static String requireText(String value, String message) {
    String normalized = firstNonBlank(value);
    if (normalized == null) throw new IllegalArgumentException(message);
    return normalized;
  }

  private static String firstNonBlank(String... values) {
    for (String value : values) {
      if (value != null && !value.trim().isEmpty()) return value.trim();
    }
    return null;
  }
}
