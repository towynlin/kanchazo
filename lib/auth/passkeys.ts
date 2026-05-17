import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { db } from "@/lib/db/client";
import { passkeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/lib/db/schema";

function rpConfig() {
  return {
    rpName: process.env.WEBAUTHN_RP_NAME ?? "Kanchazo",
    rpID: process.env.WEBAUTHN_RP_ID ?? "localhost",
    origin: process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000",
  };
}

export async function getPasskeysForUser(userId: string) {
  return db.select().from(passkeys).where(eq(passkeys.userId, userId));
}

export async function buildRegistrationOptions(user: User) {
  const { rpName, rpID } = rpConfig();
  const existingPasskeys = await getPasskeysForUser(user.id);

  return generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.phone,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((p) => ({
      id: p.credentialId,
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration(
  user: User,
  response: Parameters<typeof verifyRegistrationResponse>[0]["response"],
  expectedChallenge: string,
): Promise<VerifiedRegistrationResponse> {
  const { rpID, origin } = rpConfig();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo;
    await db.insert(passkeys).values({
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      signCount: credential.counter,
    });
  }

  return verification;
}

export async function buildAuthenticationOptions(userId?: string) {
  const { rpID } = rpConfig();
  let allowCredentials: { id: string; type: "public-key" }[] = [];

  if (userId) {
    const userPasskeys = await getPasskeysForUser(userId);
    allowCredentials = userPasskeys.map((p) => ({
      id: p.credentialId,
      type: "public-key" as const,
    }));
  }

  return generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
  });
}

export async function verifyAuthentication(
  response: Parameters<typeof verifyAuthenticationResponse>[0]["response"],
  expectedChallenge: string,
): Promise<{ verified: boolean; userId: string | null }> {
  const { rpID, origin } = rpConfig();

  // Find the passkey by credential ID
  const credentialId = response.id;
  const passkeyRows = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, credentialId))
    .limit(1);

  if (!passkeyRows[0]) {
    return { verified: false, userId: null };
  }

  const passkey = passkeyRows[0];
  const publicKey = Buffer.from(passkey.publicKey, "base64url");

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey,
        counter: passkey.signCount,
        transports: undefined,
      },
    });
  } catch {
    return { verified: false, userId: null };
  }

  if (verification.verified) {
    // Update sign count
    await db
      .update(passkeys)
      .set({
        signCount: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeys.id, passkey.id));
    return { verified: true, userId: passkey.userId };
  }

  return { verified: false, userId: null };
}
