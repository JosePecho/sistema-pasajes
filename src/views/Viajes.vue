<script setup>
import { ref, onMounted } from 'vue'
import {
  ref as dbRef,
  get,
  set,
  update,
  remove
} from 'firebase/database'
import { db } from '../services/firebase'

const viajes = ref([])
const buses = ref([])
const choferes = ref([])

const mostrarFormulario = ref(false)
const editando = ref(null)
const cargando = ref(true)

const formulario = ref({
  origen: 'Pauza',
  destino: '',
  fecha: '',
  hora: '',
  busId: '',
  bus: '',
  placa: '',
  choferId: '',
  chofer: '',
  precio: '',
  estado: 'Programado'
})

onMounted(async () => {
  await cargarDatos()
})

// ======================================
// CARGAR TODO DESDE FIREBASE
// ======================================
async function cargarDatos() {
  cargando.value = true

  try {
    await Promise.all([
      cargarViajes(),
      cargarBuses(),
      cargarChoferes()
    ])
  } catch (error) {
    console.error(error)
    alert('Error al cargar los datos.')
  } finally {
    cargando.value = false
  }
}

// ======================================
// CARGAR VIAJES
// ======================================
async function cargarViajes() {
  const referencia = dbRef(db, 'viajes')
  const resultado = await get(referencia)

  if (resultado.exists()) {
    viajes.value = Object.entries(resultado.val()).map(([id, viaje]) => ({
      ...viaje,
      id
    }))
  } else {
    viajes.value = []

    // Migración de datos antiguos
    const antiguos = JSON.parse(
      localStorage.getItem('viajes') || '[]'
    )

    if (antiguos.length > 0) {
      for (const viaje of antiguos) {
        const id = String(viaje.id || Date.now() + Math.random())

        await set(dbRef(db, `viajes/${id}`), {
          ...viaje,
          precio: Number(viaje.precio)
        })
      }

      const nuevoResultado = await get(referencia)

      if (nuevoResultado.exists()) {
        viajes.value = Object.entries(nuevoResultado.val()).map(([id, viaje]) => ({
          ...viaje,
          id
        }))
      }
    }
  }
}

// ======================================
// CARGAR BUSES
// ======================================
async function cargarBuses() {
  const resultado = await get(dbRef(db, 'flota'))

  if (resultado.exists()) {
    buses.value = Object.entries(resultado.val()).map(([id, bus]) => ({
      ...bus,
      id
    }))
  } else {
    buses.value = []
  }
}

// ======================================
// CARGAR CHOFERES
// ======================================
async function cargarChoferes() {
  const resultado = await get(dbRef(db, 'choferes'))

  if (resultado.exists()) {
    choferes.value = Object.entries(resultado.val()).map(([id, chofer]) => ({
      ...chofer,
      id
    }))
  } else {
    choferes.value = []
  }
}

// ======================================
// FORMULARIO NUEVO
// ======================================
function nuevoViaje() {
  limpiarFormulario()
  editando.value = null
  mostrarFormulario.value = true
}

// ======================================
// LIMPIAR
// ======================================
function limpiarFormulario() {
  formulario.value = {
    origen: 'Pauza',
    destino: '',
    fecha: '',
    hora: '',
    busId: '',
    bus: '',
    placa: '',
    choferId: '',
    chofer: '',
    precio: '',
    estado: 'Programado'
  }
}

// ======================================
// SELECCIONAR BUS
// ======================================
function seleccionarBus() {
  const bus = buses.value.find(
    b => b.id === formulario.value.busId
  )

  if (bus) {
    formulario.value.bus = `Bus ${bus.numero}`
    formulario.value.placa = bus.placa
  } else {
    formulario.value.bus = ''
    formulario.value.placa = ''
  }
}

// ======================================
// SELECCIONAR CHOFER
// ======================================
function seleccionarChofer() {
  const chofer = choferes.value.find(
    c => c.id === formulario.value.choferId
  )

  if (chofer) {
    formulario.value.chofer = chofer.nombre
  } else {
    formulario.value.chofer = ''
  }
}

