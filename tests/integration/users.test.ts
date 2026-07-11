import { describe, it, expect } from "vitest";
import {
  findUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  findUserById,
} from "@/lib/db/queries/users";

describe("users queries", () => {
  it("creates a user and finds by email", async () => {
    const user = await createUser({ name: "Alice", email: "alice@example.com" });
    expect(user.id).toBeTruthy();
    expect(user.name).toBe("Alice");

    const found = await findUserByEmail("alice@example.com");
    expect(found?.id).toBe(user.id);
  });

  it("returns null for unknown email", async () => {
    expect(await findUserByEmail("nobody@example.com")).toBeNull();
  });

  it("creates a user without phone or email", async () => {
    const user = await createUser({ name: "Nameless" });
    expect(user.phone).toBeNull();
    expect(user.email).toBeNull();
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
