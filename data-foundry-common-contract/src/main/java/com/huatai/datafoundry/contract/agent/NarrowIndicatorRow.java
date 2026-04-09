package com.huatai.datafoundry.contract.agent;

import java.util.Map;

public class NarrowIndicatorRow {
  private String indicatorKey;
  private String indicatorName;
  private String value;
  private String unit;
  private String sourceUrl;
  private String sourceSite;
  private String quoteText;
  private Map<String, String> dimensionValues;

  public String getIndicatorKey() {
    return indicatorKey;
  }

  public void setIndicatorKey(String indicatorKey) {
    this.indicatorKey = indicatorKey;
  }

  public String getIndicatorName() {
    return indicatorName;
  }

  public void setIndicatorName(String indicatorName) {
    this.indicatorName = indicatorName;
  }

  public String getValue() {
    return value;
  }

  public void setValue(String value) {
    this.value = value;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public String getSourceUrl() {
    return sourceUrl;
  }

  public void setSourceUrl(String sourceUrl) {
    this.sourceUrl = sourceUrl;
  }

  public String getSourceSite() {
    return sourceSite;
  }

  public void setSourceSite(String sourceSite) {
    this.sourceSite = sourceSite;
  }

  public String getQuoteText() {
    return quoteText;
  }

  public void setQuoteText(String quoteText) {
    this.quoteText = quoteText;
  }

  public Map<String, String> getDimensionValues() {
    return dimensionValues;
  }

  public void setDimensionValues(Map<String, String> dimensionValues) {
    this.dimensionValues = dimensionValues;
  }
}

