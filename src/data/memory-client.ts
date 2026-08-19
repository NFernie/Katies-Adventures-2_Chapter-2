import type {
  GatewayClient,
  PersonalQuery,
  PersonalTable,
  QueryResult,
  Session,
} from "./gateway-client";

type Row = Record<string, unknown>;

/**
 * In-memory supabase-js stand-in for Phase 8 E2E. Pretends a signed-in session.
 * Does not talk to Postgres and does not disable RLS — the gateway still stamps
 * owner_id and this stub only stores what the gateway writes.
 */
export function createMemoryClient(options: { userId: string }): GatewayClient & {
  store: Record<PersonalTable, Row[]>;
} {
  const store = {
    profiles: [],
    training_days: [],
    goals: [],
    plans: [],
    plan_versions: [],
    day_plans: [],
    meal_slots: [],
    workout_sessions: [],
    workout_items: [],
    check_ins: [],
    favorites: [],
  } as Record<PersonalTable, Row[]>;

  function matches(row: Row, filters: Array<{ column: string; value: unknown }>) {
    return filters.every((filter) => row[filter.column] === filter.value);
  }

  function start(table: PersonalTable): PersonalQuery {
    const filters: Array<{ column: string; value: unknown }> = [];
    let op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
    let payload: Row[] = [];

    function execute(): QueryResult<unknown> {
      const rows = store[table];
      if (op === "insert") {
        rows.push(...payload);
        return Promise.resolve({ data: payload, error: null });
      }
      if (op === "upsert") {
        for (const next of payload) {
          const idx = rows.findIndex((row) => {
            if (table === "check_ins") {
              return row.owner_id === next.owner_id && row.logged_on === next.logged_on;
            }
            if (table === "profiles") {
              return row.owner_id === next.owner_id;
            }
            if (next.id) return row.id === next.id;
            return false;
          });
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...next };
          } else {
            if (!next.id) next.id = crypto.randomUUID();
            rows.push(next);
          }
        }
        return Promise.resolve({ data: payload, error: null });
      }
      if (op === "update") {
        const updated: Row[] = [];
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          if (!row || !matches(row, filters)) continue;
          rows[i] = { ...row, ...payload[0] };
          updated.push(rows[i] as Row);
        }
        return Promise.resolve({ data: updated, error: null });
      }
      if (op === "delete") {
        store[table] = rows.filter((row) => !matches(row, filters));
        return Promise.resolve({ data: null, error: null });
      }
      const found = rows.filter((row) => matches(row, filters));
      return Promise.resolve({ data: found, error: null });
    }

    const query: PersonalQuery = {
      select() {
        if (op === "insert" || op === "upsert" || op === "update" || op === "delete") {
          return query;
        }
        op = "select";
        return query;
      },
      insert(row: unknown) {
        op = "insert";
        payload = Array.isArray(row) ? (row as Row[]) : [row as Row];
        return query;
      },
      upsert(row: unknown) {
        op = "upsert";
        payload = Array.isArray(row) ? (row as Row[]) : [row as Row];
        return query;
      },
      update(row: unknown) {
        op = "update";
        payload = [row as Row];
        return query;
      },
      delete() {
        op = "delete";
        return query;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return query;
      },
      maybeSingle() {
        return execute().then(() => {
          const found = store[table].filter((row) => matches(row, filters));
          const data = found[0] ?? payload[0] ?? null;
          return { data, error: null };
        }) as QueryResult<never>;
      },
      then: (onFulfilled, onRejected) => execute().then(onFulfilled, onRejected),
    };

    return query;
  }

  const session: Session | null = { user: { id: options.userId } };

  return {
    store,
    auth: {
      getSession: async () => ({ data: { session } }),
    },
    from: start,
  };
}
