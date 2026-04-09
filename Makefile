PROJECT_NAME = server-package
VERSION = 1.0
PACKAGE = $(PROJECT_NAME)-$(VERSION).zip
STAGE_DIR = $(PROJECT_NAME)

all: package

build:
	mvn -q -DskipTests package

package: build
	powershell -NoProfile -Command "\
	Remove-Item '$(STAGE_DIR)' -Recurse -Force -ErrorAction SilentlyContinue; \
	New-Item -ItemType Directory -Path '$(STAGE_DIR)' | Out-Null; \
	Copy-Item data-foundry-backend-service\\target\\*.jar -Destination '$(STAGE_DIR)' -ErrorAction SilentlyContinue; \
	Copy-Item data-foundry-scheduler-service\\target\\*.jar -Destination '$(STAGE_DIR)' -ErrorAction SilentlyContinue; \
	Copy-Item data-foundry-agent-service\\target\\*.jar -Destination '$(STAGE_DIR)' -ErrorAction SilentlyContinue; \
	Copy-Item db\\mysql -Destination '$(STAGE_DIR)\\db\\mysql' -Recurse; \
	Copy-Item docs\\java-refactor-quickstart.md -Destination '$(STAGE_DIR)' -ErrorAction SilentlyContinue; \
	Copy-Item README.md -Destination '$(STAGE_DIR)' -ErrorAction SilentlyContinue; \
	Get-ChildItem '$(STAGE_DIR)' -Recurse -File -Force | \
	Where-Object { \
		$$_.Name -like '*.log' -or \
		$$_.Name -like '*.err.log' -or \
		$$_.Name -like '*.sqlite3' -or \
		$$_.Name -like '*.journal' -or \
		$$_.Name -eq '.DS_Store' \
	} | Remove-Item -Force; \
	if (Test-Path '$(PACKAGE)') { Remove-Item '$(PACKAGE)' -Force }; \
	Compress-Archive -Path '$(STAGE_DIR)' -DestinationPath '$(PACKAGE)' -Force"

clean:
	powershell -NoProfile -Command "\
	if (Test-Path '$(PACKAGE)') { Remove-Item '$(PACKAGE)' -Force }; \
	if (Test-Path '$(STAGE_DIR)') { Remove-Item '$(STAGE_DIR)' -Recurse -Force }"

rebuild: clean package

.PHONY: all build package clean rebuild