// ======================================
// GUARDAR VIAJE
// ======================================
async function guardarViaje() {
  if (
    !formulario.value.destino ||
    !formulario.value.fecha ||
    !formulario.value.hora ||
    !formulario.value.busId ||
    !formulario.value.choferId ||
    formulario.value.precio === ''
  ) {
    alert('Completa todos los campos obligatorios.')
    return
  }

  const busSeleccionado = buses.value.find(
    b => b.id === formulario.value.busId
  )

  const choferSeleccionado = choferes.value.find(
    c => c.id === formulario.value.choferId
  )

  if (!busSeleccionado) {
    alert('Selecciona un bus válido.')
    return
  }

  if (!choferSeleccionado) {
    alert('Selecciona un chofer válido.')
    return
  }

  if (busSeleccionado.estado !== 'Disponible' &&
      editando.value === null) {
    alert('El bus seleccionado no está disponible.')
    return
  }

  if (choferSeleccionado.estado !== 'Disponible' &&
      editando.value === null) {
    alert('El chofer seleccionado no está disponible.')
    return
  }

  const datosViaje = {
    origen: formulario.value.origen,
    destino: formulario.value.destino,
    fecha: formulario.value.fecha,
    hora: formulario.value.hora,

    busId: busSeleccionado.id,
    bus: `Bus ${busSeleccionado.numero}`,
    placa: busSeleccionado.placa,

    choferId: choferSeleccionado.id,
    chofer: choferSeleccionado.nombre,

    precio: Number(formulario.value.precio),
    estado: formulario.value.estado
  }

  try {
    if (editando.value !== null) {
      await update(
        dbRef(db, `viajes/${editando.value}`),
        datosViaje
      )

      alert('Viaje actualizado correctamente.')
    } else {
      const id = String(Date.now())

      await set(
        dbRef(db, `viajes/${id}`),
        {
          ...datosViaje,
          id
        }
      )

      alert('Viaje registrado correctamente.')
    }

    await cargarViajes()

    mostrarFormulario.value = false
    editando.value = null
    limpiarFormulario()

  } catch (error) {
    console.error('Error guardando viaje:', error)
    alert('No se pudo guardar el viaje en Firebase.')
  }
}

// ======================================
// EDITAR VIAJE
// ======================================
function editarViaje(index) {
  const viaje = viajes.value[index]

  formulario.value = {
    origen: viaje.origen || 'Pauza',
    destino: viaje.destino || '',
    fecha: viaje.fecha || '',
    hora: viaje.hora || '',
    busId: viaje.busId || '',
    bus: viaje.bus || '',
    placa: viaje.placa || '',
    choferId: viaje.choferId || '',
    chofer: viaje.chofer || '',
    precio: viaje.precio || '',
    estado: viaje.estado || 'Programado'
  }

  editando.value = viaje.id
  mostrarFormulario.value = true
}

// ======================================
// ELIMINAR VIAJE
// ======================================
async function eliminarViaje(index) {
  const confirmar = confirm(
    '¿Estás seguro de eliminar este viaje?'
  )

  if (!confirmar) return

  try {
    const viaje = viajes.value[index]

    await remove(
      dbRef(db, `viajes/${viaje.id}`)
    )

    await cargarViajes()

    alert('Viaje eliminado correctamente.')

  } catch (error) {
    console.error(error)
    alert('No se pudo eliminar el viaje.')
  }
}

// ======================================
// CAMBIAR ESTADO
// ======================================
async function cambiarEstado(index, estado) {
  try {
    const viaje = viajes.value[index]

    await update(
      dbRef(db, `viajes/${viaje.id}`),
      { estado }
    )

    viajes.value[index].estado = estado

  } catch (error) {
    console.error(error)
    alert('No se pudo actualizar el estado.')
  }
}

// ======================================
// CANCELAR FORMULARIO
// ======================================
function cancelarFormulario() {
  mostrarFormulario.value = false
  editando.value = null
  limpiarFormulario()
}

// ======================================
// FORMATO FECHA
// ======================================
function formatoFecha(fecha) {
  if (!fecha) return '-'

  const partes = fecha.split('-')

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}
</script>

