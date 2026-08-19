#!/usr/bin/env bash
# Signed-out REST probe for Phase 4 prove-it step 4.
# Pass: training_days exists; anon cannot insert a profiles row.
# Does not print keys. Loads .env.local then .env.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
elif [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"

if [[ -z "$URL" || -z "$KEY" ]]; then
  echo "FAIL: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing (.env.local)."
  exit 1
fi

auth_headers=(
  -H "apikey: ${KEY}"
  -H "Authorization: Bearer ${KEY}"
  -H "Content-Type: application/json"
  -H "Prefer: return=representation"
)

fail=0

code_td="$(curl -sS -o /tmp/prove-td -w "%{http_code}" \
  "${URL}/rest/v1/training_days?select=id&limit=1" "${auth_headers[@]}")"
if [[ "$code_td" == "404" ]]; then
  echo "FAIL: public.training_days is missing (HTTP 404). Run supabase/migrations/0003_repair_auth_rls.sql."
  fail=1
elif [[ "$code_td" == "200" || "$code_td" == "401" || "$code_td" == "403" ]]; then
  echo "OK: training_days is in the schema cache (HTTP ${code_td})."
else
  echo "FAIL: unexpected training_days HTTP ${code_td}"
  fail=1
fi

body='{"owner_id":"198e5a49-c748-4bcc-b6ad-86445a76eb7b","sex":"female","birth_date":"1990-01-15","height_cm":168,"weight_kg":72,"body_fat_pct":28.5,"skeletal_muscle_mass_kg":26.9}'
code_ins="$(curl -sS -o /tmp/prove-ins -w "%{http_code}" \
  -X POST "${URL}/rest/v1/profiles" "${auth_headers[@]}" -d "$body")"

# 201 / 200 with a row = signed-out write still open.
# 400 with a column NOT NULL (gym_days_per_week) also means RLS did not fire.
# 401 / 403 / 42501 = denied (pass).
python3 - "$code_ins" <<'PY' || fail_py=1
import json, sys
code = sys.argv[1]
raw = open("/tmp/prove-ins").read()
try:
    data = json.loads(raw) if raw else None
except json.JSONDecodeError:
    data = raw
msg = ""
if isinstance(data, dict):
    msg = str(data.get("message") or data.get("code") or "")
if code in ("200", "201") and isinstance(data, list):
    print("FAIL: anon inserted a profiles row. RLS is not auth-scoped.")
    sys.exit(1)
if code == "400" and "gym_days_per_week" in msg:
    print("FAIL: anon reached profiles insert (old gym_days_per_week column). Run 0003.")
    sys.exit(1)
if code == "400" and "null value" in msg.lower():
    print(f"FAIL: anon reached profiles insert (constraint {msg!r}). RLS did not deny.")
    sys.exit(1)
if code in ("401", "403"):
    print(f"OK: anon insert denied (HTTP {code}).")
    sys.exit(0)
if isinstance(data, dict) and str(data.get("code")) in ("42501", "PGRST301", "PGRST301"):
    print(f"OK: anon insert denied ({data.get('code')}).")
    sys.exit(0)
print(f"FAIL: unexpected anon insert HTTP {code} {msg or raw[:180]!r}")
sys.exit(1)
PY

if [[ "${fail_py:-0}" == "1" ]]; then
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "Prove-it REST check failed. Apply 0003, then re-run: bash scripts/prove-supabase-anon.sh"
  exit 1
fi

echo "Prove-it REST check passed (signed-out cannot write personal rows)."
