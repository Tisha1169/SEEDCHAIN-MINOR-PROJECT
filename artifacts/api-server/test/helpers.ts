import { randomUUID } from "node:crypto";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import app from "../src/app";
import { hashPassword } from "../src/lib/auth";

export { app, request };

export type Agent = InstanceType<typeof TestAgent>;

export const uniq = () => randomUUID().slice(0, 8);

/** supertest agent that keeps the session cookie and sends the CSRF header. */
export function agent(): Agent {
  const a = request.agent(app);
  a.set("x-seedchain-csrf", "1");
  return a;
}

export async function registerCustomer(name = "Test Customer") {
  const a = agent();
  const email = `customer-${uniq()}@example.test`;
  const r = await a.post("/api/auth/register").send({ name, email, password: "correct horse battery", role: "customer", phone: "+91 90000 00000" });
  if (r.status !== 201) throw new Error(`register customer failed: ${r.status} ${JSON.stringify(r.body)}`);
  return { agent: a, user: r.body.user, email };
}

export async function registerFarmer(state = "Punjab") {
  const a = agent();
  const email = `farmer-${uniq()}@example.test`;
  const r = await a.post("/api/auth/register").send({
    name: "Test Farmer",
    email,
    password: "correct horse battery",
    role: "farmer",
    phone: "+91 98888 88888",
    farmerProfile: { publicName: "Gurpreet Farms", district: "Jalandhar", state },
  });
  if (r.status !== 201) throw new Error(`register farmer failed: ${r.status} ${JSON.stringify(r.body)}`);
  return { agent: a, user: r.body.user, email };
}

export async function createAdmin() {
  const email = `admin-${uniq()}@example.test`;
  await db.insert(usersTable).values({ email, name: "Admin", passwordHash: await hashPassword("admin password 123"), role: "admin", status: "active" });
  const a = agent();
  const r = await a.post("/api/auth/login").send({ email, password: "admin password 123" });
  if (r.status !== 200) throw new Error("admin login failed");
  return { agent: a, user: r.body.user, email };
}

/** Registered + admin-approved farmer with one farm. */
export async function approvedFarmerWithFarm(admin: Agent, state = "Punjab") {
  const f = await registerFarmer(state);
  const ap = await admin.post(`/api/admin/users/${f.user.id}/approve`).send({ note: "Documents verified" });
  if (ap.status !== 200) throw new Error(`approve failed ${ap.status}`);
  const farm = await f.agent.post("/api/farms").send({ name: "Green Acres", village: "Nakodar", district: "Jalandhar", state });
  if (farm.status !== 201) throw new Error(`farm failed ${farm.status} ${JSON.stringify(farm.body)}`);
  return { ...f, farm: farm.body };
}

export async function harvestedListedLot(farmer: Agent, farmId: string, qty = 1000, price = 22) {
  const lot = await farmer.post("/api/lots").send({
    farmId,
    productName: "Potato",
    variety: "Kufri Jyoti",
    origin: "Jalandhar, Punjab",
    harvestDate: "2026-03-01",
    harvestQuantity: qty,
    qualityGrade: "A",
    privateNotes: "PRIVATE-NOTE-should-never-be-public",
  });
  if (lot.status !== 201) throw new Error(`lot failed ${lot.status} ${JSON.stringify(lot.body)}`);
  const listed = await farmer.post(`/api/lots/${lot.body.id}/listing`).send({ listed: true, pricePerUnit: price });
  if (listed.status !== 200) throw new Error(`listing failed ${listed.status} ${JSON.stringify(listed.body)}`);
  return listed.body;
}

export async function setUserStatus(id: string, status: "active" | "suspended") {
  await db.update(usersTable).set({ status }).where(eq(usersTable.id, id));
}

export const newKey = () => `test-${randomUUID()}`;
