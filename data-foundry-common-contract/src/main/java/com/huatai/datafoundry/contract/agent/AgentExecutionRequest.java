package com.huatai.datafoundry.contract.agent;

import java.util.List;
import java.util.Map;

public class AgentExecutionRequest {
  private String taskId;
  private String runId;
  private String requirementId;
  private String wideTableId;
  private Integer rowId;
  private String businessDate;
  private String taskGroupId;
  private String batchId;
  private String collectionCoverageMode;
  private String snapshotLabel;
  private String snapshotAt;
  private Map<String, String> dimensionValues;
  private List<String> indicatorKeys;
  private Map<String, String> indicatorNames;
  private Map<String, String> indicatorDescriptions;
  private Map<String, String> indicatorUnits;
  private List<String> searchEngines;
  private List<String> preferredSites;
  private String sitePolicy;
  private List<String> knowledgeBases;
  private List<String> fixedUrls;
  private String promptTemplate;
  private String executionMode;
  private String defaultAgent;

  public String getTaskId() {
    return taskId;
  }

  public void setTaskId(String taskId) {
    this.taskId = taskId;
  }

  public String getRunId() {
    return runId;
  }

  public void setRunId(String runId) {
    this.runId = runId;
  }

  public String getRequirementId() {
    return requirementId;
  }

  public void setRequirementId(String requirementId) {
    this.requirementId = requirementId;
  }

  public String getWideTableId() {
    return wideTableId;
  }

  public void setWideTableId(String wideTableId) {
    this.wideTableId = wideTableId;
  }

  public Integer getRowId() {
    return rowId;
  }

  public void setRowId(Integer rowId) {
    this.rowId = rowId;
  }

  public String getBusinessDate() {
    return businessDate;
  }

  public void setBusinessDate(String businessDate) {
    this.businessDate = businessDate;
  }

  public String getTaskGroupId() {
    return taskGroupId;
  }

  public void setTaskGroupId(String taskGroupId) {
    this.taskGroupId = taskGroupId;
  }

  public String getBatchId() {
    return batchId;
  }

  public void setBatchId(String batchId) {
    this.batchId = batchId;
  }

  public String getCollectionCoverageMode() {
    return collectionCoverageMode;
  }

  public void setCollectionCoverageMode(String collectionCoverageMode) {
    this.collectionCoverageMode = collectionCoverageMode;
  }

  public String getSnapshotLabel() {
    return snapshotLabel;
  }

  public void setSnapshotLabel(String snapshotLabel) {
    this.snapshotLabel = snapshotLabel;
  }

  public String getSnapshotAt() {
    return snapshotAt;
  }

  public void setSnapshotAt(String snapshotAt) {
    this.snapshotAt = snapshotAt;
  }

  public Map<String, String> getDimensionValues() {
    return dimensionValues;
  }

  public void setDimensionValues(Map<String, String> dimensionValues) {
    this.dimensionValues = dimensionValues;
  }

  public List<String> getIndicatorKeys() {
    return indicatorKeys;
  }

  public void setIndicatorKeys(List<String> indicatorKeys) {
    this.indicatorKeys = indicatorKeys;
  }

  public Map<String, String> getIndicatorNames() {
    return indicatorNames;
  }

  public void setIndicatorNames(Map<String, String> indicatorNames) {
    this.indicatorNames = indicatorNames;
  }

  public Map<String, String> getIndicatorDescriptions() {
    return indicatorDescriptions;
  }

  public void setIndicatorDescriptions(Map<String, String> indicatorDescriptions) {
    this.indicatorDescriptions = indicatorDescriptions;
  }

  public Map<String, String> getIndicatorUnits() {
    return indicatorUnits;
  }

  public void setIndicatorUnits(Map<String, String> indicatorUnits) {
    this.indicatorUnits = indicatorUnits;
  }

  public List<String> getSearchEngines() {
    return searchEngines;
  }

  public void setSearchEngines(List<String> searchEngines) {
    this.searchEngines = searchEngines;
  }

  public List<String> getPreferredSites() {
    return preferredSites;
  }

  public void setPreferredSites(List<String> preferredSites) {
    this.preferredSites = preferredSites;
  }

  public String getSitePolicy() {
    return sitePolicy;
  }

  public void setSitePolicy(String sitePolicy) {
    this.sitePolicy = sitePolicy;
  }

  public List<String> getKnowledgeBases() {
    return knowledgeBases;
  }

  public void setKnowledgeBases(List<String> knowledgeBases) {
    this.knowledgeBases = knowledgeBases;
  }

  public List<String> getFixedUrls() {
    return fixedUrls;
  }

  public void setFixedUrls(List<String> fixedUrls) {
    this.fixedUrls = fixedUrls;
  }

  public String getPromptTemplate() {
    return promptTemplate;
  }

  public void setPromptTemplate(String promptTemplate) {
    this.promptTemplate = promptTemplate;
  }

  public String getExecutionMode() {
    return executionMode;
  }

  public void setExecutionMode(String executionMode) {
    this.executionMode = executionMode;
  }

  public String getDefaultAgent() {
    return defaultAgent;
  }

  public void setDefaultAgent(String defaultAgent) {
    this.defaultAgent = defaultAgent;
  }
}

