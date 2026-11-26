<script setup>
import { ref, onMounted } from 'vue'
import { ref as dbRef, get, set, update, remove } from 'firebase/database'
import { db } from '../services/firebase'

const buses = ref([])
const mostrarFormulario = ref(false)
const editando = ref(null)
const cargando = ref(true)

const formulario = ref({
  numero: '',
  placa: '',
  modelo: '',
  capacidad: 39,
  estado: 'Disponible'
})

onMounted(() => {
  cargarBuses()
})

// ================================
// CARGAR BUSES DESDE FIREBASE
// ================================
async function cargarBuses() {
  try {
    const referencia = dbRef(db, 'flota')
    const resultado = await get(referencia)

    if (resultado.exists()) {
      const datos = resultado.val()

      buses.value = Object.entries(datos).map(([id, bus]) => ({
        ...bus,
        id
      }))
    } else {
      // MIGRAR BUSES ANTIGUOS DE LOCALSTORAGE
      const busesAntiguos = JSON.parse(
        localStorage.getItem('flota') || '[]'
      )

      if (busesAntiguos.length > 0) {
        for (const bus of busesAntiguos) {
          const id = String(bus.id || Date.now() + Math.random())

          await set(dbRef(db, `flota/${id}`), {
            numero: bus.numero,
            placa: bus.placa,
            modelo: bus.modelo,
            capacidad: Number(bus.capacidad),
            estado: bus.estado || 'Disponible'
          })
        }

        const nuevaConsulta = await get(referencia)

        if (nuevaConsulta.exists()) {
          const datos = nuevaConsulta.val()

          buses.value = Object.entries(datos).map(([id, bus]) => ({
            ...bus,
            id
          }))
        }
      } else {
        buses.value = []
      }
    }
  } catch (error) {
    console.error('Error cargando buses:', error)
    alert('No se pudieron cargar los buses desde Firebase.')
  } finally {
    cargando.value = false
  }
}

// ================================
// NUEVO BUS
// ================================
function nuevoBus() {
  limpiar()
  editando.value = null
  mostrarFormulario.value = true
}

// ================================
// LIMPIAR FORMULARIO
// ================================
function limpiar() {
  formulario.value = {
    numero: '',
    placa: '',
    modelo: '',
    capacidad: 39,
    estado: 'Disponible'
  }
}

// ================================
// GUARDAR BUS
// ================================
async function guardarBus() {
  if (
    !formulario.value.numero ||
    !formulario.value.placa ||
    !formulario.value.modelo ||
    !formulario.value.capacidad
  ) {
    alert('Completa todos los campos.')
    return
  }

  const placa = formulario.value.placa.trim().toUpperCase()

  const placaExistente = buses.value.some(bus =>
    bus.placa.toLowerCase() === placa.toLowerCase() &&
    bus.id !== editando.value
  )

  if (placaExistente) {
    alert('Esta placa ya está registrada.')
    return
  }

  try {
    const datosBus = {
      numero: formulario.value.numero,
      placa,
      modelo: formulario.value.modelo,
      capacidad: Number(formulario.value.capacidad),
      estado: formulario.value.estado
    }

    if (editando.value !== null) {
      // ACTUALIZAR
      await update(
        dbRef(db, `flota/${editando.value}`),
        datosBus
      )

      alert('Bus actualizado correctamente.')
    } else {
      // REGISTRAR NUEVO
      const nuevoId = String(Date.now())

      await set(
        dbRef(db, `flota/${nuevoId}`),
        datosBus
      )

      alert('Bus registrado correctamente.')
    }

    await cargarBuses()

    mostrarFormulario.value = false
    editando.value = null
    limpiar()
  } catch (error) {
    console.error('Error guardando bus:', error)
    alert('Error al guardar el bus en Firebase.')
  }
}

// ================================
// EDITAR BUS
// ================================
function editarBus(index) {
  const bus = buses.value[index]

  formulario.value = {
    numero: bus.numero,
    placa: bus.placa,
    modelo: bus.modelo,
    capacidad: bus.capacidad,
    estado: bus.estado
  }

  editando.value = bus.id
  mostrarFormulario.value = true
}

