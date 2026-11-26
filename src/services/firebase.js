import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyDpvg0Zealf8gtF_yAdufK4vCiyH5Z1kw4',
  authDomain: 'transpro-43f82.firebaseapp.com',
  databaseURL: 'https://transpro-43f82-default-rtdb.firebaseio.com',
  projectId: 'transpro-43f82',
  storageBucket: 'transpro-43f82.firebasestorage.app',
  messagingSenderId: '339919360306',
  appId: '1:339919360306:web:afa2d6e21d786fa470072b'
}

const app = initializeApp(firebaseConfig)

export const db = getDatabase(app)