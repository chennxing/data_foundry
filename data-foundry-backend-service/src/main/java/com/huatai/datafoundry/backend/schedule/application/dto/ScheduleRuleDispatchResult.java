package com.huatai.datafoundry.backend.schedule.application.dto;

public class ScheduleRuleDispatchResult {
  private boolean ok;
  private String scheduleRuleId;
  private String taskGroupId;
  private String businessDate;
  private String triggerLogId;
  private String status;
  private String scheduleJobStatus;
  private String confirmationSource;
  private String errorMessage;

  public boolean isOk() { return ok; }
  public void setOk(boolean ok) { this.ok = ok; }
  public String getScheduleRuleId() { return scheduleRuleId; }
  public void setScheduleRuleId(String scheduleRuleId) { this.scheduleRuleId = scheduleRuleId; }
  public String getTaskGroupId() { return taskGroupId; }
  public void setTaskGroupId(String taskGroupId) { this.taskGroupId = taskGroupId; }
  public String getBusinessDate() { return businessDate; }
  public void setBusinessDate(String businessDate) { this.businessDate = businessDate; }
  public String getTriggerLogId() { return triggerLogId; }
  public void setTriggerLogId(String triggerLogId) { this.triggerLogId = triggerLogId; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getScheduleJobStatus() { return scheduleJobStatus; }
  public void setScheduleJobStatus(String scheduleJobStatus) { this.scheduleJobStatus = scheduleJobStatus; }
  public String getConfirmationSource() { return confirmationSource; }
  public void setConfirmationSource(String confirmationSource) { this.confirmationSource = confirmationSource; }
  public String getErrorMessage() { return errorMessage; }
  public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
