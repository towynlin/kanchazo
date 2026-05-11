import { describe, it, expect } from "vitest";
import { testDb } from "./setup";
import { users } from "@/lib/db/schema";
import { findUserByPhone, createUser, updateUser, deleteUser, findUserById } from "@/lib/db/queries/users";

describe("users queries", () => {
  it("creates a user and finds by phone", async () => {
    const user = await createUser({ name: "Alice", phone: "+14155550101" });
    expect(user.id).toBeTruthy();
    expect(user.name).toBe("Alice");

    const found = await findUserByPhone("+14155550101");
    expect(found?.id).toBe(user.id);
  });

  it("returns null for unknown phone", async () => {
    expect(await findUserByPhone("+10000000000")).toBeNull();
  });

  it("finds user by id", async () => {
    const user = await createUser({ name: "Bob", phone: "+14155550102" });
    const found = await findUserById(user.id);
    expect(found?.name).toBe("Bob");
  });

  it("updates a user", async () => {
    const user = await createUser({ name: "Carol", phone: "+14155550103" });
    const updated = await updateUser(user.id, { name: "Caroline" });
    expect(updated?.name).toBe("Caroline");
  });

  it("deletes a user", async () => {
    const user = await createUser({ name: "Dave", phone: "+14155550104" });
    await deleteUser(user.id);
    expect(await findUserById(user.id)).toBeNull();
  });
});
