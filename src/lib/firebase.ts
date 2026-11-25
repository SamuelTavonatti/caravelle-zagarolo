import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC-dg1j_YS6a0ib6tA9qRsjCJrIxhDu7hw',
  authDomain: 'caravelle-zagarolo.firebaseapp.com',
  projectId: 'caravelle-zagarolo',
  storageBucket: 'caravelle-zagarolo.firebasestorage.app',
  messagingSenderId: '327414520410',
  appId: '1:327414520410:web:a71b9c932a984811add663',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