<template>
  <div class="viajes-container">

    <!-- ENCABEZADO -->
    <div class="viajes-header">
      <div>
        <h2>🚌 Gestión de viajes</h2>
        <p>Programa y administra los viajes de la empresa.</p>
      </div>

      <button class="btn-nuevo" @click="nuevoViaje">
        + Nuevo viaje
      </button>
    </div>

    <!-- RESUMEN -->
    <div class="resumen-cards">

      <div class="resumen-card">
        <div class="resumen-icon naranja">🚌</div>
        <div>
          <span>Total de viajes</span>
          <h2>{{ viajes.length }}</h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="resumen-icon azul">📅</div>
        <div>
          <span>Programados</span>
          <h2>
            {{ viajes.filter(v => v.estado === 'Programado').length }}
          </h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="resumen-icon verde">✅</div>
        <div>
          <span>Finalizados</span>
          <h2>
            {{ viajes.filter(v => v.estado === 'Finalizado').length }}
          </h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="resumen-icon morado">🚫</div>
        <div>
          <span>Cancelados</span>
          <h2>
            {{ viajes.filter(v => v.estado === 'Cancelado').length }}
          </h2>
        </div>
      </div>

    </div>

    <!-- TABLA -->
    <section class="panel viajes-tabla-panel">

      <div class="tabla-titulo">
        <h3>📋 Lista de viajes</h3>
        <span>{{ viajes.length }} viajes registrados</span>
      </div>

      <div v-if="cargando" class="viajes-vacio">
        <div class="vacio-icon">⏳</div>
        <h3>Cargando viajes...</h3>
        <p>Conectando con Firebase.</p>
      </div>

      <div v-else-if="viajes.length === 0" class="viajes-vacio">
        <div class="vacio-icon">🚌</div>
        <h3>No hay viajes registrados</h3>
        <p>Presiona "Nuevo viaje" para comenzar a programar.</p>

        <button class="btn-nuevo" @click="nuevoViaje">
          + Registrar primer viaje
        </button>
      </div>

      <div v-else class="tabla-scroll">

        <table>
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Bus</th>
              <th>Placa</th>
              <th>Chofer</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(viaje, index) in viajes"
              :key="viaje.id"
            >
              <td>
                <strong>
                  {{ viaje.origen }} → {{ viaje.destino }}
                </strong>
              </td>

              <td>{{ formatoFecha(viaje.fecha) }}</td>

              <td>{{ viaje.hora }}</td>

              <td>{{ viaje.bus }}</td>

              <td>{{ viaje.placa || '-' }}</td>

              <td>{{ viaje.chofer }}</td>

              <td class="precio">
                S/ {{ Number(viaje.precio).toFixed(2) }}
              </td>

              <td>
                <select
                  class="estado-select"
                  :class="viaje.estado.toLowerCase().replace(' ', '-')"
                  :value="viaje.estado"
                  @change="cambiarEstado(index, $event.target.value)"
                >
                  <option value="Programado">Programado</option>
                  <option value="En curso">En curso</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </td>

              <td>
                <div class="acciones-tabla">

                  <button
                    class="btn-editar"
                    @click="editarViaje(index)"
                    title="Editar"
                  >
                    ✏️
                  </button>

                  <button
                    class="btn-eliminar"
                    @click="eliminarViaje(index)"
                    title="Eliminar"
                  >
                    🗑️
                  </button>

                </div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </section>

    <!-- MODAL -->
    <div v-if="mostrarFormulario" class="modal-overlay">

      <div class="modal">

        <div class="modal-header">
          <div>
            <h2>
              {{ editando !== null ? '✏️ Editar viaje' : '🚌 Nuevo viaje' }}
            </h2>

            <p>Completa la información del viaje.</p>
          </div>

          <button
            class="cerrar-modal"
            @click="cancelarFormulario"
          >
            ✕
          </button>
        </div>

        <div class="modal-form">

          <!-- ORIGEN -->
          <div class="campo">
            <label>Origen</label>

            <input
              v-model="formulario.origen"
              type="text"
            >
          </div>

          <!-- DESTINO -->
          <div class="campo">
            <label>Destino *</label>

            <select v-model="formulario.destino">
              <option value="">Seleccionar destino</option>
              <option value="Nasca">Nasca</option>
              <option value="Ica">Ica</option>
              <option value="Lima">Lima</option>
            </select>
          </div>

          <!-- FECHA -->
          <div class="campo">
            <label>Fecha *</label>

            <input
              v-model="formulario.fecha"
              type="date"
            >
          </div>

          <!-- HORA -->
          <div class="campo">
            <label>Hora de salida *</label>

            <input
              v-model="formulario.hora"
              type="time"
            >
          </div>

          <!-- BUS -->
          <div class="campo">
            <label>Bus *</label>

            <select
              v-model="formulario.busId"
              @change="seleccionarBus"
            >
              <option value="">Seleccionar bus</option>

              <option
                v-for="bus in buses"
                :key="bus.id"
                :value="bus.id"
                :disabled="bus.estado !== 'Disponible' && bus.id !== formulario.busId"
              >
                Bus {{ bus.numero }} - {{ bus.placa }}
                ({{ bus.estado }})
              </option>
            </select>

            <small v-if="buses.length === 0">
              ⚠️ Primero registra buses en Flota.
            </small>
          </div>

          <!-- PLACA -->
          <div class="campo">
            <label>Placa</label>

            <input
              v-model="formulario.placa"
              type="text"
              readonly
              placeholder="Se completa automáticamente"
            >
          </div>

          <!-- CHOFER -->
          <div class="campo">
            <label>Chofer *</label>

            <select
              v-model="formulario.choferId"
              @change="seleccionarChofer"
            >
              <option value="">Seleccionar chofer</option>

              <option
                v-for="chofer in choferes"
                :key="chofer.id"
                :value="chofer.id"
                :disabled="chofer.estado !== 'Disponible' && chofer.id !== formulario.choferId"
              >
                {{ chofer.nombre }} - {{ chofer.dni }}
                ({{ chofer.estado }})
              </option>
            </select>

            <small v-if="choferes.length === 0">
              ⚠️ Primero registra choferes.
            </small>
          </div>

          <!-- PRECIO -->
          <div class="campo">
            <label>Precio del pasaje *</label>

            <input
              v-model="formulario.precio"
              type="number"
              min="0"
              step="0.50"
              placeholder="0.00"
            >
          </div>

          <!-- ESTADO -->
          <div class="campo">
            <label>Estado</label>

            <select v-model="formulario.estado">
              <option value="Programado">Programado</option>
              <option value="En curso">En curso</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

        </div>

        <div class="modal-footer">

          <button
            class="btn-cancelar"
            @click="cancelarFormulario"
          >
            Cancelar
          </button>

          <button
            class="btn-guardar"
            @click="guardarViaje"
          >
            💾 {{ editando !== null ? 'Actualizar viaje' : 'Guardar viaje' }}
          </button>

        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.viajes-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.viajes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.viajes-header h2 {
  font-size: 22px;
}

