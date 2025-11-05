'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { AdminSeatMap } from '@/components/admin/AdminSeatMap';

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

  const [controlMenor, setControlMenor] = useState('');
  const [controlMayor, setControlMayor] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CanjeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pago por control
  const [controlPago, setControlPago] = useState('');
  const [pagoResultado, setPagoResultado] = useState<PagoResult | null>(null);
  const [funcionMapa, setFuncionMapa] = useState<number>(1);
  const [sectionMapa, setSectionMapa] = useState<number>(1);
  const [ocupacion, setOcupacion] = useState<OcupacionItem[]>([]);
  const [resaltados, setResaltados] = useState<{ fila: string; asiento: number; color?: 'blue' | 'orange' }[]>([]);
  const [activeTab, setActiveTab] = useState<'canje' | 'pago' | 'mapa'>('canje');

  const cargarOcupacion = async (funcion: number) => {
    try {
      const res = await fetch('/api/admin/ocupacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-user': 'admin', 'x-admin-pass': 'Admin2025.' },
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

  const isCredsValid = useMemo(() => username === 'admin' && password === 'Admin2025.', [username, password]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCredsValid) {
      setIsAuth(true);
      setError(null);
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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user': 'admin',
          'x-admin-pass': 'Admin2025.',
        },
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
                headers: { 'Content-Type': 'application/json', 'x-admin-user': 'admin', 'x-admin-pass': 'Admin2025.' },
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

            if (pickedFuncion) setFuncionMapa(pickedFuncion);
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
    <div className="admin-container">
      <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-center">
        <div className="admin-form animate-fade-in w-full">
          <h1 className="text-2xl font-bold mb-4">Área Administrativa</h1>

          {!isAuth ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="form-label">Usuario</label>
                <input
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <button type="submit" className="login-button">Entrar</button>
            </form>
          ) : (
            <div className="text-white">
              {/* Encabezado con estilo similar al portal */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl px-6 py-5 mb-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Panel Administrativo</h2>
                    <p className="text-sm opacity-90">Gestión de canjes, pagos y visualización de mapas</p>
                  </div>
                </div>
              </div>

              {/* Pestañas */}
              <div className="flex gap-3 mb-6 border-b border-white/20">
                <button onClick={() => setActiveTab('canje')} className={`px-4 py-2 -mb-px border-b-2 ${activeTab==='canje' ? 'border-white text-white font-semibold' : 'border-transparent text-white/70 hover:text-white'}`}>Canje</button>
                <button onClick={() => setActiveTab('pago')} className={`px-4 py-2 -mb-px border-b-2 ${activeTab==='pago' ? 'border-white text-white font-semibold' : 'border-transparent text-white/70 hover:text-white'}`}>Pago por Control</button>
                <button onClick={() => setActiveTab('mapa')} className={`px-4 py-2 -mb-px border-b-2 ${activeTab==='mapa' ? 'border-white text-white font-semibold' : 'border-transparent text-white/70 hover:text-white'}`}>Mapa General</button>
              </div>

              {activeTab === 'canje' && (
              <>
              <h2 className="text-lg font-semibold mb-4">Canje de Boletos (Solo Funciones 2 y 3)</h2>
              <form onSubmit={handleCanje} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Control del Alumno Menor (canje)</label>
                    <input
                      className="form-input"
                      value={controlMenor}
                      onChange={(e) => setControlMenor(e.target.value)}
                      placeholder="Ej. 12345"
                    />
                  </div>
                  <div>
                    <label className="form-label">Control del Hermano Mayor</label>
                    <input
                      className="form-input"
                      value={controlMayor}
                      onChange={(e) => setControlMayor(e.target.value)}
                      placeholder="Ej. 67890"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Calculando…' : 'Calcular Canje'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm('¿Confirmas realizar el canje (ajustar precios y marcar pagado)?');
                      if (!ok) return;
                      callCanje(true);
                    }}
                    disabled={loading}
                    className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Procesando…' : 'Realizar Canje (ajustar y marcar pagado)'}
                  </button>
                </div>
              </form>

              {result && (
                <div className="mt-6 bg-white/80 text-gray-800 border border-white/40 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Resultado del Cálculo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-3 rounded bg-gray-50 border">
                      <div className="text-gray-600">Monto Hermano Mayor</div>
                      <div className="font-semibold">{formatCurrency(result?.total_mayor)}</div>
                    </div>
                    <div className="p-3 rounded bg-gray-50 border">
                      <div className="text-gray-600">Monto Hermano Menor</div>
                      <div className="font-semibold">{formatCurrency(result?.total_menor)}</div>
                    </div>
                    <div className="p-3 rounded bg-gray-50 border">
                      <div className="text-gray-600">Diferencia (Mayor - Menor)</div>
                      <div className="font-semibold">{formatCurrency(result?.diferencia ?? (Number(result?.total_mayor||0) - Number(result?.total_menor||0)))}</div>
                    </div>
                    <div className="p-3 rounded bg-green-50 border border-green-200">
                      <div className="text-green-700">Monto a pagar</div>
                      <div className="font-bold text-green-800">{formatCurrency(Math.max(0, Number((result?.diferencia_aplicada ?? (Number(result?.total_mayor||0) - Number(result?.total_menor||0))) || 0)))}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mapa para canje */}
              <div className="mt-6">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <label className="text-sm text-white/90">Función</label>
                  <select className="px-3 py-2 rounded-md bg-white text-gray-900 border border-white/30 shadow-sm" value={funcionMapa} onChange={(e) => setFuncionMapa(parseInt(e.target.value))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                  <label className="text-sm text-white/90 ml-2">Zona</label>
                  <select className="px-3 py-2 rounded-md bg-white text-gray-900 border border-white/30 shadow-sm" value={sectionMapa} onChange={(e) => setSectionMapa(parseInt(e.target.value))}>
                    <option value={1}>Oro</option>
                    <option value={2}>Plata</option>
                    <option value={3}>Bronce (Palcos)</option>
                    <option value={4}>Bronce (Balcón)</option>
                  </select>
                  <button type="button" className="px-3 py-2 rounded-md bg-white text-gray-900 border border-white/30 shadow-sm hover:bg-gray-50" onClick={() => cargarOcupacion(funcionMapa)}>Actualizar</button>
                  <button
                    type="button"
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
                    onClick={async () => {
                      const ids: string[] = [];
                      if (controlMayor) ids.push(controlMayor);
                      if (controlMenor) ids.push(controlMenor);
                      const resaltadosTmp: { fila: string; asiento: number; color?: 'blue' | 'orange' }[] = [];
                      for (const id of ids) {
                        const r = await fetch('/api/admin/reservas-por-control', {
                          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-user': 'admin', 'x-admin-pass': 'Admin2025.' }, body: JSON.stringify({ control: id })
                        });
                        const d = await r.json();
                        if (r.ok && d.success) {
                          const isFirst = ids.indexOf(id) === 0;
                          (d.data || []).filter((x: ReservaPorControl) => x.nivel === funcionMapa).forEach((x: ReservaPorControl) => resaltadosTmp.push({ fila: x.fila, asiento: x.asiento, color: isFirst ? 'blue' : 'orange' }));
                        }
                      }
                      setResaltados(resaltadosTmp);
                    }}
                  >Resaltar canje</button>
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
              </>
              )}

              {activeTab === 'pago' && (
              <>
              <div className="my-8 h-px bg-gray-200" />

              <h2 className="text-lg font-semibold mb-4">Pago por Control</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Control del Alumno</label>
                    <input
                      className="form-input"
                      value={controlPago}
                      onChange={(e) => setControlPago(e.target.value)}
                      placeholder="Ej. 12345"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setPagoResultado(null);
                      setError(null);
                      if (!controlPago) {
                        setError('Ingresa el control del alumno');
                        return;
                      }
                      const confirmar = window.confirm('¿Confirmas marcar como pagados los boletos de este alumno?');
                      if (!confirmar) return;
                      setLoading(true);
                      try {
                        const res = await fetch('/api/admin/pagar', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-admin-user': 'admin',
                            'x-admin-pass': 'Admin2025.',
                          },
                          body: JSON.stringify({ control: controlPago })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                          setError(data.message || 'No fue posible realizar el pago');
                        } else {
                          setPagoResultado(data.data);
                        }
                      } catch {
                        setError('Error de red');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? 'Procesando…' : 'Pagar'}
                  </button>
                </div>

                {/* Mapa para pago */}
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <label className="text-sm text-white/90">Función</label>
                    <select className="px-3 py-2 rounded-md bg-white text-gray-900 border border-white/30 shadow-sm" value={funcionMapa} onChange={(e) => setFuncionMapa(parseInt(e.target.value))}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                    <label className="text-sm text-white/90 ml-2">Zona</label>
                    <select className="px-3 py-2 rounded-md bg-white text-gray-900 border border-white/30 shadow-sm" value={sectionMapa} onChange={(e) => setSectionMapa(parseInt(e.target.value))}>
                      <option value={1}>Oro</option>
                      <option value={2}>Plata</option>
                      <option value={3}>Bronce (Palcos)</option>
                      <option value={4}>Bronce (Balcón)</option>
                    </select>
                    <button type="button" className="px-3 py-2 rounded-md bg-white text-gray-900 border border-white/30 shadow-sm hover:bg-gray-50" onClick={() => cargarOcupacion(funcionMapa)}>Actualizar</button>
                    <button
                      type="button"
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
                      onClick={async () => {
                        setResaltados([]);
                        if (!controlPago) return;
                        const r = await fetch('/api/admin/reservas-por-control', {
                          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-user': 'admin', 'x-admin-pass': 'Admin2025.' }, body: JSON.stringify({ control: controlPago })
                        });
                        const d = await r.json();
                        if (r.ok && d.success) {
                          const rs = (d.data || []).filter((x: ReservaPorControl) => x.nivel === funcionMapa).map((x: ReservaPorControl) => ({ fila: x.fila, asiento: x.asiento, color: 'blue' as const }));
                          setResaltados(rs);
                        }
                      }}
                    >Resaltar a pagar</button>
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

                {pagoResultado && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-700 mb-2">Pago realizado</h3>
                    <pre className="text-sm overflow-auto whitespace-pre-wrap">{JSON.stringify(pagoResultado, null, 2)}</pre>
                  </div>
                )}
              </div>
              </>
              )}

              {activeTab === 'mapa' && (
                <div className="mt-6">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <label className="text-sm text-gray-600">Función</label>
                    <select className="px-3 py-2 rounded-md bg-white text-gray-900 border border-gray-300 shadow-sm" value={funcionMapa} onChange={(e) => setFuncionMapa(parseInt(e.target.value))}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                    <label className="text-sm text-gray-600 ml-2">Zona</label>
                    <select className="px-3 py-2 rounded-md bg-white text-gray-900 border border-gray-300 shadow-sm" value={sectionMapa} onChange={(e) => setSectionMapa(parseInt(e.target.value))}>
                      <option value={1}>Oro</option>
                      <option value={2}>Plata</option>
                      <option value={3}>Bronce (Palcos)</option>
                      <option value={4}>Bronce (Balcón)</option>
                    </select>
                    <button type="button" className="px-3 py-2 rounded-md bg-white text-gray-900 border border-gray-300 shadow-sm hover:bg-gray-50" onClick={() => cargarOcupacion(funcionMapa)}>Actualizar</button>
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


