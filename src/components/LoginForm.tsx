'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [alumnoRef, setAlumnoRef] = useState('');
  const [clave, setClave] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alumnoRef || !clave) {
      alert('Por favor, completa todos los campos');
      return;
    }

    const success = await login(parseInt(alumnoRef), parseInt(clave));
    if (success) {
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {/* Carrusel de imágenes */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-b from-blue-500 to-blue-800 rounded-lg p-4 mx-8 my-4">
          <div className="carousel-container relative w-full h-full">
            <div className="carousel-inner relative overflow-hidden">
              <div className="carousel-item active">
                <img 
                  src="/nav1.png" 
                  alt="Imagen 1" 
                  className="carousel-image w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de login */}
      <div className="relative z-10 bg-white border-2 border-blue-500 p-8 rounded-lg shadow-lg w-80 text-center">
        <h4 className="text-xl font-bold text-blue-600 mb-6">
          Portal de Reserva de Boletos
        </h4>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="alumno_ref" className="block text-sm font-medium text-gray-700 mb-2">
              Número de Control:
            </label>
            <input
              type="text"
              id="alumno_ref"
              value={alumnoRef}
              onChange={(e) => setAlumnoRef(e.target.value)}
              className="w-48 px-3 py-2 text-base border-2 border-gray-300 rounded-full text-blue-600 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="clave" className="block text-sm font-medium text-gray-700 mb-2">
              Password:
            </label>
            <input
              type="password"
              id="clave"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="w-48 px-3 py-2 text-base border-2 border-gray-300 rounded-full text-blue-600 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-base border-none rounded-lg cursor-pointer transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 w-full disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Login'}
          </button>
        </form>
      </div>

      {/* Copos de nieve */}
      {Array.from({ length: 19 }, (_, i) => (
        <div key={i} className="snowflake">
          ❄
        </div>
      ))}
    </div>
  );
};