.viajes-header p {
  color: #94a3b8;
  font-size: 13px;
  margin-top: 5px;
}

.btn-nuevo {
  background: #ff7b35;
  color: white;
  border: none;
  border-radius: 9px;
  padding: 12px 18px;
  font-weight: bold;
  cursor: pointer;
}

.btn-nuevo:hover {
  background: #ff914f;
}

.resumen-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.resumen-card {
  background: #111;
  border: 1px solid #383838;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.resumen-icon {
  width: 45px;
  height: 45px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
}

.naranja {
  background: #3b291e;
}

.azul {
  background: #1d2d3a;
}

.verde {
  background: #1b3027;
}

.morado {
  background: #30243b;
}

.resumen-card span {
  color: #94a3b8;
  font-size: 11px;
}

.resumen-card h2 {
  margin-top: 5px;
  font-size: 22px;
}

.viajes-tabla-panel {
  background: #111;
  border: 1px solid #383838;
  border-radius: 12px;
  padding: 20px;
}

.tabla-titulo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tabla-titulo h3 {
  font-size: 16px;
}

.tabla-titulo span {
  color: #94a3b8;
  font-size: 12px;
}

.viajes-vacio {
  padding: 50px 20px;
  text-align: center;
}

.vacio-icon {
  font-size: 45px;
  margin-bottom: 15px;
}

.viajes-vacio h3 {
  margin-bottom: 8px;
}

.viajes-vacio p {
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 20px;
}

.tabla-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 950px;
}

th {
  background: #202020;
  color: #94a3b8;
  font-size: 11px;
  font-weight: normal;
  text-align: left;
  padding: 13px;
}

td {
  padding: 13px;
  border-bottom: 1px solid #333;
  font-size: 12px;
}

.precio {
  color: #ff914f;
  font-weight: bold;
}

.estado-select {
  border: none;
  border-radius: 6px;
  padding: 7px;
  font-size: 11px;
  cursor: pointer;
}

.estado-select.programado {
  background: #26364a;
  color: #80b9ff;
}

.estado-select.en-curso {
  background: #3a3020;
  color: #ffd166;
}

.estado-select.finalizado {
  background: #1b3828;
  color: #73d99b;
}

.estado-select.cancelado {
  background: #3c2424;
  color: #ff8585;
}

.acciones-tabla {
  display: flex;
  gap: 7px;
}

.btn-editar,
.btn-eliminar {
  border: none;
  padding: 7px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-editar {
  background: #26364a;
}

.btn-eliminar {
  background: #3c2424;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  padding: 20px;
}

.modal {
  background: #171717;
  border: 1px solid #444;
  border-radius: 15px;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 25px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.modal-header h2 {
  font-size: 20px;
}

.modal-header p {
  color: #94a3b8;
  font-size: 12px;
  margin-top: 5px;
}

.cerrar-modal {
  background: #292929;
  color: white;
  border: none;
  border-radius: 7px;
  width: 35px;
  height: 35px;
  cursor: pointer;
}

.modal-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.campo label {
  color: #aab5c8;
  font-size: 12px;
}

.campo input,
.campo select {
  background: #222;
  color: white;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px;
  outline: none;
  width: 100%;
}

.campo input:focus,
.campo select:focus {
  border-color: #ff7b35;
}

.campo input[readonly] {
  color: #94a3b8;
}

.campo small {
  color: #ffb36b;
  font-size: 11px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.btn-cancelar,
.btn-guardar {
  border: none;
  border-radius: 8px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: bold;
}

.btn-cancelar {
  background: #333;
  color: white;
}

.btn-guardar {
  background: #ff7b35;
  color: white;
}

@media (max-width: 1000px) {
  .resumen-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .resumen-cards {
    grid-template-columns: 1fr;
  }

  .modal-form {
    grid-template-columns: 1fr;
  }
}
</style>