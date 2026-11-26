// Traducción entre las peticiones de la API (fase 5, fase5-backend.md) y la forma que usa PeticionesView.jsx (la del
// diseñador). En la vista una petición se identifica por su código (`id`: «PET2026-00001»); el id de la API va en `_id`.
import type { PreCpdStatus, RequestScheduleDay, RequestSource, ServiceRequest, ServiceRequestStatus, ServiceRequestSummary, StoredDocument } from '../../data';
import { eurosHora } from '../../ui/formato';

export const ESTADOS: Record<ServiceRequestStatus, string> = {
  new: 'Nueva',
  publishing: 'En difusión',
  selecting: 'En selección',
  covered: 'Cubierta',
  in_progress: 'En curso',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
};
export const estadoApi = (texto: string) => (Object.keys(ESTADOS) as ServiceRequestStatus[]).find((k) => ESTADOS[k] === texto);

/** Estados del CPD previo en la vista (ESTADOS_CPD_PREVIO). */
const CPD: Record<PreCpdStatus, string> = { pending: 'sin_generar', generated: 'generado', sent: 'enviado', reviewed: 'revisado' };

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
/** Plantillas de turno de la vista (HORARIO_TEMPLATES) por nombre. */
const PLANTILLAS: Record<string, string> = { 'Turno de mañana': 'manana', 'Turno de tarde': 'tarde', 'Turno de noche': 'noche', 'Jornada partida': 'partida' };

const euroHora = (n: number | null | undefined) => (n == null ? 'Sin indicar' : eurosHora(n));

/**
 * Perfil del puesto para la selección de ejemplo (requisitos de carné y candidatos de cada puesto). Solo lo usa la
 * demo de las fases 6 y 7.
 */
export function perfilPuesto(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes('carretiller')) return 'carretillero';
  if (n.includes('barra')) return 'camarero_barra';
  if (n.includes('camarer')) return 'camarero';
  if (n.includes('ayudante')) return 'ayudante_cocina';
  if (n.includes('cocin')) return 'cocinero';
  if (n.includes('envasado')) return 'envasado';
  if (n.includes('mozo')) return 'mozo';
  return 'operario';
}

export type PeticionVista = ReturnType<typeof peticionVista>;

