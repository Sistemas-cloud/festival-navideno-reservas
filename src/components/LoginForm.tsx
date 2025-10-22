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
    
    if (!alumnoRef.trim() || !clave.trim()) {
      alert('Por favor, completa todos los campos');
      return;
    }

    const success = await login(parseInt(alumnoRef), clave);
    if (success) {
      onLoginSuccess();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #faf5ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elementos decorativos */}
      <div style={{
        position: 'absolute',
        top: '80px',
        left: '40px',
        width: '16px',
        height: '16px',
        background: 'rgba(59, 130, 246, 0.3)',
        borderRadius: '50%',
        animation: 'gentlePulse 2s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '160px',
        right: '80px',
        width: '24px',
        height: '24px',
        background: 'rgba(147, 51, 234, 0.3)',
        borderRadius: '50%',
        animation: 'gentlePulse 2s ease-in-out infinite',
        animationDelay: '1s'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '160px',
        left: '80px',
        width: '12px',
        height: '12px',
        background: 'rgba(236, 72, 153, 0.3)',
        borderRadius: '50%',
        animation: 'gentlePulse 2s ease-in-out infinite',
        animationDelay: '2s'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '80px',
        right: '40px',
        width: '20px',
        height: '20px',
        background: 'rgba(99, 102, 241, 0.3)',
        borderRadius: '50%',
        animation: 'gentlePulse 2s ease-in-out infinite',
        animationDelay: '0.5s'
      }}></div>

      {/* Formulario de login moderno */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        margin: '16px'
      }}>
        {/* Header del formulario */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{ fontSize: '32px' }}>🎫</span>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            Festival Navideño
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Portal de Reserva de Boletos</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="alumno_ref" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Número de Control
            </label>
            <input
              type="text"
              id="alumno_ref"
              value={alumnoRef}
              onChange={(e) => setAlumnoRef(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                color: '#1f2937',
                background: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              placeholder="Ingresa tu número de control"
              required
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="clave" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Contraseña
            </label>
            <input
              type="password"
              id="clave"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                color: '#1f2937',
                background: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Footer del formulario */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>
            ¿Necesitas ayuda? Contacta al administrador
          </p>
        </div>
      </div>

      {/* Copos de nieve animados */}
      {Array.from({ length: 20 }, (_, i) => (
        <div 
          key={i} 
          style={{
            position: 'fixed',
            top: '-10px',
            zIndex: 10,
            userSelect: 'none',
            cursor: 'default',
            animation: 'snow 10s linear infinite',
            pointerEvents: 'none',
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};
