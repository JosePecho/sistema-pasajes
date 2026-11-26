<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

import VentaPasajes from './views/VentaPasajes.vue'
import Viajes from './views/Viajes.vue'
import Flota from './views/Flota.vue'
import Choferes from './views/Choferes.vue'
import Boletos from './views/Boletos.vue'

import { db } from './services/firebase'
import { ref as dbRef, onValue } from 'firebase/database'

const paginaActual = ref('Dashboard')

const ventas = ref([])
const viajes = ref([])
const cargando = ref(true)

let detenerVentas = null
let detenerViajes = null

const menu = [
  { nombre: 'Dashboard', icono: '📊' },
  { nombre: 'Venta de pasajes', icono: '🎫' },
  { nombre: 'Viajes', icono: '🚌' },
  { nombre: 'Flota', icono: '🚍' },
  { nombre: 'Choferes', icono: '👨‍✈️' },
  { nombre: 'Boletos vendidos', icono: '📋' }
]

const cambiarPagina = (pagina) => {
  paginaActual.value = pagina
}

const fecha = new Date().toLocaleDateString('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

function obtenerFecha(valor) {
  if (!valor) return null

  const fecha = new Date(valor)

  if (!isNaN(fecha.getTime())) return fecha

  return null
}

function esHoy(valor) {
  const fechaVenta = obtenerFecha(valor)

  if (!fechaVenta) {
    return String(valor || '').includes(
      new Date().toISOString().slice(0, 10)
    )
  }

  const hoy = new Date()

  return fechaVenta.getDate() === hoy.getDate() &&
    fechaVenta.getMonth() === hoy.getMonth() &&
    fechaVenta.getFullYear() === hoy.getFullYear()
}

const ventasHoy = computed(() => {
  return ventas.value.filter(venta =>
    esHoy(venta.fechaVenta || venta.fecha || venta.createdAt)
  )
})

const totalVentasHoy = computed(() => ventasHoy.value.length)

const ingresosHoy = computed(() => {
  return ventasHoy.value.reduce((total, venta) => {
    return total + Number(
      venta.precio || venta.price || venta.total || 0
    )
  }, 0)
})

const pasajerosRegistrados = computed(() => {
  const nombres = ventas.value
    .map(venta =>
      venta.pasajero ||
      venta.nombre ||
      venta.nombrePasajero ||
      venta.dni
    )
    .filter(Boolean)

  return new Set(nombres).size
})

const viajesProgramados = computed(() => {
  return viajes.value.filter(viaje => {
    const estado = String(
      viaje.estado || viaje.status || ''
    ).toLowerCase()

    return ![
      'cancelado',
      'cancelada',
      'finalizado',
      'finalizada',
      'completado',
      'completada'
    ].includes(estado)
  }).length
})

const ventasRecientes = computed(() => {
  return [...ventas.value]
    .sort((a, b) => {
      const fechaA = obtenerFecha(
        a.fechaVenta || a.fecha || a.createdAt
      ) || new Date(0)

      const fechaB = obtenerFecha(
        b.fechaVenta || b.fecha || b.createdAt
      ) || new Date(0)

      return fechaB - fechaA
    })
    .slice(0, 5)
})

const ultimos7Dias = computed(() => {
  const resultado = []

  for (let i = 6; i >= 0; i--) {
    const dia = new Date()
    dia.setDate(dia.getDate() - i)

    const nombre = dia.toLocaleDateString('es-PE', {
      weekday: 'short'
    })

    const cantidad = ventas.value.filter(venta => {
      const fechaVenta = obtenerFecha(
        venta.fechaVenta || venta.fecha || venta.createdAt
      )

      if (!fechaVenta) return false

      return fechaVenta.getDate() === dia.getDate() &&
        fechaVenta.getMonth() === dia.getMonth() &&
        fechaVenta.getFullYear() === dia.getFullYear()
    }).length

    resultado.push({
      nombre,
      cantidad,
      fecha: dia
    })
  }

  return resultado
})

const maxVentasGrafico = computed(() => {
  const maximo = Math.max(
    ...ultimos7Dias.value.map(dia => dia.cantidad),
    1
  )

  return maximo
})

const viajesProximos = computed(() => {
  return [...viajes.value]
    .filter(viaje => {
      const estado = String(
        viaje.estado || viaje.status || ''
      ).toLowerCase()

      return ![
        'cancelado',
        'cancelada',
        'finalizado',
        'finalizada',
        'completado',
        'completada'
      ].includes(estado)
    })
    .slice(0, 5)
})

function formatoPrecio(precio) {
  return Number(precio || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function obtenerPasajero(venta) {
  return venta.pasajero ||
    venta.nombre ||
    venta.nombrePasajero ||
    'Sin nombre'
}

function obtenerDestino(venta) {
  return venta.destino || 'Sin destino'
}

function obtenerAsiento(venta) {
  return venta.asiento || '—'
}

function obtenerPrecio(venta) {
  return venta.precio || venta.price || venta.total || 0
}

function obtenerOrigenViaje(viaje) {
  return viaje.origen || viaje.ciudadOrigen || 'Origen'
}

function obtenerDestinoViaje(viaje) {
  return viaje.destino || viaje.ciudadDestino || 'Destino'
}

function obtenerFechaViaje(viaje) {
  return viaje.fecha || viaje.fechaViaje || viaje.fechaSalida || 'Sin fecha'
}

function obtenerHoraViaje(viaje) {
  return viaje.hora || viaje.horaSalida || 'Sin hora'
}

function obtenerBus(viaje) {
  return viaje.bus || viaje.placa || viaje.busAsignado || 'Sin bus'
}

function obtenerEstado(viaje) {
  return viaje.estado || viaje.status || 'Programado'
}

onMounted(() => {
  detenerVentas = onValue(dbRef(db, 'ventas'), snapshot => {
    const datos = snapshot.val() || {}

    ventas.value = Object.entries(datos).map(([id, venta]) => ({
      id,
      ...venta
    }))

    cargando.value = false
  }, error => {
    console.error('Error cargando ventas:', error)
    cargando.value = false
  })

  detenerViajes = onValue(dbRef(db, 'viajes'), snapshot => {
    const datos = snapshot.val() || {}

    viajes.value = Object.entries(datos).map(([id, viaje]) => ({
      id,
      ...viaje
    }))
  }, error => {
    console.error('Error cargando viajes:', error)
  })
})

onUnmounted(() => {
  if (detenerVentas) detenerVentas()
  if (detenerViajes) detenerViajes()
})
</script>

<template>
  <div class="app">

    <!-- SIDEBAR -->
    <aside class="sidebar">

      <div class="logo">
        <div class="logo-icon">🚌</div>

        <div>
          <h2>TransPro</h2>
          <span>Sistema de transporte</span>
        </div>
      </div>

      <div class="menu-title">MENÚ PRINCIPAL</div>

      <nav>
        <button
          v-for="item in menu"
          :key="item.nombre"
          :class="{ activo: paginaActual === item.nombre }"
          @click="cambiarPagina(item.nombre)"
        >
          <span>{{ item.icono }}</span>
          {{ item.nombre }}
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="user">
          <div class="avatar">A</div>

          <div>
            <strong>Administrador</strong>
            <small>Admin del sistema</small>
          </div>
        </div>
      </div>

    </aside>

    <!-- CONTENIDO -->
    <main class="contenido">

      <header class="topbar">
        <div>
          <h1>{{ paginaActual }}</h1>
          <p>Bienvenido al sistema de gestión de transporte</p>
        </div>

        <div class="fecha">
          📅 {{ fecha }}
        </div>
      </header>

      <!-- DASHBOARD -->
      <template v-if="paginaActual === 'Dashboard'">

        <!-- BIENVENIDA -->
        <section class="bienvenida">
          <div>
            <h2>¡Bienvenido a TransPro! 👋</h2>

            <p>
              Gestiona tus viajes, pasajeros y operaciones fácilmente.
            </p>
          </div>

          <div class="bus-decoracion">🚌</div>
        </section>

        <!-- ESTADÍSTICAS -->
        <section class="estadisticas">

          <div
            class="stat-card tarjeta-clicable"
            @click="cambiarPagina('Boletos vendidos')"
          >
            <div class="stat-icon naranja">🎫</div>

            <div>
              <p>Boletos vendidos</p>
              <h2>{{ cargando ? '...' : totalVentasHoy }}</h2>
              <small>Hoy</small>
            </div>
          </div>

          <div
            class="stat-card tarjeta-clicable"
            @click="cambiarPagina('Viajes')"
          >
            <div class="stat-icon azul">🚌</div>

            <div>
              <p>Viajes programados</p>
              <h2>{{ cargando ? '...' : viajesProgramados }}</h2>
              <small>Actualmente</small>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon verde">👥</div>

            <div>
              <p>Pasajeros</p>
              <h2>{{ cargando ? '...' : pasajerosRegistrados }}</h2>
              <small>Registrados</small>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon morado">💰</div>

            <div>
              <p>Ingresos del día</p>
              <h2>
                S/ {{ cargando ? '...' : formatoPrecio(ingresosHoy) }}
              </h2>
              <small>Ventas de hoy</small>
            </div>
          </div>

        </section>

        <!-- GRÁFICO + ACCESOS -->
        <section class="dashboard-grid dashboard-superior">

          <!-- GRÁFICO -->
          <div class="panel panel-grafico">

            <div class="panel-header">
              <div>
                <h3>📈 Ventas de los últimos 7 días</h3>
                <small class="subtitulo-panel">
                  Cantidad de boletos vendidos por día
                </small>
              </div>
            </div>

            <div class="grafico-container">

              <div
                v-for="dia in ultimos7Dias"
                :key="dia.fecha.toISOString()"
                class="grafico-columna"
              >

                <div class="grafico-barra-area">

                  <span class="grafico-valor">
                    {{ dia.cantidad }}
                  </span>

                  <div
                    class="grafico-barra"
                    :style="{
                      height: Math.max(
                        (dia.cantidad / maxVentasGrafico) * 100,
                        dia.cantidad > 0 ? 8 : 3
                      ) + '%'
                    }"
                  ></div>

                </div>

                <span class="grafico-dia">
                  {{ dia.nombre }}
                </span>

              </div>

            </div>

          </div>

          <!-- ACCESOS RÁPIDOS -->
          <div class="panel acciones">

            <h3>⚡ Accesos rápidos</h3>

            <button @click="cambiarPagina('Venta de pasajes')">
              <span class="accion-icon naranja">🎫</span>

              <div>
                <strong>Vender pasaje</strong>
                <small>Registrar una nueva venta</small>
              </div>

              <span class="flecha">→</span>
            </button>

            <button @click="cambiarPagina('Viajes')">
              <span class="accion-icon azul">🚌</span>

              <div>
                <strong>Gestionar viajes</strong>
                <small>Ver y programar viajes</small>
              </div>

              <span class="flecha">→</span>
            </button>

            <button @click="cambiarPagina('Flota')">
              <span class="accion-icon verde">🚍</span>

              <div>
                <strong>Gestionar flota</strong>
                <small>Administrar buses</small>
              </div>

              <span class="flecha">→</span>
            </button>

            <button @click="cambiarPagina('Choferes')">
              <span class="accion-icon morado">👨‍✈️</span>

              <div>
                <strong>Gestionar choferes</strong>
                <small>Administrar conductores</small>
              </div>

              <span class="flecha">→</span>
            </button>

          </div>

        </section>

        <!-- VENTAS RECIENTES -->
        <section class="panel panel-ventas">

          <div class="panel-header">
            <div>
              <h3>🎫 Ventas recientes</h3>
              <small class="subtitulo-panel">
                Últimos boletos registrados
              </small>
            </div>

            <button
              class="ver-todo"
              @click="cambiarPagina('Boletos vendidos')"
            >
              Ver todos →
            </button>
          </div>

          <div class="tabla-dashboard">

            <div class="tabla-dashboard-header">
              <span>Pasajero</span>
              <span>Destino</span>
              <span>Asiento</span>
              <span>Precio</span>
            </div>

            <div
              v-for="venta in ventasRecientes"
              :key="venta.id"
              class="tabla-dashboard-fila"
            >
              <span class="pasajero-celda">
                <strong>{{ obtenerPasajero(venta) }}</strong>
              </span>

              <span>{{ obtenerDestino(venta) }}</span>

              <span>
                <span class="asiento-badge">
                  {{ obtenerAsiento(venta) }}
                </span>
              </span>

              <span class="precio-celda">
                S/ {{ formatoPrecio(obtenerPrecio(venta)) }}
              </span>
            </div>

            <div
              v-if="ventasRecientes.length === 0"
              class="vacio-dashboard"
            >
              <div>🎫</div>
              <p>Aún no hay ventas registradas</p>
              <small>Las ventas aparecerán aquí automáticamente</small>
            </div>

          </div>

        </section>

        <!-- PRÓXIMOS VIAJES -->
        <section class="panel panel-viajes">

          <div class="panel-header">
            <div>
              <h3>🚌 Próximos viajes</h3>
              <small class="subtitulo-panel">
                Viajes registrados en el sistema
              </small>
            </div>

            <button
              class="ver-todo"
              @click="cambiarPagina('Viajes')"
            >
              Ver viajes →
            </button>
          </div>

          <div class="viajes-dashboard">

            <div
              v-for="viaje in viajesProximos"
              :key="viaje.id"
              class="viaje-dashboard-card"
            >

              <div class="viaje-ruta">
                <div class="viaje-ciudades">
                  <strong>{{ obtenerOrigenViaje(viaje) }}</strong>

                  <span class="viaje-flecha">→</span>

                  <strong>{{ obtenerDestinoViaje(viaje) }}</strong>
                </div>

                <div class="viaje-info">
                  📅 {{ obtenerFechaViaje(viaje) }}
                  &nbsp; · &nbsp;
                  🕐 {{ obtenerHoraViaje(viaje) }}
                </div>

                <div class="viaje-bus">
                  🚌 {{ obtenerBus(viaje) }}
                </div>
              </div>

              <span class="estado-viaje">
                {{ obtenerEstado(viaje) }}
              </span>

            </div>

            <div
              v-if="viajesProximos.length === 0"
              class="vacio-dashboard"
            >
              <div>🚌</div>
              <p>No hay viajes registrados</p>
              <small>Registra tus viajes para verlos aquí</small>
            </div>

          </div>

        </section>

      </template>

      <!-- VENTA -->
      <template v-else-if="paginaActual === 'Venta de pasajes'">
        <VentaPasajes />
      </template>

      <!-- VIAJES -->
      <template v-else-if="paginaActual === 'Viajes'">
        <Viajes />
      </template>

      <!-- FLOTA -->
      <template v-else-if="paginaActual === 'Flota'">
        <Flota />
      </template>

      <!-- CHOFERES -->
      <template v-else-if="paginaActual === 'Choferes'">
        <Choferes />
      </template>

      <!-- BOLETOS -->
      <template v-else-if="paginaActual === 'Boletos vendidos'">
        <Boletos />
      </template>

    </main>
  </div>
</template>

<style>
/* ELEMENTOS NUEVOS DEL DASHBOARD */

.tarjeta-clicable {
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.tarjeta-clicable:hover {
  transform: translateY(-3px);
  border-color: #ff8533;
}

.dashboard-superior {
  align-items: stretch;
}

.panel-grafico {
  min-height: 320px;
}

.subtitulo-panel {
  display: block;
  color: #8b9bb5;
  font-size: 12px;
  margin-top: 5px;
}

.grafico-container {
  height: 220px;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  gap: 14px;
  padding: 20px 10px 0;
}

.grafico-columna {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.grafico-barra-area {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
  border-bottom: 1px solid #30343c;
}

.grafico-valor {
  color: #ff8533;
  font-size: 12px;
  margin-bottom: 6px;
  font-weight: bold;
}

.grafico-barra {
  width: min(36px, 70%);
  min-height: 3px;
  background: linear-gradient(180deg, #ff9b50, #ff7628);
  border-radius: 7px 7px 0 0;
  transition: height 0.4s;
}

.grafico-dia {
  font-size: 11px;
  color: #9aabc4;
  margin-top: 9px;
  text-transform: capitalize;
}

.panel-ventas,
.panel-viajes {
  margin-top: 20px;
}

.tabla-dashboard {
  width: 100%;
  overflow-x: auto;
}

.tabla-dashboard-header,
.tabla-dashboard-fila {
  display: grid;
  grid-template-columns: 1.5fr 1fr 0.7fr 0.8fr;
  align-items: center;
  gap: 12px;
  min-width: 600px;
}

.tabla-dashboard-header {
  background: #202127;
  color: #91a9c9;
  padding: 13px 15px;
  font-size: 12px;
  font-weight: 600;
}

.tabla-dashboard-fila {
  padding: 14px 15px;
  border-bottom: 1px solid #2d3036;
  font-size: 13px;
  transition: background 0.2s;
}

.tabla-dashboard-fila:hover {
  background: #1b1c20;
}

.pasajero-celda strong {
  color: #e6eaf0;
}

.asiento-badge {
  display: inline-block;
  padding: 4px 9px;
  background: #272b34;
  border-radius: 6px;
  color: #9db7da;
  font-size: 12px;
}

.precio-celda {
  color: #ff913f;
  font-weight: bold;
}

.vacio-dashboard {
  text-align: center;
  padding: 35px 15px;
  color: #8491a5;
}

.vacio-dashboard > div {
  font-size: 32px;
  margin-bottom: 10px;
}

.vacio-dashboard p {
  margin: 5px 0;
  color: #c6cfdb;
}

.vacio-dashboard small {
  font-size: 12px;
}

.viajes-dashboard {
  display: flex;
  flex-direction: column;
}

.viaje-dashboard-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 16px;
  border-bottom: 1px solid #2d3036;
  transition: background 0.2s;
}

.viaje-dashboard-card:hover {
  background: #1b1c20;
}

.viaje-ruta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.viaje-ciudades {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e8edf5;
}

.viaje-flecha {
  color: #ff8533;
  font-weight: bold;
}

.viaje-info,
.viaje-bus {
  font-size: 12px;
  color: #91a1b8;
}

.estado-viaje {
  background: rgba(40, 180, 100, 0.12);
  color: #55d88c;
  border: 1px solid rgba(40, 180, 100, 0.25);
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 11px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .dashboard-superior {
    grid-template-columns: 1fr;
  }

  .grafico-container {
    height: 190px;
  }
}

@media (max-width: 600px) {
  .viaje-dashboard-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>