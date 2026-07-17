/** The result of a query: the rows it matched, typed by the caller. */
export interface QueryResult<Row> {
  rows: Row[];
}

/** A minimal query seam the repositories share, so tests can substitute a stub. */
export interface DbClient {
  query<Row>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
}

let client: DbClient | null = null;

/** Install the database client the repositories will use. */
export function configureClient(next: DbClient): void {
  client = next;
}

/**
 * Return the configured database client, throwing when one was never installed.
 */
export function getClient(): DbClient {
  if (client === null) {
    throw new Error("database client not configured — call configureClient first");
  }
  return client;
}
