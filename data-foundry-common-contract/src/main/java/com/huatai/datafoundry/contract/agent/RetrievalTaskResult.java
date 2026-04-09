package com.huatai.datafoundry.contract.agent;

public class RetrievalTaskResult {
  private String indicatorKey;
  private String query;
  private String status;
  private Double confidence;
  private NarrowIndicatorRow narrowRow;

  public String getIndicatorKey() {
    return indicatorKey;
  }

  public void setIndicatorKey(String indicatorKey) {
    this.indicatorKey = indicatorKey;
  }

  public String getQuery() {
    return query;
  }

  public void setQuery(String query) {
    this.query = query;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Double getConfidence() {
    return confidence;
  }

  public void setConfidence(Double confidence) {
    this.confidence = confidence;
  }

  public NarrowIndicatorRow getNarrowRow() {
    return narrowRow;
  }

  public void setNarrowRow(NarrowIndicatorRow narrowRow) {
    this.narrowRow = narrowRow;
  }
}

