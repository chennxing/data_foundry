# 调度状态与触发者口径调整说明

## 1. 变更背景

本次调整聚焦运行中心“调度”页面和 XXL-JOB 自动调度链路，目标是统一以下两类口径：

1. 调度任务是否成功
2. 调度任务是谁触发的、以什么方式触发的

原有实现里，XXL-JOB、`schedule_jobs`、`schedule_trigger_logs`、`task_group/fetch_tasks` 分别从不同层面记录状态，页面展示和真实业务含义之间存在偏差。

## 2. 本次功能变化

### 2.1 调度成功/失败口径调整

`schedule_jobs.status` 现在统一表达“这次调度有没有成功把采集拉起来”，主状态收口为：

- `RUNNING`
- `SUCCESS`
- `FAILED`
- `SKIPPED`

其中：

- `SUCCESS`：已确认采集任务成功被拉起
- `FAILED`：已确认没有成功拉起采集
- `SKIPPED`：本次规则命中但未执行，不计为业务成功

历史状态兼容：

- `DISPATCHED`
- `completed`

页面展示时会兼容映射为“调度成功”。

### 2.2 新增 60s 调度确认窗口

自动调度链路中，backend 在调用采集接口后，不再仅以同步返回值直接认定“调度成功”。

新增确认机制：

- 调度分发后，会进入最长 `60s` 的确认窗口
- 若确认到 `fetch_tasks` 已获得 `collection_task_id`，或任务组已进入可确认的运行态，则记为 `SUCCESS`
- 若存在 `fetch_task` 明确分发失败且没有下游 `collection_task_id`，则记为 `FAILED`
- 若 `60s` 内始终无法确认全部采集已成功拉起，则记为 `FAILED`

该机制用于兼容采集接口返回较慢的情况，避免仅因短时延迟误判调度失败。

### 2.3 XXL-JOB 与业务页状态口径分离

本次确认的展示口径如下：

- XXL-JOB 页面：
  - `SUCCESS` 返回成功
  - `SKIPPED` 也返回成功
  - `FAILED` 返回失败

- 业务页面：
  - `SUCCESS` 展示为“调度成功”
  - `SKIPPED` 展示为“已跳过”
  - `FAILED` 展示为“调度失败”

也就是说：

- XXL-JOB 的“成功”包含“业务已跳过”
- 业务页会明确把“已跳过”从“调度成功”中拆开展示

### 2.4 触发方式口径统一

`schedule_jobs.trigger_type` 本次统一按标准枚举写入：

- `MANUAL`
- `SCHEDULED`
- `BACKFILL`
- `TRIAL`

兼容历史值：

- `SCHEDULE`
- `scheduled`
- `cron`

页面展示时统一归一为“定时调度”。

### 2.5 触发者口径统一

`schedule_jobs.operator` 现在统一表达“是谁/什么系统触发的”：

- 手动触发：写当前登录用户账号或用户名
- 自动调度：写 `xxl-job`
- 系统补偿或兜底：写 `system`

不再把 `manual` 这类“触发方式”字符串作为 `operator` 默认值写入。

### 2.6 调度失败原因展示增强

前端调度页“查看触发记录”弹窗现在除展示 `schedule_trigger_logs` 外，还会补充展示 `schedule_jobs.error_message`。

两者分工如下：

- `schedule_trigger_logs.skip_reason`
  - 为什么跳过

- `schedule_trigger_logs.error_message`
  - 规则触发过程中的错误

- `schedule_jobs.error_message`
  - 为什么没有成功拉起采集

## 3. 主要实现点

### 3.1 backend-service

- 新增调度确认服务，负责 `60s` 内轮询确认采集是否已成功拉起
- 调度分发执行改为独立事务提交，再进入确认窗口
- 内部 dispatch 接口返回体新增：
  - `schedule_job_status`
  - `confirmation_source`
  - `error_message`

### 3.2 scheduler-service

- `schedule_jobs.status` 改为写入 `RUNNING/SUCCESS/FAILED/SKIPPED`
- XXL-JOB handler 按新的调度主状态决定是否抛异常
- 手动创建调度任务默认写入：
  - `trigger_type=MANUAL`
  - `operator=system`，由前端优先传真实用户覆盖
- 自动调度参数统一写入：
  - `triggerType=SCHEDULED`
  - `operator=xxl-job`

### 3.3 frontend

- 调度页状态筛选改为：
  - 运行中
  - 调度成功
  - 调度失败
  - 已跳过
- 手动触发时，前端会把当前登录用户写入 `operator`
- 触发记录弹窗新增“调度失败原因”展示
- 页面兼容历史 `DISPATCHED/completed` 状态展示

## 4. 验证说明

本次已完成的定向验证：

- backend-service 定向测试通过：
  - `ScheduleRuleDispatchAppServiceTest`
  - `ScheduleDispatchConfirmationAppServiceTest`

- scheduler-service 定向测试通过：
  - `XxlJobDispatchAppServiceTest`
  - `ScheduleJobAppServiceTest`
  - `ScheduleJobCreatedHandlerTest`
  - `XxlJobAdminClientTest`

前端额外说明：

- `npx tsc --noEmit` 在当前仓库中仍会被既有的无关类型错误阻塞，错误位于：
  - `app/external-data/logs/page.tsx`
  - `components/requirement-tasks/utils/requirementTaskViews.ts`
- 这些并非本次改动引入的问题。

## 5. 影响范围

受本次变更影响的主要模块：

- `data-foundry-backend-service`
- `data-foundry-scheduler-service`
- `data-foundry-frontend/app/scheduling/page.tsx`
- `data-foundry-frontend/lib/scheduling-list-view.ts`

涉及的主要数据表：

- `data_foundry_scheduler.schedule_jobs`
- `data_foundry_backend.schedule_trigger_logs`
