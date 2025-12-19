// ==========================================
// AUTENTICACIÓN (LOGIN + REGISTRO)
// ==========================================

let isRegistering = false;

window.toggleRegisterMode = function() {
  isRegistering = !isRegistering;

  const nameInput = document.getElementById('full-name');
  const genderInput = document.getElementById('gender-selector');
  const btnLogin = document.getElementById('btn-login');
  const btnToggle = document.getElementById('btn-toggle');

  // Verificar que los elementos existen antes de manipularlos
  if (!nameInput || !genderInput || !btnLogin || !btnToggle) {
    console.error('Error: Elementos de formulario no encontrados');
    return;
  }

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
window.selectGender = function(gender, element) {
  const selectedInput = document.getElementById('selected-gender');
  if (!selectedInput) {
    console.error('Error: Elemento selected-gender no encontrado');
    return;
  }

  selectedInput.value = gender;
  document.querySelectorAll('.gender-option').forEach(el => el.classList.remove('selected'));
  if (element) {
    element.classList.add('selected');
  }
};

window.handleLogin = async function() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btn = document.getElementById('btn-login');

  // Verificar que los elementos existen
  if (!emailInput || !passwordInput) {
    console.error('Error: Campos de email o password no encontrados');
    alert('Error: No se encontraron los campos del formulario');
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // VALIDACIÓN: Campos vacíos
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

  // Deshabilitar botón
  if (btn) {
    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerText = 'Iniciando...';
  }

  try {
    const { data, error } = await window.db.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Error de login:', error);

      // Mensajes específicos según el error
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

      // Rehabilitar botón
      if (btn) {
        btn.disabled = false;
        btn.innerText = isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión';
      }
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

    // Rehabilitar botón
    if (btn) {
      btn.disabled = false;
      btn.innerText = isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión';
    }
  }
};

window.handleSignUp = async function() {
  const nameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const genderInput = document.getElementById('selected-gender');
  const btn = document.getElementById('btn-login');

  // Verificar que los elementos existen
  if (!nameInput || !emailInput || !passwordInput || !genderInput) {
    console.error('Error: Campos del formulario no encontrados');
    alert('Error: No se encontraron todos los campos del formulario');
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const gender = genderInput.value;

  // VALIDACIÓN: Campos vacíos
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

  // Deshabilitar botón
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Creando cuenta...';
  }

  try {
    const { data, error } = await window.db.auth.signUp({
      email: email,
      password: password
    });

    if (error) {
      console.error('Error de registro:', error);

      // Mensajes específicos según el error
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

      // Rehabilitar botón
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Crear Cuenta';
      }
      return;
    }

    if (data.user) {
      // Guardar género y nombre en la base de datos
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
        console.error('Error al crear perfil:', profileError);
        if (window.showToast) {
          window.showToast('Cuenta creada pero hubo un error en el perfil', 'error');
        } else {
          alert('Cuenta creada pero hubo un error en el perfil');
        }
      } else {
        if (window.showToast) {
          window.showToast('Cuenta creada con éxito! Iniciando sesión...', 'success');
        } else {
          alert('Cuenta creada con éxito!');
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

    // Rehabilitar botón
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Crear Cuenta';
    }
  }
};

window.handleLogout = async function() {
  try {
    // Mostrar loader antes de cerrar sesión
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#13151b;color:white;font-size:1.2rem;"><div>Cerrando sesión...</div></div>';
    await window.db.auth.signOut();
    setTimeout(() => window.location.reload(), 500);
  } catch (e) {
    console.error('Error al cerrar sesión:', e);
    window.location.reload();
  }
};
