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

const choferes = ref([])
const mostrarFormulario = ref(false)
const editando = ref(null)
const cargando = ref(true)

const formulario = ref({
  dni: '',
  nombre: '',
  licencia: '',
  categoria: 'A-IIb',
  telefono: '',
  estado: 'Disponible'
})

onMounted(() => {
  cargarChoferes()
})

// ======================================
// CARGAR CHOFERES DESDE FIREBASE
// ======================================
async function cargarChoferes() {
  try {
    const referencia = dbRef(db, 'choferes')
    const resultado = await get(referencia)

    if (resultado.exists()) {
      const datos = resultado.val()

      choferes.value = Object.entries(datos).map(([id, chofer]) => ({
        ...chofer,
        id
      }))
    } else {
      // MIGRAR REGISTROS ANTIGUOS DE LOCALSTORAGE
      const antiguos = JSON.parse(
        localStorage.getItem('choferes') || '[]'
      )

      if (antiguos.length > 0) {
        for (const chofer of antiguos) {
          const id = String(chofer.id || Date.now() + Math.random())

          await set(dbRef(db, `choferes/${id}`), {
            dni: chofer.dni,
            nombre: chofer.nombre,
            licencia: chofer.licencia,
            categoria: chofer.categoria || 'A-IIb',
            telefono: chofer.telefono,
            estado: chofer.estado || 'Disponible'
          })
        }

        const nuevaConsulta = await get(referencia)

        if (nuevaConsulta.exists()) {
          const datos = nuevaConsulta.val()

          choferes.value = Object.entries(datos).map(([id, chofer]) => ({
            ...chofer,
            id
          }))
        }
      } else {
        choferes.value = []
      }
    }
  } catch (error) {
    console.error('Error cargando choferes:', error)
    alert('No se pudieron cargar los choferes desde Firebase.')
  } finally {
    cargando.value = false
  }
}

// ======================================
// LIMPIAR FORMULARIO
// ======================================
function limpiar() {
  formulario.value = {
    dni: '',
    nombre: '',
    licencia: '',
    categoria: 'A-IIb',
    telefono: '',
    estado: 'Disponible'
  }
}

// ======================================
// NUEVO CHOFER
// ======================================
function nuevoChofer() {
  limpiar()
  editando.value = null
  mostrarFormulario.value = true
}

// ======================================
// GUARDAR CHOFER
// ======================================
async function guardarChofer() {
  if (
    !formulario.value.dni ||
    !formulario.value.nombre ||
    !formulario.value.licencia ||
    !formulario.value.telefono
  ) {
    alert('Completa todos los campos obligatorios.')
    return
  }

  const dni = formulario.value.dni.trim()
  const telefono = formulario.value.telefono.trim()

  if (!/^\d{8}$/.test(dni)) {
    alert('El DNI debe contener exactamente 8 números.')
    return
  }

  if (!/^\d{9}$/.test(telefono)) {
    alert('El teléfono debe contener exactamente 9 números.')
    return
  }

  const dniDuplicado = choferes.value.some(chofer =>
    chofer.dni === dni &&
    chofer.id !== editando.value
  )

  if (dniDuplicado) {
    alert('Este DNI ya está registrado.')
    return
  }

  try {
    const datosChofer = {
      dni,
      nombre: formulario.value.nombre.trim(),
      licencia: formulario.value.licencia.trim(),
      categoria: formulario.value.categoria,
      telefono,
      estado: formulario.value.estado
    }

    if (editando.value !== null) {
      // ACTUALIZAR CHOFER
      await update(
        dbRef(db, `choferes/${editando.value}`),
        datosChofer
      )

      alert('Chofer actualizado correctamente.')
    } else {
      // REGISTRAR NUEVO CHOFER
      const nuevoId = String(Date.now())

      await set(
        dbRef(db, `choferes/${nuevoId}`),
        datosChofer
      )

      alert('Chofer registrado correctamente.')
    }

    await cargarChoferes()

    mostrarFormulario.value = false
    editando.value = null
    limpiar()

  } catch (error) {
    console.error('Error guardando chofer:', error)
    alert('Error al guardar el chofer en Firebase.')
  }
}

// ======================================
// EDITAR CHOFER
// ======================================
function editarChofer(index) {
  const chofer = choferes.value[index]

  formulario.value = {
    dni: chofer.dni,
    nombre: chofer.nombre,
    licencia: chofer.licencia,
    categoria: chofer.categoria,
    telefono: chofer.telefono,
    estado: chofer.estado
  }

  editando.value = chofer.id
  mostrarFormulario.value = true
}

