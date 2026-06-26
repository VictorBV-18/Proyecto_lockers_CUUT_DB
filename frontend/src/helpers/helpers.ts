const CLASES_ESTADO: Record<string, string> = {
  DATOS_INCOMPLETOS: 'neutral',
  PENDIENTE: 'warning',
  EN_REVISION: 'warning',
  APROBADA: 'success',
  APROBADO: 'success',
  DOCUMENTACION_INCORRECTA: 'danger',
  RECHAZADA: 'danger',
  RECHAZADO: 'danger',
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