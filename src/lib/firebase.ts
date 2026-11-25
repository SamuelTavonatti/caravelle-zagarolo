import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC-dg1j_YS6a0ib6tA9qRsjCJrIxhDu7hw',
  authDomain: 'caravelle-zagarolo.firebaseapp.com',
  projectId: 'caravelle-zagarolo',
  storageBucket: 'caravelle-zagarolo.firebasestorage.app',
  messagingSenderId: '327414520410',
  appId: '1:327414520410:web:a71b9c932a984811add663',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  firestore = getFirestore(app);
}

export const db = firestore;