// ======================================
// ELIMINAR CHOFER
// ======================================
async function eliminarChofer(index) {
  if (!confirm('¿Seguro que deseas eliminar este chofer?')) {
    return
  }

  try {
    const chofer = choferes.value[index]

    await remove(
      dbRef(db, `choferes/${chofer.id}`)
    )

    await cargarChoferes()

    alert('Chofer eliminado correctamente.')

  } catch (error) {
    console.error('Error eliminando chofer:', error)
    alert('No se pudo eliminar el chofer.')
  }
}

// ======================================
// CAMBIAR ESTADO
// ======================================
async function cambiarEstado(index, estado) {
  try {
    const chofer = choferes.value[index]

    await update(
      dbRef(db, `choferes/${chofer.id}`),
      { estado }
    )

    choferes.value[index].estado = estado

  } catch (error) {
    console.error('Error cambiando estado:', error)
    alert('No se pudo actualizar el estado.')
  }
}

// ======================================
// CANCELAR
// ======================================
function cancelar() {
  mostrarFormulario.value = false
  editando.value = null
  limpiar()
}
</script>

<template>
  <div class="choferes-container">

    <div class="choferes-header">
      <div>
        <h2>👨‍✈️ Administración de choferes</h2>
        <p>Gestiona la información de los conductores de tu empresa.</p>
      </div>

      <button class="btn-nuevo" @click="nuevoChofer">
        + Agregar chofer
      </button>
    </div>

    <div class="choferes-resumen">

      <div class="resumen-card">
        <div class="resumen-icon naranja">👨‍✈️</div>
        <div>
          <span>Total choferes</span>
          <h2>{{ choferes.length }}</h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="resumen-icon verde">✅</div>
        <div>
          <span>Disponibles</span>
          <h2>{{ choferes.filter(c => c.estado === 'Disponible').length }}</h2>
        </div>
      </div>

      <div class="resumen-card">
        <div class="resumen-icon azul">🚌</div>
        <div>
          <span>En viaje</span>
          <h2>{{ choferes.filter(c => c.estado === 'En viaje').length }}</h2>
        </div>
      </div>

    </div>

    <section class="choferes-panel">

      <div class="panel-header">
        <h3>📋 Lista de choferes</h3>
        <span>{{ choferes.length }} registrados</span>
      </div>

      <div v-if="cargando" class="choferes-vacio">
        <div class="vacio-icon">⏳</div>
        <h3>Cargando choferes...</h3>
        <p>Conectando con Firebase.</p>
      </div>

      <div v-else-if="choferes.length === 0" class="choferes-vacio">
        <div class="vacio-icon">👨‍✈️</div>
        <h3>No hay choferes registrados</h3>
        <p>Registra tu primer conductor para comenzar.</p>

        <button class="btn-nuevo" @click="nuevoChofer">
          + Registrar chofer
        </button>
      </div>

      <div v-else class="choferes-grid">

        <article
          v-for="(chofer, index) in choferes"
          :key="chofer.id"
          class="chofer-card"
        >

          <div class="chofer-card-header">

            <div class="chofer-avatar">
              👨‍✈️
            </div>

            <div class="chofer-titulo">
              <h3>{{ chofer.nombre }}</h3>
              <span>DNI: {{ chofer.dni }}</span>
            </div>

            <button
              class="btn-eliminar"
              @click="eliminarChofer(index)"
              title="Eliminar"
            >
              🗑️
            </button>

          </div>

          <div class="chofer-datos">

            <div class="dato">
              <span>Licencia</span>
              <strong>{{ chofer.licencia }}</strong>
            </div>

            <div class="dato">
              <span>Categoría</span>
              <strong>{{ chofer.categoria }}</strong>
            </div>

            <div class="dato">
              <span>Teléfono</span>
              <strong>📱 {{ chofer.telefono }}</strong>
            </div>

          </div>

          <div class="chofer-estado">

            <label>Estado del conductor</label>

            <select
              :value="chofer.estado"
              :class="chofer.estado.toLowerCase().replace(' ', '-')"
              @change="cambiarEstado(index, $event.target.value)"
            >
              <option value="Disponible">Disponible</option>
              <option value="En viaje">En viaje</option>
            </select>

          </div>

          <button
            class="btn-editar"
            @click="editarChofer(index)"
          >
            ✏️ Editar información
          </button>

        </article>

      </div>

    </section>

    <!-- MODAL -->

    <div v-if="mostrarFormulario" class="modal-overlay">

      <div class="modal-chofer">

        <div class="modal-header">
          <div>
            <h2>
              {{ editando !== null ? '✏️ Editar chofer' : '👨‍✈️ Registrar chofer' }}
            </h2>

            <p>Ingresa los datos del conductor.</p>
          </div>

          <button class="cerrar" @click="cancelar">
            ✕
          </button>
        </div>

        <div class="formulario">

          <div class="campo">
            <label>DNI *</label>

            <input
              v-model="formulario.dni"
              maxlength="8"
              placeholder="12345678"
            >
          </div>

          <div class="campo">
            <label>Nombre completo *</label>

            <input
              v-model="formulario.nombre"
              placeholder="Nombre y apellidos"
            >
          </div>

          <div class="campo">
            <label>Número de licencia *</label>

            <input
              v-model="formulario.licencia"
              placeholder="Número de licencia"
            >
          </div>

          <div class="campo">
            <label>Categoría *</label>

            <select v-model="formulario.categoria">
              <option>A-I</option>
              <option>A-IIa</option>
              <option>A-IIb</option>
              <option>A-IIIa</option>
              <option>A-IIIb</option>
              <option>A-IIIc</option>
            </select>
          </div>

          <div class="campo">
            <label>Teléfono *</label>

            <input
              v-model="formulario.telefono"
              maxlength="9"
              placeholder="999999999"
            >
          </div>

          <div class="campo">
            <label>Estado</label>

            <select v-model="formulario.estado">
              <option value="Disponible">Disponible</option>
              <option value="En viaje">En viaje</option>
            </select>
          </div>

        </div>

        <div class="modal-footer">

          <button class="btn-cancelar" @click="cancelar">
            Cancelar
          </button>

          <button class="btn-guardar" @click="guardarChofer">
            💾 {{ editando !== null ? 'Actualizar' : 'Guardar chofer' }}
          </button>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.choferes-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.choferes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.choferes-header h2 {
  font-size: 22px;
}

