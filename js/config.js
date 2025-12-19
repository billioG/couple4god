// REEMPLAZA CON TUS DATOS REALES DE SUPABASE
const SUPABASE_URL = 'https://dsiuuymgyzkcksaqtoqk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg';

// Verificamos si la librería cargó
if (typeof supabase === 'undefined') {
    console.error('CRÍTICO: La librería de Supabase no se cargó. Revisa el index.html');
} else {
    // Inicializamos el cliente y lo guardamos en una variable GLOBAL distinta
    // Usamos 'window.supabaseClient' para evitar conflictos de nombres
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase inicializado correctamente.");
}

// Variables globales de estado
window.currentUser = null;
window.currentProfile = null;
