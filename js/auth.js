// Iniciar Sesión
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Error: " + error.message);
    } else {
        initApp(); // Cargar la app si el login es exitoso
    }
}

// Registro
async function handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 1. Crear Auth User
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        alert("Error: " + error.message);
    } else {
        // 2. Crear Perfil en tabla pública (necesario para XP)
        if(data.user) {
            await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
            alert("¡Registro exitoso! Ya puedes iniciar sesión.");
        }
    }
}

// Cerrar Sesión
async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
}
