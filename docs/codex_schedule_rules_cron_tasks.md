# schedule_rules.cron_expression 改造 - Codex执行版任务清单

---

# 一、目标

将当前“每日唤醒型 CRON”改造为“业务频率 CRON”，实现：

- schedule_rules.cron_expression 表达真实业务频率
- xxl-job 与业务频率一致
- backend 仍保留兜底执行能力

---

# 二、改造总原则

1. CRON = 业务频率表达，不再只是唤醒器
2. schedule_rules 是唯一 cron source of truth
3. task_groups / fetch_tasks 仍作为执行兜底
4. 所有变更必须幂等

---

# 二点五、本次已实现功能变化说明

本次按方案 A 落地，已经完成的功能变化如下：

1. `schedule_rules.cron_expression` 不再固定生成“每日唤醒型 CRON”，而是按业务频率生成真实 CRON。
2. 新增 `CronExpressionBuilder`，统一负责 `DAILY / WEEKLY / MONTHLY / QUARTERLY / YEARLY` 的 CRON 生成。
3. `ScheduleRuleSyncAppService` 已切换为调用 `CronExpressionBuilder.build()`，旧的 `buildDailyCron()` 语义已移除。
4. `schedule_rules` 写入时，`cron_expression`、`frequency`、`trigger_time`、`business_date_offset_days` 继续保持同源。
5. Scheduler 侧 XXL-JOB 自动同步链路保持不变，但同步下发的 `job_info.schedule_conf` 已改为真实业务频率 CRON。
6. backend 仍保留 `task_groups.scheduled_at` 的兜底校验逻辑；即使 XXL-JOB 已按真实频率触发，后端仍会校验任务组是否真正到期。

本次同时增加了“不可表达 offset 的校验/限制”，明确禁止为了兼容 offset 而偷偷退回每日触发：

1. `ScheduleScopeValidator` 在保存/更新配置时会前置校验 `business_date_offset_days` 是否能被当前频率的单条 CRON 表达。
2. `ScheduleRuleSyncAppService` 在物化 `schedule_rules` 时会再次做防御性校验，防止脏数据绕过前置校验。
3. 当前可表达性约束为：
   - `DAILY`：全部非负 offset 均可表达
   - `WEEKLY`：全部非负 offset 均可表达
   - `MONTHLY`：仅允许 `0 ~ 28`
   - `QUARTERLY`：仅允许 `0 ~ 30`
   - `YEARLY`：仅允许 `0 ~ 59`
4. 超出上述范围时，系统会直接报错，不会降级为“每日触发 + 后端判断是否执行”。

本次未包含的范围：

1. 未新增 `weekTriggerDay` 前后端字段和交互。
2. 周频仍沿用“周期结束日 + offset”推导触发星期，而不是由用户单独指定星期几。
3. 未调整既有 `task_groups / fetch_tasks` 重建主链路语义，仅确保新生成的 `schedule_rules.cron_expression` 与 XXL-JOB 保持一致。

---

# 三、Codex拆解任务

---

## TASK 1：新增 CronExpressionBuilder

### 修改范围
- 新增类：CronExpressionBuilder

### 功能
- 支持：
  - DAILY
  - WEEKLY
  - MONTHLY
  - QUARTERLY
  - YEARLY

### 输入
- frequency
- trigger_time
- offset
- weekTriggerDay

### 输出
- cron_expression

---

## TASK 2：替换 schedule_rules 生成逻辑

### 修改范围
- schedule_rule_service

### 修改点
- 删除旧 buildDailyCron()
- 替换为 CronExpressionBuilder.build()

---

## TASK 3：修改 schedule_rules 表写入逻辑

### 要求
- 写入 cron_expression 必须来自 builder
- 同步写入：
  - frequency
  - trigger_time
  - offset

---

## TASK 4：修改 xxl-job sync 逻辑

### 修改点
- sync schedule_rules → xxl-job
- cron_expression 必须同步更新
- 更新 job_info.schedule_conf

---

## TASK 5：修复 xxl_sync_failed 问题

### 要求
- sync hash 必须基于：
  - cron_expression
  - frequency
  - trigger_time

---

## TASK 6：重建任务链路修复

### 修复点
indicator_groups_json 变化必须触发：

schedule_rules
→ task_groups
→ fetch_tasks

---

## TASK 7：补齐 task_groups 重建逻辑

### 要求
- rebuild 必须全量覆盖
- 删除旧 group
- 重建新 group

---

## TASK 8：空指标组处理逻辑

### 规则
- indicator_columns为空：
  - schedule_rules = DISABLED
  - task_groups = DISABLED
  - fetch_tasks = DELETE or INVALIDATED

---

## TASK 9：状态机统一

### 状态规范
- PENDING
- SCHEDULED
- RUNNING
- FAILED
- INVALIDATED

### 要求
- 禁止状态混写

---

## TASK 10：修复前端展示依赖

### 要求
- 前端禁止依赖“生成任务组按钮状态”
- 必须依赖：
  - task_groups
  - fetch_tasks

---

## TASK 11：structuralChange 逻辑修复

### 定义
当且仅当：

- indicator_groups_json diff != 0
- 或 indicator_columns变化

则：

structuralChange = true

---

## TASK 12：XXL-JOB cron同步验证

### 要求
- cron_expression == xxl-job cron_conf
- 手动改数据库必须同步失败（防止漂移）

---

# 四、验收标准

## 1. DAILY
cron 每天触发

## 2. MONTHLY
cron 每月触发

## 3. YEARLY
cron 每年触发

---

## 4. 链路验证

indicator_groups_json change →
schedule_rules rebuild →
task_groups rebuild →
fetch_tasks rebuild →
xxl-job sync success

---

# 五、最终目标状态

系统变为：

- CRON表达业务频率
- schedule_rules 驱动调度
- task_groups 表达执行状态
- fetch_tasks 表达执行粒度
- xxl-job 仅负责触发
