'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserData } from '@/types';

export const useAuth = () => {
  const router = useRouter();
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

  const login = async (alumnoRef: number, clave: string | number): Promise<boolean> => {
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
        const newUserData: UserData = {
          alumnoRef,
          alumnoNombre: '', // Se puede obtener del nombre completo más adelante
          hermanos: result.data,
        };

        localStorage.setItem('userData', JSON.stringify(newUserData));
        
        // Actualizar estado para forzar re-render
        setUserData(newUserData);
        setIsAuthenticated(true);
        
        // Forzar navegación y refresh
        setTimeout(() => {
          router.push('/');
          router.refresh();
          
          // Fallback: recargar página si no funciona el router
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }, 500);
        }, 100);
        
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
    localStorage.removeItem('userData');
    
    // Actualizar estado para forzar re-render
    setUserData(null);
    setIsAuthenticated(false);
    
    // Forzar navegación y refresh
    setTimeout(() => {
      router.push('/');
      router.refresh();
      
      // Fallback: recargar página si no funciona el router
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 500);
    }, 100);
  };

  return {
    userData,
    isAuthenticated,
    loading,
    login,
    logout,
  };
};
