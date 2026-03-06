// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
    verificarSesion()
    cargarTodosReportes()
    cargarSelectoresConsulta()
})

// Cargar todos los reportes
async function cargarTodosReportes() {
    await Promise.all([
        cargarLibrosDisponibles(),
        cargarPrestamosActivos(),
        cargarPrestamosRetrasados(),
        cargarEstadisticas()
    ])
}

// Reporte 1: Libros disponibles
async function cargarLibrosDisponibles() {
    try {
        const { data: libros, error } = await cliente
            .from('libros')
            .select('*')
            .eq('estado', true)
            .gt('cantidad_disponible', 0)
            .order('titulo')

        if(error) throw error

        const container = document.getElementById('librosDisponibles')
        
        if(!libros || libros.length === 0) {
            container.innerHTML = '<p class="text-center">No hay libros disponibles</p>'
            return
        }

        let html = '<table class="reporte-tabla"><tr><th>Título</th><th>Autor</th><th>Disponibles</th></tr>'
        
        libros.forEach(libro => {
            html += `
                <tr>
                    <td>${libro.titulo}</td>
                    <td>${libro.autor || '-'}</td>
                    <td class="text-center">${libro.cantidad_disponible}</td>
                </tr>
            `
        })
        
        html += '</table><p class="total">Total: ' + libros.length + ' títulos</p>'
        container.innerHTML = html

    } catch(error) {
        console.error('Error:', error)
        document.getElementById('librosDisponibles').innerHTML = 
            '<p class="error">Error al cargar datos</p>'
    }
}

// Reporte 2: Préstamos activos
async function cargarPrestamosActivos() {
    try {
        const { data: prestamos, error } = await cliente
            .from('prestamos')
            .select(`
                *,
                estudiantes:estudiante_id (nombre, apellido),
                libros:libro_id (titulo)
            `)
            .eq('estado', 'activo')
            .order('fecha_estimada_devolucion')

        if(error) throw error

        const container = document.getElementById('prestamosActivosReporte')
        
        if(!prestamos || prestamos.length === 0) {
            container.innerHTML = '<p class="text-center">No hay préstamos activos</p>'
            return
        }

        let html = '<table class="reporte-tabla"><tr><th>Estudiante</th><th>Libro</th><th>Devuelve</th></tr>'
        
        prestamos.forEach(p => {
            html += `
                <tr>
                    <td>${p.estudiantes.nombre} ${p.estudiantes.apellido}</td>
                    <td>${p.libros.titulo}</td>
                    <td>${p.fecha_estimada_devolucion}</td>
                </tr>
            `
        })
        
        html += '</table><p class="total">Total: ' + prestamos.length + ' préstamos</p>'
        container.innerHTML = html

    } catch(error) {
        console.error('Error:', error)
        document.getElementById('prestamosActivosReporte').innerHTML = 
            '<p class="error">Error al cargar datos</p>'
    }
}

// Reporte 3: Préstamos retrasados
async function cargarPrestamosRetrasados() {
    try {
        const { data: prestamos, error } = await cliente
            .from('prestamos')
            .select(`
                *,
                estudiantes:estudiante_id (nombre, apellido, identificacion),
                libros:libro_id (titulo)
            `)
            .eq('estado', 'retrasado')
            .order('fecha_estimada_devolucion')

        if(error) throw error

        const container = document.getElementById('prestamosRetrasados')
        
        if(!prestamos || prestamos.length === 0) {
            container.innerHTML = '<p class="text-center">No hay préstamos retrasados</p>'
            return
        }

        let html = '<table class="reporte-tabla"><tr><th>Estudiante</th><th>Libro</th><th>Debía devolver</th></tr>'
        
        prestamos.forEach(p => {
            html += `
                <tr>
                    <td>${p.estudiantes.nombre} ${p.estudiantes.apellido}<br>
                        <small>ID: ${p.estudiantes.identificacion}</small>
                    </td>
                    <td>${p.libros.titulo}</td>
                    <td class="retrasado">${p.fecha_estimada_devolucion}</td>
                </tr>
            `
        })
        
        html += '</table><p class="total">Total: ' + prestamos.length + ' retrasados</p>'
        container.innerHTML = html

    } catch(error) {
        console.error('Error:', error)
        document.getElementById('prestamosRetrasados').innerHTML = 
            '<p class="error">Error al cargar datos</p>'
    }
}

// Reporte 4: Estadísticas generales
async function cargarEstadisticas() {
    try {
        // Total estudiantes
        const { count: totalEstudiantes } = await cliente
            .from('estudiantes')
            .select('*', { count: 'exact', head: true })

        // Total libros
        const { count: totalLibros } = await cliente
            .from('libros')
            .select('*', { count: 'exact', head: true })

        // Total préstamos
        const { count: totalPrestamos } = await cliente
            .from('prestamos')
            .select('*', { count: 'exact', head: true })

        // Libros más prestados (top 5)
        const { data: topLibros } = await cliente
            .from('prestamos')
            .select('libro_id, libros!inner(titulo)')
            .then(async ({ data }) => {
                // Agrupar manualmente
                const conteo = {}
                data?.forEach(p => {
                    const id = p.libro_id
                    conteo[id] = conteo[id] || { count: 0, titulo: p.libros.titulo }
                    conteo[id].count++
                })
                
                return Object.entries(conteo)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
            })

        const container = document.getElementById('estadisticas')
        
        let html = `
            <div class="stat-item">
                <strong>Estudiantes:</strong> ${totalEstudiantes || 0}
            </div>
            <div class="stat-item">
                <strong>Libros:</strong> ${totalLibros || 0}
            </div>
            <div class="stat-item">
                <strong>Préstamos totales:</strong> ${totalPrestamos || 0}
            </div>
        `

        if(topLibros && topLibros.length > 0) {
            html += '<h4>📈 Libros más prestados:</h4><ol>'
            topLibros.forEach(([id, data]) => {
                html += `<li>${data.titulo} (${data.count} veces)</li>`
            })
            html += '</ol>'
        }

        container.innerHTML = html

    } catch(error) {
        console.error('Error:', error)
        document.getElementById('estadisticas').innerHTML = 
            '<p class="error">Error al cargar datos</p>'
    }
}

