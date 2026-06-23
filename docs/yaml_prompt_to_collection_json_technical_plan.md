# 采集提示词 YAML 自动解析与标准 JSON 入参转换技术方案

---

## 一、需求背景

当前采集接口的标准入参格式如下：

```json
{
  "query": "...",
  "background": "...",
  "user_id": "021954",
  "max_iterations": 2,
  "require_schema_approval": false
}
```

现在平台需要新增能力：上传采集提示词 YAML 文件后，自动识别 YAML 文件中的 `query` 和 `background` 字段，并转换为采集接口需要的标准 JSON 入参格式。

该功能主要用于降低人工复制提示词和手动组装接口入参的成本，使采集提示词模板能够被平台统一管理、解析、预览、存储和执行。

---

## 二、目标能力

新增功能需要实现以下目标：

1. 支持上传 `.yaml` 或 `.yml` 格式的采集提示词文件。
2. 自动解析 YAML 顶层字段中的 `query` 和 `background`。
3. 校验 `query` 和 `background` 是否存在且非空。
4. 自动补齐采集接口标准入参中的公共字段：
   - `user_id`
   - `max_iterations`
   - `require_schema_approval`
5. 将解析结果转换为采集接口标准 JSON。
6. 前端支持解析结果预览。
7. 支持将解析后的 query/background 保存为提示词模板。
8. 后续生成采集任务实例时，可将 query/background 写入任务快照，用于实际采集调用。

---

## 三、整体处理链路

建议新增的完整处理链路如下：

```text
前端上传 YAML 文件
  -> 后端接收 MultipartFile
  -> 后端解析 YAML
  -> 提取 query/background
  -> 校验字段合法性
  -> 标准化文本格式
  -> 组装采集接口标准 JSON
  -> 前端预览
  -> 用户确认保存
  -> 写入提示词模板
  -> 生成 fetch_tasks 时写入提示词快照
  -> 调用采集接口
```

---

## 四、输入 YAML 格式

YAML 文件中应至少包含两个顶层字段：

```yaml
query: |
  请作为自动驾驶行业资深分析师，基于最新可验证的公开信息...

background: |
  domain_meta:
    industry_name: SmartDriveTech
    description: 新能源/自动驾驶企业智能驾驶算法路线与算力基础设施采集
```

其中：

- `query` 表示采集主提示词。
- `background` 表示背景信息、输出约束、指标库、搜索逻辑模板等。

---

## 五、输出 JSON 格式

解析后的标准 JSON 格式如下：

```json
{
  "query": "请作为自动驾驶行业资深分析师，基于最新可验证的公开信息...",
  "background": "domain_meta:\n industry_name: SmartDriveTech\n description: 新能源/自动驾驶企业智能驾驶算法路线与算力基础设施采集",
  "user_id": "021954",
  "max_iterations": 2,
  "require_schema_approval": false
}
```

---

## 六、字段映射规则

| YAML字段 | JSON字段 | 是否必填 | 说明 |
|---|---|---|---|
| `query` | `query` | 是 | 采集主提示词 |
| `background` | `background` | 是 | 背景约束、指标库、搜索逻辑 |
| 无 | `user_id` | 是 | 从当前登录用户或默认配置获取 |
| 无 | `max_iterations` | 否 | 默认值为 2 |
| 无 | `require_schema_approval` | 否 | 默认值为 false |

---

## 七、后端接口设计

### 1. 新增 YAML 解析接口

建议在 backend-service 新增接口：

```http
POST /api/prompt-templates/parse-yaml
Content-Type: multipart/form-data
```

请求参数：

```text
file: autonomous_driving_metrics_简版.yaml
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

失败响应：

```json
{
  "success": false,
  "message": "YAML文件缺少必填字段 query/background"
}
```

---

## 八、后端解析实现方案

### 1. YAML 解析库

建议使用 SnakeYAML。

如果项目中尚未引入，可以增加依赖：

```xml
<dependency>
  <groupId>org.yaml</groupId>
  <artifactId>snakeyaml</artifactId>
  <version>2.2</version>
</dependency>
```

如果 Spring Boot 已经间接引入 SnakeYAML，可以优先复用已有依赖。

---

### 2. DTO 设计

#### PromptYamlParseResponse

```java
public class PromptYamlParseResponse {
    private String query;
    private String background;
    private String userId;
    private Integer maxIterations;
    private Boolean requireSchemaApproval;
}
```

#### CollectionRequestPayload

```java
public class CollectionRequestPayload {

    private String query;

    private String background;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("max_iterations")
    private Integer maxIterations;

    @JsonProperty("require_schema_approval")
    private Boolean requireSchemaApproval;
}
```

注意：采集接口要求字段名为下划线格式，因此 DTO 中需要使用 `@JsonProperty` 保证序列化结果为：

```json
{
  "user_id": "...",
  "max_iterations": 2,
  "require_schema_approval": false
}
```

---

### 3. YAML 解析服务

建议新增服务：

```java
@Service
public class PromptYamlParseService {

