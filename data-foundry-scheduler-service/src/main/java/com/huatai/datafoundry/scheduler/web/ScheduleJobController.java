package com.huatai.datafoundry.scheduler.web;

import com.huatai.datafoundry.contract.scheduler.ScheduleJob;
import com.huatai.datafoundry.scheduler.persistence.ScheduleJobMapper;
import com.huatai.datafoundry.scheduler.persistence.ScheduleJobRecord;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ScheduleJobController {
  private final ScheduleJobMapper mapper;

  public ScheduleJobController(ScheduleJobMapper mapper) {
    this.mapper = mapper;
  }

  @GetMapping("/api/schedule-jobs")
  public List<ScheduleJob> list(
      @RequestParam(value = "trigger_type", required = false) String triggerType,
      @RequestParam(value = "status", required = false) String status) {
    List<ScheduleJobRecord> records = mapper.list(triggerType, status);
    List<ScheduleJob> out = new ArrayList<ScheduleJob>();
    for (ScheduleJobRecord record : records) {
      out.add(toDto(record));
    }
    return out;
  }

  @GetMapping("/api/schedule-jobs/{jobId}")
  public ScheduleJob get(@PathVariable("jobId") String jobId) {
    ScheduleJobRecord record = mapper.get(jobId);
    if (record == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ScheduleJob not found");
    }
    return toDto(record);
  }

  public static class CreateScheduleJobInput {
    private String taskGroupId;
    private String taskId;
    private String triggerType;
    private String operator;
    private String backfillRequestId;

    public String getTaskGroupId() {
      return taskGroupId;
    }

    public void setTaskGroupId(String taskGroupId) {
      this.taskGroupId = taskGroupId;
    }

    public String getTaskId() {
      return taskId;
    }

    public void setTaskId(String taskId) {
      this.taskId = taskId;
    }

    public String getTriggerType() {
      return triggerType;
    }

    public void setTriggerType(String triggerType) {
      this.triggerType = triggerType;
    }

    public String getOperator() {
      return operator;
    }

    public void setOperator(String operator) {
      this.operator = operator;
    }

    public String getBackfillRequestId() {
      return backfillRequestId;
    }

    public void setBackfillRequestId(String backfillRequestId) {
      this.backfillRequestId = backfillRequestId;
    }
  }

  @PostMapping("/api/schedule-jobs")
  public ScheduleJob create(@RequestBody CreateScheduleJobInput body) {
    String id = UUID.randomUUID().toString();
    String startedAt = Instant.now().toString();
    String triggerType = body.getTriggerType() != null && body.getTriggerType().trim().length() > 0
        ? body.getTriggerType().trim()
        : "manual";
    String operator = body.getOperator() != null && body.getOperator().trim().length() > 0
        ? body.getOperator().trim()
        : "manual";

    ScheduleJobRecord record = new ScheduleJobRecord();
    record.setId(id);
    record.setTaskGroupId(body.getTaskGroupId());
    record.setTaskId(body.getTaskId());
    record.setTriggerType(triggerType);
    record.setStatus("running");
    record.setStartedAt(startedAt);
    record.setOperator(operator);
    record.setLogRef("log://scheduler/" + id);
    mapper.insert(record);

    // Skeleton behavior: immediately complete the job.
    String endedAt = Instant.now().toString();
    mapper.updateStatus(id, "completed", endedAt, record.getLogRef());
    ScheduleJobRecord updated = mapper.get(id);
    return toDto(updated != null ? updated : record);
  }

  private static ScheduleJob toDto(ScheduleJobRecord record) {
    ScheduleJob dto = new ScheduleJob();
    dto.setId(record.getId());
    dto.setTaskGroupId(record.getTaskGroupId());
    dto.setTaskId(record.getTaskId());
    dto.setTriggerType(record.getTriggerType());
    dto.setStatus(record.getStatus());
    dto.setStartedAt(record.getStartedAt());
    dto.setEndedAt(record.getEndedAt());
    dto.setOperator(record.getOperator());
    dto.setLogRef(record.getLogRef());
    return dto;
  }
}

