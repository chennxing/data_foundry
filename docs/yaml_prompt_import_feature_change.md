# YAML 提示词导入功能变更说明

## 背景

采集提示词管理页面原来只能手工编辑指标组提示词。对于已经沉淀为 YAML 模板的采集提示词，用户需要手动复制 `query`、`background` 并组装采集接口入参，容易漏字段或填错公共参数。

本次新增 YAML 文件导入能力，用于把 YAML 模板自动转换为采集接口标准 JSON 入参，并回填到当前指标组提示词草稿。

## 功能变化

1. 采集提示词管理的每个指标组卡片新增 `导入 YAML` 按钮。
2. 支持上传 `.yaml` / `.yml` 文件，单个文件大小限制为 1MB。
3. 后端解析 YAML 顶层字段：
   - `query`
   - `background`
4. `query` 和 `background` 为必填字段，缺失或为空时接口返回失败。
5. 系统自动补齐采集接口公共字段：
   - `user_id`: `"021954"`
   - `max_iterations`: `2`
   - `require_schema_approval`: `false`
6. 如果 YAML 文件中包含上述公共字段，系统仍使用固定值覆盖。
7. 导入成功后，前端将标准 JSON 格式化后写入当前指标组的提示词草稿；用户确认内容后仍需点击 `保存提示词`。

## 转换结果

YAML 示例：

```yaml
query: |
  请作为自动驾驶行业资深分析师...

background: |
  domain_meta:
    industry_name: "Autonomous_Driving_Metrics_Long_Format"
```

转换后的标准 JSON：

```json
{
  "query": "请作为自动驾驶行业资深分析师...",
  "background": "domain_meta:\n  industry_name: \"Autonomous_Driving_Metrics_Long_Format\"",
  "user_id": "021954",
  "max_iterations": 2,
  "require_schema_approval": false
}
```

## 接口变化

新增接口：

```http
POST /api/prompt-templates/parse-yaml
Content-Type: multipart/form-data
```

请求参数：

```text
file: YAML 文件
```

成功响应：

```json
{
  "success": true,
  "data": {
    "query": "...",
    "background": "...",
    "user_id": "021954",
    "max_iterations": 2,
    "require_schema_approval": false
  }
}
```

失败响应使用 HTTP 400，并在响应错误信息中返回具体原因。

## 存储与执行链路

本次不新增数据库表和字段，继续复用现有提示词保存链路：

1. 前端导入 YAML 后生成标准 JSON 字符串。
2. 用户点击 `保存提示词`。
3. 前端通过既有宽表更新接口保存到 `wide_tables.indicator_groups_json` 中的 `prompt_template`。
4. 生成采集任务时，后端将 `prompt_template` 渲染为 `fetch_tasks.rendered_prompt_text`。
5. 调度执行时，Scheduler 读取 `rendered_prompt_text` 并下发给 Agent/采集链路。

## 变更文件

- 后端解析服务：`data-foundry-backend-service/src/main/java/com/huatai/datafoundry/backend/requirement/application/service/PromptYamlParseService.java`
- 后端响应 DTO：`data-foundry-backend-service/src/main/java/com/huatai/datafoundry/backend/requirement/application/service/dto/CollectionPromptPayload.java`
- 后端接口：`data-foundry-backend-service/src/main/java/com/huatai/datafoundry/backend/requirement/interfaces/web/PromptTemplateFacadeController.java`
- 前端 API：`data-foundry-frontend/lib/api-client.ts`
- 前端提示词 hook：`data-foundry-frontend/components/requirement-tasks/hooks/usePromptEditor.ts`
- 前端提示词卡片：`data-foundry-frontend/components/requirement-tasks/prompts/PromptEditorCard.tsx`
- 前端提示词 Tab：`data-foundry-frontend/components/requirement-tasks/prompts/PromptManagementTab.tsx`
- 前端任务面板：`data-foundry-frontend/components/RequirementTasksPanel.tsx`