    public CollectionRequestPayload parse(MultipartFile file, String userId) {
        // 1. 校验文件类型
        // 2. 校验文件大小
        // 3. 使用 SafeConstructor 解析 YAML
        // 4. 提取 query/background
        // 5. 校验非空
        // 6. 组装标准采集接口入参
    }
}
```

核心逻辑示例：

```java
LoaderOptions options = new LoaderOptions();
Yaml yaml = new Yaml(new SafeConstructor(options));

Map<String, Object> yamlMap = yaml.load(file.getInputStream());

String query = Objects.toString(yamlMap.get("query"), "").trim();
String background = Objects.toString(yamlMap.get("background"), "").trim();

if (query.isEmpty()) {
    throw new IllegalArgumentException("YAML文件缺少必填字段 query");
}

if (background.isEmpty()) {
    throw new IllegalArgumentException("YAML文件缺少必填字段 background");
}

CollectionRequestPayload payload = new CollectionRequestPayload();
payload.setQuery(query);
payload.setBackground(background);
payload.setUserId(userId);
payload.setMaxIterations(2);
payload.setRequireSchemaApproval(false);

return payload;
```

---

## 九、前端功能设计

### 1. 新增上传入口

建议在“采集提示词管理”页面新增按钮：

```text
上传 YAML 模板
```

交互流程：

```text
点击上传
  -> 选择 .yaml / .yml 文件
  -> 调用 /api/prompt-templates/parse-yaml
  -> 展示解析结果
  -> 用户确认
  -> 保存为提示词模板或绑定当前需求
```

---

### 2. 前端校验

上传前进行基础校验：

1. 文件后缀必须是 `.yaml` 或 `.yml`。
2. 文件大小限制，例如不超过 1MB。
3. 单次只允许上传一个文件。
4. 上传失败时展示明确错误信息。

---

### 3. 解析结果预览

解析成功后，前端展示：

```text
query 预览
background 预览
标准 JSON 预览
```

标准 JSON 预览示例：

```json
{
  "query": "...",
  "background": "...",
  "user_id": "021954",
  "max_iterations": 2,
  "require_schema_approval": false
}
```

---

## 十、存储设计建议

### 1. 建议保存的内容

建议同时保存以下内容，便于后续追溯和执行：

| 字段 | 说明 |
|---|---|
| `raw_yaml_text` | 原始 YAML 文件内容 |
| `query_text` | 解析后的 query |
| `background_text` | 解析后的 background |
| `collection_request_json` | 采集接口标准 JSON 入参 |

---

### 2. 表结构建议

如果已有提示词模板表，可以增加字段：

```sql
ALTER TABLE prompt_templates
ADD COLUMN raw_yaml_text LONGTEXT NULL COMMENT '原始YAML内容',
ADD COLUMN query_text LONGTEXT NULL COMMENT '从YAML解析出的query',
ADD COLUMN background_text LONGTEXT NULL COMMENT '从YAML解析出的background',
ADD COLUMN collection_request_json JSON NULL COMMENT '采集接口标准入参JSON';
```

如果当前系统使用 `fetch_tasks` 存储提示词快照，也可以在生成任务实例时写入：

```text
fetch_tasks.rendered_prompt_text
fetch_tasks.prompt_template_snapshot
```

---

## 十一、与现有任务生成链路集成

当前平台任务生成链路大致为：

```text
需求配置
  -> 指标组
  -> 提示词模板
  -> 生成 task_groups
  -> 生成 fetch_tasks
```

新增 YAML 功能后，建议集成方式为：

```text
上传 YAML 模板
  -> 解析 query/background
  -> 保存为 PromptTemplate
  -> 生成 fetch_tasks 时引用该模板
  -> fetch_tasks 中写入 rendered_prompt_text / prompt_template_snapshot
```

这样可以保证后续任务执行时使用的是生成任务当时的提示词快照，避免模板后续被修改导致历史任务不可追溯。

---

## 十二、占位符替换设计

YAML 中可能存在占位符，例如：

```text
{ROBOTYPE}
{COMCODE}
{OPERATOR}
{comname}
{comcode}
```

需要支持在生成任务实例或执行采集前替换。

---

### 1. 占位符映射关系

| 占位符 | 数据来源 |
|---|---|
| `{ROBOTYPE}` | 业态类别 |
| `{COMCODE}` | 公司代码 |
| `{OPERATOR}` | 公司名称 |
| `{comcode}` | 公司代码 |
| `{comname}` | 公司名称 |

---

### 2. 建议新增 PlaceholderRenderer

```java
public class PlaceholderRenderer {

