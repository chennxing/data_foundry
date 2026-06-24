package com.huatai.datafoundry.backend.task.infrastructure.persistence.mybatis.mapper;

import com.huatai.datafoundry.backend.task.infrastructure.persistence.mybatis.record.FetchTaskRecord;
import java.math.BigDecimal;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface FetchTaskMapper {
  String FETCH_TASK_COLUMNS =
      "id, sort_order, requirement_id, wide_table_id, task_group_id, batch_id, row_id, "
          + "indicator_group_id, indicator_group_name, name, schema_version, execution_mode, "
          + "indicator_keys_json, dimension_values_json, rendered_prompt_text, prompt_template_snapshot, "
          + "collection_task_id, collection_create_http_status, collection_create_raw_response, "
          + "business_date, status, error_message, can_rerun, "
          + "invalidated_reason, owner, confidence, plan_version, row_binding_key, created_at, updated_at ";

  @Select(
      "select "
          + FETCH_TASK_COLUMNS
          + "from fetch_tasks "
          + "where requirement_id = #{requirementId} "
          + "order by sort_order asc")
  List<FetchTaskRecord> listByRequirement(@Param("requirementId") String requirementId);

  @Select(
      "select "
          + FETCH_TASK_COLUMNS
          + "from fetch_tasks "
          + "order by requirement_id asc, sort_order asc")
  List<FetchTaskRecord> listAll();

  @Select(
      "select "
          + FETCH_TASK_COLUMNS
          + "from fetch_tasks "
          + "where wide_table_id = #{wideTableId} "
          + "order by sort_order asc")
  List<FetchTaskRecord> listByWideTable(@Param("wideTableId") String wideTableId);

  @Select(
      "select "
          + FETCH_TASK_COLUMNS
          + "from fetch_tasks "
          + "where task_group_id = #{taskGroupId} "
          + "order by sort_order asc")
  List<FetchTaskRecord> listByTaskGroup(@Param("taskGroupId") String taskGroupId);

  @Select(
      "select "
          + FETCH_TASK_COLUMNS
          + "from fetch_tasks "
          + "where id = #{id} "
          + "limit 1")
  FetchTaskRecord getById(@Param("id") String id);

  @Select(
      "select "
          + FETCH_TASK_COLUMNS
          + "from fetch_tasks "
          + "where collection_task_id = #{collectionTaskId} "
          + "limit 1")
  FetchTaskRecord getByCollectionTaskId(@Param("collectionTaskId") String collectionTaskId);

  @Select("select count(1) from fetch_tasks where task_group_id = #{taskGroupId}")
  int countByTaskGroup(@Param("taskGroupId") String taskGroupId);

  @Delete("delete from fetch_tasks where task_group_id = #{taskGroupId}")
  int deleteByTaskGroup(@Param("taskGroupId") String taskGroupId);

  @Insert({
      "<script>",
      "insert into fetch_tasks (",
      "  id, sort_order, requirement_id, wide_table_id, task_group_id, batch_id, row_id,",
      "  indicator_group_id, indicator_group_name, name, schema_version, execution_mode,",
      "  indicator_keys_json, dimension_values_json, rendered_prompt_text, prompt_template_snapshot, collection_task_id,",
      "  collection_create_http_status, collection_create_raw_response, business_date, status, error_message, can_rerun,",
      "  invalidated_reason, owner, confidence, plan_version, row_binding_key",
      ") values ",
      "  <foreach collection='records' item='r' separator=','>",
      "    (#{r.id}, #{r.sortOrder}, #{r.requirementId}, #{r.wideTableId}, #{r.taskGroupId}, #{r.batchId}, #{r.rowId},",
      "     #{r.indicatorGroupId}, #{r.indicatorGroupName}, #{r.name}, #{r.schemaVersion}, #{r.executionMode},",
      "     #{r.indicatorKeysJson}, #{r.dimensionValuesJson}, #{r.renderedPromptText}, #{r.promptTemplateSnapshot}, #{r.collectionTaskId},",
      "     #{r.collectionCreateHttpStatus}, #{r.collectionCreateRawResponse}, #{r.businessDate}, #{r.status}, #{r.errorMessage}, #{r.canRerun},",
      "     #{r.invalidatedReason}, #{r.owner}, #{r.confidence}, #{r.planVersion}, #{r.rowBindingKey})",
      "  </foreach>",
      "on duplicate key update ",
      "  status = values(status),",
      "  indicator_group_name = coalesce(values(indicator_group_name), indicator_group_name),",
      "  indicator_keys_json = coalesce(values(indicator_keys_json), indicator_keys_json),",
      "  business_date = coalesce(values(business_date), business_date),",
      "  row_binding_key = coalesce(values(row_binding_key), row_binding_key),",
      "  rendered_prompt_text = values(rendered_prompt_text),",
      "  prompt_template_snapshot = values(prompt_template_snapshot),",
      "  dimension_values_json = values(dimension_values_json),",
      "  collection_task_id = coalesce(values(collection_task_id), collection_task_id),",
      "  collection_create_http_status = values(collection_create_http_status),",
      "  collection_create_raw_response = values(collection_create_raw_response),",
      "  error_message = values(error_message),",
      "  confidence = values(confidence),",
      "  can_rerun = values(can_rerun),",
      "  invalidated_reason = values(invalidated_reason),",
      "  updated_at = current_timestamp",
      "</script>",
  })
  int upsertBatch(@Param("records") List<FetchTaskRecord> records);

  @Update("update fetch_tasks set status = #{status}, updated_at = current_timestamp where id = #{id}")
  int updateStatus(@Param("id") String id, @Param("status") String status);

  @Update(
      "update fetch_tasks "
          + "set status = #{status}, updated_at = current_timestamp "
          + "where id = #{id} and status = #{expectedStatus}")
  int updateStatusIfCurrent(
      @Param("id") String id, @Param("expectedStatus") String expectedStatus, @Param("status") String status);

  @Update(
      "update fetch_tasks "
          + "set status = #{status}, collection_task_id = #{collectionTaskId}, updated_at = current_timestamp "
          + "where id = #{id}")
  int updateStatusAndCollectionTaskId(
      @Param("id") String id, @Param("status") String status, @Param("collectionTaskId") String collectionTaskId);

  @Update(
      "update fetch_tasks "
          + "set status = #{status}, "
          + "collection_task_id = #{collectionTaskId}, "
          + "collection_create_http_status = #{collectionCreateHttpStatus}, "
          + "collection_create_raw_response = #{collectionCreateRawResponse}, "
          + "error_message = #{errorMessage}, "
          + "updated_at = current_timestamp "
          + "where id = #{id}")
  int updateCollectionDispatchResult(
      @Param("id") String id,
      @Param("status") String status,
      @Param("collectionTaskId") String collectionTaskId,
      @Param("collectionCreateHttpStatus") Integer collectionCreateHttpStatus,
      @Param("collectionCreateRawResponse") String collectionCreateRawResponse,
      @Param("errorMessage") String errorMessage);

  @Update(
      "update fetch_tasks "
          + "set status = #{status}, collection_task_id = #{collectionTaskId}, updated_at = current_timestamp "
          + "where id = #{id} and status = #{expectedStatus}")
  int updateStatusAndCollectionTaskIdIfCurrent(
      @Param("id") String id,
      @Param("expectedStatus") String expectedStatus,
      @Param("status") String status,
      @Param("collectionTaskId") String collectionTaskId);

  @Update(
      "update fetch_tasks "
          + "set status = #{status}, confidence = #{confidence}, updated_at = current_timestamp "
          + "where id = #{id}")
  int updateStatusAndConfidence(
      @Param("id") String id, @Param("status") String status, @Param("confidence") BigDecimal confidence);

  @Update(
      "update fetch_tasks "
          + "set status = #{status}, confidence = #{confidence}, updated_at = current_timestamp "
          + "where id = #{id} and status = #{expectedStatus}")
  int updateStatusAndConfidenceIfCurrent(
      @Param("id") String id,
      @Param("expectedStatus") String expectedStatus,
      @Param("status") String status,
      @Param("confidence") BigDecimal confidence);

  @Update(
      "update fetch_tasks "
          + "set indicator_group_name = #{indicatorGroupName}, name = #{indicatorGroupName}, updated_at = current_timestamp "
          + "where requirement_id = #{requirementId} "
          + "and wide_table_id = #{wideTableId} "
          + "and indicator_group_id = #{indicatorGroupId}")
  int updateIndicatorGroupName(
      @Param("requirementId") String requirementId,
      @Param("wideTableId") String wideTableId,
      @Param("indicatorGroupId") String indicatorGroupId,
      @Param("indicatorGroupName") String indicatorGroupName);
}