// ================================
// ELIMINAR BUS
// ================================
async function eliminarBus(index) {
  if (!confirm('¿Seguro que deseas eliminar este bus?')) return

  try {
    const bus = buses.value[index]

    await remove(dbRef(db, `flota/${bus.id}`))

    await cargarBuses()

    alert('Bus eliminado correctamente.')
  } catch (error) {
    console.error('Error eliminando bus:', error)
    alert('No se pudo eliminar el bus.')
  }
}

// ================================
// CAMBIAR ESTADO
// ================================
async function cambiarEstado(index, estado) {
  try {
    const bus = buses.value[index]

    await update(
      dbRef(db, `flota/${bus.id}`),
      { estado }
    )

    buses.value[index].estado = estado
  } catch (error) {
    console.error('Error cambiando estado:', error)
    alert('No se pudo actualizar el estado del bus.')
  }
}

// ================================
// CANCELAR
// ================================
function cancelar() {
  mostrarFormulario.value = false
  editando.value = null
  limpiar()
}
</script>

<template>
  <div class="flota-container">

    <div class="flota-header">
      <div>
        <h2>🚍 Administración de flota</h2>
        <p>Registra y administra los buses de la empresa.</p>
      </div>

      <button class="btn-nuevo" @click="nuevoBus">
        + Agregar bus
      </button>
    </div>

    <div class="flota-resumen">

      <div class="resumen-card">
        <div class="icono naranja">🚌</div>
        <div>
          <span>Total de buses</span>
          <h2>{{ buses.length }}</h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="icono verde">✅</div>
        <div>
          <span>Disponibles</span>
          <h2>
            {{ buses.filter(b => b.estado === 'Disponible').length }}
          </h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="icono azul">🛣️</div>
        <div>
          <span>En viaje</span>
          <h2>
            {{ buses.filter(b => b.estado === 'En viaje').length }}
          </h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="icono rojo">🔧</div>
        <div>
          <span>Mantenimiento</span>
          <h2>
            {{ buses.filter(b => b.estado === 'Mantenimiento').length }}
          </h2>
        </div>
      </div>

    </div>

    <section class="flota-panel">

      <div class="panel-header">
        <h3>🚍 Buses registrados</h3>
        <span>{{ buses.length }} unidades</span>
      </div>

      <div v-if="cargando" class="flota-vacia">
        <div class="vacio-icon">⏳</div>
        <h3>Cargando buses...</h3>
        <p>Conectando con Firebase.</p>
      </div>

      <div
        v-else-if="buses.length === 0"
        class="flota-vacia"
      >
        <div class="vacio-icon">🚌</div>
        <h3>No hay buses registrados</h3>
        <p>Agrega tu primer bus para comenzar.</p>

        <button class="btn-nuevo" @click="nuevoBus">
          + Registrar bus
        </button>
      </div>

      <div v-else class="buses-grid">

        <article
          v-for="(bus, index) in buses"
          :key="bus.id"
          class="bus-card"
        >

          <div class="bus-card-header">

            <div class="bus-icon">🚌</div>

            <div>
              <h3>Bus {{ bus.numero }}</h3>
              <span>{{ bus.placa }}</span>
            </div>

            <button
              class="btn-eliminar"
              @click="eliminarBus(index)"
              title="Eliminar bus"
            >
              🗑️
            </button>

          </div>

          <div class="bus-info">

            <div>
              <span>Modelo</span>
              <strong>{{ bus.modelo }}</strong>
            </div>

            <div>
              <span>Capacidad</span>
              <strong>👥 {{ bus.capacidad }} pasajeros</strong>
            </div>

          </div>

          <div class="bus-estado">

            <label>Estado del bus</label>

            <select
              :value="bus.estado"
              :class="bus.estado.toLowerCase().replace(' ', '-')"
              @change="cambiarEstado(index, $event.target.value)"
            >
              <option value="Disponible">Disponible</option>
              <option value="En viaje">En viaje</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>

          </div>

          <button
            class="btn-editar-bus"
            @click="editarBus(index)"
          >
            ✏️ Editar información
          </button>

        </article>

      </div>

    </section>

    <!-- MODAL -->
    <div
      v-if="mostrarFormulario"
      class="modal-overlay"
    >

      <div class="modal-flota">

        <div class="modal-header">

          <div>
            <h2>
              {{ editando !== null ? '✏️ Editar bus' : '🚌 Registrar bus' }}
            </h2>

            <p>Ingresa la información de la unidad.</p>
          </div>

          <button
            class="cerrar"
            @click="cancelar"
          >
            ✕
          </button>

        </div>

        <div class="formulario">

          <div class="campo">
            <label>Número de bus *</label>

            <input
              v-model="formulario.numero"
              placeholder="Ej. 01"
            >
          </div>

          <div class="campo">
            <label>Placa *</label>

            <input
              v-model="formulario.placa"
              placeholder="Ej. ABC-123"
            >
          </div>

          <div class="campo">
            <label>Modelo *</label>

            <input
              v-model="formulario.modelo"
              placeholder="Ej. Mercedes Benz"
            >
          </div>

          <div class="campo">
            <label>Capacidad *</label>

            <input
              v-model="formulario.capacidad"
              type="number"
              min="1"
              placeholder="39"
            >
          </div>

          <div class="campo campo-completo">
            <label>Estado</label>

            <select v-model="formulario.estado">
              <option value="Disponible">Disponible</option>
              <option value="En viaje">En viaje</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>
          </div>

        </div>

        <div class="modal-footer">

          <button
            class="btn-cancelar"
            @click="cancelar"
          >
            Cancelar
          </button>

          <button
            class="btn-guardar"
            @click="guardarBus"
          >
            💾 {{ editando !== null ? 'Actualizar bus' : 'Guardar bus' }}
          </button>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.flota-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flota-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.flota-header h2 {
  font-size: 22px;
}

