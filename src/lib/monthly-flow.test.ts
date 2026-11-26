import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";

const point = "00000000-0000-4000-8000-000000000010";
const host = "00000000-0000-4000-8000-000000000020";
const key = "00000000-0000-4000-8000-000000000030";
let db: PGlite;
type Stay = { id: string; status: string; locker_position: number; pickup_code: string; return_code: string; reusable: boolean; deposited_at: string | null };
const validate = (code: string) => db.query<{ result: { action: string; position: number } }>("select public.validate_monthly_code($1,$2) as result", [point, code]);
const stays = async () => (await db.query<Stay>("select * from public.key_exchanges order by created_at,id")).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.kiosks(id uuid primary key, positions integer);
    CREATE TABLE public.keys(id uuid primary key, kiosk_id uuid, host_id uuid, subscription_type text, deposit_code text, locked boolean default false);
    CREATE TABLE public.key_exchanges(id uuid primary key default gen_random_uuid(), key_id uuid, kiosk_id uuid, booking_ref text, locker_position integer default 0, deposit_code text, pickup_code text, return_code text, pickup_time text, status text, check_in date, check_out date, deposited_at timestamptz, picked_up_at timestamptz, returned_at timestamptz, created_at timestamptz default now());
    CREATE TABLE public.access_codes(id uuid default gen_random_uuid(), key_id uuid, code text, has_validity boolean default false, time_to text);
    CREATE TABLE public.access_log(key_id uuid, action text, role text, person_name text);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.my_host_id() RETURNS uuid LANGUAGE sql AS $$ SELECT '${host}'::uuid $$;
    CREATE FUNCTION public.test_clock() RETURNS timestamptz LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('test.clock',true),'')::timestamptz,now()) $$;
  `);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0004_monthly_guest_code_rotation.sql", import.meta.url), "utf8").replaceAll("now()", "public.test_clock()"));
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0005_monthly_stay_from_stored_key.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0006_boarding_pass_end_time.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0008_random_locker_position_abc_refs_v2.sql", import.meta.url), "utf8").replaceAll("now()", "public.test_clock()"));
}, 30000);
beforeEach(async () => {
  await db.exec("set test.clock=''");
  await db.exec(`TRUNCATE public.keys,public.kiosks,public.key_exchanges,public.access_log;
    INSERT INTO public.kiosks VALUES('${point}',16);
    INSERT INTO public.keys(id,kiosk_id,host_id,subscription_type,deposit_code) VALUES('${key}','${point}','${host}','monthly','015589');
    INSERT INTO public.key_exchanges(key_id,kiosk_id,booking_ref,deposit_code,pickup_code,return_code,status,guest_name) VALUES('${key}','${point}','TEST-STAY','015589','393496','393496','waiting_deposit','Ana');`);
});
afterAll(async () => { await db?.close(); });

describe("ciclo mensual real en PostgreSQL", () => {
  it("el depósito sortea el casillero entre los libres", async () => {
    const seen = new Set<number>();
    for (let i = 0; i < 12; i += 1) {
      await db.exec("update public.key_exchanges set status='waiting_deposit', locker_position=0");
      seen.add((await validate("015589")).rows[0]?.result.position ?? 0);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect([...seen].every((n) => n >= 1 && n <= 16)).toBe(true);
  });
  it("la tarjeta de embarque lee la hora final vigente también después del retiro", async () => {
    await validate("015589"); await validate("393496");
    await db.exec("update public.key_exchanges set pickup_until='21:00'");
    const result = await db.query<{ limits: { pickup_until: string } }>("select public.boarding_pass_validity('TEST-STAY') as limits");
    expect(result.rows[0]?.limits.pickup_until).toBe("21:00");
    expect((await stays())[0]?.status).toBe("picked_up");
  });
  it("un ciclo único vence al devolver y crea otra estadía con código nuevo y el mismo casillero", async () => {
    expect((await validate("015589")).rows[0]?.result.action).toBe("deposited");
    expect((await validate("393496")).rows[0]?.result.action).toBe("picked_up");
    const returned = (await validate("393496")).rows[0]?.result;
    const rows = await stays();
    const active = rows.find((row) => row.status === "deposited");
    expect(rows).toHaveLength(2);
    expect(active?.locker_position).toBe(returned?.position);
    expect(active?.pickup_code).toMatch(/^\d{6}$/);
    expect(active?.pickup_code).not.toBe("393496");
    expect(active?.return_code).toBe(active?.pickup_code);
    expect(active?.deposited_at).toBeNull();
    expect(rows.find((row) => row.status === "completed")?.locker_position).toBe(0);
    expect((await db.query<{ booking_ref: string }>("select booking_ref from public.key_exchanges where status='deposited'")).rows[0]?.booking_ref).toMatch(/^[A-Z]{3}-\d{3}$/);
    expect((await db.query<{ role: string }>("select role from public.access_log")).rows.every((row) => row.role === "guest")).toBe(true);
    await expect(validate("393496")).rejects.toThrow("ya no está vigente");
    if (!active) throw new Error("Falta la siguiente estadía");
    expect((await validate(active.pickup_code)).rows[0]?.result.action).toBe("picked_up");
  });
  it("el depósito duplicado no reserva otro casillero ni modifica movimientos", async () => {
    await validate("015589");
    await expect(validate("015589")).rejects.toThrow("ya se encuentra depositada");
    expect(await stays()).toHaveLength(1);
    expect((await db.query<{ count: number }>("select count(*)::integer as count from public.access_log")).rows[0]?.count).toBe(1);
  });
  it("bloquea el depósito también después de la rotación", async () => {
    await validate("015589"); await validate("393496"); await validate("393496");
    await expect(validate("015589")).rejects.toThrow("ya se encuentra depositada");
    expect((await stays()).filter((row) => row.locker_position > 0)).toHaveLength(1);
  });
  it("un código reutilizable conserva la estadía y registra todos los movimientos", async () => {
    await db.exec("update public.key_exchanges set reusable=true");
    await validate("015589"); await validate("393496"); await validate("393496"); await validate("393496");
    expect(await stays()).toHaveLength(1);
    expect((await stays())[0]?.status).toBe("picked_up");
    expect((await db.query<{ count: number }>("select count(*)::integer as count from public.access_log")).rows[0]?.count).toBe(4);
  });
  it("impide retirar antes del check-in", async () => {
    await validate("015589");
    await db.exec("update public.key_exchanges set check_in=(timezone('America/Argentina/Buenos_Aires',now())::date+1)");
    await expect(validate("393496")).rejects.toThrow("aún no es válido");
    expect((await stays())[0]?.status).toBe("deposited");
  });
  it("impide retirar después del check-out", async () => {
    await validate("015589");
    await db.exec("update public.key_exchanges set check_out=(timezone('America/Argentina/Buenos_Aires',now())::date-1)");
    await expect(validate("393496")).rejects.toThrow("expiró");
  });
  it("aplica la hora mínima de retiro", async () => {
    await validate("015589");
    await db.exec("update public.key_exchanges set pickup_time='23:59:59.999999'");
    await expect(validate("393496")).rejects.toThrow("aún no es válido en este horario");
  });
  it("desde 15:00 permite el retiro observado a las 23:57 de Argentina", async () => {
    await db.exec("set test.clock='2026-11-26T02:57:14Z'");
    await validate("015589");
    await db.exec("update public.key_exchanges set pickup_time='15:00',reusable=true");
    expect((await validate("393496")).rows[0]?.result.action).toBe("picked_up");
  });
  it("desde 15:00 rechaza el retiro a las 14:59 de Argentina", async () => {
    await db.exec("set test.clock='2026-11-26T17:59:00Z'");
    await validate("015589");
    await db.exec("update public.key_exchanges set pickup_time='15:00',reusable=true");
    await expect(validate("393496")).rejects.toThrow("aún no es válido en este horario");
    expect((await stays())[0]?.status).toBe("deposited");
  });
  it("aplica la hora máxima de retiro", async () => {
    await validate("015589");
    await db.exec("update public.key_exchanges set pickup_until='00:00'");
    await expect(validate("393496")).rejects.toThrow("ya no es válido en este horario");
  });
  it("permite devolver una llave aunque haya terminado la vigencia", async () => {
    await validate("015589"); await validate("393496");
    await db.exec("update public.key_exchanges set check_out=(timezone('America/Argentina/Buenos_Aires',now())::date-1)");
    expect((await validate("393496")).rows[0]?.result.action).toBe("completed");
  });
  it("no permite dos estadías mensuales activas", async () => {
    await expect(db.query("select public.start_monthly_stay($1)", [key])).rejects.toThrow("Ya hay una estadía activa");
  });
  it("prepara la siguiente estadía de una llave devuelta anteriormente sin pedir otro depósito", async () => {
    await db.exec("update public.key_exchanges set status='completed',locker_position=8");
    await db.query("select public.start_monthly_stay($1)", [key]);
    expect((await stays()).find((row) => row.status === "deposited")?.locker_position).toBe(8);
    await expect(validate("015589")).rejects.toThrow("ya se encuentra depositada");
  });
  it("no deja que un anfitrión valide códigos como si fuera un dispositivo", async () => {
    await db.exec("set role authenticated");
    try { await expect(validate("015589")).rejects.toThrow("permission denied"); }
    finally { await db.exec("reset role"); }
  });
});