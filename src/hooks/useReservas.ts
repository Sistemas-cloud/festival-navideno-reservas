'use client';

import { useState, useEffect, useCallback } from 'react';
import { AsientosResponse, Reserva, Asiento } from '@/types';

export const useReservas = (alumnoRef: number) => {
  const [asientosDisponibles, setAsientosDisponibles] = useState<number>(0);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pagos, setPagos] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAsientosDisponibles = useCallback(async () => {
    try {
      const response = await fetch('/api/reservas/asientos-disponibles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idAlumno: alumnoRef }),
      });

      const result: AsientosResponse = await response.json();
      setAsientosDisponibles(result.asientos);
    } catch (error) {
      console.error('Error al obtener asientos disponibles:', error);
    }
  }, [alumnoRef]);

  const fetchReservas = useCallback(async () => {
    try {
      const response = await fetch('/api/reservas/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idAlumno: alumnoRef }),
      });

      const result: Reserva[] = await response.json();
      setReservas(result);
    } catch (error) {
      console.error('Error al obtener reservas:', error);
    }
  }, [alumnoRef]);

  const fetchPagos = useCallback(async () => {
    try {
      const response = await fetch('/api/reservas/pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idAlumno: alumnoRef }),
      });

      const result: Reserva[] = await response.json();
      setPagos(result);
    } catch (error) {
      console.error('Error al obtener pagos:', error);
    }
  }, [alumnoRef]);

  const crearReserva = async (
    asientos: Asiento[],
    hermanosData: unknown[],
    precio: number,
    zona: string,
    fechaPago?: string | null
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/reservas/crear-reserva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asientos,
          alumno_ref: alumnoRef,
          hermanos_data: hermanosData,
          precio,
          zona,
          fecha_pago: fechaPago,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Actualizar datos después de la reserva
        await fetchAsientosDisponibles();
        await fetchReservas();
        return true;
      } else {
        alert(result.message || 'Error al crear la reserva');
        return false;
      }
    } catch (error) {
      console.error('Error al crear reserva:', error);
      alert('Error de conexión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const eliminarReserva = async (asientos: Asiento[]): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/reservas/eliminar-reserva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asientos,
          alumno_ref: alumnoRef,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Actualizar datos después de la eliminación
        await fetchAsientosDisponibles();
        await fetchReservas();
        alert(result.message || 'Reserva eliminada exitosamente');
        return true;
      } else {
        alert(result.message || 'Error al eliminar la reserva');
        return false;
      }
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      alert('Error de conexión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (alumnoRef) {
      fetchAsientosDisponibles();
      fetchReservas();
      fetchPagos();
    }
  }, [alumnoRef, fetchAsientosDisponibles, fetchReservas, fetchPagos]);

  return {
    asientosDisponibles,
    reservas,
    pagos,
    loading,
    crearReserva,
    eliminarReserva,
    refetch: () => {
      fetchAsientosDisponibles();
      fetchReservas();
      fetchPagos();
    },
  };
};
