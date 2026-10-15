// @vitest-environment node
/**
 * Applies the real Supabase migration to an in-process Postgres (PGlite) with a
 * minimal stand-in for Supabase's `auth` schema, then acts as two different
 * users to prove Row Level Security, ownership constraints and triggers work.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATION = fileURLToPath(
  new URL("../../supabase/migrations/20261015000000_initial_schema.sql", import.meta.url),
);
const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

let db: PGlite;

/** Runs SQL as an authenticated user, the way Supabase's API does. */
async function as<T = Record<string, unknown>>(user: string, sql: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await db.query<T>(sql);
  } finally {
    await db.exec("reset role;");
  }
}

async function createApp(user: string, company: string, status = "applied") {
  const result = await as<{ id: string; user_id: string }>(
    user,
    `insert into public.applications (company, job_title, status) values ('${company}', 'Engineer', '${status}') returning id, user_id`,
  );
  return result.rows[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role authenticated nologin;
    create role anon nologin;
    grant usage on schema public, auth to authenticated, anon;
  `);
  await db.exec(readFileSync(MIGRATION, "utf8"));
  // Supabase grants table privileges to these roles by default; RLS then filters rows.
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
    insert into auth.users (id, raw_user_meta_data) values
      ('${ALICE}', '{"full_name":"Alice"}'), ('${BOB}', '{"full_name":"Bob"}');
  `);
}, 60_000);

describe("database schema", () => {
  it("creates a profile for every new auth user", async () => {
    const { rows } = await db.query<{ full_name: string }>("select full_name from public.profiles order by full_name");
    expect(rows.map((r) => r.full_name)).toEqual(["Alice", "Bob"]);
  });

  it("defaults user_id to the signed-in user", async () => {
    const app = await createApp(ALICE, "Northwind");
    expect(app.user_id).toBe(ALICE);
  });

  it("enforces status, salary and URL constraints", async () => {
    await expect(as(ALICE, `insert into public.applications (company, job_title, status) values ('x', 'y', 'ghosted')`)).rejects.toThrow();
    await expect(as(ALICE, `insert into public.applications (company, job_title, salary_min, salary_max) values ('x', 'y', 10, 5)`)).rejects.toThrow();
    await expect(as(ALICE, `insert into public.applications (company, job_title, job_url) values ('x', 'y', 'javascript:alert(1)')`)).rejects.toThrow();
  });
});

describe("row level security", () => {
  it("only shows users their own applications", async () => {
    await createApp(ALICE, "Alice Co");
    await createApp(BOB, "Bob Co");
    const alice = await as<{ company: string }>(ALICE, "select company from public.applications");
    const bob = await as<{ company: string }>(BOB, "select company from public.applications");
    expect(alice.rows.map((r) => r.company)).not.toContain("Bob Co");
    expect(bob.rows.map((r) => r.company)).toEqual(["Bob Co"]);
  });

  it("prevents updating or deleting another user's application", async () => {
    const bobApp = await createApp(BOB, "Bob Private");
    const update = await as(ALICE, `update public.applications set company = 'Hacked' where id = '${bobApp.id}'`);
    const remove = await as(ALICE, `delete from public.applications where id = '${bobApp.id}'`);
    expect(update.affectedRows).toBe(0);
    expect(remove.affectedRows).toBe(0);
    const check = await as<{ company: string }>(BOB, `select company from public.applications where id = '${bobApp.id}'`);
    expect(check.rows[0].company).toBe("Bob Private");
  });

  it("prevents creating rows for, or transferring rows to, another user", async () => {
    await expect(
      as(ALICE, `insert into public.applications (user_id, company, job_title) values ('${BOB}', 'Spoof', 'x')`),
    ).rejects.toThrow(/row-level security/);
    const own = await createApp(ALICE, "Mine");
    await expect(as(ALICE, `update public.applications set user_id = '${BOB}' where id = '${own.id}'`)).rejects.toThrow(
      /row-level security/,
    );
  });

  it("prevents attaching follow-ups to another user's application", async () => {
    const bobApp = await createApp(BOB, "Bob Target");
    await expect(
      as(ALICE, `insert into public.follow_up_tasks (application_id, title, due_at) values ('${bobApp.id}', 'x', now())`),
    ).rejects.toThrow(/foreign key/);
  });

  it("hides follow-ups and activity from other users", async () => {
    const aliceApp = await createApp(ALICE, "Alice Secret");
    await as(ALICE, `insert into public.follow_up_tasks (application_id, title, due_at) values ('${aliceApp.id}', 'Ping', now())`);
    const tasks = await as(BOB, `select * from public.follow_up_tasks where application_id = '${aliceApp.id}'`);
    const activity = await as(BOB, `select * from public.application_activity where application_id = '${aliceApp.id}'`);
    expect(tasks.rows).toHaveLength(0);
    expect(activity.rows).toHaveLength(0);
  });

  it("does not let clients write activity history directly", async () => {
    const app = await createApp(ALICE, "Forgery");
    await expect(
      as(ALICE, `insert into public.application_activity (user_id, application_id, type) values ('${ALICE}', '${app.id}', 'created')`),
    ).rejects.toThrow(/row-level security/);
  });

  it("shows nothing to anonymous visitors", async () => {
    await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false);");
    const { rows } = await db.query("select * from public.applications");
    await db.exec("reset role;");
    expect(rows).toHaveLength(0);
  });
});

describe("triggers", () => {
  it("logs creation, status changes, interview scheduling and archiving", async () => {
    const app = await createApp(ALICE, "History", "saved");
    await as(ALICE, `update public.applications set status = 'applied', date_applied = current_date where id = '${app.id}'`);
    await as(ALICE, `update public.applications set status = 'interview', interview_at = now() + interval '2 days' where id = '${app.id}'`);
    await as(ALICE, `update public.applications set notes = 'unrelated edit' where id = '${app.id}'`);
    await as(ALICE, `update public.applications set archived_at = now() where id = '${app.id}'`);

    const { rows } = await as<{ type: string; from_status: string | null; to_status: string }>(
      ALICE,
      `select type, from_status, to_status from public.application_activity where application_id = '${app.id}'`,
    );
    expect(rows.map((r) => r.type).sort()).toEqual([
      "archived",
      "created",
      "interview_scheduled",
      "status_changed",
      "status_changed",
    ]);
    expect(rows).toContainEqual({ type: "status_changed", from_status: "applied", to_status: "interview" });
  });

  it("bumps updated_at on update", async () => {
    const app = await createApp(ALICE, "Timestamps");
    const read = async () =>
      (await as<{ updated_at: Date }>(ALICE, `select updated_at from public.applications where id = '${app.id}'`)).rows[0].updated_at;
    const before = await read();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await as(ALICE, `update public.applications set notes = 'n' where id = '${app.id}'`);
    expect((await read()).getTime()).toBeGreaterThan(before.getTime());
  });

  it("cascades application deletes to follow-ups and history", async () => {
    const app = await createApp(ALICE, "Cascade");
    await as(ALICE, `insert into public.follow_up_tasks (application_id, title, due_at) values ('${app.id}', 'x', now())`);
    await as(ALICE, `delete from public.applications where id = '${app.id}'`);
    const { rows } = await db.query<{ tasks: number; events: number }>(
      `select (select count(*)::int from public.follow_up_tasks where application_id = '${app.id}') as tasks,
              (select count(*)::int from public.application_activity where application_id = '${app.id}') as events`,
    );
    expect(rows[0]).toEqual({ tasks: 0, events: 0 });
  });
});
