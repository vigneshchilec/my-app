import { createClient } from '@supabase/supabase-js'

/** Shared Supabase client (auth + future DB). Move URL/key to env vars for production. */
const supabaseUrl = "https://omnwpxeqkepaylblfarb.supabase.co"
const supabaseKey = "sb_publishable_KzQxzVDNXK5y016Nv0zA-w_X5f0yQim"

export const supabase = createClient(supabaseUrl, supabaseKey)