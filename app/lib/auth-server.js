import { auth } from "@/auth";

/**
 * Retrieves the current authenticated user session in Server Components and Server Actions.
 * Preserves the decoded token contract { uid, email, name, picture } where uid is the MongoDB user ID.
 * @returns {Promise<{ uid: string, email: string, name: string, picture: string|null }>}
 */
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No session token");
  }

  return {
    uid: session.user.id,
    email: session.user.email,
    name: session.user.name || "",
    picture: session.user.image || null,
  };
}
