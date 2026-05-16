import { cookies } from "next/headers";
import { ADMIN_SESSION_KEY } from "@/lib/constants";

export async function logout() {
  cookies().delete(ADMIN_SESSION_KEY);
}

export async function isAdminLoggedIn() {
  const session = cookies().get(ADMIN_SESSION_KEY);
  return session?.value === "true";
}
