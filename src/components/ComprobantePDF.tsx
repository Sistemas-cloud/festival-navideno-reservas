'use client';

import { useRef } from 'react';
import jsPDF from 'jspdf';

interface AsientoReservado {
  seccion: string;
  fila: string;
  asiento: number;
  precio: number;
}

interface ComprobanteData {
  alumnoNombre: string;
  alumnoControl: string;
  funcion: string;
  asientos: AsientoReservado[];
  total: number;
  fechaReserva: string;
}

interface ComprobantePDFProps {
  data: ComprobanteData;
  onClose: () => void;
  onEliminarAsiento?: (asiento: AsientoReservado) => void;
  loading?: boolean;
}

export const ComprobantePDF: React.FC<ComprobantePDFProps> = ({ data, onClose, onEliminarAsiento, loading = false }) => {
  const comprobanteRef = useRef<HTMLDivElement>(null);

  const generarPDF = async () => {
    if (!comprobanteRef.current) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Configurar fuente
    pdf.setFont('helvetica');

    // Título principal
    pdf.setFontSize(24);
    pdf.setTextColor(37, 99, 235); // Azul
    pdf.text('FESTIVAL NAVIDEÑO', pageWidth / 2, 30, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('COMPROBANTE DE RESERVA', pageWidth / 2, 40, { align: 'center' });

    // Línea decorativa
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.5);
    pdf.line(20, 45, pageWidth - 20, 45);

    // Información del alumno
    pdf.setFontSize(14);
    pdf.text('INFORMACIÓN DEL ALUMNO', 20, 60);
    
    pdf.setFontSize(12);
    pdf.text(`Nombre: ${data.alumnoNombre}`, 20, 70);
    pdf.text(`Control: ${data.alumnoControl}`, 20, 78);
    pdf.text(`Función: ${data.funcion}`, 20, 86);
    pdf.text(`Fecha de Reserva: ${data.fechaReserva}`, 20, 94);

    // Línea separadora
    pdf.line(20, 100, pageWidth - 20, 100);

    // Detalle de asientos
    pdf.setFontSize(14);
    pdf.text('ASIENTOS RESERVADOS', 20, 115);

    let yPosition = 125;
    if (data.asientos && data.asientos.length > 0) {
      data.asientos.forEach((asiento, index) => {
      pdf.setFontSize(11);
      pdf.text(`${index + 1}. Sección: ${asiento.seccion}`, 20, yPosition);
      pdf.text(`   Fila: ${asiento.fila} - Asiento: ${asiento.asiento}`, 25, yPosition + 8);
      pdf.text(`   Precio: $${asiento.precio}`, 25, yPosition + 16);
      yPosition += 25;
      });
    } else {
      pdf.setFontSize(11);
      pdf.text('No hay asientos reservados', 20, yPosition);
      yPosition += 15;
    }

    // Total
    pdf.setFontSize(14);
    pdf.setTextColor(37, 99, 235);
    pdf.text('TOTAL A PAGAR', pageWidth - 60, yPosition + 10);
    pdf.setFontSize(16);
    pdf.text(`$${data.total}`, pageWidth - 60, yPosition + 20);

    // Línea final
    pdf.setDrawColor(37, 99, 235);
    pdf.line(20, yPosition + 30, pageWidth - 20, yPosition + 30);

    // Información adicional
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('• Presentar este comprobante al momento del pago', 20, yPosition + 45);
    pdf.text('• Los asientos están reservados por 24 horas', 20, yPosition + 52);
    pdf.text('• Para dudas contactar al administrador', 20, yPosition + 59);

    // Pie de página
    pdf.setFontSize(8);
    pdf.text('Festival Navideño - Sistema de Reservas', pageWidth / 2, pageHeight - 20, { align: 'center' });
    pdf.text(`Generado el: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Guardar PDF
    pdf.save(`comprobante-${data.alumnoControl}-${Date.now()}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🎫 Comprobante de Reserva</h2>
              <p className="text-blue-100">Festival Navideño</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido del comprobante */}
        <div ref={comprobanteRef} className="p-6">
          {/* Información del alumno */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">👤 Información del Alumno</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-gray-600">Nombre:</span>
                  <p className="font-medium">{data.alumnoNombre}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Control:</span>
                  <p className="font-medium">{data.alumnoControl}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Función:</span>
                  <p className="font-medium text-blue-600">{data.funcion}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Fecha:</span>
                  <p className="font-medium">{data.fechaReserva}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Asientos reservados */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🎭 Asientos Reservados</h3>
            <div className="space-y-3">
              {data.asientos && data.asientos.length > 0 ? data.asientos.map((asiento, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{asiento.seccion}</p>
                      <p className="text-sm text-gray-600">Fila {asiento.fila} - Asiento {asiento.asiento}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">${asiento.precio}</p>
                      </div>
                      {onEliminarAsiento && (
                        <button
                          onClick={() => {
                            const confirmar = window.confirm(
                              `¿Estás seguro de que quieres eliminar el asiento ${asiento.fila}${asiento.asiento}?\n\nEsta acción no se puede deshacer.`
                            );
                            if (confirmar) {
                              onEliminarAsiento(asiento);
                            }
                          }}
                          disabled={loading}
                          className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? '...' : '🗑️'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-600 text-center">No hay asientos reservados</p>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total a Pagar:</span>
                <span className="text-2xl font-bold text-green-600">${data.total}</span>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">ℹ️ Información Importante</h3>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center">
                  <span className="text-yellow-600 mr-2">⚠️</span>
                  Presentar este comprobante al momento del pago
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-600 mr-2">⏰</span>
                  Los asientos están reservados por 24 horas
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-600 mr-2">📞</span>
                  Para dudas contactar al administrador
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="bg-gray-50 p-6 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={generarPDF}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              📄 Descargar PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
