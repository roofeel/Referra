Don't write markdown documentation unless explicitly asked.

Code Structure

Web Frontend (web/src/)
web/src/
├── assets/       Static assets (images, fonts, etc.)
├── pages/        Page components (public pages + admin dashboard pages)
├── components/   UI components
│   ├── layout/   Page layout (Header, Footer)
│   └── admin/    Admin dashboard specific components
├── routes/       Route configuration and loaders (including admin authentication)
├── hooks/        Custom hooks
├── types/        Global TypeScript type definitions
└── config/       Configuration (API endpoints, etc.)


API Backend (api/src/)
api/src/
├── controllers/  HTTP request handlers that coordinate input/output for each API domain.
├── lib/          Shared low-level utilities and common helpers used across the API.
├── middlewares/  Reusable middleware for cross-cutting concerns (validation, auth, errors, etc.).
├── routes/       Route definitions that map endpoints to controllers.
└── services/     Business logic and data-access orchestration behind controllers.

Packages (packages/)
packages/
├── db/           Database package for schema management, migrations, client generation, and seed workflows.
├── shared/       Shared package space for cross-package utilities/types