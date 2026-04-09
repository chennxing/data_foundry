package com.huatai.datafoundry.backend.web;

import com.huatai.datafoundry.contract.scheduler.ScheduleJob;
import java.net.URI;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ScheduleJobFacadeController {
  private final RestTemplate restTemplate;
  private final String schedulerBase;

  public ScheduleJobFacadeController(
      RestTemplate restTemplate,
      @Value("${data-foundry.scheduler.base-url:http://127.0.0.1:8200}") String schedulerBase) {
    this.restTemplate = restTemplate;
    this.schedulerBase = schedulerBase;
  }

  @GetMapping("/api/schedule-jobs")
  public List listScheduleJobs(
      @RequestParam(value = "trigger_type", required = false) String triggerType,
      @RequestParam(value = "status", required = false) String status) {
    StringBuilder url = new StringBuilder(schedulerBase).append("/api/schedule-jobs");
    boolean hasQuery = false;
    if (triggerType != null && triggerType.trim().length() > 0) {
      url.append(hasQuery ? "&" : "?").append("trigger_type=").append(triggerType.trim());
      hasQuery = true;
    }
    if (status != null && status.trim().length() > 0) {
      url.append(hasQuery ? "&" : "?").append("status=").append(status.trim());
    }
    try {
      return restTemplate.getForObject(URI.create(url.toString()), List.class);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Scheduler service unavailable", ex);
    }
  }

  @PostMapping("/api/schedule-jobs")
  public ScheduleJob createScheduleJob(@RequestBody Object body) {
    try {
      ResponseEntity<ScheduleJob> response = restTemplate.postForEntity(
          URI.create(schedulerBase + "/api/schedule-jobs"),
          body,
          ScheduleJob.class);
      return response.getBody();
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Scheduler service unavailable", ex);
    }
  }
}

