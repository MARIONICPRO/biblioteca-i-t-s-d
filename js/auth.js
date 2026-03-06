// Verificar sesión
function verificarSesion() {
    if(!sessionStorage.getItem("usuarioId")) {
        window.location.href = "index.html"
    }
}

// Cerrar sesión
window.cerrarSesion = function() {
    sessionStorage.clear()
    window.location.href = "index.html"
}

// Iniciar sesión
window.iniciarSesion = async function() {
    let email = document.getElementById("emailLogin").value.trim()
    let password = document.getElementById("passwordLogin").value.trim()
    let mensajeLogin = document.getElementById("mensajeLogin")

    if(email === "" || password === ""){
        mensajeLogin.innerText = "Complete todos los campos"
        mensajeLogin.style.color = "red"
        return
    }

    try {
        const { data: usuarios, error } = await cliente
            .from("usuarios")
            .select("*")
            .eq("email", email)
            .eq("password", password)
            .eq("estado", true)

        if(error) throw error

        if(usuarios && usuarios.length > 0) {
            const usuario = usuarios[0]
            
            sessionStorage.setItem("usuarioId", usuario.id)
            sessionStorage.setItem("usuarioNombre", usuario.nombre)
            sessionStorage.setItem("usuarioRol", usuario.rol)
            
            mensajeLogin.innerText = `¡Bienvenido ${usuario.nombre}!`
            mensajeLogin.style.color = "green"
            
            setTimeout(() => {
                window.location.href = "dashboard.html"
            }, 1000)
        } else {
            mensajeLogin.innerText = "Email o contraseña incorrectos"
            mensajeLogin.style.color = "red"
        }
    } catch(error) {
        console.log("Error:", error)
        mensajeLogin.innerText = "Error en el sistema"
        mensajeLogin.style.color = "red"
    }
}

// Crear cuenta
window.crearCuenta = async function(){
    let nombre = document.getElementById("nombre").value.trim()
    let email = document.getElementById("emailRegistro").value.trim()
    let password = document.getElementById("passwordRegistro").value.trim()
    let mensaje = document.getElementById("mensaje")

    if(nombre === "" || email === "" || password === ""){
        mensaje.innerText = "Complete todos los campos"
        mensaje.style.color = "red"
        return
    }

    if(password.length < 6) {
        mensaje.innerText = "La contraseña debe tener al menos 6 caracteres"
        mensaje.style.color = "red"
        return
    }

    try {
        const { error } = await cliente
            .from("usuarios")
            .insert([
                {
                    nombre: nombre,
                    email: email,
                    password: password,
                    rol: 'bibliotecario',
                    estado: true
                }
            ])

        if(error){
            mensaje.innerText = error.message
            mensaje.style.color = "red"
            return
        }

        mensaje.innerText = "Cuenta creada correctamente"
        mensaje.style.color = "green"
        
        document.getElementById("nombre").value = ""
        document.getElementById("emailRegistro").value = ""
        document.getElementById("passwordRegistro").value = ""
        
        // Cambiar a pestaña de login después de 2 segundos
        setTimeout(() => {
            mostrarTab('login')
        }, 2000)
        
    } catch(error) {
        mensaje.innerText = "Error al crear la cuenta"
        mensaje.style.color = "red"
    }
}