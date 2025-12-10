'use client';

import { useRef } from 'react';
import jsPDF from 'jspdf';
import { ComprobanteData, AsientoComprobante } from '@/types';
import { formatPaymentDate } from '@/lib/utils/paymentDates';

interface ComprobantePDFProps {
  data: ComprobanteData;
  onClose: () => void;
  onEliminarAsiento?: (asiento: AsientoComprobante) => void;
  onCambiarAsiento?: (asiento: AsientoComprobante) => void;
  loading?: boolean;
}

export const ComprobantePDF: React.FC<ComprobantePDFProps> = ({ data, onClose, onEliminarAsiento, onCambiarAsiento, loading = false }) => {
  const comprobanteRef = useRef<HTMLDivElement>(null);

  const generarPDF = async () => {
    if (!comprobanteRef.current) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginTop = 30;
    const marginBottom = 40;
    const marginLeft = 20;
    const marginRight = 20;

    // Configurar fuente
    pdf.setFont('helvetica');

    // Función auxiliar para agregar nueva página si es necesario
    const checkAndAddPage = (currentY: number, spaceNeeded: number): number => {
      if (currentY + spaceNeeded > pageHeight - marginBottom) {
        pdf.addPage();
        return marginTop;
      }
      return currentY;
    };

    // Función auxiliar para dibujar encabezado de página
    const drawHeader = (yPos: number): number => {
      pdf.setFontSize(24);
      pdf.setTextColor(37, 99, 235); // Azul
      pdf.text('FESTIVAL NAVIDEÑO', pageWidth / 2, yPos, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('COMPROBANTE DE RESERVA', pageWidth / 2, yPos + 10, { align: 'center' });

      // Línea decorativa
      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(0.5);
      pdf.line(marginLeft, yPos + 15, pageWidth - marginRight, yPos + 15);

      return yPos + 20;
    };

    // Función auxiliar para dibujar pie de página
    const drawFooter = () => {
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Festival Navideño - Sistema de Reservas', pageWidth / 2, pageHeight - 15, { align: 'center' });
        pdf.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    };

    let yPosition = marginTop;
    
    // Encabezado
    yPosition = drawHeader(yPosition);

    // Información del alumno
    pdf.setFontSize(14);
    yPosition = checkAndAddPage(yPosition, 50);
    pdf.text('INFORMACIÓN DEL ALUMNO', marginLeft, yPosition);
    
    pdf.setFontSize(12);
    yPosition += 10;
    const lines = [
      `Nombre: ${data.alumnoNombre}`,
      `Control: ${data.alumnoControl}`,
      `Función: ${data.funcion}`,
      `Fecha de Reserva: ${data.fechaReserva}`
    ];
    
    lines.forEach((line) => {
      yPosition = checkAndAddPage(yPosition, 8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(line, marginLeft, yPosition);
      yPosition += 8;
    });
    
    // Fecha de pago destacada
    yPosition = checkAndAddPage(yPosition, 10);
    pdf.setFontSize(12);
    pdf.setTextColor(220, 38, 127); // Rosa/Rojo para destacar
    const fechaPagoFormateada = data.fechaPago ? formatPaymentDate(data.fechaPago) : data.fechaPago || 'No especificada';
    pdf.text(`Fecha de Pago: ${fechaPagoFormateada}`, marginLeft, yPosition);

    // Línea separadora
    yPosition += 6;
    pdf.setDrawColor(37, 99, 235);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    yPosition += 10;

    // Detalle de asientos
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    yPosition = checkAndAddPage(yPosition, 10);
    pdf.text('ASIENTOS', marginLeft, yPosition);
    yPosition += 10;

    if (data.asientos && data.asientos.length > 0) {
      data.asientos.forEach((asiento, index) => {
        yPosition = checkAndAddPage(yPosition, 25);
        pdf.setFontSize(11);
        
        // Indicar si el asiento está pagado
        const estadoTexto = asiento.estado === 'pagado' ? ' ✓ PAGADO' : '';
        const colorTexto: [number, number, number] = asiento.estado === 'pagado' ? [34, 197, 94] : [0, 0, 0]; // Verde si está pagado
        
        pdf.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
        pdf.text(`${index + 1}. Sección: ${asiento.seccion}${estadoTexto}`, marginLeft, yPosition);
        pdf.text(`   Fila: ${asiento.fila} - Asiento: ${asiento.asiento}`, marginLeft + 5, yPosition + 8);
        pdf.text(`   Precio: $${asiento.precio}${asiento.estado === 'pagado' ? ' (Liquidado)' : ''}`, marginLeft + 5, yPosition + 16);
        pdf.setTextColor(0, 0, 0); // Restaurar color
        yPosition += 25;
      });
    } else {
      yPosition = checkAndAddPage(yPosition, 15);
      pdf.setFontSize(11);
      pdf.text('No hay asientos', marginLeft, yPosition);
      yPosition += 15;
    }

    // Total
    yPosition = checkAndAddPage(yPosition, 15);
    pdf.setFontSize(14);
    // Mostrar totales (general, pagado, pendiente o liquidado)
    if (data.totalPagado !== undefined && data.totalPendiente !== undefined) {
      // Si tenemos desglose de totales
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Total General:', pageWidth - marginRight - 70, yPosition);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`$${data.total}`, pageWidth - marginRight - 20, yPosition, { align: 'right' });
      yPosition += 8;

      if (data.totalPagado > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(34, 197, 94); // Verde
        pdf.text('✓ Ya Pagado:', pageWidth - marginRight - 70, yPosition);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`$${data.totalPagado}`, pageWidth - marginRight - 20, yPosition, { align: 'right' });
        yPosition += 8;
      }

      if (data.totalPendiente > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(234, 88, 12); // Naranja
        pdf.text('⏳ Saldo Pendiente:', pageWidth - marginRight - 70, yPosition);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(`$${data.totalPendiente}`, pageWidth - marginRight - 20, yPosition, { align: 'right' });
      } else {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(34, 197, 94); // Verde
        pdf.setFontSize(13);
        pdf.text('✓ LIQUIDADO - Pago Completo', pageWidth - marginRight - 70, yPosition);
      }
    } else {
      // Formato antiguo (sin desglose, por compatibilidad)
      pdf.setTextColor(37, 99, 235);
      pdf.text('TOTAL A PAGAR', pageWidth - marginRight - 60, yPosition);
      pdf.setFontSize(16);
      pdf.text(`$${data.total}`, pageWidth - marginRight - 60, yPosition + 10);
    }

    // Línea final
    yPosition += 15;
    pdf.setDrawColor(37, 99, 235);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    yPosition += 15;

    // Información adicional
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    const infoLines = [
      '• Presentar este comprobante al momento del pago',
      '• Para dudas contactar al administrador'
    ];
    
    infoLines.forEach(line => {
      yPosition = checkAndAddPage(yPosition, 7);
      pdf.text(line, marginLeft, yPosition);
      yPosition += 7;
    });

    // Advertencia importante sobre fecha de pago
    yPosition = checkAndAddPage(yPosition, 20);
    pdf.setFontSize(11);
    pdf.setTextColor(220, 38, 127); // Rosa/Rojo para destacar
    
    // Dividir el texto en múltiples líneas si es muy largo
    const fechaFormateada = data.fechaPago ? formatPaymentDate(data.fechaPago) : data.fechaPago || 'fecha indicada';
    const advertenciaTexto = `⚠️ IMPORTANTE: Si no realizas el pago el día ${fechaFormateada}, tus asientos serán liberados automáticamente y volverán a estar disponibles para el público.`;
    
    // Dividir texto en líneas que caben en el ancho de página
    const maxWidth = pageWidth - marginLeft - marginRight;
    const splitText = pdf.splitTextToSize(advertenciaTexto, maxWidth);
    
    splitText.forEach((line: string) => {
      yPosition = checkAndAddPage(yPosition, 7);
      pdf.text(line, marginLeft, yPosition);
      yPosition += 7;
    });

    // Dibujar pie de página en todas las páginas
    drawFooter();

    // Guardar PDF
    pdf.save(`comprobante-${data.alumnoControl}-${Date.now()}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header fijo */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex-shrink-0">
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

        {/* Contenido scrolleable */}
        <div ref={comprobanteRef} className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* ADVERTENCIAS IMPORTANTES AL INICIO */}
          {data.fechaPago && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-lg p-4 border-2 border-pink-300">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">📅</span>
                  <div className="flex-1">
                    <p className="font-semibold text-red-700 mb-1">Fecha de Pago:</p>
                    <p className="text-lg font-bold text-red-600">{formatPaymentDate(data.fechaPago)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advertencia importante */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">⚠️ Advertencia Importante</h3>
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300">
              <div className="flex items-start">
                <span className="text-2xl mr-3">🚨</span>
                <div className="flex-1">
                  <p className="font-semibold text-red-700 mb-2">
                    Liberación Automática de Asientos
                  </p>
                  <p className="text-sm text-red-600 leading-relaxed">
                    {data.fechaPago ? (
                      <>Si no realizas el pago el día <strong>{formatPaymentDate(data.fechaPago)}</strong>, tus asientos serán <strong>liberados automáticamente</strong> y volverán a estar <strong>disponibles para el público</strong>. Perderás tu reserva si no pagas en la fecha indicada.</>
                    ) : (
                      <>Si no realizas el pago en la fecha indicada, tus asientos serán <strong>liberados automáticamente</strong> y volverán a estar <strong>disponibles para el público</strong>.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🎭 Asientos</h3>
            <div className="space-y-3">
              {data.asientos && data.asientos.length > 0 ? data.asientos.map((asiento, index) => (
                <div key={index} className={`rounded-lg p-4 border ${
                  asiento.estado === 'pagado' 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{asiento.seccion}</p>
                        {asiento.estado === 'pagado' && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">✓ PAGADO</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Fila {asiento.fila} - Asiento {asiento.asiento}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${asiento.estado === 'pagado' ? 'text-green-600' : 'text-blue-600'}`}>${asiento.precio}</p>
                        {asiento.estado === 'pagado' && (
                          <p className="text-xs text-green-600">Liquidado</p>
                        )}
                      </div>
                      {onCambiarAsiento && (
                        <button
                          onClick={() => {
                            onCambiarAsiento(asiento);
                          }}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cambiar este asiento por otro disponible"
                        >
                          {loading ? '...' : '🔄'}
                        </button>
                      )}
                      {!onCambiarAsiento && onEliminarAsiento && (
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

          {/* Totales */}
          <div className="mb-6">
            {/* Total general */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total General:</span>
                <span className="text-2xl font-bold text-blue-600">${data.total}</span>
              </div>
            </div>

            {/* Si hay totales separados (boletos pagados y pendientes) */}
            {(data.totalPagado !== undefined && data.totalPendiente !== undefined) && (
              <>
                {/* Total ya pagado */}
                {data.totalPagado > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">✓ Ya Pagado:</span>
                      <span className="text-xl font-bold text-green-600">${data.totalPagado}</span>
                    </div>
                  </div>
                )}

                {/* Saldo pendiente o Liquidado */}
                {data.totalPendiente > 0 ? (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-400">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-800">⏳ Saldo Pendiente:</span>
                      <span className="text-2xl font-bold text-orange-600">${data.totalPendiente}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 border-2 border-green-500">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-green-800">✓ LIQUIDADO</span>
                      <span className="text-xl font-bold text-green-700">Pago Completo</span>
                    </div>
                  </div>
                )}
              </>
            )}
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
                  <span className="text-yellow-600 mr-2">📞</span>
                  Para dudas contactar al administrador
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer con botones - Fijo en la parte inferior */}
        <div className="bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200 flex-shrink-0 shadow-lg">
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
