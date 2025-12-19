// ==========================================
// AUTENTICACIÓN (LOGIN + REGISTRO) - LISTO PROD
// ==========================================

let isRegistering = false;

window.toggleRegisterMode = function () {
    isRegistering = !isRegistering;

    // Referencias a elementos DOM
    const nameInput = document.getElementById('full-name');
    const genderDiv = document.getElementById('gender-selector'); // Ahora apunta al DIV, no al input
    const btnLogin = document.getElementById('btn-login');
    const btnToggle = document.getElementById('btn-toggle');

    if (isRegistering) {
        if (nameInput) nameInput.classList.remove('hidden');
        if (genderDiv) genderDiv.classList.remove('hidden');

        btnLogin.innerText = "Crear Cuenta";
        btnToggle.innerText = "¿Ya tienes cuenta? Inicia Sesión";
        btnLogin.onclick = window.handleSignUp;
    } else {
        if (nameInput) nameInput.classList.add('hidden');
        if (genderDiv) genderDiv.classList.add('hidden');

        btnLogin.innerText = "Iniciar Sesión";
        btnToggle.innerText = "¿No tienes cuenta? Regístrate";
        btnLogin.onclick = window.handleLogin;
    }
};

window.selectGender = function (gender, element) {
    document.getElementById('selected-gender').value = gender;

    // Remover clase selected de todos
    document.querySelectorAll('.gender-option').forEach(el => el.classList.remove('selected'));
    // Agregar al actual
    if (element) element.classList.add('selected');
};

window.handleLogin = async function () {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const btn = document.getElementById('btn-login');

    if (!email || !password) return window.showToast('Completa todos los campos', 'error');

    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerText = 'Verificando...';

    try {
        const { data, error } = await window.db.auth.signInWithPassword({ email, password });

        if (error) throw error;

        window.showToast('¡Bienvenido de vuelta!', 'success');
        setTimeout(() => window.location.reload(), 500);

    } catch (e) {
        console.error('Login error:', e);
        let msg = 'Error al iniciar sesión';
        if (e.message.includes('Invalid login')) msg = 'Credenciales incorrectas';
        if (e.message.includes('Email not confirmed')) msg = 'Confirma tu correo primero';

        window.showToast(msg, 'error');
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

window.handleSignUp = async function () {
    const name = document.getElementById('full-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const gender = document.getElementById('selected-gender').value;
    const btn = document.getElementById('btn-login');

    if (!name || !email || !password) return window.showToast('Completa todos los campos', 'error');
    if (!gender) return window.showToast('Selecciona tu género', 'error');
    if (password.length < 6) return window.showToast('La contraseña es muy corta (min 6)', 'error');

    btn.disabled = true;
    btn.innerText = 'Registrando...';

    try {
        const { data, error } = await window.db.auth.signUp({ email, password });

        if (error) throw error;

        if (data.user) {
            // Crear perfil inmediatamente
            const { error: profileError } = await window.db.from('profiles').insert([{
                id: data.user.id,
                email: email,
                full_name: name,
                gender: gender,
                xp: 0
            }]);

            if (profileError) throw profileError;

            window.showToast('¡Cuenta creada! Iniciando...', 'success');
            setTimeout(() => window.location.reload(), 1000);
        }

    } catch (e) {
        console.error('Signup error:', e);
        let msg = 'Error al registrarse';
        if (e.message.includes('already registered')) msg = 'Este correo ya existe';

        window.showToast(msg, 'error');
        btn.disabled = false;
        btn.innerText = 'Crear Cuenta';
    }
};

window.handleLogout = async function () {
    const btn = document.querySelector('.btn-logout');
    if (btn) btn.innerText = "...";

    await window.db.auth.signOut();
    window.location.reload();
};