    public String render(String text, Map<String, String> variables) {
        // 替换 {COMCODE}, {comcode}, {OPERATOR}, {comname}
    }
}
```

---

### 3. 替换时机

推荐在以下时机之一进行替换：

#### 方案 A：生成 fetch_tasks 时替换

优点：

- 任务快照中保存的是最终可执行提示词
- 执行时逻辑简单

缺点：

- 如果任务维度后续变化，需要重建任务实例

#### 方案 B：执行采集前替换

优点：

- 更灵活
- 可以使用最新维度数据

缺点：

- 执行链路复杂度更高
- 调试时需要额外查看渲染结果

建议第一版采用方案 A。

---

## 十三、校验规则

### 1. 必填字段校验

必须满足：

```text
query 非空
background 非空
```

---

### 2. YAML 格式校验

需要处理以下异常：

- YAML 语法错误
- 文件为空
- `query` 字段不存在
- `background` 字段不存在
- `query` 不是字符串
- `background` 不是字符串

返回明确错误：

```text
YAML解析失败，请检查文件格式
```

---

### 3. 标准 JSON 校验

最终 JSON 需要满足：

```text
query: 非空字符串
background: 非空字符串
user_id: 非空
max_iterations: 正整数
require_schema_approval: boolean
```

---

## 十四、安全与稳定性

### 1. 文件大小限制

建议限制：

```text
<= 1MB
```

避免上传过大 YAML 文件导致内存压力或接口超时。

---

### 2. 使用安全 YAML 解析器

SnakeYAML 应使用安全构造器，避免反序列化风险：

```java
LoaderOptions options = new LoaderOptions();
Yaml yaml = new Yaml(new SafeConstructor(options));
```

---

### 3. 日志脱敏

不要在日志中完整打印 query/background。

建议只记录：

```text
fileName
queryLength
backgroundLength
parseStatus
```

---

## 十五、采集接口调用方式

最终调用采集接口时，请求体为：

```json
{
  "query": "<解析并渲染后的query>",
  "background": "<解析并渲染后的background>",
  "user_id": "021954",
  "max_iterations": 2,
  "require_schema_approval": false
}
```

如果 query/background 中含有换行，JSON 序列化时会自动转换为 `\\n`，不需要手动拼接转义。

---

## 十六、验收标准

### 1. YAML 上传解析

上传附件 YAML 后，后端能正确解析出：

```text
query
background
```

### 2. 标准 JSON 生成

接口返回 JSON 中包含：

```text
query
background
user_id
max_iterations
require_schema_approval
```

### 3. 前端展示正常

前端可以展示：

```text
query预览
background预览
标准JSON预览
```

### 4. 任务生成正常

使用该 YAML 模板生成采集任务后：

```text
fetch_tasks 中能看到对应提示词快照
```

### 5. 采集调用正常

执行采集任务时，请求体格式与采集接口要求一致。

---

## 十七、推荐分阶段实施

### 阶段一：YAML 解析接口

完成：

```text
上传 YAML
解析 query/background
返回标准 JSON
```

### 阶段二：前端上传与预览

完成：

```text
采集提示词管理页面上传 YAML
展示解析结果
确认保存
```

### 阶段三：模板存储

完成：

```text
保存 raw_yaml_text
保存 query_text
保存 background_text
保存 collection_request_json
```

### 阶段四：任务生成集成

完成：

```text
生成 fetch_tasks 时绑定 YAML 模板
写入提示词快照
```

### 阶段五：采集执行集成

完成：

```text
执行 fetch_task 时渲染占位符
组装标准 JSON
调用采集接口
```

---

## 十八、给 Codex 的执行指令

可以给 Codex 使用如下指令：

```text
请为平台新增“采集提示词 YAML 解析”功能。

需求：
1. 在 backend-service 新增接口 POST /api/prompt-templates/parse-yaml，接收 multipart/form-data 的 yaml/yml 文件。
2. 使用 SnakeYAML 安全解析 YAML 文件，仅提取顶层 query 和 background 字段。
3. query 和 background 必须为非空字符串，否则返回明确错误。
4. 将 query/background 转换为采集接口标准 JSON：
   {
     "query": "...",
     "background": "...",
     "user_id": 当前用户ID或默认021954,
     "max_iterations": 2,
     "require_schema_approval": false
   }
5. 增加 DTO，字段序列化必须使用下划线格式 user_id、max_iterations、require_schema_approval。
6. 限制上传文件类型为 .yaml/.yml，文件大小不超过 1MB。
7. 不要在日志中打印完整 query/background，只记录长度和解析结果。
8. 在前端采集提示词管理页面新增“上传YAML模板”按钮。
9. 上传成功后展示 query、background 和标准JSON预览。
10. 用户确认后，将 raw_yaml_text、query_text、background_text、collection_request_json 保存到提示词模板中。
11. 后续生成 fetch_tasks 时，将解析后的 query/background 快照写入任务实例，供采集执行调用。
12. 增加单元测试覆盖：正常 YAML、缺少 query、缺少 background、YAML格式错误、query/background为空。
```

---

## 十九、最终结论

该功能本质上是增加一个“YAML 提示词模板 → 采集接口标准 JSON”的转换层。

建议以 `query/background` 为核心字段，以标准采集请求 JSON 为统一输出格式，并将解析结果沉淀到提示词模板和任务实例快照中，保证后续任务生成、调度执行和采集接口调用都使用统一格式。
