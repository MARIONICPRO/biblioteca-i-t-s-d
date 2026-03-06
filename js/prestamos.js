// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
    verificarSesion()
    cargarSelectores()
    cargarPrestamosActivos()
    cargarHistorial()
    
    // Establecer fecha actual por defecto
    const hoy = new Date().toISOString().split('T')[0]
    document.getElementById('fecha_prestamo').value = hoy
    
    // Calcular fecha estimada (7 días después)
    const fechaEstimada = new Date()
    fechaEstimada.setDate(fechaEstimada.getDate() + 7)
    document.getElementById('fecha_estimada_devolucion').value = fechaEstimada.toISOString().split('T')[0]
})

// Cargar selectores de estudiantes y libros
async function cargarSelectores() {
    try {
        // Cargar estudiantes activos
        const { data: estudiantes, error: errorEst } = await cliente
            .from('estudiantes')
            .select('id, identificacion, nombre, apellido')
            .eq('estado', true)
            .order('apellido')

        if(errorEst) throw errorEst

        const selectEst = document.getElementById('estudiante_id')
        selectEst.innerHTML = '<option value="">Seleccionar Estudiante *</option>'
        
        estudiantes.forEach(est => {
            const option = document.createElement('option')
            option.value = est.id
            option.textContent = `${est.identificacion} - ${est.nombre} ${est.apellido}`
            selectEst.appendChild(option)
        })

        // Cargar libros disponibles
        const { data: libros, error: errorLib } = await cliente
            .from('libros')
            .select('id, codigo_libro, titulo, cantidad_disponible')
            .eq('estado', true)
            .gt('cantidad_disponible', 0)
            .order('titulo')

        if(errorLib) throw errorLib

        const selectLib = document.getElementById('libro_id')
        selectLib.innerHTML = '<option value="">Seleccionar Libro *</option>'
        
        libros.forEach(lib => {
            const option = document.createElement('option')
            option.value = lib.id
            option.textContent = `${lib.codigo_libro} - ${lib.titulo} (${lib.cantidad_disponible} disp.)`
            selectLib.appendChild(option)
        })

    } catch(error) {
        console.error('Error cargando selectores:', error)
        mostrarMensaje('Error al cargar datos', 'error')
    }
}

// Registrar nuevo préstamo
window.registrarPrestamo = async function() {
    const estudiante_id = document.getElementById('estudiante_id').value
    const libro_id = document.getElementById('libro_id').value
    const fecha_prestamo = document.getElementById('fecha_prestamo').value
    const fecha_estimada_devolucion = document.getElementById('fecha_estimada_devolucion').value
    const observaciones = document.getElementById('observaciones').value.trim()

    // Validaciones
    if(!estudiante_id || !libro_id || !fecha_prestamo || !fecha_estimada_devolucion) {
        mostrarMensaje('Complete todos los campos obligatorios', 'error')
        return
    }

    try {
        // Verificar que el estudiante no tenga más de 3 préstamos activos
        const { count: prestamosActivos, error: countError } = await cliente
            .from('prestamos')
            .select('*', { count: 'exact', head: true })
            .eq('estudiante_id', estudiante_id)
            .eq('estado', 'activo')

        if(countError) throw countError

        if(prestamosActivos >= 3) {
            mostrarMensaje('El estudiante ya tiene 3 préstamos activos (máximo permitido)', 'error')
            return
        }

        // Obtener datos del libro para verificar disponibilidad
        const { data: libro, error: libroError } = await cliente
            .from('libros')
            .select('cantidad_disponible, titulo')
            .eq('id', libro_id)
            .single()

        if(libroError) throw libroError

        if(libro.cantidad_disponible <= 0) {
            mostrarMensaje('No hay ejemplares disponibles de este libro', 'error')
            return
        }

        // Registrar préstamo
        const { error: prestamoError } = await cliente
            .from('prestamos')
            .insert([{
                estudiante_id: estudiante_id,
                libro_id: libro_id,
                fecha_prestamo: fecha_prestamo,
                fecha_estimada_devolucion: fecha_estimada_devolucion,
                observaciones: observaciones || null,
                estado: 'activo'
            }])

        if(prestamoError) throw prestamoError

        // Actualizar cantidad disponible del libro
        const { error: updateError } = await cliente
            .from('libros')
            .update({ cantidad_disponible: libro.cantidad_disponible - 1 })
            .eq('id', libro_id)

        if(updateError) throw updateError

        mostrarMensaje('✅ Préstamo registrado correctamente', 'success')
        
        // Limpiar formulario
        document.getElementById('estudiante_id').value = ''
        document.getElementById('libro_id').value = ''
        document.getElementById('observaciones').value = ''
        
        // Recargar datos
        cargarSelectores()
        cargarPrestamosActivos()
        cargarHistorial()

    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error al registrar préstamo', 'error')
    }
}

