const CLASES_ESTADO: Record<string, string> = {
  DATOS_INCOMPLETOS: 'neutral',
  PENDIENTE: 'warning',
  EN_REVISION: 'warning',
  REPOSICION: 'warning',
  APROBADA: 'success',
  APROBADO: 'success',
  VIGENTE: 'success',
  DOCUMENTACION_INCORRECTA: 'danger',
  RECHAZADA: 'danger',
  RECHAZADO: 'danger',
  VENCIDA: 'danger',
  VENCIDO: 'danger',
  FINALIZADA: 'neutral',
};

export const claseEstado = (estado: string): string => {
  return CLASES_ESTADO[estado?.toUpperCase()] ?? 'neutral';
};

export const formatearFecha= (fecha: string):string=> {
    const meses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const [year, month, day] = fecha.split('T')[0].split('-').map(Number);
    return `${day} ${meses[month - 1]} ${year}`;
  }

export const descargarBlob = (blob: Blob, nombreArchivo: string): void => {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  window.URL.revokeObjectURL(url);
};