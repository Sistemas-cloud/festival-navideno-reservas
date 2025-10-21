'use client';

import { useState, useEffect } from 'react';
import { UserData } from '@/types';

export const useAuth = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar si hay datos de usuario en localStorage
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setUserData(parsedData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
        localStorage.removeItem('userData');
      }
    }
  }, []);

  const login = async (alumnoRef: number, clave: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alumno_ref: alumnoRef,
          clave: clave,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const userData: UserData = {
          alumnoRef,
          alumnoNombre: '', // Se puede obtener del nombre completo más adelante
          hermanos: result.data,
        };

        setUserData(userData);
        setIsAuthenticated(true);
        localStorage.setItem('userData', JSON.stringify(userData));
        return true;
      } else {
        alert(result.message || 'Error en el login');
        return false;
      }
    } catch (error) {
      console.error('Error en login:', error);
      alert('Error de conexión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUserData(null);
    setIsAuthenticated(false);
    localStorage.removeItem('userData');
  };

  return {
    userData,
    isAuthenticated,
    loading,
    login,
    logout,
  };
};
