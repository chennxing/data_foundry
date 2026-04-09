# MySQL split schemas (backend vs scheduler)

This folder contains initial DDL scripts for the refactor target state:

- `backend` DB (`data_foundry_backend`): business master data and wide-table results
- `scheduler` DB (`data_foundry_scheduler`): scheduling/runtime data (jobs, execution history, tasks)

They are intentionally separated to enforce data isolation between backend-service and scheduler-service.

