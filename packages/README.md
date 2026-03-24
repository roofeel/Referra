# `packages` Folder Overview

This document briefly describes the purpose of each folder in `packages`.

## Folder Purposes

- `db/`: Database package for schema management, migrations, client generation, and seed workflows.
- `db/generated/`: Auto-generated database client/runtime artifacts.
- `db/generated/prisma/`: Prisma-generated code and internal model/runtime outputs.
- `db/prisma/`: Prisma source assets (schema and migration history).
- `db/prisma/migrations/`: Versioned database migration directories.
- `db/src/`: Handwritten database-layer source code (client setup, models, SQL/seed helpers).
- `db/node_modules/`: Installed dependencies for the `db` package.
- `shared/`: Shared package space for cross-package utilities/types (currently minimal/reserved).
