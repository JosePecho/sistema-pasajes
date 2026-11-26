
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from '../services/firebase'
import { ref as dbRef, onValue, push, runTransaction } from 'firebase/database'

const viajes = ref([])
const viajeSeleccionadoId = ref('')
const pasajero = ref('')
const dni = ref('')
const telefono = ref('')
const asientoSeleccionado = ref(null)
const asientosOcupados = ref([])
const cargando = ref(true)

let detenerViajes = null
let detenerAsientos = null

const filasAsientos = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
  [21, 22, 23, 24],
  [25, 26, 27, 28],
  [29, 30, 31, 32],
  [33, 34, 35, 36]
]

const viajeSeleccionado = computed(() => {
  return viajes.value.find(v => v.id === viajeSeleccionadoId.value) || null
})

const destino = computed(() => viajeSeleccionado.value?.destino || '')
const fecha = computed(() => viajeSeleccionado.value?.fecha || '')
const hora = computed(() => viajeSeleccionado.value?.hora || '')
const precio = computed(() => Number(viajeSeleccionado.value?.precio || 0))

const viajesDisponibles = computed(() => {
  return viajes.value.filter(v =>
    v.estado !== 'Cancelado' &&
    v.estado !== 'Finalizado'
  )
})

function seleccionarViaje() {
  asientoSeleccionado.value = null
  asientosOcupados.value = []

  if (detenerAsientos) {
    detenerAsientos()
    detenerAsientos = null
  }

  if (!viajeSeleccionadoId.value) return

  detenerAsientos = onValue(
    dbRef(db, `reservasAsientos/${viajeSeleccionadoId.value}`),
    snapshot => {
      const datos = snapshot.val() || {}

      asientosOcupados.value = Object.keys(datos)
        .map(Number)
        .filter(numero => !isNaN(numero))
    }
  )
}

function seleccionarAsiento(numero) {
  if (!viajeSeleccionadoId.value) {
    alert('Primero selecciona un viaje.')
    return
  }

  if (asientosOcupados.value.includes(numero)) return

  asientoSeleccionado.value =
    asientoSeleccionado.value === numero ? null : numero
}

onMounted(() => {
  detenerViajes = onValue(
    dbRef(db, 'viajes'),
    snapshot => {
      const datos = snapshot.val() || {}

      viajes.value = Object.entries(datos).map(([key, viaje]) => ({
        ...viaje,
        id: key
      }))

      cargando.value = false
    },
    error => {
      console.error('Error cargando viajes:', error)
      alert('No se pudieron cargar los viajes desde Firebase.')
      cargando.value = false
    }
  )
})

onUnmounted(() => {
  if (detenerViajes) detenerViajes()
  if (detenerAsientos) detenerAsientos()
})

async function registrarVenta() {
  if (
    !viajeSeleccionado.value ||
    !pasajero.value.trim() ||
    !dni.value.trim() ||
    !asientoSeleccionado.value
  ) {
    alert('Completa los datos y selecciona un asiento.')
    return
  }

  if (dni.value.trim().length !== 8) {
    alert('El DNI debe tener 8 dígitos.')
    return
  }

  const viaje = viajeSeleccionado.value
  const asiento = asientoSeleccionado.value

  const boleto = {
    pasajero: pasajero.value.trim(),
    dni: dni.value.trim(),
    telefono: telefono.value.trim(),
    origen: viaje.origen || 'Pauza',
    destino: viaje.destino,
    fecha: viaje.fecha,
    hora: viaje.hora,
    bus: viaje.bus || '',
    placa: viaje.placa || '',
    chofer: viaje.chofer || '',
    viajeId: viaje.id,
    asiento,
    precio: Number(viaje.precio),
    fechaVenta: new Date().toISOString(),
    estado: 'Vendido'
  }

  try {
    const reservaRef = dbRef(
      db,
      `reservasAsientos/${viaje.id}/${asiento}`
    )

    // Bloquea el asiento si todavía está libre.
    const resultado = await runTransaction(reservaRef, actual => {
      if (actual !== null) {
        return
      }

      return boleto
    })

    if (!resultado.committed) {
      alert('¡Este asiento acaba de ser vendido! Selecciona otro.')
      return
    }

    // Guarda la venta en Firebase.
    const ventasRef = dbRef(db, 'ventas')
    await push(ventasRef, boleto)

    localStorage.setItem('ultimoBoleto', JSON.stringify(boleto))

    alert('¡Venta registrada correctamente!')

    imprimirBoleto(boleto)

    asientoSeleccionado.value = null
    pasajero.value = ''
    dni.value = ''
    telefono.value = ''

  } catch (error) {
    console.error('Error registrando venta:', error)

    alert('Ocurrió un error al registrar la venta.')

    // Si la venta falla, libera el asiento.
    try {
      await runTransaction(
        dbRef(db, `reservasAsientos/${viaje.id}/${asiento}`),
        actual => null
      )
    } catch (errorLiberar) {
      console.error('Error liberando asiento:', errorLiberar)
    }
  }
}

