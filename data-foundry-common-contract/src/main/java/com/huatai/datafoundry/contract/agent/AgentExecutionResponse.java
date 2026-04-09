package com.huatai.datafoundry.contract.agent;

import java.util.ArrayList;
import java.util.List;

public class AgentExecutionResponse {
  private String taskId;
  private String status;
  private List<AgentIndicatorResult> indicators = new ArrayList<AgentIndicatorResult>();
  private List<RetrievalTaskResult> retrievalTasks = new ArrayList<RetrievalTaskResult>();
  private Integer durationMs;
  private String errorMessage;

  public String getTaskId() {
    return taskId;
  }

  public void setTaskId(String taskId) {
    this.taskId = taskId;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public List<AgentIndicatorResult> getIndicators() {
    return indicators;
  }

  public void setIndicators(List<AgentIndicatorResult> indicators) {
    this.indicators = indicators;
  }

  public List<RetrievalTaskResult> getRetrievalTasks() {
    return retrievalTasks;
  }

  public void setRetrievalTasks(List<RetrievalTaskResult> retrievalTasks) {
    this.retrievalTasks = retrievalTasks;
  }

  public Integer getDurationMs() {
    return durationMs;
  }

  public void setDurationMs(Integer durationMs) {
    this.durationMs = durationMs;
  }

  public String getErrorMessage() {
    return errorMessage;
  }

  public void setErrorMessage(String errorMessage) {
    this.errorMessage = errorMessage;
  }
}

