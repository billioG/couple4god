// js/auth.js

async function handleLogin() {
    // Verificación de seguridad
    if (!window.db) return alert("Error de conexión: Base de datos no inicializada.");

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return alert("Por favor ingresa correo y contraseña");

    const { data, error } = await window.db.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Error al entrar: " + error.message);
    } else {
        // Recargar para limpiar estado
        window.location.reload();
    }
}

async function handleSignUp() {
    if (!window.db) return alert("Error de conexión.");

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return alert("Por favor ingresa correo y contraseña");

    const { data, error } = await window.db.auth.signUp({ email, password });

    if (error) {
        alert("Error al registrarse: " + error.message);
    } else {
        if(data.user) {
            // Crear perfil en tabla pública para los XP
            const { error: profileError } = await window.db
                .from('profiles')
                .insert([{ id: data.user.id, email: email, xp: 0 }]);
            
            if(profileError) console.error("Error creando perfil:", profileError);

            alert("¡Registro exitoso! Ya puedes iniciar sesión.");
        }
    }
}

async function handleLogout() {
    if (window.db) await window.db.auth.signOut();
    window.location.reload();
}
