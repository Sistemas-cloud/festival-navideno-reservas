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
        
        // Debug: Log de datos cargados desde localStorage
        console.log('🔍 useAuth Debug - Datos cargados desde localStorage:', parsedData);
        console.log('👥 useAuth Debug - hermanos cargados:', parsedData.hermanos);
        console.log('📏 useAuth Debug - hermanos.length:', parsedData.hermanos?.length);
        
        setUserData(parsedData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
        localStorage.removeItem('userData');
      }
    }
  }, []);

  const login = async (alumnoRef: number, clave: string | number): Promise<{ success: boolean; errorInfo?: { isAccessDeniedByDate: boolean; fechaApertura?: string; nombreFuncion?: string; message: string } }> => {
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
        // Obtener nombre del primer hermano (usuario actual)
        const primerHermano = result.data[0];
        const nombreCompleto = primerHermano?.nombre || '';
        
        const newUserData: UserData = {
          alumnoRef,
          alumnoNombre: nombreCompleto,
          hermanos: result.data,
          isInternal: result.isInternal || false,
          funcionAsignada: result.funcionAsignada || undefined
        };

        // Debug: Log de datos que se van a guardar
        console.log('🔍 useAuth Debug - result.data:', result.data);
        console.log('📏 useAuth Debug - result.data.length:', result.data.length);
        console.log('💾 useAuth Debug - newUserData:', newUserData);
        console.log('👥 useAuth Debug - hermanos que se guardarán:', newUserData.hermanos);
        console.log('🔐 useAuth Debug - isInternal:', newUserData.isInternal);
        console.log('🎭 useAuth Debug - funcionAsignada:', newUserData.funcionAsignada);

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
        
        return { success: true };
      } else {
        // Retornar información detallada del error
        if (result.isAccessDeniedByDate) {
          return {
            success: false,
            errorInfo: {
              isAccessDeniedByDate: true,
              fechaApertura: result.fechaApertura,
              nombreFuncion: result.nombreFuncion,
              message: result.message || 'Acceso denegado por fecha'
            }
          };
        }
        // Para otros errores, mostrar alert normal
        alert(result.message || 'Error en el login');
        return { success: false };
      }
    } catch (error) {
      console.error('Error en login:', error);
      alert('Error de conexión');
      return { success: false };
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