/** Fila del listado o, con los campos de la ficha, la petición abierta. */
export function peticionVista(r: ServiceRequestSummary & Partial<ServiceRequest>) {
  const c = r.conditions;
  const d = r.distribution;
  return {
    id: r.code,
    _id: r.id,
    _quoteId: r.quoteId,
    sucursalId: r.branchId,
    presupuesto: r.quoteCode,
    version: `v${r.quoteVersionNumber}`,
    presupuestoOrigen: `${r.quoteCode} v${r.quoteVersionNumber}`,
    cliente: r.clientId,
    clienteNombre: r.clientName,
    // Mismo puesto del presupuesto = mismo `tipo` (las peticiones hermanas)
    tipo: r.quotePositionId ?? '',
    perfil: perfilPuesto(r.positionName),
    puesto: r.positionName,
    personasPuesto: d?.quotePeople ?? 0,
    plantilla: PLANTILLAS[r.shiftName ?? ''] ?? '',
    turnoNombre: r.shiftName || 'Sin turno',
    solicitados: r.positionsCount,
    cubiertas: r.slots.filled,
    estado: ESTADOS[r.status],
    motivoCancelacion: r.status === 'cancelled' ? (r.cancelReason ?? '') : undefined,
    inicio: r.startDate ?? '',
    fin: r.endDate ?? '',
    creada: r.createdAt.slice(0, 10),
    creadaPor: r.createdByName ?? '—',
    responsable: r.responsibleName ?? 'Sin responsable',
    responsableId: r.responsibleUserId,
    // Portales y candidaturas: fase 7 (en la demo los pone la selección de ejemplo)
    portalesActivos: 0,
    candidaturas: 0,
    // De la ficha (en la fila, vacíos hasta abrirla)
    centroTrabajo: r.clientCenterName ?? 'Centro sin indicar',
    ciudad: r.clientCenterName ?? '',
    cif: r.clientTaxId ?? '',
    sector: '',
    contactoCliente: r.clientSignerContactName ?? 'Sin contacto que firme los CPD',
    emailContacto: r.clientSignerContactEmail ?? '',
    telefonoContacto: r.clientSignerContactPhone ?? '',
    categoria: c?.categoryName ?? 'Sin categoría',
    cctConvenio: c?.collectiveAgreementName ?? 'Sin convenio',
    salarioBrutoConvenio: euroHora(c?.grossSalaryHour),
    tarifaVentaHora: euroHora(c?.rateHour),
    requiereEpi: r.ppe || 'Sin indicar',
    carnetRequerido: r.requiredLicenses || 'Ninguno',
    descripcionCorta: r.tasks ?? c?.description ?? '',
    riesgos: r.risks ?? '',
    supuesto: r.useCase ?? '',
    justificacion: r.useCaseJustification ?? '',
    extrasPropuesta: (c?.extras ?? []).filter((x) => x.print).map((x) => x.name.toLowerCase()),
    salarioBajoConvenio: !!r.agreementCheck?.belowAgreement,
    // Tramo del convenio (fechas) en el que el salario queda por debajo
    tramoBajoConvenio: r.agreementCheck?.periods.find((x) => x.belowAgreement) ?? null,
    peligroso: !!r.hazardousWork,
    cpdPrevio: r.preCpd
      ? {
          estado: CPD[r.preCpd.status],
          fecha: r.preCpd.sentAt?.slice(0, 10) ?? null,
          generado: r.preCpd.generatedAt?.slice(0, 10) ?? null,
          desactualizado: r.preCpd.outdated,
          comprobaciones: r.preCpd.checks,
        }
      : { estado: CPD[r.preCpdStatus], fecha: null, generado: null, desactualizado: false, comprobaciones: [] },
    presupuestoFirmado: r.signedQuoteDocument
      ? { documentId: r.signedQuoteDocument.documentId, nombre: r.signedQuoteDocument.name, fecha: r.signedQuoteDocument.date.slice(0, 10), firmado: r.signedQuoteDocument.kind === 'signed' }
      : null,
    // Reparto del puesto (de la ficha): las peticiones no canceladas del mismo puesto y las de otros puestos
    reparto: d
      ? {
          personas: d.quotePeople,
          repartidas: d.inRequests,
          hermanas: d.siblings.map((x) => ({
            id: x.code, _id: x.id, turnoNombre: x.shiftName || 'Sin turno', inicio: x.startDate ?? '', fin: x.endDate ?? '', solicitados: x.positionsCount,
            cubiertas: x.filled, estado: ESTADOS[x.status], esta: x.isThis,
          })),
          otrosPuestos: d.otherPositions.flatMap((p) => p.requests.map((x) => ({ id: x.code, puesto: p.name }))),
        }
      : null,
    // Fase 7, art. 8 de la Ley 14/1994: lo que el cliente declara (registrado por la ETT) y la excepción de peligroso
    declaraciones: { huelga: r.art8?.declarations.strike ?? null, amortizacion: r.art8?.declarations.downsizedPositions ?? null },
    excepcionPeligroso: r.art8?.hazardousException ?? null,
    clienteEsEtt: !!r.art8?.clientIsEtt,
    evaluacionRiesgos: r.risksDocument ?? null,
    cpdFirmado: r.cpdSigned ?? null,
    // Datos del servicio, para la ventana «Datos del servicio» (en la forma de la API)
    servicio: {
      clientCenterId: r.clientCenterId ?? null,
      clientSignerContactId: r.clientSignerContactId ?? null,
      orderReference: r.orderReference ?? null,
      notes: r.notes ?? null,
      tasks: r.tasks ?? null,
      qualification: r.qualification ?? null,
      risks: r.risks ?? null,
      ppe: r.ppe ?? null,
      requiredLicenses: r.requiredLicenses ?? null,
      useCase: r.useCase ?? null,
      useCaseJustification: r.useCaseJustification ?? null,
      hazardousWork: !!r.hazardousWork,
      startDate: r.startDate,
      endDate: r.endDate,
      responsibleUserId: r.responsibleUserId,
    },
  };
}

export type HorarioVista = ReturnType<typeof horarioVista>;
export function horarioVista(r: ServiceRequest) {
  return {
    turnoNombre: r.shiftName || 'Sin turno',
    tipoJornada: r.workdayType === 'part' ? 'Parcial' : 'Completa',
    centro: r.clientCenterName ?? '',
    dias: [...r.schedule]
      .sort((a, b) => a.weekday - b.weekday)
      .map((d) => ({ dia: DIAS[d.weekday - 1], laborable: d.working, inicio: d.start ?? '00:00', fin: d.end ?? '00:00', descanso: d.breakMinutes, horas: d.hours ?? 0 })),
    guardado: true,
    ultimaModif: '',
  };
}

