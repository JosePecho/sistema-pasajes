
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from '../services/firebase'
import { ref as dbRef, onValue } from 'firebase/database'

const boletos = ref([])
const cargando = ref(true)
const busqueda = ref('')
const filtro = ref('Todos')
let detenerEscucha = null

onMounted(() => {
  console.log('🟢 BOLETOS: componente iniciado')

  const referencia = dbRef(db, 'ventas')
  console.log('🟢 BOLETOS: buscando Firebase en /ventas')

  detenerEscucha = onValue(referencia, (snapshot) => {
    const datos = snapshot.val()
    console.log('📦 BOLETOS: datos recibidos:', datos)

    if (datos) {
      boletos.value = Object.entries(datos).map(([id, venta]) => ({
        id,
        ...venta
      })).sort((a, b) => {
        return new Date(b.fechaVenta || 0) - new Date(a.fechaVenta || 0)
      })

      console.log('🎫 BOLETOS: cantidad recibida:', boletos.value.length)
      console.log('📋 BOLETOS:', boletos.value)
    } else {
      boletos.value = []
      console.log('⚠️ BOLETOS: Firebase devolvió vacío')
    }

    cargando.value = false
  }, (error) => {
    console.error('❌ BOLETOS: error Firebase:', error)
    cargando.value = false
  })
})

onUnmounted(() => {
  if (detenerEscucha) detenerEscucha()
})

const boletosFiltrados = computed(() => {
  const texto = busqueda.value.toLowerCase().trim()

  return boletos.value.filter((boleto) => {
    const coincideTexto = [
      boleto.id,
      boleto.pasajero,
      boleto.dni,
      boleto.destino,
      boleto.origen,
      boleto.asiento,
      boleto.bus
    ].some(valor => String(valor || '').toLowerCase().includes(texto))

    const coincideEstado = filtro.value === 'Todos' ||
      (boleto.estado || 'Vendido') === filtro.value

    return coincideTexto && coincideEstado
  })
})

const totalBoletos = computed(() => boletos.value.length)

const totalRecaudado = computed(() => {
  return boletos.value.reduce((total, boleto) => {
    return total + Number(boleto.precio || boleto.price || 0)
  }, 0)
})