.choferes-header p {
  color: #94a3b8;
  font-size: 13px;
  margin-top: 5px;
}

.btn-nuevo {
  background: #ff7b35;
  color: white;
  border: none;
  padding: 12px 18px;
  border-radius: 9px;
  font-weight: bold;
  cursor: pointer;
}

.btn-nuevo:hover {
  background: #ff914f;
}

.choferes-resumen {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.resumen-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 18px;
  background: #111;
  border: 1px solid #383838;
  border-radius: 12px;
}

.resumen-icon {
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
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

.resumen-card span {
  color: #94a3b8;
  font-size: 11px;
}

.resumen-card h2 {
  font-size: 22px;
  margin-top: 5px;
}

.choferes-panel {
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

.choferes-vacio {
  text-align: center;
  padding: 50px 20px;
}

.vacio-icon {
  font-size: 45px;
  margin-bottom: 15px;
}

.choferes-vacio p {
  color: #94a3b8;
  font-size: 13px;
  margin: 10px 0 20px;
}

.choferes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.chofer-card {
  background: #171717;
  border: 1px solid #393939;
  border-radius: 12px;
  padding: 18px;
}

.chofer-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}

.chofer-avatar {
  width: 45px;
  height: 45px;
  background: #30251d;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  font-size: 22px;
}

.chofer-titulo {
  flex: 1;
  min-width: 0;
}

.chofer-titulo h3 {
  font-size: 14px;
  word-break: break-word;
}

.chofer-titulo span {
  color: #94a3b8;
  font-size: 11px;
}

.btn-eliminar {
  background: #3c2424;
  border: none;
  border-radius: 7px;
  padding: 8px;
  cursor: pointer;
}

.chofer-datos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  padding: 18px 0;
}

.dato {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.dato span {
  color: #94a3b8;
  font-size: 11px;
}

.dato strong {
  font-size: 13px;
  word-break: break-word;
}

.chofer-estado {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chofer-estado label {
  font-size: 11px;
  color: #94a3b8;
}

.chofer-estado select {
  padding: 10px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  background: #1b3828;
  color: #73d99b;
}

.chofer-estado select.en-viaje {
  background: #3a3020;
  color: #ffd166;
}

.btn-editar {
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #444;
  background: #222;
  color: white;
  border-radius: 7px;
  cursor: pointer;
}

.btn-editar:hover {
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

.modal-chofer {
  background: #171717;
  border: 1px solid #444;
  border-radius: 15px;
  width: 100%;
  max-width: 600px;
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
  .choferes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 650px) {
  .choferes-grid,
  .choferes-resumen {
    grid-template-columns: 1fr;
  }

  .formulario {
    grid-template-columns: 1fr;
  }
}
</style>