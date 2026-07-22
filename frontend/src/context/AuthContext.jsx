import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null); // Firestore users/{uid} doc

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => setUser(fbUser));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    // users/{uid} holds: instagramConnected, igUsername, igAccountType, plan, ...
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, [user]);

  const value = {
    user,
    profile,
    loading: user === undefined,
    isInstagramConnected: Boolean(profile?.instagramConnected),
    signOut: () => firebaseSignOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
