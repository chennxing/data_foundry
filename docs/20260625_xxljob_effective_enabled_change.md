# XXL-JOB 有效启停口径调整说明

## 1. 背景

本次调整解决两类空跑问题：

1. 调度规则已同步到 XXL-JOB，但需求下尚未生成 `task_groups` / `fetch_tasks`，XXL-JOB 仍会按 cron 自动触发。
2. 调度规则下所有时间周期的任务组已经执行完毕，后续 XXL-JOB 仍继续触发，并在后端返回 `SKIPPED` / `No existing task group is available for dispatch`。

调整目标是让 XXL-JOB 的运行态不只看 `schedule_rules.enabled`，还要看该规则当前是否真的存在可自动调度的任务组。

## 2. 新口径

XXL-JOB 最终同步的 `enabled` 使用“有效启用”口径：

```text
effective_xxl_enabled =
  schedule_rules.enabled = true
  AND exists task_groups.schedule_rule_id = schedule_rules.id
  AND task_groups.source_type = 'SCHEDULED'
  AND task_groups.status = 'pending'
  AND task_groups.scheduled_at is not null
  AND task_groups.total_tasks > 0
  AND exists fetch_tasks.task_group_id = task_groups.id
```

也就是说：

- 只有存在待执行的定时任务组，并且任务组下已有采集任务实例时，XXL-JOB 才保持启用。
- 没有任务组、没有采集任务实例、任务组已全部完成或失败时，XXL-JOB 同步为 `enabled=false`。
- `failed` 不再作为自动 cron 可继续触发的状态；失败后的处理应通过人工重采、重新触发或补采链路完成。

## 3. 状态同步时机

### 3.1 任务计划生成或刷新

当宽表配置生成或刷新任务组后，系统会将对应 `schedule_rules.xxl_sync_status` 标记为 `PENDING_SYNC`，等待 scheduler-service 下一轮同步到 XXL-JOB。

覆盖场景：

- 首次生成任务组和采集任务实例。
- 刷新后发现没有可执行时间周期。
- 调度规则对应的任务组被重建、失效或状态发生变化。

### 3.2 任务组状态汇总

当采集任务实例状态回写后，`TaskGroupAggregateService` 会重新汇总 `task_groups` 状态。

如果任务组从 `pending` 进入 `running`、`completed`、`failed`、`cancelled`、`invalidated` 或其他非 pending 状态，会将对应规则标记为 `PENDING_SYNC`，用于触发下一轮 XXL-JOB 有效启停重算。

这用于覆盖“最后一个时间周期执行完毕后自动停用 XXL-JOB”的场景。

## 4. 字段与表

### 4.1 schedule_rules

- `enabled`：业务配置层面的规则启用开关，不再直接等同于 XXL-JOB 运行态。
- `xxl_sync_status`：同步状态；本次在任务计划变化、任务组状态变化后写入 `PENDING_SYNC`。
- `xxl_job_id`：已创建的 XXL-JOB 任务 ID，停用时不删除任务，只同步 `enabled=false`。
- `xxl_last_error_message`：标记待同步时清空旧同步错误。

### 4.2 task_groups

- `schedule_rule_id`：关联调度规则。
- `source_type`：必须为 `SCHEDULED` 才参与 XXL-JOB 有效启用判断。
- `status`：只有 `pending` 视为仍可由 cron 自动触发。
- `scheduled_at`：必须非空，表示该任务组具备计划执行时间。
- `total_tasks`：必须大于 0。

### 4.3 fetch_tasks

- `task_group_id`：用于确认任务组下实际存在采集任务实例。

## 5. 代码范围

### 5.1 Backend Service

- `ScheduleRuleXxlSyncStateAppService`
  - 拉取待同步规则时计算 `effective_xxl_enabled`。
  - 同步命令中的 `enabled` 改为有效启用结果。

- `TaskGroupRepository` / `TaskGroupMapper`
  - 新增待执行定时任务组存在性查询。

- `ScheduleRuleRepository` / `ScheduleRuleMapper`
  - 新增按规则 ID 标记 `PENDING_SYNC`。
  - 新增按 `requirement_id + wide_table_id` 批量标记 `PENDING_SYNC`。

- `TaskPlanAppService`
  - 任务计划生成、重建或没有可生成周期时，标记关联规则待同步。

- `SchedulePlanRefreshAppService`
  - 调度计划刷新后标记关联规则待同步，确保 XXL-JOB 根据最新任务组状态重算启停。

- `TaskGroupAggregateService`
  - 任务组状态汇总后标记关联规则待同步，覆盖所有周期执行完毕后的自动停用。

## 6. 非变更项

- 不在 `ScheduleRuleDispatchAppService` 中增加 `SKIPPED_TASK_GROUP_NOT_FOUND` 的兜底写回逻辑。
- 不因为某一次 XXL-JOB 触发发现没有任务组，就在 dispatch 链路中直接改规则状态。
- 不删除 XXL-JOB 任务，只通过同步 `enabled=false` 停止后续自动触发。

## 7. 示例口径

### 7.1 `sr_7b0e0f1b04f83cd089ae7f2176b70595`

需求下没有 `task_groups` 和 `fetch_tasks` 时：

- `schedule_rules.enabled=true` 只表示业务规则启用。
- `effective_xxl_enabled=false`。
- XXL-JOB 下一轮同步后应进入停用状态，避免继续自动触发。

### 7.2 `sr_9d34ac1b4a153fa9a12609bb4401cda3`

所有业务日期周期均已执行完毕时：

- 不再存在 `status='pending'` 的定时任务组。
- `effective_xxl_enabled=false`。
- XXL-JOB 下一轮同步后应进入停用状态，避免继续产生 `No existing task group is available for dispatch` 的空跑记录。