// Cargar selectores para consultas
async function cargarSelectoresConsulta() {
    try {
        // Cargar estudiantes
        const { data: estudiantes } = await cliente
            .from('estudiantes')
            .select('id, identificacion, nombre, apellido')
            .order('apellido')

        const selectEst = document.getElementById('estudianteConsulta')
        selectEst.innerHTML = '<option value="">Seleccionar estudiante</option>'
        
        estudiantes?.forEach(est => {
            const option = document.createElement('option')
            option.value = est.id
            option.textContent = `${est.identificacion} - ${est.nombre} ${est.apellido}`
            selectEst.appendChild(option)
        })

        // Cargar libros
        const { data: libros } = await cliente
            .from('libros')
            .select('id, codigo_libro, titulo')
            .order('titulo')

        const selectLib = document.getElementById('libroConsulta')
        selectLib.innerHTML = '<option value="">Seleccionar libro</option>'
        
        libros?.forEach(lib => {
            const option = document.createElement('option')
            option.value = lib.id
            option.textContent = `${lib.codigo_libro} - ${lib.titulo}`
            selectLib.appendChild(option)
        })

    } catch(error) {
        console.error('Error cargando selectores:', error)
    }
}

// Consultar historial por estudiante
window.consultarHistorialEstudiante = async function() {
    const estudianteId = document.getElementById('estudianteConsulta').value
    
    if(!estudianteId) {
        alert('Seleccione un estudiante')
        return
    }

    try {
        const { data: prestamos, error } = await cliente
            .from('prestamos')
            .select(`
                *,
                libros:libro_id (codigo_libro, titulo)
            `)
            .eq('estudiante_id', estudianteId)
            .order('fecha_prestamo', { ascending: false })

        if(error) throw error

        const container = document.getElementById('historialEstudiante')
        
        if(!prestamos || prestamos.length === 0) {
            container.innerHTML = '<p class="text-center">El estudiante no tiene historial de préstamos</p>'
        } else {
            let html = '<h4>Historial de préstamos</h4><table><tr><th>Libro</th><th>Fecha préstamo</th><th>Fecha devolución</th><th>Estado</th></tr>'
            
            prestamos.forEach(p => {
                html += `
                    <tr>
                        <td>${p.libros.titulo} (${p.libros.codigo_libro})</td>
                        <td>${p.fecha_prestamo}</td>
                        <td>${p.fecha_real_devolucion || '-'}</td>
                        <td>
                            <span class="badge ${p.estado === 'devuelto' ? 'badge-active' : 'badge-inactive'}">
                                ${p.estado}
                            </span>
                        </td>
                    </tr>
                `
            })
            
            html += '</table>'
            container.innerHTML = html
        }
        
        container.style.display = 'block'

    } catch(error) {
        console.error('Error:', error)
        alert('Error al consultar historial')
    }
}

// Consultar historial por libro
window.consultarHistorialLibro = async function() {
    const libroId = document.getElementById('libroConsulta').value
    
    if(!libroId) {
        alert('Seleccione un libro')
        return
    }

    try {
        const { data: prestamos, error } = await cliente
            .from('prestamos')
            .select(`
                *,
                estudiantes:estudiante_id (identificacion, nombre, apellido)
            `)
            .eq('libro_id', libroId)
            .order('fecha_prestamo', { ascending: false })

        if(error) throw error

        const container = document.getElementById('historialLibro')
        
        if(!prestamos || prestamos.length === 0) {
            container.innerHTML = '<p class="text-center">El libro no tiene historial de préstamos</p>'
        } else {
            let html = '<h4>Historial de préstamos</h4><table><tr><th>Estudiante</th><th>Fecha préstamo</th><th>Fecha devolución</th><th>Estado</th></tr>'
            
            prestamos.forEach(p => {
                html += `
                    <tr>
                        <td>${p.estudiantes.nombre} ${p.estudiantes.apellido}<br>
                            <small>${p.estudiantes.identificacion}</small>
                        </td>
                        <td>${p.fecha_prestamo}</td>
                        <td>${p.fecha_real_devolucion || '-'}</td>
                        <td>
                            <span class="badge ${p.estado === 'devuelto' ? 'badge-active' : 'badge-inactive'}">
                                ${p.estado}
                            </span>
                        </td>
                    </tr>
                `
            })
            
            html += '</table>'
            container.innerHTML = html
        }
        
        container.style.display = 'block'

    } catch(error) {
        console.error('Error:', error)
        alert('Error al consultar historial')
    }
}