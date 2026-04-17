# 前端操作 ⇄ 后端接口缺口/占位对照清单（两列）

> 生成时间：2026-04-16（Asia/Shanghai）  
> 目的：把“前端可见操作/按钮”与“后端接口实现状态（缺失/占位/已实现）”一一对齐，便于确定补齐优先级。  
> 说明：此清单基于当前代码扫描（`data-foundry-frontend/*` 与 `data-foundry-*-service/*Controller.java`）。

---

## 1) 项目/需求管理（Projects / Requirements）

| 前端操作（页面/按钮/行为） | 对应后端接口与现状 |
|---|---|
| 项目概览加载项目列表（`/projects`） | `GET /api/projects` ✅（`data-foundry-backend-service/.../ProjectController.java`） |
| 进入项目详情加载：项目 + 需求 + 任务组 + 任务（`/projects/[id]`） | `GET /api/projects/{projectId}` ✅；`GET /api/projects/{projectId}/requirements` ✅；`GET /api/projects/{projectId}/requirements/{requirementId}/task-groups` ✅；`GET /api/projects/{projectId}/requirements/{requirementId}/tasks` ✅ |
| 新建项目（前端已实现 `createProject`，若页面接入则会触发） | `POST /api/projects` ❌（后端未实现；前端函数在 `data-foundry-frontend/lib/api-client.ts`） |
| 编辑/更新项目（前端已实现 `updateProject`，若页面接入则会触发） | `PUT /api/projects/{projectId}` ❌（后端未实现；前端函数在 `data-foundry-frontend/lib/api-client.ts`） |
| 需求清单页加载（`/requirements`） | 同项目概览：`GET /api/projects` ✅ + `GET /api/projects/{projectId}/requirements` ✅ |
| 需求详情页自动保存需求基本信息（在需求详情页编辑 title/status/owner/assignee 等） | `PUT /api/projects/{projectId}/requirements/{requirementId}` ✅（`RequirementController.java`） |

---

## 2) 宽表定义 / 计划预览 / 计划落地（Requirement Definition / Plan）

| 前端操作（页面/按钮/行为） | 对应后端接口与现状 |
|---|---|
| 更新宽表定义（schema/scope/指标组/调度规则等）（需求详情页-定义区） | `PUT /api/requirements/{requirementId}/wide-tables/{wideTableId}` ✅（`RequirementWideTableController.java`） |
| “预览计划/保存预览”（需求详情页-任务区，调用 `persistWideTablePreview`） | `POST /api/requirements/{requirementId}/wide-tables/{wideTableId}/preview` 🟡（占位：接受 payload 但不落宽表行，仅返回 ok；`WideTablePlanController.java`） |
| “计划落地/保存计划”（需求详情页-任务区，调用 `persistWideTablePlan`） | `POST /api/requirements/{requirementId}/wide-tables/{wideTableId}/plan` 🟡（部分实现：主要 upsert `task_groups`；未落 `rows/batches/fetch_tasks` 全链路；`WideTablePlanController.java`） |
| 页面展示宽表行预览/产出（需求详情页任务/验收/数据管理等） | `GET /api/wide-tables/{wideTableId}/rows` ❌（后端未实现；前端函数 `fetchWideTableRows`） |
| 按需求维度加载宽表行（需求详情页可能用到） | `GET /api/projects/{projectId}/requirements/{requirementId}/rows` ❌（后端未实现；前端函数 `fetchRequirementRows`） |
| 直接更新宽表某行指标值/系统字段（验收页“修订/保存”） | `PUT /api/wide-tables/{wideTableId}/rows/{rowId}` ❌（后端未实现；前端函数 `updateWideTableRow`） |
| 获取采集批次列表（页面存在 `fetchCollectionBatches`） | `GET /api/requirements/{requirementId}/wide-tables/{wideTableId}/collection-batches` ❌（后端未实现） |
| 生成任务组（页面存在 `generateTaskGroups`） | `POST /api/requirements/{requirementId}/task-groups/generate` ❌（后端未实现） |
| 试运行（页面存在 `createTrialRun`，用于小样本验证） | `POST /api/requirements/{requirementId}/trial-run` ❌（后端未实现） |

---

## 3) 采集任务管理（TaskGroups / FetchTasks / Execute）

