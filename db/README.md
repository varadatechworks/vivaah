# Database migrations

Apply migrations in lexical order using a PostgreSQL database dedicated to the environment:

1. `db/migrations/0001_core.sql`
2. `db/migrations/0002_identity_consent_hardening.sql`
3. `db/migrations/0003_contact_verification_discovery.sql`
4. `db/migrations/0004_member_safety.sql`

Example:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0001_core.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0002_identity_consent_hardening.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0003_contact_verification_discovery.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0004_member_safety.sql
```

Run the migration regression script against a disposable database after migrations 0001 and 0002 (it remains compatible after 0003):

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/0002_identity_consent_hardening.sql
```

The test script rolls back its test data. Do not point it at production.

Before applying migration 0002 to an existing environment, check for case-insensitive duplicate email addresses:

```sql
SELECT lower(email) AS normalized_email, count(*)
FROM app_user
GROUP BY lower(email)
HAVING count(*) > 1;
```

Resolve duplicates through an audited account-recovery process before creating the unique index. Do not automatically merge identities.

Migration 0002 preserves historical Social Connect grants and allows a new grant after withdrawal. A single active grant per user/category/purpose is enforced by a partial unique index.

A migration file being committed does not mean it has been applied. Track applied versions in the deployment's migration runner and verify each environment independently.
