// src/app.d.ts
import { SupabaseClient, Session } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {}
    interface PageData {
      session: Session | null;
    }
  }
}

export {};
