// REEMPLAZA CON TUS DATOS REALES DE SUPABASE
const SUPABASE_URL = 'https://dsiuuymgyzkcksaqtoqk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales de estado
let currentUser = null;
let currentProfile = null;
