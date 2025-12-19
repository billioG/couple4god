let isRegistering = false;

window.toggleRegisterMode = function() {
    isRegistering = !isRegistering;
    const nameInput = document.getElementById('full-name');
    const genderInput = document.getElementById('gender-selector');
    const btnLogin = document.getElementById('btn-login');
    const btnToggle = document.getElementById('btn-toggle');

    if (isRegistering) {
        nameInput.classList.remove('hidden');
        genderInput.classList.remove('hidden'); // Mostrar selector
        btnLogin.innerText = "Crear Cuenta";
        btnToggle.innerText = "¿Ya tienes cuenta? Inicia Sesión";
        btnLogin.onclick = window.handleSignUp;
    } else {
        nameInput.classList.add('hidden');
        genderInput.classList.add('hidden');
        btnLogin.innerText = "Iniciar Sesión";
        btnToggle.innerText = "¿No tienes cuenta? Regístrate";
        btnLogin.onclick = window.handleLogin;
    }
}

// Selección visual de género
window.selectGender = function(gender, element) {
    document.getElementById('selected-gender').value = gender;
    document.querySelectorAll('.gender-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

window.handleLogin = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if(!email || !password) return window.showToast("⚠️ Ingresa correo y contraseña", "error");

    const { error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) {
        window.showToast("❌ Datos incorrectos o usuario no encontrado", "error");
    } else {
        window.location.reload();
    }
}

window.handleSignUp = async function() {
    const name = document.getElementById('full-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const gender = document.getElementById('selected-gender').value;

    if(!name || !email || !password) return window.showToast("⚠️ Todos los campos son obligatorios", "error");
    if(!gender) return window.showToast("⚠️ Selecciona si eres Hombre o Mujer", "error");

    const { data, error } = await window.db.auth.signUp({ email, password });

    if (error) {
        window.showToast("❌ " + error.message, "error");
    } else if (data.user) {
        // Guardar género y nombre
        const { error: profileError } = await window.db
            .from('profiles')
            .insert([{ 
                id: data.user.id, 
                email: email, 
                full_name: name, 
                gender: gender, // Guardamos el género
                xp: 0 
            }]);
        
        if (profileError) {
            console.error(profileError);
            window.showToast("Cuenta creada pero hubo un error en el perfil", "error");
        } else {
            window.showToast("✅ ¡Bienvenido! Inicia sesión.", "success");
            window.location.reload();
        }
    }
}

window.handleLogout = async function() {
    await window.db.auth.signOut();
    window.location.reload();
};