function fechaBonita(fecha) {
  if (!fecha) return 'Sin fecha'

  const partes = String(fecha).split('-')

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  return fecha
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
  const ventana = window.open('', '_blank', 'width=650,height=750')

  if (!ventana) {
    alert('Permite las ventanas emergentes para imprimir el boleto.')
    return
  }

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Boleto TransPro</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 30px;
          color: #222;
        }
        .ticket {
          max-width: 480px;
          margin: auto;
          border: 2px dashed #333;
          border-radius: 12px;
          padding: 25px;
        }
        h1 {
          text-align: center;
          color: #1769aa;
          margin-bottom: 5px;
        }
        .sub {
          text-align: center;
          color: #666;
          margin-bottom: 25px;
        }
        .dato {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #ddd;
          padding: 10px 0;
          gap: 15px;
        }
        .dato strong {
          text-align: right;
        }
        .precio {
          text-align: center;
          font-size: 25px;
          font-weight: bold;
          margin-top: 25px;
        }
        .pie {
          text-align: center;
          margin-top: 25px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <h1>TRANSPRO</h1>
        <div class="sub">BOLETO DE VIAJE</div>

        <div class="dato">
          <span>N° de boleto</span>
          <strong>${escaparHTML(boleto.id)}</strong>
        </div>

        <div class="dato">
          <span>Pasajero</span>
          <strong>${escaparHTML(boleto.pasajero || '-')}</strong>
        </div>

        <div class="dato">
          <span>DNI</span>
          <strong>${escaparHTML(boleto.dni || '-')}</strong>
        </div>

        <div class="dato">
          <span>Teléfono</span>
          <strong>${escaparHTML(boleto.telefono || '-')}</strong>
        </div>

        <div class="dato">
          <span>Origen</span>
          <strong>${escaparHTML(boleto.origen || '-')}</strong>
        </div>

        <div class="dato">
          <span>Destino</span>
          <strong>${escaparHTML(boleto.destino || '-')}</strong>
        </div>

        <div class="dato">
          <span>Fecha</span>
          <strong>${escaparHTML(fechaBonita(boleto.fecha || boleto.date))}</strong>
        </div>

        <div class="dato">
          <span>Hora</span>
          <strong>${escaparHTML(boleto.hora || boleto.hour || '-')}</strong>
        </div>

        <div class="dato">
          <span>Bus</span>
          <strong>${escaparHTML(boleto.bus || '-')}</strong>
        </div>

        <div class="dato">
          <span>Placa</span>
          <strong>${escaparHTML(boleto.placa || boleto.plate || '-')}</strong>
        </div>

        <div class="dato">
          <span>Chofer</span>
          <strong>${escaparHTML(boleto.chofer || boleto.driver || '-')}</strong>
        </div>

        <div class="dato">
          <span>Asiento</span>
          <strong>${escaparHTML(boleto.asiento || '-')}</strong>
        </div>

        <div class="precio">
          S/ ${Number(boleto.precio || boleto.price || 0).toFixed(2)}
        </div>

        <div class="pie">Gracias por viajar con TransPro</div>
      </div>

      <script>
        window.onload = () => window.print()
      <\/script>
    </body>
    </html>
  `)

  ventana.document.close()
}
</script>

<template>
  <div class="boletos-page">
    <div class="encabezado">
      <div>
        <h1>Gestión de Boletos</h1>
        <p>Consulta y administra los pasajes vendidos.</p>
      </div>
      <div class="icono-titulo">🎫</div>
    </div>

    <div class="estadisticas">
      <div class="stat-card">
        <div class="stat-icon azul">🎫</div>
        <div>
          <span>Total de boletos</span>
          <h2>{{ totalBoletos }}</h2>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon verde">💰</div>
        <div>
          <span>Total recaudado</span>
          <h2>S/ {{ totalRecaudado.toFixed(2) }}</h2>
        </div>
      </div>
    </div>

    <div class="contenido">
      <div class="barra-superior">
        <div>
          <h2>Boletos registrados</h2>
          <p>Listado de ventas almacenadas en Firebase</p>
        </div>
        <span class="contador">{{ boletosFiltrados.length }} boletos</span>
      </div>

      <div class="filtros">
        <div class="buscador">
          <span>🔎</span>
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por pasajero, DNI, destino o boleto..."
          >
        </div>

        <select v-model="filtro">
          <option>Todos</option>
          <option>Vendido</option>
          <option>Cancelado</option>
        </select>
      </div>

      <div v-if="cargando" class="mensaje">
        Cargando boletos desde Firebase...
      </div>

      <div v-else-if="boletosFiltrados.length === 0" class="mensaje vacio">
        <div>🎫</div>
        <h3>No se encontraron boletos</h3>
        <p>
          {{ boletos.length === 0
            ? 'Cuando registres una venta, aparecerá aquí automáticamente.'
            : 'Intenta cambiar tu búsqueda o filtro.' }}
        </p>
      </div>

      <div v-else class="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>N° BOLETO</th>
              <th>PASAJERO</th>
              <th>DNI</th>
              <th>RUTA</th>
              <th>FECHA</th>
              <th>ASIENTO</th>
              <th>PRECIO</th>
              <th>ESTADO</th>
              <th>ACCIÓN</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="boleto in boletosFiltrados" :key="boleto.id">
              <td>
                <span class="numero">#{{ boleto.id.slice(-6) }}</span>
              </td>

              <td class="pasajero">{{ boleto.pasajero || '-' }}</td>

              <td>{{ boleto.dni || '-' }}</td>

              <td>
                <div class="ruta">
                  <strong>{{ boleto.origen || '-' }}</strong>
                  <span>→ {{ boleto.destino || '-' }}</span>
                </div>
              </td>

              <td>{{ fechaBonita(boleto.fecha || boleto.date) }}</td>

              <td>
                <span class="asiento">{{ boleto.asiento || '-' }}</span>
              </td>

              <td class="precio-tabla">
                S/ {{ Number(boleto.precio || boleto.price || 0).toFixed(2) }}
              </td>

              <td>
                <span
                  class="estado"
                  :class="(boleto.estado || 'Vendido').toLowerCase()"
                >
                  {{ boleto.estado || 'Vendido' }}
                </span>
              </td>

              <td>
                <button class="btn-imprimir" @click="imprimirBoleto(boleto)">
                  🖨️ Imprimir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.boletos-page {
  padding: 25px;
  color: var(--text-color, #1e293b);
  min-width: 0;
}

.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.encabezado h1 {
  font-size: 25px;
  margin: 0 0 7px;
  font-weight: 700;
}

.encabezado p,
.barra-superior p {
  color: #8490a3;
  margin: 0;
  font-size: 13px;
}

.icono-titulo {
  background: #eaf2ff;
  color: #2563eb;
  border-radius: 12px;
  padding: 13px;
  font-size: 25px;
}

.estadisticas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 25px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e8edf3);
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.azul {
  background: #eaf2ff;
}

.verde {
  background: #e7f9ef;
}

.stat-card span {
  font-size: 13px;
  color: #8490a3;
}

.stat-card h2 {
  font-size: 23px;
  margin: 5px 0 0;
}

.contenido {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e8edf3);
  border-radius: 13px;
  padding: 22px;
}

.barra-superior {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.barra-superior h2 {
  font-size: 18px;
  margin: 0 0 6px;
}

.contador {
  background: #eaf2ff;
  color: #2563eb;
  border-radius: 20px;
  padding: 7px 13px;
  font-size: 12px;
  font-weight: 600;
}

.filtros {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.buscador {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 0 13px;
}

.buscador input {
  width: 100%;
  border: none;
  outline: none;
  padding: 12px 0;
  background: transparent;
  color: inherit;
  font-size: 13px;
}

.filtros select {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 0 13px;
  background: var(--card-bg, #fff);
  color: inherit;
}

.tabla-contenedor {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
  font-size: 12px;
}

th {
  text-align: left;
  color: #8490a3;
  background: var(--table-header-bg, #f8fafc);
  padding: 13px 12px;
  font-weight: 600;
}

td {
  padding: 15px 12px;
  border-bottom: 1px solid var(--border-color, #edf0f4);
}

.numero {
  color: #2563eb;
  font-weight: 700;
}

.pasajero {
  font-weight: 600;
}

.ruta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ruta span {
  color: #8490a3;
}

.asiento {
  background: #eaf2ff;
  color: #2563eb;
  padding: 5px 9px;
  border-radius: 6px;
  font-weight: 700;
}

.precio-tabla {
  font-weight: 700;
}

.estado {
  padding: 5px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: #e7f9ef;
  color: #159455;
}

.estado.cancelado {
  background: #feecec;
  color: #dc2626;
}

.btn-imprimir {
  border: none;
  border-radius: 7px;
  padding: 8px 11px;
  background: #eaf2ff;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
  font-size: 12px;
}

.btn-imprimir:hover {
  background: #d8e7ff;
}

.mensaje {
  text-align: center;
  padding: 45px 15px;
  color: #8490a3;
  font-size: 14px;
}

.vacio div {
  font-size: 38px;
  margin-bottom: 10px;
}

.vacio h3 {
  color: var(--text-color, #334155);
  margin: 0 0 8px;
}

.vacio p {
  margin: 0;
}

@media (max-width: 750px) {
  .boletos-page {
    padding: 15px;
  }

  .estadisticas {
    grid-template-columns: 1fr;
  }

  .filtros {
    flex-direction: column;
  }

  .filtros select {
    padding: 12px;
  }

  .contenido {
    padding: 14px;
  }
}
</style>