type DiaVista = { dia: string; laborable: boolean; inicio: string; fin: string; descanso: number | string };
/** Horario de la vista → API (las horas de cada día las calcula el servidor). */
export function horarioApi(h: { turnoNombre: string; dias: DiaVista[] }): { shiftName: string; schedule: RequestScheduleDay[] } {
  return {
    shiftName: h.turnoNombre,
    schedule: h.dias.map((d) => ({
      weekday: DIAS.indexOf(d.dia) + 1,
      working: d.laborable,
      start: d.laborable ? d.inicio : null,
      end: d.laborable ? d.fin : null,
      breakMinutes: d.laborable ? Number(d.descanso) || 0 : 0,
    })),
  };
}

/** Presupuesto aceptado del buscador de «Nueva petición». */
export function presupuestoAceptadoVista(s: RequestSource) {
  return {
    id: s.quoteCode,
    _id: s.quoteId,
    _versionId: s.versionId,
    version: `v${s.versionNumber}`,
    clienteNombre: s.clientName,
    cif: s.clientTaxId ?? '',
    titulo: s.title ?? 'Sin título',
    aceptado: s.acceptedAt?.slice(0, 10) ?? '',
    puestos: s.positions.map((p) => ({ tipo: p.quotePositionId, nombre: p.name, personas: p.people, enPeticiones: p.peopleInRequests })),
    pendientes: s.peopleWithoutRequest,
  };
}

export function documentoVista(d: StoredDocument) {
  return { id: d.id, tipo: d.typeName, nombre: d.name, fecha: d.uploadedAt.slice(0, 10), autor: d.uploadedByName ?? '—' };
}

/**
 * Bloqueos legales de la petición (códigos de la API y de las comprobaciones del CPD previo) explicados en lenguaje
 * claro: qué pasa y qué hacer.
 */
export const EXPLICACION_BLOQUEO: Record<string, string> = {
  client_is_ett: 'El cliente está marcado como ETT en Empresas. La ley no permite ceder personal a otra ETT (art. 8.d de la Ley 14/1994). Si es un error, quita la marca en la ficha del cliente.',
  hazardous_work: 'Es un trabajo especialmente peligroso. Solo se puede ceder personal con una excepción marcada por la ETT y su base (convenio o acuerdo que lo permite, con la formación y la vigilancia de la salud específicas). Regístrala aquí.',
  strike: 'El cliente ha declarado una huelga en el centro. No se puede ceder personal para sustituir a quienes la hacen (art. 8.a de la Ley 14/1994).',
  strike_undeclared: 'Falta la declaración del cliente de que no hay huelga en el centro. El CPD previo la recoge para que la firme; también puedes registrarla aquí: quién, cuándo y cómo.',
  downsized_positions: 'El cliente amortizó estos puestos en los 12 meses anteriores (despido improcedente, colectivo u objetivo). No se pueden cubrir con una ETT (art. 8.c de la Ley 14/1994).',
  downsized_positions_undeclared: 'Falta la declaración del cliente de que no ha amortizado estos puestos en los 12 meses anteriores. El CPD previo la recoge; también puedes registrarla aquí.',
  risks: 'Falta la información de riesgos del puesto: escríbela en «Datos del servicio» o sube la evaluación de riesgos del cliente (tipo «Evaluación de riesgos del cliente») en Documentos.',
  salario_bajo_convenio: 'El salario de la petición queda por debajo del convenio de la empresa usuaria. No se puede pagar menos (art. 11 de la Ley 14/1994): haz una versión nueva del presupuesto.',
  art8_bloqueado: 'El art. 8 de la Ley 14/1994 no permite ceder personal en esta petición. Mira las declaraciones del cliente y el trabajo peligroso en «Contratos y altas» de la petición.',
};
// Los códigos de las comprobaciones del CPD previo y los de la API llevan el prefijo «art8_»
for (const k of ['client_is_ett', 'hazardous_work', 'strike', 'strike_undeclared', 'downsized_positions', 'downsized_positions_undeclared']) EXPLICACION_BLOQUEO[`art8_${k}`] = EXPLICACION_BLOQUEO[k];
