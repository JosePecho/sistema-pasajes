import { ref, set, get } from 'firebase/database'
import { db } from './services/firebase'

const referencia = ref(db, 'pruebaConexion')

async function probarFirebase() {
  try {
    await set(referencia, {
      mensaje: 'Firebase conectado correctamente',
      proyecto: 'TransPro',
      fecha: new Date().toISOString()
    })

    console.log('Dato guardado en Firebase')

    const resultado = await get(referencia)

    if (resultado.exists()) {
      console.log('Dato recibido:', resultado.val())
      console.log('CONEXION EXITOSA')
    }
  } catch (error) {
    console.error('Error de Firebase:', error)
  }
}

probarFirebase()
