package com.huatai.datafoundry.contract.agent;

import java.util.Map;

public class AgentIndicatorResult {
  private String indicatorKey;
  private String value;
  private String valueDescription;
  private String dataSource;
  private String sourceUrl;
  private String sourceLink;
  private String quoteText;
  private Double confidence;
  private Map<String, Object> semantic;

  public String getIndicatorKey() {
    return indicatorKey;
  }

  public void setIndicatorKey(String indicatorKey) {
    this.indicatorKey = indicatorKey;
  }

  public String getValue() {
    return value;
  }

  public void setValue(String value) {
    this.value = value;
  }

  public String getValueDescription() {
    return valueDescription;
  }

  public void setValueDescription(String valueDescription) {
    this.valueDescription = valueDescription;
  }

  public String getDataSource() {
    return dataSource;
  }

  public void setDataSource(String dataSource) {
    this.dataSource = dataSource;
  }

  public String getSourceUrl() {
    return sourceUrl;
  }

  public void setSourceUrl(String sourceUrl) {
    this.sourceUrl = sourceUrl;
  }

  public String getSourceLink() {
    return sourceLink;
  }

  public void setSourceLink(String sourceLink) {
    this.sourceLink = sourceLink;
  }

  public String getQuoteText() {
    return quoteText;
  }

  public void setQuoteText(String quoteText) {
    this.quoteText = quoteText;
  }

  public Double getConfidence() {
    return confidence;
  }

  public void setConfidence(Double confidence) {
    this.confidence = confidence;
  }

  public Map<String, Object> getSemantic() {
    return semantic;
  }

  public void setSemantic(Map<String, Object> semantic) {
    this.semantic = semantic;
  }
}

