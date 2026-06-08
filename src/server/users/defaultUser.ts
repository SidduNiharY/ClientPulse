import { db } from "@/server/db/client";

const defaultAgencyUserEmail =
  process.env.DEFAULT_AGENCY_USER_EMAIL ?? "agency@example.com";

export async function ensureDefaultAgencyUser() {
  return db.user.upsert({
    where: { email: defaultAgencyUserEmail },
    update: {
      name: "Agency Admin",
      role: "admin"
    },
    create: {
      email: defaultAgencyUserEmail,
      name: "Agency Admin",
      role: "admin"
    },
    select: { id: true }
  });
}

export async function resolveAgencyUserId(userId?: string | null) {
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (user) {
      return user.id;
    }
  }

  const defaultUser = await ensureDefaultAgencyUser();

  return defaultUser.id;
}
