let isRegistering = false;

function toggleRegisterMode() {
    isRegistering = !isRegistering;
    const nameInput = document.getElementById('full-name');
    const btnLogin = document.getElementById('btn-login');
    const btnToggle = document.getElementById('btn-toggle');

    if (isRegistering) {
        nameInput.classList.remove('hidden');
        btnLogin.innerText = "Crear Cuenta";
        btnToggle.innerText = "¿Ya tienes cuenta? Inicia Sesión";
        btnLogin.onclick = handleSignUp;
    } else {
        nameInput.classList.add('hidden');
        btnLogin.innerText = "Iniciar Sesión";
        btnToggle.innerText = "¿No tienes cuenta? Regístrate";
        btnLogin.onclick = handleLogin;
    }
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if(!email || !password) return window.showToast("Completa los campos", "error");

    const { data, error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) {
        window.showToast(error.message, "error");
    } else {
        window.location.reload();
    }
}

async function handleSignUp() {
    const name = document.getElementById('full-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if(!name || !email || !password) return window.showToast("Todos los campos son obligatorios", "error");

    // 1. Crear Usuario Auth
    const { data, error } = await window.db.auth.signUp({ email, password });

    if (error) {
        window.showToast(error.message, "error");
    } else if (data.user) {
        // 2. Crear Perfil inmediatamente con el nombre
        const { error: profileError } = await window.db
            .from('profiles')
            .insert([{ id: data.user.id, email: email, full_name: name, xp: 0 }]);
        
        if (profileError) {
            window.showToast("Error creando perfil", "error");
        } else {
            window.showToast("¡Cuenta creada! Bienvenido/a", "success");
            window.location.reload();
        }
    }
}

window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
};
