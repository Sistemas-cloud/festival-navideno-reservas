'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AccessDeniedModal } from './AccessDeniedModal';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [alumnoRef, setAlumnoRef] = useState('');
  const [clave, setClave] = useState('');
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedInfo, setAccessDeniedInfo] = useState<{
    fechaApertura: string;
    nombreFuncion: string;
  } | null>(null);
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alumnoRef.trim() || !clave.trim()) {
      alert('Por favor, completa todos los campos');
      return;
    }

    // Si intentan entrar como admin en el portal de alumnos, redirigir al panel admin
    if (alumnoRef.trim().toLowerCase() === 'admin') {
      window.location.href = '/admin';
      return;
    }

    const result = await login(parseInt(alumnoRef), clave);
    
    if (result.success) {
      onLoginSuccess();
    } else if (result.errorInfo?.isAccessDeniedByDate) {
      // Mostrar modal de acceso denegado
      setAccessDeniedInfo({
        fechaApertura: result.errorInfo.fechaApertura || '',
        nombreFuncion: result.errorInfo.nombreFuncion || ''
      });
      setShowAccessDeniedModal(true);
    } else {
      // El error ya se mostró en un alert dentro de useAuth
      // Pero podemos limpiar los campos si es necesario
      // setAlumnoRef('');
      // setClave('');
    }
  };

  return (
    <div className="login-container">
      {/* Luces navideñas en la parte superior */}
      <div className="christmas-lights"></div>
      
      {/* Copos de nieve animados */}
      {Array.from({ length: 25 }, (_, i) => (
        <div 
          key={i} 
          className="snowflake"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        >
          ❄
        </div>
      ))}
      
      {/* Elementos decorativos navideños */}
      <div className="christmas-tree"></div>
      <div className="gift-box"></div>
      <div className="bells"></div>
      <div className="snowman"></div>
      
      {/* Elementos decorativos flotantes */}
      <div className="decorative-element"></div>
      <div className="decorative-element"></div>
      <div className="decorative-element"></div>
      <div className="decorative-element"></div>
      
      {/* Efecto de partículas */}
      <div className="particles">
        {Array.from({ length: 20 }, (_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${6 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>
      
      <form className="login-form animate-fade-in" onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="login-icon">
            <span>🎄</span>
          </div>
          <h1 className="login-title">Festival Navideño</h1>
          <p className="login-subtitle">Portal de Reservas 2025</p>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span className="christmas-icon">🎫</span>
            Número de Control
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Ingresa tu número de control"
            value={alumnoRef}
            onChange={(e) => setAlumnoRef(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <span className="christmas-icon">🔐</span>
            Contraseña
          </label>
          <input
            type="password"
            className="form-input"
            placeholder="Ingresa tu contraseña"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          className="login-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Iniciando sesión...
            </>
          ) : (
            <>
              <span>🎅</span>
              Iniciar Sesión
              <span>🎁</span>
            </>
          )}
        </button>

        <div className="login-footer">
          <p>✨ ¡Bienvenido al Festival Navideño 2025! ✨</p>
          <p>🎭 Una experiencia mágica te espera 🎭</p>
          <button
            type="button"
            onClick={() => (window.location.href = '/admin')}
            className="mt-3 text-sm text-blue-100/90 underline hover:text-white"
          >
            Entrar como administrador
          </button>
        </div>
      </form>

      {/* Modal de acceso denegado */}
      {accessDeniedInfo && (
        <AccessDeniedModal
          isOpen={showAccessDeniedModal}
          onClose={() => {
            setShowAccessDeniedModal(false);
            setAccessDeniedInfo(null);
          }}
          fechaApertura={accessDeniedInfo.fechaApertura}
          nombreFuncion={accessDeniedInfo.nombreFuncion}
        />
      )}
    </div>
  );
};