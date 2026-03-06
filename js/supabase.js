
// Configuración de Supabase - REEMPLAZA CON TUS DATOS
const SUPABASE_URL = 'https://dsgyyddhdkajoxdqfckb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_ecTp1b4OUM2MgZYm71pqCQ_ee469M8A'

// Crear cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
const cliente = supabaseClient