import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var vivaahPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: true },
    application_name: "vivaah-web",
  });
}

export function db(): Pool {
  if (!globalThis.vivaahPgPool) globalThis.vivaahPgPool = createPool();
  return globalThis.vivaahPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return db().query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
