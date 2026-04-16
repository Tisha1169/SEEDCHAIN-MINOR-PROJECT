import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing")
}

console.log("Supabase URL:", supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Verify connection on init
supabase.from("users").select("count", { count: "exact", head: true }).then(({ count, error }) => {
  if (error) {
    console.warn("Supabase connection check:", error.message)
  } else {
    console.log("Supabase connected — users count:", count)
  }
})
