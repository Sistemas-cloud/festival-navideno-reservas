'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { AdminSeatMap } from '@/components/admin/AdminSeatMap';
import { validateAdminCredentials, canAccessFunction, type AdminUser } from '@/lib/config/adminUsers';

interface CanjeResult {
  control_menor: number;
  control_mayor: number;
  total_menor: number;
  total_mayor: number;
  diferencia: number;
  diferencia_aplicada: number;
  reglas?: {
    aplica_funciones: number[];
    si_diferencia_positiva: string;
    si_diferencia_no_positiva: string;
  };
  updates?: Array<{ id: number; precio: number }>;
  realizar_canje?: boolean;
  pagos?: {
    pagados_mayor: number;
  };
}

interface PagoResult {
  control: number;
  pagadas: number;
  total_a_pagar?: number;
}

interface OcupacionItem {
  fila: string;
  asiento: number;
  estado: 'reservado' | 'pagado';
  referencia: number;
  zona: string;
  nivel?: number;
}

interface ReservaPorControl {
  fila: string;
  asiento: number;
  estado: 'reservado' | 'pagado';
  referencia: number;
  zona: string;
  nivel: number;
}

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  const [controlMenor, setControlMenor] = useState('');
  const [controlMayor, setControlMayor] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CanjeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pago por control
  const [controlPago, setControlPago] = useState('');
  const [pagoResultado, setPagoResultado] = useState<PagoResult | null>(null);
  const [montoRecibidoPago, setMontoRecibidoPago] = useState('');
  const [totalAPagarPago, setTotalAPagarPago] = useState<number | null>(null);
  const [loadingConsultaPago, setLoadingConsultaPago] = useState(false);
  const [funcionMapa, setFuncionMapa] = useState<number>(1);
  
  // Canje
  const [montoRecibidoCanje, setMontoRecibidoCanje] = useState('');
  const [sectionMapa, setSectionMapa] = useState<number>(1);
  const [ocupacion, setOcupacion] = useState<OcupacionItem[]>([]);
  const [resaltados, setResaltados] = useState<{ fila: string; asiento: number; color?: 'blue' | 'orange' }[]>([]);
  const [activeTab, setActiveTab] = useState<'canje' | 'pago' | 'mapa'>('canje');
  const [funcionAnterior, setFuncionAnterior] = useState<number>(1);

  const getAdminHeaders = () => {
    if (!currentUser) return {};
    return {
      'Content-Type': 'application/json',
      'x-admin-user': currentUser.username,
      'x-admin-pass': currentUser.password,
    };
  };

  // Obtener funciones disponibles según el usuario
  const funcionesDisponibles = useMemo(() => {
    if (!currentUser) return [1, 2, 3];
    // Admin tiene acceso a todas
    if (!currentUser.funcion) return [1, 2, 3];
    // Otros usuarios solo su función
    return [currentUser.funcion];
  }, [currentUser]);

  const cargarOcupacion = async (funcion: number) => {
    if (!currentUser || !canAccessFunction(currentUser, funcion)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/ocupacion', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ funcion })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOcupacion(data.data || []);
      }
    } catch {
      // noop
    }
  };

  useEffect(() => { cargarOcupacion(funcionMapa); }, [funcionMapa]);

  // Limpiar resaltados cuando cambia la función
  useEffect(() => {
    if (funcionMapa !== funcionAnterior) {
      setResaltados([]);
      setFuncionAnterior(funcionMapa);
    }
  }, [funcionMapa, funcionAnterior]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = validateAdminCredentials(username, password);
    if (user) {
      setCurrentUser(user);
      setIsAuth(true);
      setError(null);
      // Si el usuario tiene una función específica, establecerla como función inicial
      if (user.funcion) {
        setFuncionMapa(user.funcion);
        setFuncionAnterior(user.funcion);
      }
    } else {
      setError('Credenciales inválidas');
    }
  };

  const callCanje = async (realizar: boolean) => {
    setError(null);
    setResult(null);
    if (!controlMenor || !controlMayor) {
      setError('Ingresa ambos controles');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/canje', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          control_menor: controlMenor,
          control_mayor: controlMayor,
          realizar_canje: realizar,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Error en canje');
      } else {
        setResult(data.data);
        // Si es solo cálculo, sincronizar selects y resaltados con la función/zona de los boletos
        if (!realizar) {
          try {
            const ids: Array<{ id: string; color: 'blue' | 'orange' }> = [];
            if (controlMayor) ids.push({ id: controlMayor, color: 'blue' });
            if (controlMenor) ids.push({ id: controlMenor, color: 'orange' });

            let pickedFuncion: number | null = null;
            let pickedZona: number | null = null; // 1 oro, 2 plata, 3/4 bronce
            const resaltadosTmp: { fila: string; asiento: number; color?: 'blue' | 'orange' }[] = [];

            for (const entry of ids) {
              const r = await fetch('/api/admin/reservas-por-control', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({ control: entry.id })
              });
              const d = await r.json();
              if (r.ok && d.success) {
                const arr = (d.data || []).filter((x: ReservaPorControl) => [2,3].includes(Number(x.nivel)));
                // Elegir función 2 si existe, si no 3
                const has2 = arr.some((x: ReservaPorControl) => Number(x.nivel) === 2);
                const has3 = arr.some((x: ReservaPorControl) => Number(x.nivel) === 3);
                const func = has2 ? 2 : (has3 ? 3 : null);
                if (func && pickedFuncion == null) pickedFuncion = func;
                // Elegir zona por el primer boleto encontrado
                const zonaTxt = (arr.find((x: ReservaPorControl) => Number(x.nivel) === (pickedFuncion ?? func))?.zona || '').toString().toLowerCase();
                if (pickedZona == null && zonaTxt) {
                  if (zonaTxt.includes('oro')) pickedZona = 1;
                  else if (zonaTxt.includes('plata')) pickedZona = 2;
                  else pickedZona = 3; // bronce
                }
                // Resaltar solo en la función elegida
                const funcToUse = pickedFuncion ?? func;
                (arr || []).filter((x: ReservaPorControl) => Number(x.nivel) === funcToUse).forEach((x: ReservaPorControl) => {
                  resaltadosTmp.push({ fila: x.fila, asiento: x.asiento, color: entry.color });
                });
              }
            }

            if (pickedFuncion) {
              setFuncionMapa(pickedFuncion);
              setFuncionAnterior(pickedFuncion); // Actualizar función anterior para evitar limpiar resaltados
            }
            if (pickedZona) setSectionMapa(pickedZona);
            setResaltados(resaltadosTmp);
            // Forzar recarga de ocupación acorde a la función seleccionada
            if (pickedFuncion) await cargarOcupacion(pickedFuncion);
          } catch {
            // noop de resaltado
          }
        }
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const handleCanje = async (e: React.FormEvent) => {
    e.preventDefault();
    callCanje(false);
  };

  const formatCurrency = (n: number | undefined | null) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number(n || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full">
          {!isAuth ? (
            <div className="max-w-md mx-auto">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-indigo-200/50">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Área Administrativa</h1>
                  <p className="text-gray-500 text-sm">Ingresa tus credenciales para continuar</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="Ingresa tu usuario"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Ingresa tu contraseña"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Entrar
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              {/* Encabezado */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 mb-6 border border-indigo-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Panel Administrativo</h2>
                    <p className="text-indigo-100 text-sm">Gestión de canjes, pagos y visualización de mapas</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{currentUser?.nombre}</p>
                      <p className="text-xs text-indigo-100">{currentUser?.descripcion}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAuth(false);
                        setCurrentUser(null);
                        setUsername('');
                        setPassword('');
                        setFuncionMapa(1);
                        setFuncionAnterior(1);
                      }}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white rounded-lg hover:bg-indigo-50 transition-colors shadow-md"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </div>

              {/* Pestañas */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2 mb-6 border border-indigo-200/50">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('canje')} 
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === 'canje' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Canje
                  </button>
                  <button 
                    onClick={() => setActiveTab('pago')} 
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === 'pago' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Pago por Control
                  </button>
                  <button 
                    onClick={() => setActiveTab('mapa')} 
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === 'mapa' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Mapa General
                  </button>
                </div>
              </div>

              {activeTab === 'canje' && (
              <div className="space-y-6">
                {/* Formulario de Canje */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-indigo-200/50">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Canje de Boletos</h2>
                    <p className="text-sm text-gray-500">Solo aplica para Funciones 2 y 3</p>
                  </div>
                  <form onSubmit={handleCanje} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Control del Alumno Menor (canje)
                        </label>
                        <input
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                          value={controlMenor}
                          onChange={(e) => setControlMenor(e.target.value)}
                          placeholder="Ej. 12345"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Control del Hermano Mayor
                        </label>
                        <input
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                          value={controlMayor}
                          onChange={(e) => setControlMayor(e.target.value)}
                          placeholder="Ej. 67890"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        {loading ? 'Calculando…' : 'Calcular Canje'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!result || result.diferencia_aplicada <= 0) {
                            const ok = window.confirm('¿Confirmas realizar el canje (ajustar precios y marcar pagado)?');
                            if (!ok) return;
                            callCanje(true);
                            return;
                          }
                          
                          // Si hay monto a pagar, validar monto recibido
                          if (!montoRecibidoCanje || Number(montoRecibidoCanje) < result.diferencia_aplicada) {
                            setError('El monto recibido debe ser mayor o igual al monto a pagar');
                            return;
                          }
                          
                          const cambio = Number(montoRecibidoCanje) - result.diferencia_aplicada;
                          const ok = window.confirm(
                            `¿Confirmas realizar el canje (ajustar precios y marcar pagado)?\n\n` +
                            `Monto a pagar: ${formatCurrency(result.diferencia_aplicada)}\n` +
                            `Monto recibido: ${formatCurrency(Number(montoRecibidoCanje))}\n` +
                            `Cambio: ${formatCurrency(cambio)}`
                          );
                          if (!ok) return;
                          callCanje(true);
                          // Limpiar monto recibido después del canje
                          setMontoRecibidoCanje('');
                        }}
                        disabled={loading || (result && result.diferencia_aplicada > 0 && (!montoRecibidoCanje || Number(montoRecibidoCanje) < result.diferencia_aplicada))}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        {loading ? 'Procesando…' : 'Realizar Canje'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Resultados */}
                {result && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-indigo-200/50">
                    <h3 className="text-lg font-bold text-gray-900 mb-5">Resultado del Cálculo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl p-5 border-2 border-indigo-300 shadow-md">
                        <div className="text-sm text-indigo-700 font-medium mb-1">Monto Hermano Mayor</div>
                        <div className="text-2xl font-bold text-indigo-900">{formatCurrency(result?.total_mayor)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl p-5 border-2 border-pink-300 shadow-md">
                        <div className="text-sm text-pink-700 font-medium mb-1">Monto Hermano Menor</div>
                        <div className="text-2xl font-bold text-pink-900">{formatCurrency(result?.total_menor)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-5 border-2 border-amber-300 shadow-md">
                        <div className="text-sm text-amber-700 font-medium mb-1">Diferencia</div>
                        <div className="text-2xl font-bold text-amber-900">{formatCurrency(result?.diferencia ?? (Number(result?.total_mayor||0) - Number(result?.total_menor||0)))}</div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl p-5 border-2 border-emerald-400 shadow-lg">
                        <div className="text-sm text-emerald-700 font-semibold mb-1">Monto a pagar</div>
                        <div className="text-2xl font-bold text-emerald-900">{formatCurrency(Math.max(0, Number((result?.diferencia_aplicada ?? (Number(result?.total_mayor||0) - Number(result?.total_menor||0))) || 0)))}</div>
                      </div>
                    </div>

                    {/* Campos de pago para canje */}
                    {result && result.diferencia_aplicada > 0 && (
                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Monto Recibido
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-lg font-semibold"
                            value={montoRecibidoCanje}
                            onChange={(e) => setMontoRecibidoCanje(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        {/* Mostrar Cambio */}
                        {montoRecibidoCanje && Number(montoRecibidoCanje) > 0 && (
                          <div className={`rounded-xl p-5 border-2 ${
                            Number(montoRecibidoCanje) >= result.diferencia_aplicada
                              ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600 font-medium mb-1">
                                  {Number(montoRecibidoCanje) >= result.diferencia_aplicada ? 'Cambio a Devolver' : 'Falta por Pagar'}
                                </p>
                                <p className={`text-3xl font-bold ${
                                  Number(montoRecibidoCanje) >= result.diferencia_aplicada ? 'text-emerald-900' : 'text-red-900'
                                }`}>
                                  {formatCurrency(Math.abs(Number(montoRecibidoCanje) - result.diferencia_aplicada))}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mapa para canje */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-indigo-200/50">
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Función</label>
                      <select 
                        className="px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
                        value={funcionMapa} 
                        onChange={(e) => setFuncionMapa(parseInt(e.target.value))}
                        disabled={funcionesDisponibles.length === 1}
                      >
                        {funcionesDisponibles.includes(1) && <option value={1}>1</option>}
                        {funcionesDisponibles.includes(2) && <option value={2}>2</option>}
                        {funcionesDisponibles.includes(3) && <option value={3}>3</option>}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Zona</label>
                      <select 
                        className="px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
                        value={sectionMapa} 
                        onChange={(e) => setSectionMapa(parseInt(e.target.value))}
                      >
                        <option value={1}>Oro</option>
                        <option value={2}>Plata</option>
                        <option value={3}>Bronce (Palcos)</option>
                        <option value={4}>Bronce (Balcón)</option>
                      </select>
                    </div>
                    <button 
                      type="button" 
                      className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200 transition-colors shadow-sm" 
                      onClick={() => cargarOcupacion(funcionMapa)}
                    >
                      Actualizar
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                      onClick={async () => {
                        const ids: string[] = [];
                        if (controlMayor) ids.push(controlMayor);
                        if (controlMenor) ids.push(controlMenor);
                        const resaltadosTmp: { fila: string; asiento: number; color?: 'blue' | 'orange' }[] = [];
                        for (const id of ids) {
                          const r = await fetch('/api/admin/reservas-por-control', {
                            method: 'POST', headers: getAdminHeaders(), body: JSON.stringify({ control: id })
                          });
                          const d = await r.json();
                          if (r.ok && d.success) {
                            const isFirst = ids.indexOf(id) === 0;
                            (d.data || []).filter((x: ReservaPorControl) => x.nivel === funcionMapa).forEach((x: ReservaPorControl) => resaltadosTmp.push({ fila: x.fila, asiento: x.asiento, color: isFirst ? 'blue' : 'orange' }));
                          }
                        }
                        setResaltados(resaltadosTmp);
                      }}
                    >
                      Resaltar canje
                    </button>
                  </div>
                  <AdminSeatMap
                    section={sectionMapa}
                    ocupados={(ocupacion || []).filter((o: OcupacionItem) => {
                      const z = (o.zona || '').toString().toLowerCase();
                      if (sectionMapa === 1) return z === 'oro' || z.includes('oro');
                      if (sectionMapa === 2) return z === 'plata' || z.includes('plata');
                      return z.includes('bronce');
                    })}
                    resaltados={resaltados}
                  />
                </div>
              </div>
              )}

              {activeTab === 'pago' && (
              <div className="space-y-6">
                {/* Formulario de Pago */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-indigo-200/50">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Pago por Control</h2>
                    <p className="text-sm text-gray-500">Marcar boletos como pagados por número de control</p>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Control del Alumno
                      </label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                          value={controlPago}
                          onChange={(e) => {
                            setControlPago(e.target.value);
                            setTotalAPagarPago(null);
                            setMontoRecibidoPago('');
                            setPagoResultado(null);
                          }}
                          placeholder="Ej. 12345"
                        />
                        <button
                          type="button"
                          disabled={loadingConsultaPago || !controlPago}
                          onClick={async () => {
                            setError(null);
                            setTotalAPagarPago(null);
                            setLoadingConsultaPago(true);
                            try {
                              // Primero consultar las reservas para obtener el total
                              const resConsulta = await fetch('/api/admin/reservas-por-control', {
                                method: 'POST',
                                headers: getAdminHeaders(),
                                body: JSON.stringify({ control: controlPago })
                              });
                              const dataConsulta = await resConsulta.json();
                              if (resConsulta.ok && dataConsulta.success) {
                                // Calcular total sumando los precios de las reservas pendientes
                                const reservasPendientes = (dataConsulta.data || []).filter((r: any) => r.estado === 'reservado');
                                const total = reservasPendientes.reduce((sum: number, r: any) => sum + (Number(r.precio) || 0), 0);
                                setTotalAPagarPago(total);
                              } else {
                                setError('No se encontraron reservas pendientes para este control');
                              }
                            } catch {
                              setError('Error al consultar reservas');
                            } finally {
                              setLoadingConsultaPago(false);
                            }
                          }}
                          className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium"
                        >
                          {loadingConsultaPago ? 'Consultando…' : 'Consultar Total'}
                        </button>
                      </div>
                    </div>

                    {/* Mostrar Total a Pagar */}
                    {totalAPagarPago !== null && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-1">Total a Pagar</p>
                            <p className="text-3xl font-bold text-blue-900">{formatCurrency(totalAPagarPago)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Campo para monto recibido */}
                    {totalAPagarPago !== null && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monto Recibido
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-lg font-semibold"
                          value={montoRecibidoPago}
                          onChange={(e) => setMontoRecibidoPago(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {/* Mostrar Cambio */}
                    {totalAPagarPago !== null && montoRecibidoPago && Number(montoRecibidoPago) > 0 && (
                      <div className={`rounded-xl p-5 border-2 ${
                        Number(montoRecibidoPago) >= totalAPagarPago
                          ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                          : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-1">
                              {Number(montoRecibidoPago) >= totalAPagarPago ? 'Cambio a Devolver' : 'Falta por Pagar'}
                            </p>
                            <p className={`text-3xl font-bold ${
                              Number(montoRecibidoPago) >= totalAPagarPago ? 'text-emerald-900' : 'text-red-900'
                            }`}>
                              {formatCurrency(Math.abs(Number(montoRecibidoPago) - totalAPagarPago))}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={loading || !controlPago || totalAPagarPago === null || !montoRecibidoPago || Number(montoRecibidoPago) < totalAPagarPago}
                      onClick={async () => {
                        setPagoResultado(null);
                        setError(null);
                        if (!controlPago) {
                          setError('Ingresa el control del alumno');
                          return;
                        }
                        if (!montoRecibidoPago || Number(montoRecibidoPago) < (totalAPagarPago || 0)) {
                          setError('El monto recibido debe ser mayor o igual al total a pagar');
                          return;
                        }
                        const cambio = Number(montoRecibidoPago) - (totalAPagarPago || 0);
                        const confirmar = window.confirm(
                          `¿Confirmas marcar como pagados los boletos de este alumno?\n\n` +
                          `Total a pagar: ${formatCurrency(totalAPagarPago || 0)}\n` +
                          `Monto recibido: ${formatCurrency(Number(montoRecibidoPago))}\n` +
                          `Cambio: ${formatCurrency(cambio)}`
                        );
                        if (!confirmar) return;
                        setLoading(true);
                        try {
                          const res = await fetch('/api/admin/pagar', {
                            method: 'POST',
                            headers: getAdminHeaders(),
                            body: JSON.stringify({ control: controlPago })
                          });
                          const data = await res.json();
                          if (!res.ok || !data.success) {
                            setError(data.message || 'No fue posible realizar el pago');
                          } else {
                            setPagoResultado(data.data);
                            // Limpiar campos después del pago exitoso
                            setMontoRecibidoPago('');
                            setTotalAPagarPago(null);
                            setControlPago('');
                          }
                        } catch {
                          setError('Error de red');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {loading ? 'Procesando…' : 'Marcar como Pagado'}
                    </button>
                  </div>
                </div>

                {/* Resultado del Pago */}
                {pagoResultado && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-indigo-200/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Pago realizado exitosamente</h3>
                        <p className="text-sm text-gray-500">Boletos marcados como pagados</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-700 font-medium mb-1">Boletos Pagados</p>
                        <p className="text-2xl font-bold text-blue-900">{pagoResultado.pagadas}</p>
                      </div>
                      {pagoResultado.total_a_pagar !== undefined && (
                        <>
                          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                            <p className="text-sm text-indigo-700 font-medium mb-1">Total Pagado</p>
                            <p className="text-2xl font-bold text-indigo-900">{formatCurrency(pagoResultado.total_a_pagar)}</p>
                          </div>
                          {montoRecibidoPago && Number(montoRecibidoPago) > (pagoResultado.total_a_pagar || 0) && (
                            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                              <p className="text-sm text-emerald-700 font-medium mb-1">Cambio Devuelto</p>
                              <p className="text-2xl font-bold text-emerald-900">
                                {formatCurrency(Number(montoRecibidoPago) - (pagoResultado.total_a_pagar || 0))}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Mapa para pago */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-indigo-200/50">
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Función</label>
                      <select 
                        className="px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
                        value={funcionMapa} 
                        onChange={(e) => setFuncionMapa(parseInt(e.target.value))}
                        disabled={funcionesDisponibles.length === 1}
                      >
                        {funcionesDisponibles.includes(1) && <option value={1}>1</option>}
                        {funcionesDisponibles.includes(2) && <option value={2}>2</option>}
                        {funcionesDisponibles.includes(3) && <option value={3}>3</option>}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Zona</label>
                      <select 
                        className="px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
                        value={sectionMapa} 
                        onChange={(e) => setSectionMapa(parseInt(e.target.value))}
                      >
                        <option value={1}>Oro</option>
                        <option value={2}>Plata</option>
                        <option value={3}>Bronce (Palcos)</option>
                        <option value={4}>Bronce (Balcón)</option>
                      </select>
                    </div>
                    <button 
                      type="button" 
                      className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200 transition-colors shadow-sm" 
                      onClick={() => cargarOcupacion(funcionMapa)}
                    >
                      Actualizar
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                      onClick={async () => {
                        setResaltados([]);
                        if (!controlPago) return;
                        try {
                          const r = await fetch('/api/admin/reservas-por-control', {
                            method: 'POST', 
                            headers: getAdminHeaders(), 
                            body: JSON.stringify({ control: controlPago })
                          });
                          const d = await r.json();
                          if (r.ok && d.success) {
                            const reservas = d.data || [];
                            
                            // Determinar función y zona de los boletos
                            let pickedFuncion: number | null = null;
                            let pickedZona: number | null = null;
                            
                            // Si hay reservas, usar la primera para determinar función y zona
                            if (reservas.length > 0) {
                              const primeraReserva = reservas[0];
                              pickedFuncion = Number(primeraReserva.nivel);
                              
                              // Determinar zona basándose en el nombre de la zona
                              const zonaTxt = (primeraReserva.zona || '').toString().toLowerCase();
                              if (zonaTxt.includes('oro')) {
                                pickedZona = 1;
                              } else if (zonaTxt.includes('plata')) {
                                pickedZona = 2;
                              } else if (zonaTxt.includes('bronce')) {
                                // Determinar si es Palcos o Balcón
                                if (zonaTxt.includes('palco')) {
                                  pickedZona = 3;
                                } else {
                                  pickedZona = 4;
                                }
                              }
                            }
                            
                            // Actualizar función y zona si se encontraron
                            if (pickedFuncion) {
                              setFuncionMapa(pickedFuncion);
                              setFuncionAnterior(pickedFuncion); // Actualizar función anterior para evitar limpiar resaltados
                            }
                            if (pickedZona) {
                              setSectionMapa(pickedZona);
                            }
                            
                            // Resaltar asientos de la función seleccionada (o la actual si no se encontró función)
                            const funcionParaResaltar = pickedFuncion || funcionMapa;
                            const rs = reservas
                              .filter((x: ReservaPorControl) => Number(x.nivel) === funcionParaResaltar)
                              .map((x: ReservaPorControl) => ({ fila: x.fila, asiento: x.asiento, color: 'blue' as const }));
                            setResaltados(rs);
                            
                            // Cargar ocupación de la función actualizada
                            if (pickedFuncion) {
                              await cargarOcupacion(pickedFuncion);
                            }
                          }
                        } catch {
                          // Error al resaltar
                        }
                      }}
                    >
                      Resaltar a pagar
                    </button>
                  </div>
                  <AdminSeatMap
                    section={sectionMapa}
                    ocupados={(ocupacion || []).filter((o: OcupacionItem) => {
                      const z = (o.zona || '').toString().toLowerCase();
                      if (sectionMapa === 1) return z === 'oro' || z.includes('oro');
                      if (sectionMapa === 2) return z === 'plata' || z.includes('plata');
                      return z.includes('bronce');
                    })}
                    resaltados={resaltados}
                  />
                </div>
              </div>
              )}

              {activeTab === 'mapa' && (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-indigo-200/50">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Mapa General</h2>
                    <p className="text-sm text-gray-500">Visualización de ocupación de asientos por función y zona</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Función</label>
                      <select 
                        className="px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
                        value={funcionMapa} 
                        onChange={(e) => setFuncionMapa(parseInt(e.target.value))}
                        disabled={funcionesDisponibles.length === 1}
                      >
                        {funcionesDisponibles.includes(1) && <option value={1}>1</option>}
                        {funcionesDisponibles.includes(2) && <option value={2}>2</option>}
                        {funcionesDisponibles.includes(3) && <option value={3}>3</option>}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Zona</label>
                      <select 
                        className="px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
                        value={sectionMapa} 
                        onChange={(e) => setSectionMapa(parseInt(e.target.value))}
                      >
                        <option value={1}>Oro</option>
                        <option value={2}>Plata</option>
                        <option value={3}>Bronce (Palcos)</option>
                        <option value={4}>Bronce (Balcón)</option>
                      </select>
                    </div>
                    <button 
                      type="button" 
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg" 
                      onClick={() => cargarOcupacion(funcionMapa)}
                    >
                      Actualizar Mapa
                    </button>
                  </div>
                  <AdminSeatMap
                    section={sectionMapa}
                    ocupados={(ocupacion || []).filter((o: OcupacionItem) => {
                      const z = (o.zona || '').toString().toLowerCase();
                      if (sectionMapa === 1) return z === 'oro' || z.includes('oro');
                      if (sectionMapa === 2) return z === 'plata' || z.includes('plata');
                      return z.includes('bronce');
                    })}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


