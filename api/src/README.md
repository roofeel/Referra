# `src` Folder Overview

This file briefly explains the purpose of each folder in `api/src`.

## Folder Purposes

- `controllers/`: HTTP request handlers that coordinate input/output for each API domain.
- `http/`: Server and app bootstrap layer (app initialization and HTTP wiring).
- `lib/`: Shared low-level utilities and common helpers used across the API.
- `middlewares/`: Reusable middleware for cross-cutting concerns (validation, auth, errors, etc.).
- `routes/`: Route definitions that map endpoints to controllers.
- `services/`: Business logic and data-access orchestration behind controllers.