.flota-header p {
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

.flota-resumen {
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

.icono {
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

.verde {
  background: #1b3027;
}

.azul {
  background: #1d2d3a;
}

.rojo {
  background: #3b2222;
}

.resumen-card span {
  font-size: 11px;
  color: #94a3b8;
}

.resumen-card h2 {
  font-size: 22px;
  margin-top: 5px;
}

.flota-panel {
  background: #111;
  border: 1px solid #383838;
  border-radius: 12px;
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header span {
  color: #94a3b8;
  font-size: 12px;
}

.flota-vacia {
  text-align: center;
  padding: 50px 20px;
}

.vacio-icon {
  font-size: 45px;
  margin-bottom: 15px;
}

.flota-vacia p {
  color: #94a3b8;
  font-size: 13px;
  margin: 10px 0 20px;
}

.buses-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.bus-card {
  background: #171717;
  border: 1px solid #393939;
  border-radius: 12px;
  padding: 18px;
}

.bus-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}

.bus-icon {
  width: 45px;
  height: 45px;
  background: #30251d;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
}

.bus-card-header h3 {
  font-size: 15px;
}

.bus-card-header span {
  color: #ff914f;
  font-size: 12px;
}

.btn-eliminar {
  margin-left: auto;
  background: #3c2424;
  border: none;
  border-radius: 7px;
  padding: 8px;
  cursor: pointer;
}

.bus-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  padding: 18px 0;
}

.bus-info div {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.bus-info span {
  color: #94a3b8;
  font-size: 11px;
}

.bus-info strong {
  font-size: 13px;
}

.bus-estado {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bus-estado label {
  font-size: 11px;
  color: #94a3b8;
}

.bus-estado select {
  width: 100%;
  padding: 9px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  background: #26364a;
  color: #80b9ff;
}

.bus-estado select.disponible {
  background: #1b3828;
  color: #73d99b;
}

.bus-estado select.en-viaje {
  background: #3a3020;
  color: #ffd166;
}

.bus-estado select.mantenimiento {
  background: #3c2424;
  color: #ff8585;
}

.btn-editar-bus {
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #444;
  background: #222;
  color: white;
  border-radius: 7px;
  cursor: pointer;
}

.btn-editar-bus:hover {
  border-color: #ff7b35;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
}

.modal-flota {
  background: #171717;
  border: 1px solid #444;
  border-radius: 15px;
  width: 100%;
  max-width: 550px;
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

.cerrar {
  background: #292929;
  color: white;
  border: none;
  border-radius: 7px;
  width: 35px;
  height: 35px;
  cursor: pointer;
}

.formulario {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.campo-completo {
  grid-column: 1 / -1;
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
}

.campo input:focus,
.campo select:focus {
  border-color: #ff7b35;
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

@media (max-width: 1100px) {
  .buses-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .flota-resumen {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 650px) {
  .buses-grid,
  .flota-resumen {
    grid-template-columns: 1fr;
  }

  .formulario {
    grid-template-columns: 1fr;
  }

  .campo-completo {
    grid-column: auto;
  }
}
</style>