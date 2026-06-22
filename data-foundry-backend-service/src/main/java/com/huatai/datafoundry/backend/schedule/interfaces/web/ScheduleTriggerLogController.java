package com.huatai.datafoundry.backend.schedule.interfaces.web;

import com.huatai.datafoundry.backend.schedule.application.query.service.ScheduleTriggerLogQueryService;
import com.huatai.datafoundry.backend.schedule.domain.model.ScheduleTriggerLog;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScheduleTriggerLogController {
  private final ScheduleTriggerLogQueryService scheduleTriggerLogQueryService;

  public ScheduleTriggerLogController(
      ScheduleTriggerLogQueryService scheduleTriggerLogQueryService) {
    this.scheduleTriggerLogQueryService = scheduleTriggerLogQueryService;
  }

  @GetMapping("/api/schedule-trigger-logs")
  public List<ScheduleTriggerLog> list(
      @RequestParam("schedule_job_id") String scheduleJobId) {
    return scheduleTriggerLogQueryService.listByScheduleJobId(scheduleJobId);
  }
}
