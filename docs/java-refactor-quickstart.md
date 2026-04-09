# Java 重构工程骨架（当前落地）

本仓库已新增 Maven 多模块与 3 个 Spring Boot 服务工程，用于承接“后端服务/调度服务/采数 Agent 服务”的 Java 迁移；前端保持不变，仍通过 Next.js 的 `/api/*` 代理转发到后端基址。

## 目录

- `data-foundry-backend-service/`：后端服务（端口 `8000`，MySQL：`data_foundry_backend`）
- `data-foundry-scheduler-service/`：调度服务（端口 `8200`，MySQL：`data_foundry_scheduler`）
- `data-foundry-agent-service/`：采数 Agent 服务（端口 `8100`，无状态，无库）
- `data-foundry-common-contract/`：公共契约（DTO/接口契约类，非部署）

## MySQL 建表脚本

- `db/mysql/backend/001_schema.sql`
- `db/mysql/scheduler/001_schema.sql`

## 前端联调

前端已有 `/api/*` 代理路由与环境变量：

- `data-foundry-frontend/.env.local`
  - `BACKEND_API_BASE=http://127.0.0.1:8000`

因此浏览器访问前端时，页面请求的 `/api/...` 会由 Next.js 转发到后端服务。

## 说明

当前 Java 服务提供的是“可启动/可联调的骨架”和少量占位接口；业务域完整迁移（宽表、任务、执行、回填等）会在后续迭代中逐步补齐。