| 前端操作（页面/按钮/行为） | 对应后端接口与现状 |
|---|---|
| 列表查看任务组（`/collection-tasks`、需求详情任务 tab） | `GET /api/projects/{projectId}/requirements/{requirementId}/task-groups` ✅（`RequirementTaskController.java`） |
| 列表查看采集任务（FetchTask）（`/collection-tasks`、需求详情任务 tab） | `GET /api/projects/{projectId}/requirements/{requirementId}/tasks` ✅（`RequirementTaskController.java`） |
| 展开任务组时“生成采集任务（ensure）”（`/collection-tasks` 调 `ensureTaskGroupTasks`） | `POST /api/task-groups/{taskGroupId}/ensure-tasks` ✅（会 lazy 生成 `fetch_tasks`，`TaskExecutionController.java`） |
| 执行任务组（需求详情任务 tab/collection tasks 可能触发） | `POST /api/task-groups/{taskGroupId}/execute` 🟡（占位：仅将 task_group 状态 running->completed；不走 scheduler/agent；`TaskExecutionController.java`） |
| 执行单任务 | `POST /api/tasks/{taskId}/execute` 🟡（占位：仅更新任务状态；`TaskExecutionController.java`） |
| 重试单任务 | `POST /api/tasks/{taskId}/retry` 🟡（占位：仅置回 pending；`TaskExecutionController.java`） |
| 查看任务详情页中的“执行记录”区块 | `GET /api/tasks/{taskId}/runs` ❌（后端未实现；前端函数 `fetchExecutionRecords`，任务详情页会显示“当前任务还没有执行记录”） |
| 查看任务详情页中的“窄表数据”区块 | 依赖 rows + retrieval/execution 数据；当前 `GET /api/wide-tables/{wideTableId}/rows` 也缺失 | ❌（后端缺失 rows/runs 等关键查询，窄表展示多为空或依赖前端演示） |

---

## 4) 调度（Scheduling）

| 前端操作（页面/按钮/行为） | 对应后端接口与现状 |
|---|---|
| 调度页加载调度执行记录（`/scheduling` 调 `fetchScheduleJobs`） | backend：`GET /api/schedule-jobs` ✅（`ScheduleJobFacadeController.java` 转发 scheduler） |
| 调度页“手动触发/重新触发”（调用 `createScheduleJob`） | backend：`POST /api/schedule-jobs` ✅（转发 scheduler）；scheduler：`POST /api/schedule-jobs` 🟡（skeleton：创建后立即 completed，不会触发真实执行） |
| 调度服务 admin seed/reset（演示数据） | scheduler：`POST /api/admin/seed` ✅；`POST /api/admin/reset` ✅（但属于演示用途） |

---

## 5) 验收（Acceptance）

| 前端操作（页面/按钮/行为） | 对应后端接口与现状 |
|---|---|
| 验收列表加载工单（`/acceptance` 调 `fetchAcceptanceTickets`） | `GET /api/acceptance-tickets` 🟡（占位：空数组；`PlatformStubController.java`） |
| 在验收面板发起“通过/驳回/修订”并持久化（`RequirementAcceptancePanel`） | `POST /api/acceptance-tickets` ❌；`PUT /api/acceptance-tickets/{ticketId}` ❌；`PUT /api/wide-tables/{wideTableId}/rows/{rowId}` ❌（后端均未实现） |

---

## 6) 运维监控 / 平台配置（Ops / Governance）

| 前端操作（页面/按钮/行为） | 对应后端接口与现状 |
|---|---|
| 监控页加载环境概览 | `GET /api/ops/overview` 🟡（占位：空数组；`PlatformStubController.java`） |
| 监控页加载任务状态统计 | `GET /api/ops/task-status-counts` 🟡（占位：空数组；`PlatformStubController.java`） |
| 监控页加载数据状态统计 | `GET /api/ops/data-status-counts` 🟡（占位：空数组；`PlatformStubController.java`） |
| 仪表盘指标 | `GET /api/dashboard/metrics` 🟡（部分占位：task_groups/fetch_tasks 等写死 0；`PlatformStubController.java`） |
| 知识库页面加载 | `GET /api/knowledge-bases` 🟡（占位：空数组；`PlatformStubController.java`） |
| 后处理规则/稽核规则页面加载 | `GET /api/preprocess-rules` 🟡（占位）；`GET /api/audit-rules` 🟡（占位） |

---

## 7) 管理/初始化（Admin）

| 前端操作（页面/按钮/行为） | 对应后端接口与现状 |
|---|---|
| “初始化/注入演示数据”（前端调用 `resetDemoData`/`resetAllData`） | `POST /api/admin/seed` ✅（会写入 demo 项目/需求；`PlatformStubController.java` 调 `DemoDataService.seed()`） |
| “清空演示数据” | `POST /api/admin/reset` ✅（`PlatformStubController.java` 调 `DemoDataService.reset()`） |

---

## 8) 结论：当前“预留/未实现”集中在哪里

1) **宽表行与回填**：`GET /api/wide-tables/{id}/rows`、`PUT /api/wide-tables/{id}/rows/{rowId}`、按需求 rows 等均缺失 → 直接影响“数据管理/验收/产出展示/窄表展示”。  
2) **执行记录与检索产物**：`GET /api/tasks/{taskId}/runs` 缺失 → 任务详情页“执行记录”只能显示空。  
3) **调度/执行闭环**：scheduler `POST /api/schedule-jobs` 为 skeleton；backend 执行接口为 placeholder → 不会触发真实任务执行/回填。  
4) **验收工单**：`POST/PUT /api/acceptance-tickets` 缺失，读取接口 stub → 验收状态无法持久化。  
5) **批次/补采/试运行**：collection-batches/backfill/trial-run/generate task-groups 等接口缺失。

