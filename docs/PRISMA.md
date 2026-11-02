[← Project overview](../README.md) · [All documentation](../README.md#documentation)

# Database workflow

Taskflow uses Prisma ORM 7.10 with PostgreSQL, a single initial migration, and no legacy migration ledger.

- prisma/schema.prisma: models and relations.
- prisma/migrations/20261103000000_init/migration.sql: fresh schema, indexes, CHECK constraints and the project/team foreign key.
- prisma7.config.ts: CLI schema, database URL and seed entry.
- scripts/seed.js: repeatable Prisma createMany batches with skipDuplicates.

## Start a new database

Set backend/.env, then run from the root:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:status
```

## Change the schema

Edit schema.prisma, create a development migration using db:dev -- --name descriptive_name, review the SQL, regenerate the client and run tests. Development migrations require a shadow database or permission to create one. Keep custom CHECK constraints, partial indexes and the deferrable team foreign key in migration SQL. Deploy committed migrations with db:migrate.

The application uses Prisma model methods everywhere except analytics. Schema DDL and isolated-test fixture initialization are SQL by necessity; neither is application CRUD. UTC is the application/database-session timezone for date-only rules.
