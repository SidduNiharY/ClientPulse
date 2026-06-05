import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const algorithm = "aes-256-gcm";

export type CredentialPayload = Record<string, string>;

export function encryptCredentialPayload(
  payload: CredentialPayload,
  secret: string
) {
  const iv = randomBytes(12);
  const key = deriveKey(secret);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function decryptCredentialPayload(
  encryptedPayload: string,
  secret: string
): CredentialPayload {
  const [version, ivValue, tagValue, encryptedValue] =
    encryptedPayload.split(".");

  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported credential payload format");
  }

  const decipher = createDecipheriv(
    algorithm,
    deriveKey(secret),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]);
  const parsed = JSON.parse(decrypted.toString("utf8")) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid credential payload");
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, String(value)])
  );
}

function deriveKey(secret: string) {
  if (!secret) {
    throw new Error("Credential encryption secret is required");
  }

  return scryptSync(secret, "reports-generator-direct-credentials", 32);
}
