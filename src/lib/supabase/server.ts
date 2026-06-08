import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrlForServer, isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export async function createClient() {
  if (!isUserAuthEnabledOnServer()) {
    throw new Error("User auth is not configured");
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrlForServer()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Component からの呼び出し時は cookie 書き込み不可 */
        }
      },
    },
  });
}
