// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
    verificarSesion()
    cargarEstudiantes()
})

// Cargar todos los estudiantes
async function cargarEstudiantes() {
    try {
        const { data: estudiantes, error } = await cliente
            .from('estudiantes')
            .select('*')
            .order('id', { ascending: false })

        if(error) throw error

        const tbody = document.getElementById('estudiantesBody')
        
        if(!estudiantes || estudiantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay estudiantes registrados</td></tr>'
            return
        }

        tbody.innerHTML = ''

        estudiantes.forEach(est => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${est.id}</td>
                <td>${est.identificacion}</td>
                <td>${est.nombre} ${est.apellido}</td>
                <td>${est.curso || '-'}</td>
                <td>${est.correo || '-'}</td>
                <td>${est.telefono || '-'}</td>
                <td>
                    <span class="badge ${est.estado ? 'badge-active' : 'badge-inactive'}">
                        ${est.estado ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="acciones">
                    <button onclick="editarEstudiante(${est.id})" class="btn-edit" title="Editar">✏️</button>
                    <button onclick="toggleEstadoEstudiante(${est.id}, ${est.estado})" class="btn-toggle" title="${est.estado ? 'Desactivar' : 'Activar'}">
                        ${est.estado ? '🔴' : '🟢'}
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        })

        // Agregar evento de búsqueda
        document.getElementById('buscarEstudiante').addEventListener('keyup', filtrarEstudiantes)
        
    } catch(error) {
        console.error('Error:', error)
        document.getElementById('estudiantesBody').innerHTML = 
            '<tr><td colspan="8" class="text-center error">Error al cargar estudiantes</td></tr>'
    }
}

// Guardar estudiante
window.guardarEstudiante = async function() {
    const id = document.getElementById('estudianteId').value
    const datos = {
        identificacion: document.getElementById('identificacion').value.trim(),
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        curso: document.getElementById('curso').value.trim() || null,
        correo: document.getElementById('correo').value.trim() || null,
        telefono: document.getElementById('telefono').value.trim() || null,
        estado: document.getElementById('estado').checked
    }

    // Validar campos obligatorios
    if(!datos.identificacion || !datos.nombre || !datos.apellido) {
        mostrarMensaje('Identificación, nombre y apellido son obligatorios', 'error')
        return
    }

    try {
        let error
        if(id) {
            // Actualizar
            ({ error } = await cliente
                .from('estudiantes')
                .update(datos)
                .eq('id', id))
        } else {
            // Insertar
            ({ error } = await cliente
                .from('estudiantes')
                .insert([datos]))
        }

        if(error) throw error

        mostrarMensaje(id ? '✅ Estudiante actualizado' : '✅ Estudiante registrado', 'success')
        limpiarFormulario()
        cargarEstudiantes()
        
    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error: ' + (error.message || 'Error al guardar'), 'error')
    }
}

// Editar estudiante
window.editarEstudiante = async function(id) {
    try {
        const { data, error } = await cliente
            .from('estudiantes')
            .select('*')
            .eq('id', id)
            .single()

        if(error) throw error

        document.getElementById('estudianteId').value = data.id
        document.getElementById('identificacion').value = data.identificacion
        document.getElementById('nombre').value = data.nombre
        document.getElementById('apellido').value = data.apellido
        document.getElementById('curso').value = data.curso || ''
        document.getElementById('correo').value = data.correo || ''
        document.getElementById('telefono').value = data.telefono || ''
        document.getElementById('estado').checked = data.estado
        
        document.getElementById('formTitulo').textContent = 'Editar Estudiante'
        
        // Scroll al formulario
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' })
        
    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error al cargar estudiante', 'error')
    }
}

// Cambiar estado
window.toggleEstadoEstudiante = async function(id, estadoActual) {
    if(!confirm(`¿Está seguro de ${estadoActual ? 'desactivar' : 'activar'} este estudiante?`)) return

    try {
        const { error } = await cliente
            .from('estudiantes')
            .update({ estado: !estadoActual })
            .eq('id', id)

        if(error) throw error

        mostrarMensaje(`✅ Estudiante ${!estadoActual ? 'activado' : 'desactivado'}`, 'success')
        cargarEstudiantes()
        
    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error al cambiar estado', 'error')
    }
}

// Limpiar formulario
window.limpiarFormulario = function() {
    document.getElementById('estudianteId').value = ''
    document.getElementById('identificacion').value = ''
    document.getElementById('nombre').value = ''
    document.getElementById('apellido').value = ''
    document.getElementById('curso').value = ''
    document.getElementById('correo').value = ''
    document.getElementById('telefono').value = ''
    document.getElementById('estado').checked = true
    document.getElementById('formTitulo').textContent = 'Registrar Estudiante'
}

// Filtrar estudiantes
function filtrarEstudiantes() {
    const texto = document.getElementById('buscarEstudiante').value.toLowerCase()
    const filas = document.querySelectorAll('#estudiantesBody tr')
    
    filas.forEach(fila => {
        const textoFila = fila.textContent.toLowerCase()
        fila.style.display = textoFila.includes(texto) ? '' : 'none'
    })
}

// Mostrar mensajes
function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje')
    mensaje.textContent = texto
    mensaje.className = `message ${tipo}`
    setTimeout(() => {
        mensaje.textContent = ''
        mensaje.className = 'message'
    }, 3000)
}