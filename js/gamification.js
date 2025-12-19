// Función para enviar Bandera Blanca
async function sendWhiteFlag() {
    const user = supabase.auth.user();
    // Actualizar estado en DB
    const { error } = await supabase
        .from('couples')
        .update({ white_flag_status: 'sent', white_flag_sender: user.id })
        .eq('user1_id', user.id); // Ajustar lógica para encontrar la pareja correcta
    
    if(!error) showModal("🏳️ Bandera Enviada", "Esperando respuesta de tu pareja...");
}

// Función para ACEPTAR Bandera Blanca (La parte que faltaba)
async function acceptWhiteFlag(coupleId, partnerId) {
    const myId = supabase.auth.user().id;

    // 1. Actualizar estado a 'accepted'
    const { error } = await supabase
        .from('couples')
        .update({ white_flag_status: 'accepted' })
        .eq('id', coupleId);

    if (!error) {
        // 2. DAR PUNTOS (Gamificación) - Llamada a la función RPC SQL
        // 50 XP para mí
        await supabase.rpc('add_xp', { user_id: myId, points: 50 });
        // 50 XP para mi pareja
        await supabase.rpc('add_xp', { user_id: partnerId, points: 50 });

        showModal("✨ ¡Paz Restaurada!", "Ambos han ganado +50 XP. ¡Vayan a abrazarse!");
        
        // Actualizar UI
        updateXPDisplay();
    }
}
