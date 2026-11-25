import { Pool, type PoolClient } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var vivaahPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const configuredMax = Number(process.env.DB_POOL_MAX ?? 5);
  return new Pool({
    connectionString,
    max: Number.isInteger(configuredMax) && configuredMax > 0 ? Math.min(configuredMax, 20) : 5,
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

export async function query<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const result = await db().query(text, values as never[]);
  return { rows: result.rows as T[], rowCount: result.rowCount };
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
