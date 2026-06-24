package com.huatai.datafoundry.backend.requirement.application.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CollectionPromptPayload {
  private String query;
  private String background;

  @JsonProperty("user_id")
  private String userId;

  @JsonProperty("max_iterations")
  private Integer maxIterations;

  @JsonProperty("require_schema_approval")
  private Boolean requireSchemaApproval;

  public String getQuery() {
    return query;
  }

  public void setQuery(String query) {
    this.query = query;
  }

  public String getBackground() {
    return background;
  }

  public void setBackground(String background) {
    this.background = background;
  }

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public Integer getMaxIterations() {
    return maxIterations;
  }

  public void setMaxIterations(Integer maxIterations) {
    this.maxIterations = maxIterations;
  }

  public Boolean getRequireSchemaApproval() {
    return requireSchemaApproval;
  }

  public void setRequireSchemaApproval(Boolean requireSchemaApproval) {
    this.requireSchemaApproval = requireSchemaApproval;
  }
}
