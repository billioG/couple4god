// js/auth.js

async function handleLogin() {
    const db = window.supabaseClient; // Usamos la global
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Error: " + error.message);
    } else {
        // Recargar la página suele ser más limpio para reiniciar el estado
        window.location.reload();
    }
}

async function handleSignUp() {
    const db = window.supabaseClient;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await db.auth.signUp({ email, password });

    if (error) {
        alert("Error: " + error.message);
    } else {
        if(data.user) {
            // Crear perfil en tabla pública
            await db.from('profiles').insert([{ id: data.user.id, email: email }]);
            alert("¡Registro exitoso! Ya puedes iniciar sesión.");
        }
    }
}

async function handleLogout() {
    const db = window.supabaseClient;
    await db.auth.signOut();
    window.location.reload();
}
