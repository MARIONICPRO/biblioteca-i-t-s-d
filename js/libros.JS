// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
    verificarSesion()
    cargarLibros()
})

// Cargar todos los libros
async function cargarLibros() {
    try {
        const { data: libros, error } = await cliente
            .from('libros')
            .select('*')
            .order('id', { ascending: false })

        if(error) throw error

        const tbody = document.getElementById('librosBody')
        
        if(!libros || libros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay libros registrados</td></tr>'
            return
        }

        tbody.innerHTML = ''

        libros.forEach(libro => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${libro.codigo_libro}</td>
                <td>${libro.titulo}</td>
                <td>${libro.autor || '-'}</td>
                <td>${libro.categoria || '-'}</td>
                <td>${libro.cantidad_total}</td>
                <td>
                    <span class="badge ${libro.cantidad_disponible > 0 ? 'badge-active' : 'badge-inactive'}">
                        ${libro.cantidad_disponible}
                    </span>
                </td>
                <td>
                    <span class="badge ${libro.estado ? 'badge-active' : 'badge-inactive'}">
                        ${libro.estado ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="acciones">
                    <button onclick="editarLibro(${libro.id})" class="btn-edit" title="Editar">✏️</button>
                    <button onclick="toggleEstadoLibro(${libro.id}, ${libro.estado})" class="btn-toggle" title="${libro.estado ? 'Desactivar' : 'Activar'}">
                        ${libro.estado ? '🔴' : '🟢'}
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        })

        document.getElementById('buscarLibro').addEventListener('keyup', filtrarLibros)
        
    } catch(error) {
        console.error('Error:', error)
        document.getElementById('librosBody').innerHTML = 
            '<tr><td colspan="8" class="text-center error">Error al cargar libros</td></tr>'
    }
}

// Guardar libro
window.guardarLibro = async function() {
    const id = document.getElementById('libroId').value
    const cantidad_total = parseInt(document.getElementById('cantidad_total').value) || 0
    const cantidad_disponible = parseInt(document.getElementById('cantidad_disponible').value) || 0
    
    const datos = {
        codigo_libro: document.getElementById('codigo_libro').value.trim(),
        titulo: document.getElementById('titulo').value.trim(),
        autor: document.getElementById('autor').value.trim() || null,
        editorial: document.getElementById('editorial').value.trim() || null,
        anio_publicacion: parseInt(document.getElementById('anio_publicacion').value) || null,
        isbn: document.getElementById('isbn').value.trim() || null,
        categoria: document.getElementById('categoria').value.trim() || null,
        cantidad_total: cantidad_total,
        cantidad_disponible: cantidad_disponible,
        estado: document.getElementById('estado').checked
    }

    // Validaciones
    if(!datos.codigo_libro || !datos.titulo) {
        mostrarMensaje('Código y título son obligatorios', 'error')
        return
    }

    if(cantidad_total <= 0) {
        mostrarMensaje('La cantidad total debe ser mayor a 0', 'error')
        return
    }

    if(cantidad_disponible > cantidad_total) {
        mostrarMensaje('La cantidad disponible no puede ser mayor a la total', 'error')
        return
    }

    try {
        let error
        if(id) {
            ({ error } = await cliente
                .from('libros')
                .update(datos)
                .eq('id', id))
        } else {
            ({ error } = await cliente
                .from('libros')
                .insert([datos]))
        }

        if(error) throw error

        mostrarMensaje(id ? '✅ Libro actualizado' : '✅ Libro registrado', 'success')
        limpiarFormulario()
        cargarLibros()
        
    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error: ' + (error.message || 'Error al guardar'), 'error')
    }
}

// Editar libro
window.editarLibro = async function(id) {
    try {
        const { data, error } = await cliente
            .from('libros')
            .select('*')
            .eq('id', id)
            .single()

        if(error) throw error

        document.getElementById('libroId').value = data.id
        document.getElementById('codigo_libro').value = data.codigo_libro
        document.getElementById('titulo').value = data.titulo
        document.getElementById('autor').value = data.autor || ''
        document.getElementById('editorial').value = data.editorial || ''
        document.getElementById('anio_publicacion').value = data.anio_publicacion || ''
        document.getElementById('isbn').value = data.isbn || ''
        document.getElementById('categoria').value = data.categoria || ''
        document.getElementById('cantidad_total').value = data.cantidad_total
        document.getElementById('cantidad_disponible').value = data.cantidad_disponible
        document.getElementById('estado').checked = data.estado
        
        document.getElementById('formTitulo').textContent = 'Editar Libro'
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' })
        
    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error al cargar libro', 'error')
    }
}

// Cambiar estado
window.toggleEstadoLibro = async function(id, estadoActual) {
    if(!confirm(`¿Está seguro de ${estadoActual ? 'desactivar' : 'activar'} este libro?`)) return

    try {
        const { error } = await cliente
            .from('libros')
            .update({ estado: !estadoActual })
            .eq('id', id)

        if(error) throw error

        mostrarMensaje(`✅ Libro ${!estadoActual ? 'activado' : 'desactivado'}`, 'success')
        cargarLibros()
        
    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error al cambiar estado', 'error')
    }
}

// Limpiar formulario
window.limpiarFormulario = function() {
    document.getElementById('libroId').value = ''
    document.getElementById('codigo_libro').value = ''
    document.getElementById('titulo').value = ''
    document.getElementById('autor').value = ''
    document.getElementById('editorial').value = ''
    document.getElementById('anio_publicacion').value = ''
    document.getElementById('isbn').value = ''
    document.getElementById('categoria').value = ''
    document.getElementById('cantidad_total').value = ''
    document.getElementById('cantidad_disponible').value = ''
    document.getElementById('estado').checked = true
    document.getElementById('formTitulo').textContent = 'Registrar Libro'
}

// Filtrar libros
function filtrarLibros() {
    const texto = document.getElementById('buscarLibro').value.toLowerCase()
    const filas = document.querySelectorAll('#librosBody tr')
    
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