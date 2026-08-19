import type { GatewayClient, PersonalQuery, PersonalTable, QueryResult } from "./gateway-client";

export type RecordedCall = {
  table: PersonalTable;
  op: "select" | "insert" | "upsert" | "update" | "delete";
  filters: Array<{ column: string; value: unknown }>;
  rows: unknown[];
};

type RecordingOptions = {
  userId: string | null;
  /** Value returned from maybeSingle / first await. */
  data?: unknown;
};

/**
 * Test double at the supabase-js boundary. Records every personal-table call
 * so tests can prove the gateway never issues an unscoped query.
 */
export function createRecordingClient(options: RecordingOptions): GatewayClient & {
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];

  function start(table: PersonalTable): PersonalQuery {
    const call: RecordedCall = {
      table,
      op: "select",
      filters: [],
      rows: [],
    };
    calls.push(call);

    const result: QueryResult<unknown> = Promise.resolve({
      data: options.data ?? null,
      error: null,
    });

    const query: PersonalQuery = {
      select() {
        if (
          call.op === "insert" ||
          call.op === "upsert" ||
          call.op === "update" ||
          call.op === "delete"
        ) {
          return query;
        }
        call.op = "select";
        return query;
      },
      insert(row: unknown) {
        call.op = "insert";
        call.rows = Array.isArray(row) ? row : [row];
        return query;
      },
      upsert(row: unknown) {
        call.op = "upsert";
        call.rows = Array.isArray(row) ? row : [row];
        return query;
      },
      update(row: unknown) {
        call.op = "update";
        call.rows = Array.isArray(row) ? row : [row];
        return query;
      },
      delete() {
        call.op = "delete";
        return query;
      },
      eq(column: string, value: unknown) {
        call.filters.push({ column, value });
        return query;
      },
      maybeSingle() {
        return result as QueryResult<never>;
      },
      then: result.then.bind(result),
    };

    return query;
  }

  return {
    calls,
    auth: {
      getSession: async () => ({
        data: { session: options.userId ? { user: { id: options.userId } } : null },
      }),
    },
    from: start,
  };
}

export function assertEveryCallScopedTo(calls: RecordedCall[], ownerId: string) {
  for (const call of calls) {
    if (call.op === "insert" || call.op === "upsert") {
      for (const row of call.rows) {
        const owner = (row as { owner_id?: unknown }).owner_id;
        if (owner !== ownerId) {
          throw new Error(
            `${call.op} on ${call.table} wrote owner_id=${String(owner)} instead of ${ownerId}`,
          );
        }
      }
    }
    if (call.op === "select" || call.op === "update" || call.op === "delete") {
      const scoped = call.filters.some(
        (filter) => filter.column === "owner_id" && filter.value === ownerId,
      );
      if (!scoped) {
        throw new Error(
          `unscoped ${call.op} on ${call.table}: missing owner_id = ${ownerId}`,
        );
      }
    }
  }
}
