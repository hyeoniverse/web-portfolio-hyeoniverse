import { createClient } from "@supabase/supabase-js";

// Service role — RLS 우회. API routes에서만 사용
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
