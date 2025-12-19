// REEMPLAZA CON TUS DATOS REALES DE SUPABASE
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = 'tu-anon-key-publica';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales de estado
let currentUser = null;
let currentProfile = null;
