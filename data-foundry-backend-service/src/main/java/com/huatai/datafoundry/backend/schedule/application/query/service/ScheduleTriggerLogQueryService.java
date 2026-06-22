package com.huatai.datafoundry.backend.schedule.application.query.service;

import com.huatai.datafoundry.backend.schedule.domain.model.ScheduleTriggerLog;
import com.huatai.datafoundry.backend.schedule.domain.repository.ScheduleTriggerLogRepository;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScheduleTriggerLogQueryService {
  private final ScheduleTriggerLogRepository scheduleTriggerLogRepository;

  public ScheduleTriggerLogQueryService(
      ScheduleTriggerLogRepository scheduleTriggerLogRepository) {
    this.scheduleTriggerLogRepository = scheduleTriggerLogRepository;
  }

  public List<ScheduleTriggerLog> listByScheduleJobId(String scheduleJobId) {
    if (scheduleJobId == null || scheduleJobId.trim().isEmpty()) {
      return Collections.emptyList();
    }
    return scheduleTriggerLogRepository.listByScheduleJobId(scheduleJobId.trim());
  }
}
