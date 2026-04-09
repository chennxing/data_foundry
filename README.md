# Data Foundry

Data Foundry 是一个面向“非结构化信息 -> 结构化数据”的数据生产平台原型仓库。

- 详细说明与体验路径：`docs/README.md`
- 前端原型（Next.js）：`data-foundry-frontend/`
- 后端服务（Spring Boot + MyBatis, MySQL）：`data-foundry-backend-service/`
- 调度服务（Spring Boot + MyBatis, MySQL）：`data-foundry-scheduler-service/`
- 采数 Agent 服务（Spring Boot, 无状态）：`data-foundry-agent-service/`
- 公共契约（非部署）：`data-foundry-common-contract/`

## 快速开始（前端）

```bash
cd data-foundry-frontend
npm install
npm run dev
```

默认访问：http://localhost:3000

## 快速开始（后端/调度/Agent）

需要本机安装 Java 8 与 Maven，然后执行：

- `start-backend.cmd`（端口 8000）
- `start-scheduler.cmd`（端口 8200）
- `start-agent.cmd`（端口 8100）
