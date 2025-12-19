
// ==========================================
// AUTENTICACIÓN (LOGIN + REGISTRO)
// ==========================================

let isRegistering = false;

window.toggleRegisterMode = function () {
    isRegistering = !isRegistering;
    const nameInput = document.getElementById('full-name');
    const genderInput = document.getElementById('gender-selector');
    const btnLogin = document.getElementById('btn-login');
    const btnToggle = document.getElementById('btn-toggle');

    if (isRegistering) {
        nameInput.classList.remove('hidden');
        genderInput.classList.remove('hidden');
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
};

// Selección visual de género
window.selectGender = function (gender, element) {
    document.getElementById('selected-gender').value = gender;
    document.querySelectorAll('.gender-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
};

window.handleLogin = async function () {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const btn = document.getElementById('btn-login');

    // CORRECCIÓN 3: Validar campos vacíos
    if (!email || !password) {
        if (window.showToast) {
            window.showToast('Por favor completa todos los campos', 'error');
        } else {
            alert('Por favor completa todos los campos');
        }
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (window.showToast) {
            window.showToast('Correo electrónico inválido', 'error');
        } else {
            alert('Correo electrónico inválido');
        }
        return;
    }

    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerText = 'Iniciando...';

    try {
        const { data, error } = await window.db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('Error de login:', error);

            // CORRECCIÓN 3: Mensajes específicos según el error
            let errorMessage = 'Error al iniciar sesión';

            if (error.message.includes('Invalid login credentials') ||
                error.message.includes('Invalid email or password')) {
                errorMessage = 'Correo o contraseña incorrectos';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Por favor confirma tu correo electrónico';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'Demasiados intentos. Espera un momento';
            } else if (error.message.includes('User not found')) {
                errorMessage = 'No existe una cuenta con este correo';
            }

            if (window.showToast) {
                window.showToast(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }

            btn.disabled = false;
            btn.innerText = originalText;
            return;
        }

        if (window.showToast) {
            window.showToast('Bienvenido!', 'success');
        }

        setTimeout(() => window.location.reload(), 800);

    } catch (e) {
        console.error('Error inesperado:', e);
        if (window.showToast) {
            window.showToast('Error de conexión. Intenta de nuevo', 'error');
        } else {
            alert('Error de conexión. Intenta de nuevo');
        }
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

    // CORRECCIÓN 3: Validar campos vacíos
    if (!name || !email || !password) {
        if (window.showToast) {
            window.showToast('Por favor completa todos los campos', 'error');
        } else {
            alert('Por favor completa todos los campos');
        }
        return;
    }

    if (!gender) {
        if (window.showToast) {
            window.showToast('Selecciona si eres Hombre o Mujer', 'error');
        } else {
            alert('Selecciona si eres Hombre o Mujer');
        }
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (window.showToast) {
            window.showToast('Correo electrónico inválido', 'error');
        } else {
            alert('Correo electrónico inválido');
        }
        return;
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
        if (window.showToast) {
            window.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        } else {
            alert('La contraseña debe tener al menos 6 caracteres');
        }
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Creando cuenta...';

    try {
        const { data, error } = await window.db.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            console.error('Error de registro:', error);

            // CORRECCIÓN 3: Mensajes específicos según el error
            let errorMessage = 'Error al crear la cuenta';

            if (error.message.includes('already registered') ||
                error.message.includes('User already registered')) {
                errorMessage = 'Este correo ya está registrado';
            } else if (error.message.includes('Password should be')) {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres';
            } else if (error.message.includes('Invalid email')) {
                errorMessage = 'Formato de correo inválido';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'Demasiados intentos. Espera un momento';
            }

            if (window.showToast) {
                window.showToast(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }

            btn.disabled = false;
            btn.innerText = 'Crear Cuenta';
            return;
        }

        if (data.user) {
            // Guardar género y nombre
            const { error: profileError } = await window.db
                .from('profiles')
                .insert([{
                    id: data.user.id,
                    email: email,
                    full_name: name,
                    gender: gender,
                    xp: 0
                }]);

            if (profileError) {
                console.error(profileError);
                if (window.showToast) {
                    window.showToast('Cuenta creada pero hubo un error en el perfil', 'error');
                }
            } else {
                if (window.showToast) {
                    window.showToast('Cuenta creada con éxito! Iniciando sesión...', 'success');
                }
                setTimeout(() => window.location.reload(), 1000);
                return;
            }
        }

    } catch (e) {
        console.error('Error inesperado:', e);
        if (window.showToast) {
            window.showToast('Error de conexión. Intenta de nuevo', 'error');
        } else {
            alert('Error de conexión. Intenta de nuevo');
        }
        btn.disabled = false;
        btn.innerText = 'Crear Cuenta';
    }
};

window.handleLogout = async function () {
    try {
        // CORRECCIÓN 4: Mostrar loader antes de cerrar sesión
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#13151b;color:white;font-size:1.2rem;"><div>Cerrando sesión...</div></div>';
        await window.db.auth.signOut();
        setTimeout(() => window.location.reload(), 500);
    } catch (e) {
        console.error(e);
        window.location.reload();
    }
};