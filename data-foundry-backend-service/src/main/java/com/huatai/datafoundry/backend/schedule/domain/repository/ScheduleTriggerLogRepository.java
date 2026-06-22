package com.huatai.datafoundry.backend.schedule.domain.repository;

import com.huatai.datafoundry.backend.schedule.domain.model.ScheduleTriggerLog;
import java.util.List;

public interface ScheduleTriggerLogRepository {
  List<ScheduleTriggerLog> listByScheduleJobId(String scheduleJobId);

  int insert(ScheduleTriggerLog triggerLog);

  int updateResult(
      String id,
      String taskGroupId,
      String status,
      String skipReason,
      String errorMessage);

  int updateExecutionStatusByTaskGroup(
      String taskGroupId, String status, String errorMessage);
}