function escaparHTML(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function imprimirBoleto(boleto) {
  const ventana = window.open('', '_blank')

  if (!ventana) {
    alert('Permite las ventanas emergentes para imprimir el boleto.')
    return
  }

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Boleto TransPro</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 25px;
          text-align: center;
        }

        .boleto {
          border: 2px dashed #333;
          padding: 25px;
          max-width: 350px;
          margin: auto;
        }

        h1 {
          color: #ff7b35;
        }

        hr {
          border: 1px dashed #999;
        }

        .precio {
          font-size: 25px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="boleto">
        <h1>🚌 TransPro</h1>
        <h2>BOLETO DE VIAJE</h2>
        <hr>

        <p><b>Pasajero:</b> ${escaparHTML(boleto.pasajero)}</p>
        <p><b>DNI:</b> ${escaparHTML(boleto.dni)}</p>
        <p><b>Teléfono:</b> ${escaparHTML(boleto.telefono || '-')}</p>
        <p><b>Origen:</b> ${escaparHTML(boleto.origen)}</p>
        <p><b>Destino:</b> ${escaparHTML(boleto.destino)}</p>
        <p><b>Fecha:</b> ${escaparHTML(boleto.fecha)}</p>
        <p><b>Hora:</b> ${escaparHTML(boleto.hora)}</p>
        <p><b>Bus:</b> ${escaparHTML(boleto.bus || '-')}</p>
        <p><b>Placa:</b> ${escaparHTML(boleto.placa || '-')}</p>
        <p><b>Chofer:</b> ${escaparHTML(boleto.chofer || '-')}</p>
        <p><b>Asiento:</b> ${escaparHTML(boleto.asiento)}</p>

        <hr>
        <p class="precio">S/ ${Number(boleto.precio).toFixed(2)}</p>
        <p>¡Buen viaje!</p>
      </div>
    </body>
    </html>
  `)

  ventana.document.close()
  ventana.focus()
  ventana.print()
}
</script>

<template>
  <div class="venta-container">

    <div class="encabezado">
      <h1>🎫 Venta de pasajes</h1>
      <p>Registra pasajeros y selecciona sus asientos</p>
    </div>

    <div class="venta-grid">

      <!-- FORMULARIO IZQUIERDO -->
      <section class="panel formulario">
        <h2>Datos del viaje</h2>

        <div class="form-grid">

          <div class="campo completo">
            <label>Viaje programado</label>

            <select
              v-model="viajeSeleccionadoId"
              @change="seleccionarViaje"
            >
              <option value="">
                {{ cargando ? 'Cargando viajes...' : 'Seleccionar viaje' }}
              </option>

              <option
                v-for="viaje in viajesDisponibles"
                :key="viaje.id"
                :value="viaje.id"
              >
                {{ viaje.origen }} → {{ viaje.destino }}
                | {{ viaje.fecha }}
                | {{ viaje.hora }}
                | S/ {{ Number(viaje.precio).toFixed(2) }}
              </option>
            </select>
          </div>

          <div class="campo">
            <label>Destino</label>
            <input :value="destino" readonly>
          </div>

          <div class="campo">
            <label>Fecha del viaje</label>
            <input :value="fecha" type="date" readonly>
          </div>

          <div class="campo">
            <label>Hora de salida</label>
            <input :value="hora" type="time" readonly>
          </div>

          <div class="campo">
            <label>Bus</label>
            <input :value="viajeSeleccionado?.bus || '-'" readonly>
          </div>

        </div>

        <hr>

        <h2>Datos del pasajero</h2>

        <div class="form-grid">

          <div class="campo completo">
            <label>Nombre completo</label>
            <input
              v-model="pasajero"
              type="text"
              placeholder="Ingrese nombre completo"
            >
          </div>

          <div class="campo">
            <label>DNI</label>
            <input
              v-model="dni"
              type="text"
              maxlength="8"
              placeholder="Número de DNI"
            >
          </div>

          <div class="campo">
            <label>Teléfono</label>
            <input
              v-model="telefono"
              type="tel"
              placeholder="Número de teléfono"
            >
          </div>

        </div>
      </section>

      <!-- ASIENTOS A LA DERECHA -->
      <section class="panel panel-asientos">

        <div class="asientos-header">
          <div>
            <h2>Seleccionar asiento</h2>
            <p>Bus de 39 pasajeros</p>
          </div>

          <div class="leyenda">
            <span><i class="libre"></i> Libre</span>
            <span><i class="ocupado"></i> Ocupado</span>
            <span><i class="seleccionado"></i> Seleccionado</span>
          </div>
        </div>

        <div class="bus">

          <div class="conductor">
            <span>🚗</span>
            <span>CONDUCTOR</span>
          </div>

          <div class="asientos">

            <div
              v-for="fila in filasAsientos"
              :key="fila[0]"
              class="fila-asientos"
            >

              <button
                v-for="(numero, index) in fila"
                :key="numero"
                class="asiento"
                :class="{
                  ocupado: asientosOcupados.includes(numero),
                  seleccionado: asientoSeleccionado === numero,
                  pasillo: index === 2
                }"
                :disabled="asientosOcupados.includes(numero)"
                @click="seleccionarAsiento(numero)"
              >
                {{ numero }}
              </button>

            </div>

          </div>

          <div class="asientos-traseros">

            <button
              v-for="numero in [37, 38, 39]"
              :key="numero"
              class="asiento"
              :class="{
                ocupado: asientosOcupados.includes(numero),
                seleccionado: asientoSeleccionado === numero
              }"
              :disabled="asientosOcupados.includes(numero)"
              @click="seleccionarAsiento(numero)"
            >
              {{ numero }}
            </button>

          </div>
        </div>

        <div class="asiento-info">
          Asiento seleccionado:
          <strong>{{ asientoSeleccionado || 'Ninguno' }}</strong>
        </div>

      </section>

      <!-- RESUMEN ABAJO -->
      <section class="panel resumen">

        <h2>Resumen de venta</h2>

        <div class="resumen-item">
          <span>Destino</span>
          <strong>{{ destino || 'No seleccionado' }}</strong>
        </div>

        <div class="resumen-item">
          <span>Pasajero</span>
          <strong>{{ pasajero || 'No registrado' }}</strong>
        </div>

        <div class="resumen-item">
          <span>Fecha</span>
          <strong>{{ fecha || 'No seleccionada' }}</strong>
        </div>

        <div class="resumen-item">
          <span>Hora</span>
          <strong>{{ hora || '--:--' }}</strong>
        </div>

        <div class="resumen-item">
          <span>Asiento</span>
          <strong>{{ asientoSeleccionado || '--' }}</strong>
        </div>

        <div class="precio-total">
          <span>Total a pagar</span>
          <h2>S/ {{ precio.toFixed(2) }}</h2>
        </div>

        <button
          class="btn-vender"
          :disabled="!viajeSeleccionado || !asientoSeleccionado"
          @click="registrarVenta"
        >
          🎫 Registrar venta e imprimir
        </button>

      </section>

    </div>
  </div>
</template>

<style scoped>
.venta-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.encabezado h1 {
  font-size: 25px;
}

.encabezado p {
  color: #94a3b8;
  margin-top: 5px;
  font-size: 13px;
}

/* FORMULARIO Y ASIENTOS EN DOS COLUMNAS */
.venta-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.panel {
  background: #111;
  border: 1px solid #383838;
  border-radius: 14px;
  padding: 20px;
  min-width: 0;
}

.panel h2 {
  font-size: 17px;
  margin-bottom: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.campo.completo {
  grid-column: span 2;
}

.campo label {
  font-size: 12px;
  color: #aab5c8;
}

.campo input,
.campo select {
  background: #1e1e1e;
  color: white;
  border: 1px solid #414141;
  padding: 11px;
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.campo input:read-only {
  opacity: 0.8;
}

.formulario hr {
  border: none;
  border-top: 1px solid #333;
  margin: 20px 0;
}

/* PANEL DE ASIENTOS */
.panel-asientos {
  grid-column: auto;
}

.asientos-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}

.asientos-header h2 {
  margin-bottom: 8px;
}

.asientos-header p {
  color: #94a3b8;
  font-size: 12px;
}

.leyenda {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 10px;
}

.leyenda span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.leyenda i {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}

.libre {
  background: #252525;
  border: 1px solid #777;
}

.ocupado {
  background: #6b3030;
}

.seleccionado {
  background: #ff7b35;
}

.bus {
  width: 100%;
  max-width: 360px;
  box-sizing: border-box;
  margin: 15px auto;
  background: #1b1b1b;
  border: 2px solid #555;
  border-radius: 35px 35px 18px 18px;
  padding: 16px;
}

.conductor {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #444;
  padding-bottom: 12px;
  margin-bottom: 12px;
  color: #94a3b8;
  font-size: 9px;
}

.fila-asientos {
  display: grid;
  grid-template-columns: 1fr 1fr 22px 1fr 1fr;
  gap: 6px;
  margin-bottom: 6px;
}

.fila-asientos .asiento:nth-child(3) {
  grid-column: 4;
}

.asiento {
  min-height: 34px;
  background: #252525;
  color: white;
  border: 1px solid #555;
  border-radius: 6px;
  font-weight: bold;
  font-size: 11px;
  cursor: pointer;
  padding: 4px;
}

.asiento:hover:not(.ocupado) {
  border-color: #ff7b35;
}

.asiento.ocupado {
  background: #6b3030;
  border-color: #8e4848;
  cursor: not-allowed;
}

.asiento.seleccionado {
  background: #ff7b35;
  border-color: #ff7b35;
}

.asientos-traseros {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.asientos-traseros .asiento {
  width: 40px;
}

.asiento-info {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: #1e1e1e;
  border-radius: 8px;
  font-size: 12px;
}

.asiento-info strong {
  color: #ff7b35;
}

/* RESUMEN DE VENTA DEBAJO */
.resumen {
  grid-column: span 2;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  padding: 13px 0;
  border-bottom: 1px solid #333;
  font-size: 13px;
  gap: 12px;
}

.resumen-item span {
  color: #94a3b8;
}

.precio-total {
  margin-top: 20px;
  background: #1e1e1e;
  padding: 20px;
  border-radius: 10px;
}

.precio-total span {
  color: #94a3b8;
  font-size: 12px;
}

.precio-total h2 {
  color: #ff7b35;
  font-size: 25px;
  margin-top: 10px;
}

.btn-vender {
  width: 100%;
  background: #ff7b35;
  color: white;
  padding: 15px;
  border-radius: 9px;
  font-weight: bold;
  font-size: 14px;
  margin-top: 18px;
  cursor: pointer;
  border: none;
}

.btn-vender:hover {
  background: #ff914f;
}

.btn-vender:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* PANTALLAS PEQUEÑAS */
@media (max-width: 900px) {
  .venta-grid {
    grid-template-columns: 1fr;
  }

  .panel-asientos,
  .resumen {
    grid-column: span 1;
  }

  .bus {
    max-width: 430px;
  }
}

@media (max-width: 500px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .campo.completo {
    grid-column: span 1;
  }

  .panel {
    padding: 14px;
  }

  .bus {
    padding: 12px;
  }

  .fila-asientos {
    gap: 4px;
  }

  .asiento {
    min-height: 32px;
    font-size: 10px;
  }
}
</style>
