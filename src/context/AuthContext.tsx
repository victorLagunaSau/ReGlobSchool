'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escucha en tiempo real si el usuario inicia o cierra sesión
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Al estar logueado, creamos la cookie para el Middleware del servidor
        document.cookie = "regoschol_session=true; path=/; max-age=86400; SameSite=Lax";
      } else {
        // Si no hay usuario, destruimos la cookie de inmediato
        document.cookie = "regoschol_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // Borramos la cookie explícitamente en el logout
      document.cookie = "regoschol_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {/*
        Permitimos que renderice los hijos siempre.
        Ahora el control de "pantalla de carga" lo maneja individualmente cada página o layout,
        evitando romper la hidratación de Next.js y previniendo bloqueos del middleware en la raíz.
      */}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);