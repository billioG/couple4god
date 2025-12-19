// js/config.js

// --- 1. PEGA AQUÍ TUS CREDENCIALES DE SUPABASE ---

const PROJECT_URL = 'https://dsiuuymgyzkcksaqtoqk.supabase.co';

const PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXV1eW1neXprY2tzYXF0b3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTg2NDksImV4cCI6MjA4MTUzNDY0OX0.BxxUrlixe9X-JA--G_0OUeqD5ZIDikIc2WcjcIbBamg';

// --- 2. INICIALIZACIÓN SEGURA ---

// Verificamos si la librería cargó
if (typeof supabase === 'undefined') {
    console.error('🔴 ERROR CRÍTICO: La librería de Supabase no cargó. Revisa tu internet o el index.html');
    alert('Error: No se pudo conectar con la base de datos.');
} else {
    // Creamos la conexión con opciones mejoradas para realtime
    window.db = supabase.createClient(PROJECT_URL, PROJECT_KEY, {
        realtime: {
            reconnect: true,
            timeout: 10000
        }
    });
    console.log("✅ Supabase inicializado correctamente como 'window.db'");

    // Variables globales para guardar el usuario actual
    window.currentUser = null;
    window.currentProfile = null;
}