// Cargar préstamos activos
async function cargarPrestamosActivos() {
    try {
        const { data: prestamos, error } = await cliente
            .from('prestamos')
            .select(`
                *,
                estudiantes:estudiante_id (identificacion, nombre, apellido),
                libros:libro_id (codigo_libro, titulo)
            `)
            .in('estado', ['activo', 'retrasado'])
            .order('fecha_prestamo', { ascending: false })

        if(error) throw error

        const tbody = document.getElementById('prestamosActivosBody')
        
        if(!prestamos || prestamos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay préstamos activos</td></tr>'
            return
        }

        const hoy = new Date()
        tbody.innerHTML = ''

        for(const p of prestamos) {
            // Verificar si está retrasado
            const fechaEstimada = new Date(p.fecha_estimada_devolucion)
            const estaRetrasado = fechaEstimada < hoy && p.estado === 'activo'
            
            if(estaRetrasado) {
                // Actualizar estado a retrasado
                await cliente
                    .from('prestamos')
                    .update({ estado: 'retrasado' })
                    .eq('id', p.id)
                p.estado = 'retrasado'
            }

            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${p.estudiantes.identificacion}<br>
                    <small>${p.estudiantes.nombre} ${p.estudiantes.apellido}</small>
                </td>
                <td>${p.libros.codigo_libro}<br>
                    <small>${p.libros.titulo}</small>
                </td>
                <td>${p.fecha_prestamo}</td>
                <td>${p.fecha_estimada_devolucion}</td>
                <td>
                    <span class="badge ${p.estado === 'activo' ? 'badge-active' : 'badge-inactive'}">
                        ${p.estado === 'activo' ? 'Activo' : 'Retrasado'}
                    </span>
                </td>
                <td>
                    <button onclick="registrarDevolucion(${p.id}, ${p.libro_id})" class="btn-primary">
                        ↩️ Devolver
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        }

    } catch(error) {
        console.error('Error:', error)
        document.getElementById('prestamosActivosBody').innerHTML = 
            '<tr><td colspan="6" class="text-center error">Error al cargar préstamos</td></tr>'
    }
}

// Registrar devolución
window.registrarDevolucion = async function(prestamoId, libroId) {
    if(!confirm('¿Registrar devolución de este libro?')) return

    try {
        const hoy = new Date().toISOString().split('T')[0]

        // Actualizar préstamo
        const { error: prestamoError } = await cliente
            .from('prestamos')
            .update({
                fecha_real_devolucion: hoy,
                estado: 'devuelto'
            })
            .eq('id', prestamoId)

        if(prestamoError) throw prestamoError

        // Incrementar cantidad disponible del libro
        const { data: libro, error: libroError } = await cliente
            .from('libros')
            .select('cantidad_disponible')
            .eq('id', libroId)
            .single()

        if(libroError) throw libroError

        const { error: updateError } = await cliente
            .from('libros')
            .update({ cantidad_disponible: libro.cantidad_disponible + 1 })
            .eq('id', libroId)

        if(updateError) throw updateError

        mostrarMensaje('✅ Devolución registrada correctamente', 'success')
        
        // Recargar datos
        cargarPrestamosActivos()
        cargarHistorial()
        cargarSelectores()

    } catch(error) {
        console.error('Error:', error)
        mostrarMensaje('Error al registrar devolución', 'error')
    }
}

// Cargar historial de préstamos
async function cargarHistorial() {
    try {
        const { data: prestamos, error } = await cliente
            .from('prestamos')
            .select(`
                *,
                estudiantes:estudiante_id (identificacion, nombre, apellido),
                libros:libro_id (codigo_libro, titulo)
            `)
            .in('estado', ['devuelto', 'retrasado'])
            .order('fecha_prestamo', { ascending: false })
            .limit(50)

        if(error) throw error

        const tbody = document.getElementById('historialBody')
        
        if(!prestamos || prestamos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay historial</td></tr>'
            return
        }

        tbody.innerHTML = ''

        prestamos.forEach(p => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${p.estudiantes.identificacion}<br>
                    <small>${p.estudiantes.nombre} ${p.estudiantes.apellido}</small>
                </td>
                <td>${p.libros.codigo_libro}<br>
                    <small>${p.libros.titulo}</small>
                </td>
                <td>${p.fecha_prestamo}</td>
                <td>${p.fecha_real_devolucion || '-'}</td>
                <td>
                    <span class="badge ${p.estado === 'devuelto' ? 'badge-active' : 'badge-inactive'}">
                        ${p.estado === 'devuelto' ? 'Devuelto' : 'Retrasado'}
                    </span>
                </td>
                <td>${p.observaciones || '-'}</td>
            `
            tbody.appendChild(tr)
        })

        document.getElementById('buscarHistorial').addEventListener('keyup', filtrarHistorial)

    } catch(error) {
        console.error('Error:', error)
        document.getElementById('historialBody').innerHTML = 
            '<tr><td colspan="6" class="text-center error">Error al cargar historial</td></tr>'
    }
}

// Filtrar historial
function filtrarHistorial() {
    const texto = document.getElementById('buscarHistorial').value.toLowerCase()
    const filas = document.querySelectorAll('#historialBody tr')
    
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