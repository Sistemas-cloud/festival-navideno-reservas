'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserData, HermanosData } from '@/types';
import { hasEarlyAccess, getOpeningDateForFunction } from '@/lib/config/earlyAccess';
import { getTodayInMonterrey, parseDateString } from '@/lib/utils/timezone';

/**
 * Valida si un usuario tiene acceso al sistema basándose en:
 * - Si es usuario interno (siempre tiene acceso)
 * - Si tiene acceso anticipado
 * - Si la fecha de apertura ya pasó
 */
function validateUserAccess(userData: UserData): boolean {
  // Usuarios internos siempre tienen acceso
  if (userData.isInternal) {
    console.log('✅ Validación de acceso: Usuario interno - acceso permitido');
    return true;
  }

  // Obtener el alumno actual de la lista de hermanos
  const alumnoActual = userData.hermanos?.find(
    (h: HermanosData) => String(h.control) === String(userData.alumnoRef)
  );

  if (!alumnoActual) {
    console.warn('⚠️ Validación de acceso: No se encontró el alumno actual en la lista de hermanos');
    return false;
  }

  const { nivel, grado } = alumnoActual;

  // Calcular función numérica para validación de acceso anticipado
  let funcionNum = 3; // Por defecto
  if (nivel === 1 || nivel === 2 || (nivel === 3 && grado === 1)) {
    funcionNum = 1;
  } else if (nivel === 3 && grado >= 2 && grado <= 5) {
    funcionNum = 2;
  } else if (nivel === 3 && grado === 6 || nivel === 4) {
    funcionNum = 3;
  }

  // IMPORTANTE: La función 1 NO tiene restricción de fecha - siempre está abierta
  // Las funciones 2 y 3 mantienen sus restricciones de fecha
  if (funcionNum === 1) {
    console.log(`✅ Validación de acceso: Función 1 siempre está abierta (sin restricción de fecha)`);
    return true;
  }

  // Para funciones 2 y 3, verificar acceso anticipado o fecha de apertura
  const controlNumber = Number(userData.alumnoRef);
  const tieneAccesoAnticipado = hasEarlyAccess(controlNumber);
  const fechaAperturaStr = getOpeningDateForFunction(funcionNum);

  // Solo denegar acceso si NO tiene acceso anticipado Y la fecha actual es ANTES de la fecha de apertura
  // Si la fecha es igual o posterior, permitir acceso
  const today = getTodayInMonterrey();
  const fechaApertura = parseDateString(fechaAperturaStr);
  const fechaAunNoHaPasado = today.getTime() < fechaApertura.getTime();

  if (!tieneAccesoAnticipado && fechaAunNoHaPasado) {
    console.log(`🚫 Validación de acceso: Usuario ${userData.alumnoRef} no tiene acceso - fecha de apertura: ${fechaAperturaStr}`);
    console.log(`📅 Fecha actual: ${today.toLocaleDateString('es-MX')}, Fecha de apertura: ${fechaApertura.toLocaleDateString('es-MX')}`);
    return false;
  }

  console.log(`✅ Validación de acceso: Usuario ${userData.alumnoRef} tiene acceso permitido`);
  return true;
}

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
        const parsedData: UserData = JSON.parse(storedData);
        
        // Debug: Log de datos cargados desde localStorage
        console.log('🔍 useAuth Debug - Datos cargados desde localStorage:', parsedData);
        console.log('👥 useAuth Debug - hermanos cargados:', parsedData.hermanos);
        console.log('📏 useAuth Debug - hermanos.length:', parsedData.hermanos?.length);
        
        // VALIDAR ACCESO: Verificar si el usuario todavía tiene acceso
        const tieneAcceso = validateUserAccess(parsedData);
        
        if (!tieneAcceso) {
          console.log('🚫 useAuth: Usuario no tiene acceso - limpiando localStorage y cerrando sesión');
          localStorage.removeItem('userData');
          setUserData(null);
          setIsAuthenticated(false);
          return;
        }
        
        // Si tiene acceso, establecer los datos
        setUserData(parsedData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
        localStorage.removeItem('userData');
        setUserData(null);
        setIsAuthenticated(false);
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

      // Debug: Log completo de la respuesta
      console.log('🔍 useAuth - Respuesta completa del servidor:', result);
      console.log('🔍 useAuth - result.success:', result.success);
      console.log('🔍 useAuth - result.data:', result.data);
      console.log('🔍 useAuth - result.data es array?', Array.isArray(result.data));
      console.log('🔍 useAuth - result.data length:', Array.isArray(result.data) ? result.data.length : 'N/A');
      console.log('🔍 useAuth - result.isAccessDeniedByDate:', result.isAccessDeniedByDate);
      console.log('🔍 useAuth - result.message:', result.message);

      if (result.success) {
        // Verificar que result.data existe y es un array (puede estar vacío pero debe existir)
        if (!result.data || !Array.isArray(result.data)) {
          console.error('❌ useAuth - result.data no es un array válido:', result.data);
          alert('Error: Datos de usuario inválidos. Por favor, intenta nuevamente.');
          return { success: false };
        }

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
        
        console.log('✅ useAuth - Login exitoso, redirigiendo...');
        
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
          console.log('🚫 useAuth - Acceso denegado por fecha');
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
        console.error('❌ useAuth - Error en login:', result.message);
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
