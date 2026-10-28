// Partió de design/presupuestos.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useEffect, useMemo, useRef } from 'react';
    import {
      Calculator, FileText, CheckCircle2, Clock, AlertTriangle, ChevronRight, 
      ArrowLeft, Plus, Copy, Trash2, Edit3, Save, X, RotateCcw, AlertCircle,
      TrendingUp, DollarSign, ShieldCheck, Download, History, Send, Layers,
      Building2, User, Calendar, Briefcase, FileSignature, Check, Eye, Lock,
      Unlock, HelpCircle, Sparkles, Filter, Search, ArrowUpRight, ChevronDown,
      Info, RefreshCw, SlidersHorizontal, BookOpen, FileSpreadsheet, GitBranch,
      UserCheck, ExternalLink, ShieldAlert, Award, EyeOff, List, SquareKanban, GripVertical
    } from 'lucide-react';
import { Page, PageHeader, Card, KpiTile, Button, IconButton, Badge, SearchInput, Select, SelectConAlta, Segmented, Tabs, CAMPO, Modal, Drawer, Confirmar, Notice, EmptyState } from '../ui';

    // ==========================================
    // CATÁLOGOS ESTRUCTURADOS CON "OTRO / PERSONALIZADO"
    // ==========================================
    const CATALOGOS = {
      convenios: [
{ id: 'logistica_madrid', label: 'Convenio colectivo logística y paquetería (com. Madrid)' },
{ id: 'logistica_bcn', label: 'Convenio sectorial transporte de mercancías y logística (Barcelona)' },
{ id: 'metal_madrid', label: 'Convenio industria del metal (Madrid)' },
{ id: 'hosteleria_estatal', label: 'ALEH - convenio estatal hostelería' },
{ id: 'quimicas_estatal', label: 'Convenio general de la industria química' },
{ id: 'comercio_alimentacion', label: 'Convenio comercio y almacenistas alimentación' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      categorias: {
logistica_madrid: [
  { id: 'op_almacen', label: 'Operario/a de almacén (nivel IV)' },
  { id: 'mozo_esp', label: 'Mozo/a especialista - carretillero/a (nivel III)' },
  { id: 'prep_pedidos', label: 'Preparador/a de pedidos / picking (nivel IV)' },
  { id: 'jefe_equipo', label: 'Jefe/a de equipo / capataz (nivel II)' },
  { id: 'administrativo_log', label: 'Administrativo/a de tráfico y logística (nivel III)' },
  { id: 'otro', label: 'Otro / Personalizado...' }
],
metal_madrid: [
  { id: 'peon_metal', label: 'Peón / auxiliar producción' },
  { id: 'oficial_3_metal', label: 'Oficial 3ª Metal' },
  { id: 'oficial_1_cnc', label: 'Oficial 1ª mecanizado CNC' },
  { id: 'soldador_tuv', label: 'Soldador/a homologado TIG/MIG' },
  { id: 'otro', label: 'Otro / Personalizado...' }
],
hosteleria_estatal: [
  { id: 'camarero_sala', label: 'Camarero/a de sala (nivel II)' },
  { id: 'ayudante_cocina', label: 'Ayudante de cocina (nivel III)' },
  { id: 'cocinero_partida', label: 'Cocinero/a de partida (nivel I)' },
  { id: 'office_limpieza', label: 'Auxiliar de office y limpieza' },
  { id: 'otro', label: 'Otro / Personalizado...' }
],
default: [
  { id: 'perfil_estandar', label: 'Operador / auxiliar estándar' },
  { id: 'tecnico_especialista', label: 'Técnico Especialista' },
  { id: 'responsable_turno', label: 'Responsable de Turno' },
  { id: 'otro', label: 'Otro / Personalizado...' }
]
      },
      gruposNivel: [
{ id: 'g1', label: 'Grupo I / directivos y titulados superiores' },
{ id: 'g2', label: 'Grupo II / técnicos medios y mandos intermedios' },
{ id: 'g3', label: 'Grupo III / oficiales y especialistas de oficio' },
{ id: 'g4', label: 'Grupo IV / operarios, mozos y peonaje cualificado' },
{ id: 'g5', label: 'Grupo V / auxiliares y aprendices' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      modalidades: [
{ id: 'puesta_disposicion_estandar', label: 'Puesta a disposición estándar (CPD ordinario)' },
{ id: 'pico_produccion', label: 'Picos de producción / circunstancial (art. 15.2 ET)' },
{ id: 'sustitucion_it', label: 'Sustitución de persona trabajadora (IT / excedencia / maternidad)' },
{ id: 'servicio_continuado', label: 'Servicio continuado con retainer mensual' },
{ id: 'master_vendor', label: 'Modelo On-Site / master vendor ETT' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      formasPago: [
{ id: 'confirming_60', label: 'Confirming bancario a 60 días fecha factura' },
{ id: 'transfer_30', label: 'Transferencia bancaria a 30 días' },
{ id: 'transfer_15', label: 'Transferencia bancaria quincenal (15 días)' },
{ id: 'domiciliacion_30', label: 'Recibo domiciliado SEPA B2B a 30 días' },
{ id: 'prepago_semanal', label: 'Prepago semanal con liquidación mensual' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      garantiasSustitucion: [
{ id: 'garantia_4h', label: '4 horas de respuesta operativa sin coste' },
{ id: 'garantia_24h', label: '24 horas de periodo de prueba con reemplazo bonificado' },
{ id: 'garantia_48h', label: '48 horas de sustitución garantizada sin cargo de gestión' },
{ id: 'garantia_express_2h', label: 'Sustitución express en menos de 2 horas (retainer crítico)' },
{ id: 'sin_garantia', label: 'Sin garantía extendida (condiciones estándar ETT)' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      tiposConcepto: [
{ id: 'porcentaje', label: 'Porcentaje (%) sobre Base' },
{ id: 'fijo_hora', label: 'Importe fijo por hora (€/h)' },
{ id: 'fijo_mes', label: 'Importe fijo mensual (€/mes)' },
{ id: 'fijo_jornada', label: 'Importe fijo por jornada (€/día)' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      basesCalculo: [
{ id: 'salario_bruto_hora', label: 'Salario bruto por hora' },
{ id: 'coste_salarial_total', label: 'Coste salarial total (bruto + prorratas)' },
{ id: 'base_ss_total', label: 'Base de cotización SSSS total' },
{ id: 'tarifa_venta_hora', label: 'Tarifa hora ofertada (PVP)' },
{ id: 'horas_reales_efectivas', label: 'Horas reales efectivas trabajadas' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      tiposIva: [
{ id: '21', label: '21% (IVA general Península y Baleares)' },
{ id: '10', label: '10% (IVA reducido aplicable)' },
{ id: '7', label: '7% (IGIC Canarias general)' },
{ id: '0_exento', label: '0% (exento / inversión de sujeto pasivo / intracomunitario)' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ],
      monedas: [
{ id: 'EUR', label: 'EUR (€) — Euro' },
{ id: 'USD', label: 'USD ($) — dólar estadounidense' },
{ id: 'GBP', label: 'GBP (£) — libra esterlina' },
{ id: 'otro', label: 'Otro / Personalizado...' }
      ]
    };

    // Convenio de la empresa de ejemplo (Bizkaia): mismas categorías que el de logística
    CATALOGOS.convenios.unshift({ id: 'logistica_bizkaia', label: 'Convenio de almacenes y logística (Bizkaia)' });
    CATALOGOS.categorias.logistica_bizkaia = CATALOGOS.categorias.logistica_madrid;
    const etiquetaConvenio = (id, custom) => CATALOGOS.convenios.find(c => c.id === id)?.label || custom || '';

    // ==========================================
    // EMPRESAS Y COMERCIALES (datos de ejemplo; en real vendrán de Empresas vía apps/api)
    // ==========================================
    const EMPRESAS_CLIENTE = [
      {
        id: 'comp-1', nombre: 'Trans-Logística Ibérica Norte, S.L.', cif: 'B-87654321', sector: 'Logística y almacén',
        ciudad: 'Basauri (Bizkaia)', convenio: 'logistica_bizkaia', comercial: 'Carlos Mendoza',
        contactos: [
          { nombre: 'Marta Gómez Arana', cargo: 'Responsable de RRHH y Selección', email: 'marta.gomez@translog-norte.es', telefono: '+34 654 987 321' },
          { nombre: 'Javier Ugarte Elorza', cargo: 'Jefe de Planta / Operaciones', email: 'j.ugarte@translog-norte.es', telefono: '+34 611 223 344' },
        ],
      },
      {
        id: 'comp-2', nombre: 'Manufacturas Metálicas del Henares, S.A.', cif: 'A-28193847', sector: 'Industria metalúrgica',
        ciudad: 'Alcalá de Henares (Madrid)', convenio: 'metal_madrid', comercial: 'Elena Rivas',
        contactos: [{ nombre: 'Alfonso Serrano', cargo: 'Dir. Financiero', email: 'aserrano@metalhenares.com', telefono: '+34 600 112 233' }],
      },
      {
        id: 'comp-3', nombre: 'Mediterránea Agrícola y Envasado, S.L.', cif: 'B-65432198', sector: 'Agroalimentario',
        ciudad: 'Valencia', convenio: 'comercio_alimentacion', comercial: 'Carlos Mendoza', contactos: [],
      },
      {
        id: 'comp-4', nombre: 'Hostelería & Eventos Premium BCN, S.L.', cif: 'B-99887766', sector: 'Hostelería y eventos',
        ciudad: 'Barcelona', convenio: 'hosteleria_estatal', comercial: 'Laura Vidal',
        contactos: [{ nombre: 'Sergi Pujol', cargo: 'Coordinador de Eventos', email: 'spujol@premiumeventsbcn.cat', telefono: '+34 688 990 011' }],
      },
    ];

    const COMERCIALES = ['Carlos Mendoza', 'Elena Navarro', 'Elena Rivas', 'Laura Vidal', 'Marta Prieto', 'Raúl Santana'];

    // ==========================================
    // CONCEPTOS EXTRA FACTURABLES
    // Siempre quedan en la oferta (si no, no se podrán facturar), aunque no se impriman en la propuesta.
    // coefSalario: sobre el salario de la hora normal. coefTarifa: vacío = mismo factor que la hora normal.
    // Coeficientes de ejemplo, por confirmar según cada convenio.
    // ==========================================
    const EXTRAS_DEFECTO = [
      { id: 'extra', concepto: 'Hora extra', coefSalario: 1.5, coefTarifa: '', mostrar: true },
      { id: 'nocturna', concepto: 'Hora nocturna', coefSalario: 1.25, coefTarifa: '', mostrar: true },
      { id: 'finde', concepto: 'Hora de fin de semana', coefSalario: 1.5, coefTarifa: '', mostrar: true },
      { id: 'festiva', concepto: 'Hora festiva', coefSalario: 1.75, coefTarifa: '', mostrar: true },
    ];
    const copiarExtras = (lista) => (lista || EXTRAS_DEFECTO).map(x => ({ ...x }));

    // Presupuesto nuevo: vacío, con los conceptos internos de siempre y el margen objetivo por defecto
    function presupuestoVacio(listado) {
      const max = Math.max(0, ...listado.map(p => Number(p.id.split('-').pop()) || 0));
      const id = `PRE-2026-${String(max + 1).padStart(4, '0')}`;
      const hoy = new Date();
      const iso = (d) => d.toISOString().slice(0, 10);
      const validez = new Date(hoy); validez.setDate(validez.getDate() + 30);
      return {
        id,
        codigoVersion: `${id}-v1`,
        versionNumero: 1,
        titulo: '',
        empresaId: '', cliente: '', cif: '', sector: '', ciudad: '', convenioEmpresa: '',
        contacto: '', emailContacto: '', telefonoContacto: '',
        comercial: '',
        estado: 'Borrador',
        esEditableDirecto: true,
        fechaEmision: iso(hoy),
        fechaValidez: iso(validez),
        fechaInicioPrevista: '', duracionMeses: '',
        moneda: 'EUR', modalidad: '', modalidadCustom: '', iva: '21', ivaCustom: '',
        formaPago: '', formaPagoCustom: '', garantiaSustitucion: '', garantiaSustitucionCustom: '',
        observacionesComerciales: '',
        margenObjetivo: 18,
        extrasDefecto: copiarExtras(EXTRAS_DEFECTO),
        posiciones: [],
        conceptosEscandallo: JSON.parse(JSON.stringify(DEMO_PRESUPUESTO_INICIAL.conceptosEscandallo)),
        auditoria: [{ id: `aud-${Date.now()}`, fecha: new Date().toISOString().replace('T', ' ').substring(0, 19), usuario: 'Usuario Demo', accion: 'Creación de presupuesto', detalle: `Alta de ${id} en estado Borrador.` }],
      };
    }

    // ==========================================
    // DATOS DE DEMO INICIALES (v3 fiel a v2)
    // ==========================================
    const DEMO_PRESUPUESTO_INICIAL = {
      id: 'PRE-2026-0048',
      codigoVersion: 'PRE-2026-0048-v2',
      versionNumero: 2,
      titulo: 'Servicio ETT campaña logística primavera y refuerzo HUB central',
      empresaId: 'comp-1',
      cliente: 'Trans-Logística Ibérica Norte, S.L.',
      cif: 'B-87654321',
      sector: 'Logística y almacén',
      ciudad: 'Basauri (Bizkaia)',
      convenioEmpresa: 'logistica_bizkaia',
      contacto: 'Marta Gómez Arana (Responsable de RRHH y Selección)',
      emailContacto: 'marta.gomez@translog-norte.es',
      telefonoContacto: '+34 654 987 321',
      comercial: 'Elena Navarro',
      margenObjetivo: 18,
      extrasDefecto: EXTRAS_DEFECTO.map(x => ({ ...x })),
      estado: 'Borrador', // Borrador | En preparación | Enviado a Cliente | Pendiente de Firma | Firmado / Aceptado | Rechazado | Sustituido
      esEditableDirecto: true,
      fechaEmision: '2026-10-27',
      fechaValidez: '2026-11-27',
      fechaInicioPrevista: '2026-12-01',
      duracionMeses: 3,
      moneda: 'EUR',
      modalidad: 'pico_produccion',
      modalidadCustom: '',
      iva: '21',
      ivaCustom: '',
      formaPago: 'confirming_60',
      formaPagoCustom: '',
      garantiaSustitucion: 'garantia_4h',
      garantiaSustitucionCustom: '',
      observacionesComerciales: 'Se contempla cláusula de absorción por plantilla cliente sin coste de traspaso tras superar las 900 horas efectivas de CPD. La ETT asume la gestión documental completa en CAE y portal de PRL.',
      
      // Posiciones cotizadas
      posiciones: [
{
  id: 'pos-1',
  nombre: 'Operario/a de Almacén',
  convenio: 'logistica_bizkaia',
  convenioCustom: '',
  categoria: 'op_almacen',
  categoriaCustom: '',
  grupoNivel: 'g4',
  grupoNivelCustom: '',
  salarioBaseAnual: 17200.00,
  plusConvenioMes: 120.00,
  pagasAnuales: 14,
  horasAnuales: 1784,
  horasDiaCalculo: 8,
  coeficienteParcialidad: 1.0,
  tarifaHoraOfertada: 17.65,
  personas: 8,
  horasPersona: 480,
  tarifaJornadaManual: null,
  vacacionesDiasAnio: 30,
  extras: EXTRAS_DEFECTO.map(x => ({ ...x })),
  descripcionTareas: 'Recepción, control de bultos, picking por radiofrecuencia, preparación de pedidos e inventario rotativo.'
},
{
  id: 'pos-2',
  nombre: 'Mozo/a Especialista — Carretillero/a Frontal/Retráctil',
  convenio: 'logistica_bizkaia',
  convenioCustom: '',
  categoria: 'mozo_esp',
  categoriaCustom: '',
  grupoNivel: 'g3',
  grupoNivelCustom: '',
  salarioBaseAnual: 19450.00,
  plusConvenioMes: 180.00,
  pagasAnuales: 14,
  horasAnuales: 1784,
  horasDiaCalculo: 8,
  coeficienteParcialidad: 1.0,
  tarifaHoraOfertada: 19.80,
  personas: 4,
  horasPersona: 480,
  tarifaJornadaManual: null,
  vacacionesDiasAnio: 30,
  extras: EXTRAS_DEFECTO.map(x => ({ ...x, mostrar: x.id !== 'festiva' })),
  conceptos: { 'c-abs': { aplica: true, valor: 3.2 } },
  descripcionTareas: 'Ubicación en altura en estanterías dinámicas (hasta 9m), descarga de trailers y abastecimiento de líneas.'
}
      ],

      // Conceptos del Escandallo Económico
      conceptosEscandallo: [
{
  id: 'c-ss',
  nombre: 'Seguridad Social Patronal (Común + AT/EP 4.10% + Desempleo + FOGASA + FP)',
  tipo: 'porcentaje',
  tipoCustom: '',
  valor: 32.85,
  baseCalculo: 'coste_salarial_total',
  baseCalculoCustom: '',
  esObligatorioLegal: true,
  descripcion: 'Aportación legal obligatoria a la TGSS según tarifa CNAE Transporte y Almacenamiento.'
},
{
  id: 'c-indem',
  nombre: 'Indemnización Fin de Contrato Puesta a Disposición (12 días/año)',
  tipo: 'porcentaje',
  tipoCustom: '',
  valor: 4.54,
  baseCalculo: 'coste_salarial_total',
  baseCalculoCustom: '',
  esObligatorioLegal: true,
  descripcion: 'Prorrateo de indemnización legal obligatoria por cese de contrato de puesta a disposición.'
},
{
  id: 'c-abs',
  recomendado: true,
  nombre: 'Provisión de absentismo y contingencias',
  tipo: 'porcentaje',
  tipoCustom: '',
  valor: 2.15,
  baseCalculo: 'salario_bruto_hora',
  baseCalculoCustom: '',
  esObligatorioLegal: false,
  descripcion: 'Cobertura estimada de bajas de corta duración y permisos retribuidos según convenio.'
},
{
  id: 'c-epi',
  recomendado: true,
  nombre: 'EPIs (calzado S3, chaleco y guantes anticorte)',
  tipo: 'fijo_hora',
  tipoCustom: '',
  valor: 0.18,
  baseCalculo: 'horas_reales_efectivas',
  baseCalculoCustom: '',
  esObligatorioLegal: false,
  descripcion: 'Amortización del kit de protección individual y reposición de consumibles.'
},
{
  id: 'c-prl',
  recomendado: true,
  nombre: 'Revisión médica inicial y formación PRL',
  tipo: 'fijo_hora',
  tipoCustom: '',
  valor: 0.22,
  baseCalculo: 'horas_reales_efectivas',
  baseCalculoCustom: '',
  esObligatorioLegal: false,
  descripcion: 'Acreditación según Art. 19 LPRL y vigilancia médica para trabajo en altura y almacén.'
}
      ],

      // Historial de auditoría
      auditoria: [
{
  id: 'aud-1',
  fecha: '2026-03-24 10:15:20',
  usuario: 'Elena Navarro (KAM)',
  accion: 'Creación de presupuesto',
  detalle: 'Alta de presupuesto PRE-2026-0048 en estado Borrador.'
},
{
  id: 'aud-2',
  fecha: '2026-03-24 10:28:44',
  usuario: 'Elena Navarro (KAM)',
  accion: 'Incorporación de puesto',
  detalle: 'Se añade puesto Mozo/a Especialista - Carretillero/a con tarifa inicial 19.80 €/h.'
}
      ]
    };

    // Versión anterior (v1) para poder comparar: tarifas algo distintas y un carretillero menos
    const DEMO_VERSION_ANTERIOR = (() => {
      const v = JSON.parse(JSON.stringify(DEMO_PRESUPUESTO_INICIAL));
      v.codigoVersion = 'PRE-2026-0048-v1';
      v.versionNumero = 1;
      v.estado = 'Sustituido';
      v.fechaValidez = '2026-11-10';
      v.posiciones[0].tarifaHoraOfertada = 17.20;
      v.posiciones[1].tarifaHoraOfertada = 20.40;
      v.posiciones[1].personas = 3;
      return v;
    })();

    // Historial de versiones del presupuesto para demo
    const DEMO_HISTORIAL_VERSIONES = [
      {
version: 'PRE-2026-0048-v1',
numero: 1,
fecha: '2026-03-24',
creador: 'Elena Navarro',
estado: 'Borrador activo',
tarifaMedia: '18.72 €/h',
margenMedio: '17.4%',
comentario: 'Versión actual en edición.'
      },
      {
version: 'PRE-2026-0032-v2',
numero: 2,
fecha: '2026-02-15',
creador: 'Marcos Rubio',
estado: 'Firmado / Activo',
tarifaMedia: '17.20 €/h',
margenMedio: '16.8%',
comentario: 'Campaña invierno finalizada con éxito.'
      }
    ];

    // Otros presupuestos para la vista de listado
    const TURNOS_PETICION = ['Turno de mañana', 'Turno de tarde', 'Turno de noche', 'Jornada partida'];

    const DEMO_LISTADO_PRESUPUESTOS = [
      { id: 'PRE-2026-0048', importe: 63800,  titulo: 'Servicio ETT campaña logística primavera HUB central', cliente: 'Trans-Logística Ibérica Norte, S.L.', comercial: 'Elena Navarro', estado: 'Borrador', puestosCount: 2, tarifaMedia: 18.72, margenPct: 17.4, fechaValidez: '2026-11-27', esEditableDirecto: true },
      { id: 'PRE-2026-0047', importe: 41200,  titulo: 'Refuerzo líneas de envasado y picking alimentario', cliente: 'Mediterránea Agrícola y Envasado, S.L.', comercial: 'Carlos Mendoza', estado: 'En preparación', puestosCount: 3, tarifaMedia: 16.90, margenPct: 18.2, fechaValidez: '2026-11-02', esEditableDirecto: true },
      { id: 'PRE-2026-0046', importe: 28900, diasSinRespuesta: 2,  titulo: 'Camareros/as para temporada de congresos', cliente: 'Hostelería & Eventos Premium BCN, S.L.', comercial: 'Laura Vidal', estado: 'Pendiente de Firma', puestosCount: 2, tarifaMedia: 17.40, margenPct: 19.1, fechaValidez: '2026-11-10', esEditableDirecto: false },
      { id: 'PRE-2026-0045', importe: 52300, diasSinRespuesta: 6,  titulo: 'Operarios/as soldadura y mecanizado metal 24/7', cliente: 'Manufacturas Metálicas del Henares, S.A.', comercial: 'Elena Rivas', estado: 'Enviado a Cliente', puestosCount: 1, tarifaMedia: 22.40, margenPct: 19.5, fechaValidez: '2026-11-15', esEditableDirecto: false },
      { id: 'PRE-2026-0042', importe: 58200,  titulo: 'Campaña logística otoño HUB central', cliente: 'Trans-Logística Ibérica Norte, S.L.', comercial: 'Elena Navarro', estado: 'Firmado / Aceptado', puestosCount: 2, tarifaMedia: 18.37, margenPct: 18.0, fechaValidez: '2026-10-20', esEditableDirecto: false },
      { id: 'PRE-2026-0041', importe: 37600,  titulo: 'Servicio ETT camareros/as y cocina fiestas locales', cliente: 'Hostelería & Eventos Premium BCN, S.L.', comercial: 'Laura Vidal', estado: 'Firmado / Aceptado', puestosCount: 4, tarifaMedia: 18.10, margenPct: 21.0, fechaValidez: '2026-10-15', esEditableDirecto: false },
      { id: 'PRE-2026-0038', importe: 12400,  titulo: 'Mozos de carga para inventario anual', cliente: 'Trans-Logística Ibérica Norte, S.L.', comercial: 'Carlos Mendoza', estado: 'Rechazado', puestosCount: 1, tarifaMedia: 16.20, margenPct: 14.0, fechaValidez: '2026-10-01', esEditableDirecto: false },
    ];

    // ==========================================
    // UTILIDADES DE CÁLCULO ECONÓMICO ETT
    // ==========================================
    function calcularEconomiaPosicion(pos, conceptos, margenGlobal = 18) {
      const horasAnuales = pos.horasAnuales > 0 ? pos.horasAnuales : 1784;
      const salarioBase = Number(pos.salarioBaseAnual) || 0;
      const plusMensual = Number(pos.plusConvenioMes) || 0;
      const pagas = Number(pos.pagasAnuales) || 12;
      const horasDia = Number(pos.horasDiaCalculo) || 8;
      const parcialidad = Number(pos.coeficienteParcialidad) || 1.0;
      const tarifaPVP = Number(pos.tarifaHoraOfertada) || 0;

      // Salario Bruto Anual Total = Salario Base + (Plus Mensual * 12 o Pagas)
      const plusAnual = plusMensual * 12;
      const salarioBrutoAnual = salarioBase + plusAnual;

      // Salario Bruto por Hora Efectiva
      const salarioBrutoHora = (salarioBrutoAnual / horasAnuales) * parcialidad;

      // Prorrata de Pagas Extras y Vacaciones integrada en hora efectiva
      const costeSalarialHora = salarioBrutoHora; 

      // Calcular conceptos de escandallo
      let totalCosteSocialHora = 0;
      let desgloseConceptos = [];

      conceptos.forEach(c => {
// Ajuste del puesto: puede no aplicarse (salvo los legales) o tener otro valor
const ajuste = pos.conceptos?.[c.id];
if (!c.esObligatorioLegal && ajuste && ajuste.aplica === false) return;
const valorConcepto = !c.esObligatorioLegal && ajuste && ajuste.valor !== '' && ajuste.valor != null ? Number(ajuste.valor) : Number(c.valor);
let base = salarioBrutoHora;
if (c.baseCalculo === 'coste_salarial_total' || c.baseCalculo === 'base_ss_total') {
  base = costeSalarialHora;
} else if (c.baseCalculo === 'tarifa_venta_hora') {
  base = tarifaPVP;
} else if (c.baseCalculo === 'horas_reales_efectivas') {
  base = 1.0; // Fijo por hora
}

let importeHora = 0;
if (c.tipo === 'porcentaje') {
  importeHora = (base * valorConcepto) / 100;
} else if (c.tipo === 'fijo_hora') {
  importeHora = valorConcepto;
} else if (c.tipo === 'fijo_jornada') {
  importeHora = valorConcepto / horasDia;
} else if (c.tipo === 'fijo_mes') {
  importeHora = valorConcepto / (horasAnuales / 12);
}

totalCosteSocialHora += importeHora;
desgloseConceptos.push({
  id: c.id,
  nombre: c.nombre,
  importeHora: importeHora,
  esLegal: c.esObligatorioLegal,
  propio: valorConcepto !== Number(c.valor)
});
      });

      // Coste Total Empresa ETT por Hora
      const costeTotalEmpresaHora = salarioBrutoHora + totalCosteSocialHora;

      // Margen bruto
      const margenEuroHora = tarifaPVP - costeTotalEmpresaHora;
      const margenPorcentaje = tarifaPVP > 0 ? (margenEuroHora / tarifaPVP) * 100 : 0;

      // Tarifa sugerida con el margen objetivo (margen sobre la tarifa)
      const margenObjetivo = Number(pos.margenObjetivo ?? margenGlobal ?? 18);
      const tarifaSugerida = margenObjetivo < 100 ? costeTotalEmpresaHora / (1 - margenObjetivo / 100) : 0;

      // Conceptos extra: salario = hora normal x coeficiente; tarifa = salario x coeficiente de tarifa
      // (si no se indica, el mismo factor tarifa/salario de la hora normal)
      const factorTarifa = salarioBrutoHora > 0 ? tarifaPVP / salarioBrutoHora : 0;
      const extras = (pos.extras || EXTRAS_DEFECTO).map(x => {
        const salarioHora = salarioBrutoHora * (Number(x.coefSalario) || 1);
        const coefTarifaAplicado = x.coefTarifa !== '' && x.coefTarifa != null ? Number(x.coefTarifa) : factorTarifa;
        return { ...x, salarioHora, tarifaHora: salarioHora * coefTarifaAplicado, coefTarifaAplicado };
      });

      // Importes del servicio: personas x horas por persona
      const personas = Number(pos.personas) || 1;
      const horasPersona = Number(pos.horasPersona) || 0;
      const horasTotales = personas * horasPersona;
      const facturacionTotal = tarifaPVP * horasTotales;
      const costeServicio = costeTotalEmpresaHora * horasTotales;
      const margenServicio = facturacionTotal - costeServicio;

      // Tarifa Jornada
      const tarifaJornadaCalculada = tarifaPVP * horasDia;
      const costeJornada = costeTotalEmpresaHora * horasDia;

      return {
salarioBrutoHora,
salarioBrutoAnual,
costeTotalEmpresaHora,
totalCosteSocialHora,
margenEuroHora,
margenPorcentaje,
tarifaJornadaCalculada,
costeJornada,
desgloseConceptos,
tarifaPVP,
horasDia,
margenObjetivo,
tarifaSugerida,
extras,
personas,
horasPersona,
horasTotales,
facturacionTotal,
costeServicio,
margenServicio
      };
    }

    // ==========================================
    // COMPONENTE PRINCIPAL
    // ==========================================
    export default function PresupuestosView() {
      // Estado de navegación
      const [vistaActual, setVistaActual] = useState('listado'); // 'detalle' | 'listado'
      const [busquedaPresupuestos, setBusquedaPresupuestos] = useState('');
      // Listado: datos, filtros y vista (tabla o pipeline)
      const [listado, setListado] = useState(DEMO_LISTADO_PRESUPUESTOS);
      const [filtroEstado, setFiltroEstado] = useState('todos');
      const [filtroComercial, setFiltroComercial] = useState('todos');
      const [filtroValidez, setFiltroValidez] = useState('todas');
      const [vistaListado, setVistaListado] = useState('tabla');
      const [esNuevo, setEsNuevo] = useState(false);
      const [conveniosExtra, setConveniosExtra] = useState([]);

      const estadoValidez = (fecha) => {
        const dias = (new Date(fecha) - new Date(new Date().toISOString().slice(0, 10))) / 86400000;
        return dias < 0 ? 'caducado' : dias <= 7 ? 'pronto' : 'vigente';
      };
      const hayFiltrosListado = busquedaPresupuestos || filtroEstado !== 'todos' || filtroComercial !== 'todos' || filtroValidez !== 'todas';
      const limpiarFiltrosListado = () => { setBusquedaPresupuestos(''); setFiltroEstado('todos'); setFiltroComercial('todos'); setFiltroValidez('todas'); };
      const listadoFiltrado = listado.filter(p => {
        const q = busquedaPresupuestos.trim().toLowerCase();
        if (q && !`${p.id} ${p.cliente} ${p.titulo}`.toLowerCase().includes(q)) return false;
        if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
        if (filtroComercial !== 'todos' && p.comercial !== filtroComercial) return false;
        if (filtroValidez === 'vigentes' && estadoValidez(p.fechaValidez) === 'caducado') return false;
        if (filtroValidez === 'pronto' && estadoValidez(p.fechaValidez) !== 'pronto') return false;
        if (filtroValidez === 'caducados' && estadoValidez(p.fechaValidez) !== 'caducado') return false;
        return true;
      });
      const moverPresupuesto = (id, estado) => {
        const p = listado.find(x => x.id === id);
        if (!p || p.estado === estado) return;
        // Aceptar y rechazar piden confirmación (y motivo, en el caso de rechazar)
        if (estado === 'Firmado / Aceptado') return setModalAceptar({ id });
        if (estado === 'Rechazado') return setModalRechazo({ id });
        aplicarEstado(id, estado);
      };

      // Cambia el estado en el listado y, si es el presupuesto abierto, también en el detalle
      const aplicarEstado = (id, estado, extra = {}) => {
        const cambios = { estado, esEditableDirecto: ['Borrador', 'En preparación'].includes(estado), ...extra };
        setListado(prev => prev.map(x => (x.id === id ? { ...x, ...cambios, diasSinRespuesta: estado === 'Enviado a Cliente' ? 0 : x.diasSinRespuesta } : x)));
        if (id === presupuesto.id) {
          setPresupuesto(prev => ({ ...prev, ...cambios }));
          setFormularioPresupuesto(prev => ({ ...prev, ...cambios }));
        }
        mostrarToast(`${id} pasa a «${ESTADOS_PIPELINE.find(s => s.estado === estado)?.texto || estado}».`, estado === 'Rechazado' ? 'info' : 'exito');
      };

      const solicitarAprobacion = () => {
        const motivo = revisarPresupuesto(datosActivos).find(i => i.tipo === 'aprobacion' && !i.ok)?.texto || '';
        const aprobacion = { estado: 'pendiente', motivo };
        setPresupuesto(prev => ({ ...prev, aprobacion }));
        setFormularioPresupuesto(prev => ({ ...prev, aprobacion }));
        setModalRevision(false);
        mostrarToast('Aprobación pedida a dirección. Lo verá en su panel de Inicio.', 'info');
      };

      const resolverAprobacion = (aprobada) => {
        const aprobacion = { ...presupuesto.aprobacion, estado: aprobada ? 'aprobada' : 'rechazada' };
        setPresupuesto(prev => ({ ...prev, aprobacion }));
        setFormularioPresupuesto(prev => ({ ...prev, aprobacion }));
        mostrarToast(aprobada ? 'Margen aprobado: ya se puede enviar al cliente.' : 'Se piden cambios al comercial.', aprobada ? 'exito' : 'info');
      };

      const enviarAlCliente = () => {
        setModalRevision(false);
        aplicarEstado(presupuesto.id, 'Enviado a Cliente');
        mostrarToast(`Propuesta enviada a ${datosActivos.emailContacto}.`, 'exito');
      };

      const abrirCrearPeticiones = () => {
        setInicioPeticion(datosActivos.fechaInicioPrevista || '');
        setRepartoPeticiones(datosActivos.posiciones.map((pos, i) => ({ fila: `${pos.id}-${i}`, posId: pos.id, plazas: Number(pos.personas) || 1, turno: TURNOS_PETICION[0] })));
        setModalPeticion(true);
      };
      const dividirPuesto = (fila) => {
        setRepartoPeticiones(prev => {
          const i = prev.findIndex(r => r.fila === fila);
          const r = prev[i];
          const mitad = Math.max(1, Math.floor(r.plazas / 2));
          const resto = Math.max(1, r.plazas - mitad);
          const otro = TURNOS_PETICION.find(x => x !== r.turno) || r.turno;
          return [...prev.slice(0, i), { ...r, plazas: resto }, { ...r, fila: `${r.posId}-${Date.now()}`, plazas: mitad, turno: otro }, ...prev.slice(i + 1)];
        });
      };
      const crearPeticion = () => {
        const codigos = repartoPeticiones.map((_, i) => `PET-2026-${String(52 + i).padStart(4, '0')}`);
        const resumen = codigos.length === 1 ? codigos[0] : `${codigos[0]} a ${codigos[codigos.length - 1].slice(-4)}`;
        // Se guarda el reparto para verlo en cada puesto del presupuesto
        const peticionesCreadas = repartoPeticiones.map((r, i) => ({ codigo: codigos[i], posId: r.posId, turno: r.turno, plazas: Number(r.plazas) || 0 }));
        setPresupuesto(prev => ({ ...prev, peticionCreada: resumen, peticionesCreadas }));
        setFormularioPresupuesto(prev => ({ ...prev, peticionCreada: resumen, peticionesCreadas }));
        setModalPeticion(false);
        mostrarToast(`${codigos.length === 1 ? 'Creada la petición' : `Creadas ${codigos.length} peticiones:`} ${resumen}. Cada una con un solo puesto.`, 'exito');
      };

      // Duplicar: copia puestos, costes y condiciones; la empresa se elige de nuevo
      const handleDuplicarPresupuesto = (p) => {
        const base = presupuestoVacio(listado);
        const origen = JSON.parse(JSON.stringify(DEMO_PRESUPUESTO_INICIAL));
        const copia = {
          ...base,
          titulo: `${p.titulo} (copia)`,
          posiciones: origen.posiciones.map((x, i) => ({ ...x, id: `pos-${Date.now()}-${i}` })),
          conceptosEscandallo: origen.conceptosEscandallo,
          extrasDefecto: origen.extrasDefecto,
          margenObjetivo: origen.margenObjetivo,
          modalidad: origen.modalidad, formaPago: origen.formaPago, garantiaSustitucion: origen.garantiaSustitucion,
        };
        setPresupuesto(copia);
        setFormularioPresupuesto(JSON.parse(JSON.stringify(copia)));
        setModoEdicion(true);
        setEsNuevo(true);
        setHayCambiosSinGuardar(true);
        setPestanaActiva('empresa');
        setVistaActual('detalle');
        mostrarToast(`Copia de ${p.id} creada como ${copia.id}. Elige la empresa.`, 'info');
      };
      const sinRespuesta = (p) => ['Enviado a Cliente', 'Pendiente de Firma'].includes(p.estado) && (p.diasSinRespuesta || 0) >= DIAS_RECORDATORIO;
      const abrirPresupuesto = () => {
        setVistaActual('detalle');
        setPestanaActiva('resumen');
      };

      // Documentos del presupuesto: se pueden eliminar y volver a generar
      const [docsPresupuesto, setDocsPresupuesto] = useState(['propuesta', 'escandallo']);
      const [docABorrar, setDocABorrar] = useState(null);

      // Revisión, propuesta, aceptar/rechazar, petición y versiones
      const [modalRevision, setModalRevision] = useState(false);
      const [modalPropuesta, setModalPropuesta] = useState(false);
      const [modalAceptar, setModalAceptar] = useState(null);
      const [modalRechazo, setModalRechazo] = useState(null);
      const [modalPeticion, setModalPeticion] = useState(false);
      const [inicioPeticion, setInicioPeticion] = useState('');
      // Reparto en peticiones: una por puesto; un puesto se puede dividir (otro turno, otras fechas)
      const [repartoPeticiones, setRepartoPeticiones] = useState([]);
      const [motivosRechazo, setMotivosRechazo] = useState(['Precio', 'Plazo de incorporación', 'Eligió a la competencia', 'Cancela el proyecto', 'Sin respuesta del cliente']);
      const [versiones, setVersiones] = useState([{ codigo: 'PRE-2026-0048-v1', fecha: '2026-03-10', autor: 'Elena Navarro', estado: 'Sustituido', comentario: 'Primera propuesta enviada; el cliente pidió ajustar la tarifa del carretillero.', datos: DEMO_VERSION_ANTERIOR }]);
      const [versionAComparar, setVersionAComparar] = useState(null);

      const [pestanaActiva, setPestanaActiva] = useState('resumen'); // 'resumen' | 'posiciones' | 'escandallo' | 'condiciones' | 'historial' | 'documentos' | 'auditoria'

      // Rol de usuario (Dirección con costes/márgenes, Comercial con datos sensibles ocultos/limitados)
      const [rolUsuario, setRolUsuario] = useState('direccion'); // 'direccion' | 'comercial'

      // Estado del presupuesto principal
      const [presupuesto, setPresupuesto] = useState(DEMO_PRESUPUESTO_INICIAL);
      
      // Estado de edición global
      const [modoEdicion, setModoEdicion] = useState(false);
      const [formularioPresupuesto, setFormularioPresupuesto] = useState(DEMO_PRESUPUESTO_INICIAL);
      const [cambiosPendientes, setCambiosPendientes] = useState([]);
      const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
      const [estadoGuardado, setEstadoGuardado] = useState('guardado'); // 'guardado' | 'guardando' | 'incompleto' | 'revision' | 'error'
      
      // Paneles laterales (Drawers) y Modales
      const [drawerPosicionAbierto, setDrawerPosicionAbierto] = useState(false);
      const [posicionEnEdicion, setPosicionEnEdicion] = useState(null); // null = nuevo
      
      const [drawerConceptoAbierto, setDrawerConceptoAbierto] = useState(false);
      const [conceptoEnEdicion, setConceptoEnEdicion] = useState(null);

      const [modalResumenCambiosAbierto, setModalResumenCambiosAbierto] = useState(false);
      const [modalConfirmarEliminarPosicion, setModalConfirmarEliminarPosicion] = useState(null);
      const [modalConfirmarConvenio, setModalConfirmarConvenio] = useState(null);
      const [modalNuevaVersionAbierto, setModalNuevaVersionAbierto] = useState(false);

      // Toast feedback
      const [toast, setToast] = useState(null);

      const mostrarToast = (mensaje, tipo = 'exito') => {
setToast({ mensaje, tipo });
setTimeout(() => setToast(null), 4000);
      };

      // Control de autoguardado simulado cuando hay cambios
      useEffect(() => {
if (modoEdicion && hayCambiosSinGuardar) {
  const timer = setTimeout(() => {
    // simular guardado en borrador en background
    setEstadoGuardado('borrador_auto');
  }, 5000);
  return () => clearTimeout(timer);
}
      }, [hayCambiosSinGuardar, modoEdicion, formularioPresupuesto]);

      // Comprobar si el presupuesto está completo para emitir
      const estaCompleto = useMemo(() => {
const p = formularioPresupuesto;
if (!p.titulo || !p.cliente || !p.comercial || !p.fechaValidez) return false;
if (!p.posiciones || p.posiciones.length === 0) return false;
return p.posiciones.every(pos => pos.tarifaHoraOfertada > 0 && pos.salarioBaseAnual > 0);
      }, [formularioPresupuesto]);

      // Presupuesto nuevo: empieza vacío, en la pestaña Empresa
      const handleNuevoPresupuesto = () => {
        const nuevo = presupuestoVacio(listado);
        setPresupuesto(nuevo);
        setFormularioPresupuesto(JSON.parse(JSON.stringify(nuevo)));
        setModoEdicion(true);
        setEsNuevo(true);
        setHayCambiosSinGuardar(false);
        setPestanaActiva('empresa');
        setVistaActual('detalle');
      };

      const ajustarConceptoPuesto = (posId, conceptoId, cambio) => {
        setFormularioPresupuesto(prev => ({
          ...prev,
          posiciones: prev.posiciones.map(p => (p.id === posId
            ? { ...p, conceptos: { ...(p.conceptos || {}), [conceptoId]: { aplica: true, valor: '', ...(p.conceptos?.[conceptoId] || {}), ...cambio } } }
            : p)),
        }));
        setHayCambiosSinGuardar(true);
      };

      const actualizarVarios = (cambios) => {
        setFormularioPresupuesto(prev => ({ ...prev, ...cambios }));
        setHayCambiosSinGuardar(true);
      };

      // Iniciar edición
      const handleIniciarEdicion = () => {
if (presupuesto.estado === 'Enviado a Cliente' || presupuesto.estado === 'Pendiente de Firma' || presupuesto.estado === 'Firmado / Aceptado') {
  // Si está cerrado o enviado, abrir flujo de nueva versión editable
  setModalNuevaVersionAbierto(true);
} else {
  setFormularioPresupuesto(JSON.parse(JSON.stringify(presupuesto)));
  setModoEdicion(true);
  setHayCambiosSinGuardar(false);
  setEstadoGuardado('guardado');
  mostrarToast('Modo edición activado. Modifica datos, posiciones o conceptos.', 'info');
}
      };

      // Crear nueva versión editable a partir de uno cerrado
      const handleCrearNuevaVersion = () => {
const nuevoNum = presupuesto.versionNumero + 1;
const nuevoId = `${presupuesto.id}-v${nuevoNum}`;
const nuevaCopia = {
  ...presupuesto,
  codigoVersion: nuevoId,
  versionNumero: nuevoNum,
  estado: 'Borrador',
  esEditableDirecto: true,
  aprobacion: undefined,
  peticionCreada: undefined,
  auditoria: [
    {
      id: `aud-${Date.now()}`,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      usuario: 'Elena Navarro (KAM)',
      accion: 'Creación de versión editable',
      detalle: `Generada nueva versión ${nuevoId} a partir de la versión sustituida.`
    },
    ...presupuesto.auditoria
  ]
};
setVersiones(prev => [{ codigo: presupuesto.codigoVersion, fecha: new Date().toISOString().slice(0, 10), autor: 'Usuario Demo', estado: 'Sustituido', comentario: 'Sustituida por una versión nueva.', datos: JSON.parse(JSON.stringify({ ...presupuesto, estado: 'Sustituido' })) }, ...prev]);
setPresupuesto(nuevaCopia);
setFormularioPresupuesto(JSON.parse(JSON.stringify(nuevaCopia)));
setModoEdicion(true);
setModalNuevaVersionAbierto(false);
setHayCambiosSinGuardar(false);
mostrarToast(`Nueva versión editable creada: ${nuevoId}`, 'exito');
      };

      // Cancelar edición
      const handleCancelarEdicion = () => {
if (esNuevo) {
  // Un presupuesto nuevo que no se ha guardado se descarta y se vuelve al listado
  setEsNuevo(false);
  setModoEdicion(false);
  setPresupuesto(DEMO_PRESUPUESTO_INICIAL);
  setFormularioPresupuesto(DEMO_PRESUPUESTO_INICIAL);
  setVistaActual('listado');
  return;
}
if (hayCambiosSinGuardar) {
  if (confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver a la versión anterior?')) {
    setFormularioPresupuesto(JSON.parse(JSON.stringify(presupuesto)));
    setModoEdicion(false);
    setHayCambiosSinGuardar(false);
    mostrarToast('Edición cancelada.', 'info');
  }
} else {
  setModoEdicion(false);
}
      };

      // Detectar diferencias para el Diff Modal
      const calcularDiferencias = () => {
const diffs = [];
const orig = presupuesto;
const edit = formularioPresupuesto;

if (orig.titulo !== edit.titulo) diffs.push({ campo: 'Título del servicio', anterior: orig.titulo, nuevo: edit.titulo });
if (orig.cliente !== edit.cliente) diffs.push({ campo: 'Empresa Cliente', anterior: orig.cliente, nuevo: edit.cliente });
if (orig.contacto !== edit.contacto) diffs.push({ campo: 'Contacto destinatario', anterior: orig.contacto, nuevo: edit.contacto });
if (orig.comercial !== edit.comercial) diffs.push({ campo: 'Responsable Comercial', anterior: orig.comercial, nuevo: edit.comercial });
if (orig.fechaValidez !== edit.fechaValidez) diffs.push({ campo: 'Fecha de Validez', anterior: orig.fechaValidez, nuevo: edit.fechaValidez });
if (orig.modalidad !== edit.modalidad) diffs.push({ campo: 'Modalidad ETT', anterior: orig.modalidad, nuevo: edit.modalidad });
if (orig.formaPago !== edit.formaPago) diffs.push({ campo: 'Forma de Pago', anterior: orig.formaPago, nuevo: edit.formaPago });
if (orig.garantiaSustitucion !== edit.garantiaSustitucion) diffs.push({ campo: 'Garantía sustitución', anterior: orig.garantiaSustitucion, nuevo: edit.garantiaSustitucion });

// Diferencias en posiciones
if (orig.posiciones.length !== edit.posiciones.length) {
  diffs.push({
    campo: 'Número de puestos',
    anterior: `${orig.posiciones.length} puesto(s)`,
    nuevo: `${edit.posiciones.length} puesto(s)`
  });
}

edit.posiciones.forEach((pos, idx) => {
  const posOrig = orig.posiciones.find(p => p.id === pos.id);
  if (!posOrig) {
    diffs.push({ campo: `Nuevo puesto añadido`, anterior: '—', nuevo: `${pos.nombre} (${pos.tarifaHoraOfertada} €/h)` });
  } else {
    if (posOrig.tarifaHoraOfertada !== pos.tarifaHoraOfertada) {
      diffs.push({ campo: `Tarifa [${pos.nombre}]`, anterior: `${posOrig.tarifaHoraOfertada} €/h`, nuevo: `${pos.tarifaHoraOfertada} €/h` });
    }
    if (posOrig.salarioBaseAnual !== pos.salarioBaseAnual) {
      diffs.push({ campo: `Salario Base [${pos.nombre}]`, anterior: `${posOrig.salarioBaseAnual} €`, nuevo: `${pos.salarioBaseAnual} €` });
    }
    if (posOrig.convenio !== pos.convenio) {
      diffs.push({ campo: `Convenio [${pos.nombre}]`, anterior: posOrig.convenio, nuevo: pos.convenio });
    }
  }
});

// Diferencias en conceptos
if (orig.conceptosEscandallo.length !== edit.conceptosEscandallo.length) {
  diffs.push({
    campo: 'Conceptos del escandallo',
    anterior: `${orig.conceptosEscandallo.length} conceptos`,
    nuevo: `${edit.conceptosEscandallo.length} conceptos`
  });
}

return diffs;
      };

      // Solicitar guardar cambios (abre diff modal)
      const handleSolicitarGuardar = () => {
const diffs = calcularDiferencias();
setCambiosPendientes(diffs);
setModalResumenCambiosAbierto(true);
      };

      // Confirmar y aplicar guardado definitivo
      const handleConfirmarGuardar = (guardarComoBorrador = false) => {
setEstadoGuardado('guardando');

setTimeout(() => {
  const nuevosLogs = cambiosPendientes.map(diff => ({
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
    usuario: rolUsuario === 'direccion' ? 'Dirección de Operaciones' : 'Elena Navarro (KAM)',
    accion: 'Modificación de presupuesto',
    detalle: `${diff.campo}: de "${diff.anterior}" a "${diff.nuevo}"`
  }));

  const updated = {
    ...formularioPresupuesto,
    estado: guardarComoBorrador ? 'Borrador' : (estaCompleto ? 'En preparación' : 'Borrador'),
    auditoria: [
      ...(nuevosLogs.length > 0 ? nuevosLogs : [{
        id: `aud-${Date.now()}`,
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
        usuario: 'Elena Navarro (KAM)',
        accion: 'Guardado de presupuesto',
        detalle: 'Revisión y actualización de datos.'
      }]),
      ...formularioPresupuesto.auditoria
    ]
  };

  setPresupuesto(updated);
  setFormularioPresupuesto(updated);
  if (esNuevo) {
    const ecos = updated.posiciones.map(p => calcularEconomiaPosicion(p, updated.conceptosEscandallo, updated.margenObjetivo));
    const media = (k) => (ecos.length ? ecos.reduce((s, e) => s + e[k], 0) / ecos.length : 0);
    setListado(prev => [{ id: updated.id, titulo: updated.titulo || 'Sin título', cliente: updated.cliente || 'Sin empresa', comercial: updated.comercial || '—', estado: updated.estado, puestosCount: updated.posiciones.length, importe: totalesDe(updated).facturacion, tarifaMedia: media('tarifaPVP'), margenPct: media('margenPorcentaje'), fechaValidez: updated.fechaValidez, esEditableDirecto: true }, ...prev]);
    setEsNuevo(false);
  }
  setModoEdicion(false);
  setHayCambiosSinGuardar(false);
  setEstadoGuardado('guardado');
  setModalResumenCambiosAbierto(false);
  mostrarToast('Presupuesto guardado correctamente y registrado en auditoría.', 'exito');
}, 600);
      };

      // Guardar directamente como borrador (permite datos incompletos)
      const handleGuardarComoBorradorDirecto = () => {
const updated = {
  ...formularioPresupuesto,
  estado: 'Borrador',
  auditoria: [
    {
      id: `aud-${Date.now()}`,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      usuario: 'Elena Navarro (KAM)',
      accion: 'Guardado en Borrador',
      detalle: 'Guardado manual en estado borrador (puede contener datos provisionales).'
    },
    ...formularioPresupuesto.auditoria
  ]
};
setPresupuesto(updated);
setFormularioPresupuesto(updated);
setModoEdicion(false);
setHayCambiosSinGuardar(false);
mostrarToast('Presupuesto guardado como Borrador.', 'info');
      };

      // Actualizar campos del presupuesto en formulario
      const handleActualizarCampoPresupuesto = (campo, valor) => {
setFormularioPresupuesto(prev => ({
  ...prev,
  [campo]: valor
}));
setHayCambiosSinGuardar(true);
      };

      // ==========================================
      // GESTIÓN DE POSICIONES
      // ==========================================
      const handleAbrirDrawerPosicion = (pos = null) => {
if (!modoEdicion) {
  setFormularioPresupuesto(JSON.parse(JSON.stringify(presupuesto)));
  setModoEdicion(true);
}
if (pos) {
  setPosicionEnEdicion(JSON.parse(JSON.stringify(pos)));
} else {
  // Nueva posición default
  setPosicionEnEdicion({
    id: `pos-${Date.now()}`,
    nombre: '',
    convenio: formularioPresupuesto.convenioEmpresa || presupuesto.convenioEmpresa || 'logistica_madrid',
    convenioCustom: '',
    categoria: 'op_almacen',
    categoriaCustom: '',
    grupoNivel: 'g4',
    grupoNivelCustom: '',
    salarioBaseAnual: 18000,
    plusConvenioMes: 100,
    pagasAnuales: 14,
    horasAnuales: 1784,
    horasDiaCalculo: 8,
    coeficienteParcialidad: 1.0,
    tarifaHoraOfertada: 0,
    tarifaJornadaManual: null,
    vacacionesDiasAnio: 30,
    personas: 1,
    horasPersona: 160,
    extras: copiarExtras(formularioPresupuesto.extrasDefecto || presupuesto.extrasDefecto),
    descripcionTareas: ''
  });
}
setDrawerPosicionAbierto(true);
      };

      const handleGuardarPosicion = (posData) => {
if (!posData.nombre || !posData.tarifaHoraOfertada) {
  alert('Por favor indica al menos el nombre del puesto y la tarifa ofertada.');
  return;
}

const existe = formularioPresupuesto.posiciones.some(p => p.id === posData.id);
let nuevasPosiciones;
if (existe) {
  nuevasPosiciones = formularioPresupuesto.posiciones.map(p => p.id === posData.id ? posData : p);
} else {
  nuevasPosiciones = [...formularioPresupuesto.posiciones, posData];
}

setFormularioPresupuesto(prev => ({
  ...prev,
  posiciones: nuevasPosiciones
}));
setHayCambiosSinGuardar(true);
setDrawerPosicionAbierto(false);
setPosicionEnEdicion(null);
mostrarToast(existe ? 'Puesto actualizado.' : 'Nuevo puesto añadido al presupuesto.', 'exito');
      };

      const handleDuplicarPosicion = (pos) => {
if (!modoEdicion) {
  setFormularioPresupuesto(JSON.parse(JSON.stringify(presupuesto)));
  setModoEdicion(true);
}
const copia = {
  ...pos,
  id: `pos-${Date.now()}`,
  nombre: `${pos.nombre} (Copia)`
};
setFormularioPresupuesto(prev => ({
  ...prev,
  posiciones: [...prev.posiciones, copia]
}));
setHayCambiosSinGuardar(true);
mostrarToast(`Puesto "${pos.nombre}" duplicado con éxito.`, 'exito');
      };

      const handleEliminarPosicion = (posId) => {
setModalConfirmarEliminarPosicion(posId);
      };

      const confirmarEliminacionPosicion = () => {
const nuevasPos = formularioPresupuesto.posiciones.filter(p => p.id !== modalConfirmarEliminarPosicion);
setFormularioPresupuesto(prev => ({
  ...prev,
  posiciones: nuevasPos
}));
setHayCambiosSinGuardar(true);
setModalConfirmarEliminarPosicion(null);
mostrarToast('Posición eliminada del presupuesto.', 'info');
      };

      // ==========================================
      // GESTIÓN DE CONCEPTOS DE ESCANDALLO
      // ==========================================
      const handleAbrirDrawerConcepto = (concepto = null) => {
if (!modoEdicion) {
  setFormularioPresupuesto(JSON.parse(JSON.stringify(presupuesto)));
  setModoEdicion(true);
}
if (concepto) {
  setConceptoEnEdicion(JSON.parse(JSON.stringify(concepto)));
} else {
  setConceptoEnEdicion({
    id: `c-${Date.now()}`,
    nombre: '',
    tipo: 'porcentaje',
    tipoCustom: '',
    valor: 1.5,
    baseCalculo: 'salario_bruto_hora',
    baseCalculoCustom: '',
    esObligatorioLegal: false,
    descripcion: ''
  });
}
setDrawerConceptoAbierto(true);
      };

      const handleGuardarConcepto = (conceptoData) => {
if (!conceptoData.nombre || conceptoData.valor === '' || isNaN(Number(conceptoData.valor))) {
  alert('Por favor ingresa un nombre y un valor numérico válido para el concepto.');
  return;
}
const existe = formularioPresupuesto.conceptosEscandallo.some(c => c.id === conceptoData.id);
let nuevosConceptos;
if (existe) {
  nuevosConceptos = formularioPresupuesto.conceptosEscandallo.map(c => c.id === conceptoData.id ? conceptoData : c);
} else {
  nuevosConceptos = [...formularioPresupuesto.conceptosEscandallo, conceptoData];
}

setFormularioPresupuesto(prev => ({
  ...prev,
  conceptosEscandallo: nuevosConceptos
}));
setHayCambiosSinGuardar(true);
setDrawerConceptoAbierto(false);
setConceptoEnEdicion(null);
mostrarToast(existe ? 'Concepto económico actualizado.' : 'Nuevo concepto añadido al escandallo.', 'exito');
      };

      const handleEliminarConcepto = (conceptoId) => {
const concepto = formularioPresupuesto.conceptosEscandallo.find(c => c.id === conceptoId);
if (concepto && concepto.recomendado) {
  alert('Este concepto va siempre en el presupuesto. Si un puesto no lo necesita, desmárcalo en ese puesto.');
  return;
}
if (concepto && concepto.esObligatorioLegal) {
  alert('Este concepto es de cumplimiento legal obligatorio para ETT (Seguridad Social o Indemnización legal) y no puede eliminarse.');
  return;
}
if (confirm(`¿Deseas eliminar el concepto "${concepto?.nombre}"?`)) {
  const nuevos = formularioPresupuesto.conceptosEscandallo.filter(c => c.id !== conceptoId);
  setFormularioPresupuesto(prev => ({
    ...prev,
    conceptosEscandallo: nuevos
  }));
  setHayCambiosSinGuardar(true);
  mostrarToast('Concepto eliminado del escandallo.', 'info');
}
      };

      // Cálculos globales agregados
      const datosActivos = modoEdicion ? formularioPresupuesto : presupuesto;
      const calculosPosiciones = useMemo(() => {
return datosActivos.posiciones.map(pos => ({
  pos,
  eco: calcularEconomiaPosicion(pos, datosActivos.conceptosEscandallo, datosActivos.margenObjetivo)
}));
      }, [datosActivos]);

      const totalesAgregados = useMemo(() => {
        const tot = totalesDe(datosActivos);
        const costeMedio = tot.ecos.length ? tot.ecos.reduce((s, e) => s + e.costeTotalEmpresaHora, 0) / tot.ecos.length : 0;
        return { ...tot, costeMedio, margenMedioEur: tot.tarifaMedia - costeMedio };
      }, [datosActivos]);

      // Render de etiqueta de estado
      // Demo: ver el presupuesto como dirección (con costes) o como comercial (sin costes).
      const selectorRol = (
        <Select value={rolUsuario} onChange={(e) => setRolUsuario(e.target.value)} aria-label="Ver como">
          <option value="direccion">Ver como dirección</option>
          <option value="comercial">Ver como comercial</option>
        </Select>
      );

      const renderBadgeEstado = (estado) => {
        const tonos = {
          'Borrador': 'neutral',
          'En preparación': 'warning',
          'Enviado a Cliente': 'info',
          'Pendiente de Firma': 'info',
          'Firmado / Aceptado': 'success',
          'Rechazado': 'danger',
          'Sustituido': 'neutral',
        };
        const textos = { 'Enviado a Cliente': 'Enviado', 'Pendiente de Firma': 'Pendiente de firma', 'Firmado / Aceptado': 'Aceptado' };
        return <Badge tone={tonos[estado] || 'neutral'} dot>{textos[estado] || estado}</Badge>;
      };

      return (
<div className="min-h-full flex flex-col">
  

  {/* Toast Notification */}
  {toast && (
    <div className="fixed bottom-5 right-5 z-50 animate-bounce shadow-lg">
      <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2.5 shadow-lg border ${
        toast.tipo === 'exito' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' :
        toast.tipo === 'error' ? 'bg-rose-900 text-rose-100 border-rose-700' :
        'bg-slate-900 text-slate-100 border-slate-700'
      }`}>
        {toast.tipo === 'exito' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {toast.tipo === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
        {toast.tipo === 'info' && <Info className="w-4 h-4 text-blue-400" />}
        <span>{toast.mensaje}</span>
        <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )}

  {vistaActual === 'listado' && (
    <Page>
      <PageHeader
        title="Presupuestos"
        count={listado.length}
        subtitle="Propuestas a clientes con tarifas por puesto y márgenes."
        actions={
          <>
            {selectorRol}
            <Button variant="primary" icon={Plus} onClick={handleNuevoPresupuesto}>
              Nuevo presupuesto
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
          <SearchInput className="flex-1 min-w-[220px] max-w-sm" value={busquedaPresupuestos} onChange={setBusquedaPresupuestos} placeholder="Buscar por cliente, título o código..." />
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {ESTADOS_PIPELINE.map(s => <option key={s.estado} value={s.estado}>{s.texto || s.estado}</option>)}
          </Select>
          <Select value={filtroComercial} onChange={(e) => setFiltroComercial(e.target.value)}>
            <option value="todos">Todos los comerciales</option>
            {[...new Set(listado.map(p => p.comercial))].sort().map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={filtroValidez} onChange={(e) => setFiltroValidez(e.target.value)}>
            <option value="todas">Cualquier validez</option>
            <option value="vigentes">Vigentes</option>
            <option value="pronto">Caducan en 7 días</option>
            <option value="caducados">Caducados</option>
          </Select>
          {hayFiltrosListado && (
            <Button size="sm" variant="ghost" icon={X} onClick={limpiarFiltrosListado}>Limpiar</Button>
          )}
          <div className="ml-auto">
            <Segmented
              value={vistaListado}
              onChange={setVistaListado}
              options={[
                { id: 'tabla', title: 'Ver como tabla', icon: List },
                { id: 'pipeline', title: 'Ver por estados (pipeline)', icon: SquareKanban },
              ]}
            />
          </div>
        </div>

        {listadoFiltrado.length === 0 ? (
          <EmptyState icon={FileText} title="No hay presupuestos con estos filtros" action={<Button onClick={limpiarFiltrosListado}>Limpiar filtros</Button>} />
        ) : vistaListado === 'pipeline' ? (
          <div className="p-3">
            <PipelinePresupuestos lista={listadoFiltrado} onAbrir={abrirPresupuesto} onMover={moverPresupuesto} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                  <th className="py-2 px-3 font-medium">Presupuesto</th>
                  <th className="py-2 px-3 font-medium">Cliente</th>
                  <th className="py-2 px-3 font-medium">Comercial</th>
                  <th className="py-2 px-3 font-medium">Puestos</th>
                  <th className="py-2 px-3 font-medium text-right">Importe</th>
                  <th className="py-2 px-3 font-medium">Tarifa media</th>
                  {rolUsuario === 'direccion' && <th className="py-2 px-3 font-medium">Margen</th>}
                  <th className="py-2 px-3 font-medium">Validez</th>
                  <th className="py-2 px-3 font-medium">Estado</th>
                  <th className="py-2 px-3" aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {listadoFiltrado.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => abrirPresupuesto(p)}>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-700">{p.id}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{p.cliente}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{p.titulo}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">{p.comercial}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">{p.puestosCount}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-medium text-slate-900">{eurosTotal(p.importe)}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{p.tarifaMedia.toFixed(2)} €/h</td>
                    {rolUsuario === 'direccion' && <td className="py-2.5 px-3 whitespace-nowrap text-emerald-700">{p.margenPct.toFixed(1)} %</td>}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={estadoValidez(p.fechaValidez) === 'caducado' ? 'text-rose-600' : estadoValidez(p.fechaValidez) === 'pronto' ? 'text-amber-700' : 'text-slate-500'}>{p.fechaValidez}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {renderBadgeEstado(p.estado)}
                      {sinRespuesta(p) && <div className="mt-1 text-[11px] text-amber-700">Sin respuesta · {p.diasSinRespuesta} días</div>}
                      {p.estado === 'Rechazado' && p.motivoRechazo && <div className="mt-1 text-[11px] text-slate-500">{p.motivoRechazo}</div>}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {sinRespuesta(p) && (
                          <Button size="sm" icon={Send} onClick={() => mostrarToast(`Recordatorio enviado a ${p.cliente}.`, 'exito')}>Recordar</Button>
                        )}
                        <Button size="sm" icon={p.esEditableDirecto ? Edit3 : Eye} onClick={() => abrirPresupuesto(p)}>
                          {p.esEditableDirecto ? 'Editar' : 'Ver'}
                        </Button>
                        <IconButton icon={Copy} title="Duplicar para otro cliente" onClick={() => handleDuplicarPresupuesto(p)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  )}

  {/* ==========================================
      VISTA PRINCIPAL: DETALLE DEL PRESUPUESTO
     ========================================== */}
  {vistaActual === 'detalle' && (
    <div className="w-full px-4 sm:px-6 py-5 space-y-4">
      <PageHeader
        breadcrumbs={[{ label: 'Presupuestos', onClick: () => setVistaActual('listado') }, { label: datosActivos.codigoVersion }]}
        title={
          modoEdicion ? (
            <input
              type="text"
              value={formularioPresupuesto.titulo}
              onChange={(e) => handleActualizarCampoPresupuesto('titulo', e.target.value)}
              aria-label="Título del presupuesto"
              className={`${CAMPO} text-base font-semibold text-slate-900 w-[28rem] max-w-full`}
              placeholder="Nombre del servicio o campaña..."
            />
          ) : (
            presupuesto.titulo
          )
        }
        status={
          <>
            {renderBadgeEstado(datosActivos.estado)}
            {modoEdicion && (hayCambiosSinGuardar
              ? <Badge tone="warning" dot>Cambios sin guardar</Badge>
              : <Badge tone="success" icon={Check}>Guardado</Badge>)}
            {!datosActivos.esEditableDirecto && <Badge icon={Lock}>Versión cerrada</Badge>}
            {datosActivos.aprobacion?.estado === 'pendiente' && <Badge tone="warning" dot>Pendiente de aprobación</Badge>}
            {datosActivos.aprobacion?.estado === 'aprobada' && <Badge tone="success" icon={Check}>Margen aprobado</Badge>}
          </>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{datosActivos.cliente}</span>
            <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" />{datosActivos.contacto}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />Válido hasta {datosActivos.fechaValidez}</span>
          </span>
        }
        actions={
          modoEdicion ? (
            <>
              <Button onClick={handleCancelarEdicion}>Cancelar</Button>
              <Button icon={Save} onClick={handleGuardarComoBorradorDirecto}>Guardar borrador</Button>
              <Button variant="primary" icon={Save} onClick={handleSolicitarGuardar}>Guardar cambios</Button>
            </>
          ) : (
            <>
              {selectorRol}
              {['Borrador', 'En preparación'].includes(datosActivos.estado) && (
                <>
                  <Button icon={Eye} onClick={() => setModalPropuesta(true)}>Vista previa</Button>
                  <Button icon={Edit3} onClick={handleIniciarEdicion}>Editar</Button>
                  <Button variant="primary" icon={Send} onClick={() => setModalRevision(true)}>Enviar al cliente</Button>
                </>
              )}
              {['Enviado a Cliente', 'Pendiente de Firma'].includes(datosActivos.estado) && (
                <>
                  <Button icon={X} onClick={() => setModalRechazo({ id: presupuesto.id })}>Rechazado</Button>
                  <Button icon={GitBranch} onClick={() => setModalNuevaVersionAbierto(true)}>Nueva versión</Button>
                  <Button variant="primary" icon={CheckCircle2} onClick={() => setModalAceptar({ id: presupuesto.id })}>Aceptado</Button>
                </>
              )}
              {datosActivos.estado === 'Firmado / Aceptado' && (datosActivos.peticionCreada ? (
                <Button icon={ArrowUpRight} onClick={() => { window.location.hash = '#/peticiones'; }}>Ver peticiones</Button>
              ) : (
                <Button variant="primary" icon={ArrowUpRight} onClick={abrirCrearPeticiones}>Crear peticiones</Button>
              ))}
              {['Rechazado', 'Sustituido'].includes(datosActivos.estado) && (
                <Button variant="primary" icon={GitBranch} onClick={() => setModalNuevaVersionAbierto(true)}>Nueva versión</Button>
              )}
            </>
          )
        }
      />

      {datosActivos.aprobacion?.estado === 'pendiente' && (
        <Notice tone="warning" icon={AlertTriangle}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span><strong>Pendiente de aprobación de dirección.</strong> {datosActivos.aprobacion.motivo}</span>
            {rolUsuario === 'direccion' ? (
              <span className="flex items-center gap-2">
                <Button size="sm" onClick={() => resolverAprobacion(false)}>Pedir cambios</Button>
                <Button size="sm" variant="primary" icon={Check} onClick={() => resolverAprobacion(true)}>Aprobar</Button>
              </span>
            ) : (
              <span className="text-[11px]">Dirección lo verá en su panel de Inicio.</span>
            )}
          </div>
        </Notice>
      )}
      {datosActivos.aprobacion?.estado === 'rechazada' && (
        <Notice tone="danger" icon={AlertCircle}>Dirección ha pedido cambios en el margen. Ajusta las tarifas y vuelve a pedir la aprobación.</Notice>
      )}
      {datosActivos.estado === 'Rechazado' && datosActivos.motivoRechazo && (
        <Notice tone="danger" icon={X}>Rechazado por: <strong>{datosActivos.motivoRechazo}</strong>{datosActivos.notasRechazo ? ` · ${datosActivos.notasRechazo}` : ''}</Notice>
      )}

      {datosActivos.posiciones.length === 0 ? (
        <Notice tone="info" icon={Info}>
          Este presupuesto aún no tiene puestos. La facturación, la tarifa media y el margen aparecerán al añadir el primero.
        </Notice>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile label="Facturación estimada" tone="accent" value={eurosTotal(totalesAgregados.facturacion)} hint={`${totalesAgregados.personas} personas · ${horasFmt(totalesAgregados.horas)} h · sin extras`} />
          {rolUsuario === 'direccion' ? (
            <KpiTile label="Margen total" tone={totalesAgregados.margenTotal < 0 ? 'danger' : 'success'} value={eurosTotal(totalesAgregados.margenTotal)} hint={`${pct(totalesAgregados.margenTotalPct)} de la facturación`} />
          ) : (
            <KpiTile label="Margen total" value="—" hint="Solo lo ve dirección" />
          )}
          <KpiTile label="Tarifa media" value={euros(totalesAgregados.tarifaMedia)} hint={rolUsuario === 'direccion' ? `Coste medio ${euros(totalesAgregados.costeMedio)}` : `${datosActivos.posiciones.length} puestos`} />
          <KpiTile
            label="Peticiones"
            value={datosActivos.peticionCreada || (datosActivos.estado === 'Firmado / Aceptado' ? 'Por crear' : 'Pendiente')}
            hint={datosActivos.peticionCreada ? 'Creadas desde este presupuesto' : datosActivos.estado === 'Firmado / Aceptado' ? 'Ya se puede crear' : 'Cuando el cliente lo acepte'}
          />
        </div>
      )}

      <Tabs
        active={pestanaActiva}
        onChange={setPestanaActiva}
        tabs={[
          { id: 'resumen', label: 'Resumen' },
          { id: 'empresa', label: 'Empresa', alert: !datosActivos.cliente },
          { id: 'posiciones', label: 'Posiciones', count: datosActivos.posiciones.length },
          { id: 'escandallo', label: 'Escandallo y costes' },
          { id: 'condiciones', label: 'Condiciones' },
          { id: 'historial', label: 'Versiones' },
          { id: 'documentos', label: 'Documentos' },
          { id: 'auditoria', label: 'Actividad' },
        ]}
      />

      {/* CONTENIDO DE LAS PESTAÑAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        
        {/* ----------------------------------------------------
            PESTAÑA 1: RESUMEN COMERCIAL
           ---------------------------------------------------- */}
        {pestanaActiva === 'resumen' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Datos generales y empresa cliente</h3>
                <p className="text-xs text-slate-500">Parámetros principales de la oferta comercial y personas de contacto.</p>
              </div>
              {!modoEdicion && presupuesto.esEditableDirecto && (
                <button
                  onClick={handleIniciarEdicion}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1.5 self-start"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar Datos
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icono: Building2, titulo: 'Empresa', lineas: [datosActivos.cliente || 'Sin empresa', datosActivos.cif, etiquetaConvenio(datosActivos.convenioEmpresa)] },
                { icono: User, titulo: 'Contacto', lineas: [datosActivos.contacto || 'Sin contacto', datosActivos.emailContacto, datosActivos.telefonoContacto] },
                { icono: Briefcase, titulo: 'Gestión comercial', lineas: [datosActivos.comercial || 'Sin comercial', datosActivos.fechaEmision && `Emitido el ${datosActivos.fechaEmision}`, datosActivos.fechaValidez && `Válido hasta ${datosActivos.fechaValidez}`] },
              ].map(b => (
                <div key={b.titulo} className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5"><b.icono className="w-4 h-4 text-slate-400" /> {b.titulo}</div>
                  {b.lineas.filter(Boolean).map((l, i) => <div key={i} className={i === 0 ? 'text-xs text-slate-800' : 'text-[11px] text-slate-500'}>{l}</div>)}
                </div>
              ))}
            </div>
            <div>
              <Button size="sm" icon={Building2} onClick={() => setPestanaActiva('empresa')}>Cambiar empresa, contacto o comercial</Button>
            </div>

            {/* Resumen rápido de puestos cotizados en Resumen */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800">Perfiles cotizados en esta oferta</h4>
                <button
                  onClick={() => setPestanaActiva('posiciones')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  Ver detalle y fórmulas <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {calculosPosiciones.length === 0 && (
                <EmptyState icon={Briefcase} title="Sin puestos todavía" action={<Button icon={Plus} onClick={() => handleAbrirDrawerPosicion(null)}>Añadir puesto</Button>} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {calculosPosiciones.map(({ pos, eco }) => (
                  <div key={pos.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-semibold text-slate-900 text-sm">{pos.nombre}</h5>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {eco.tarifaPVP.toFixed(2)} €/h
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pos.descripcionTareas || 'Sin descripción de tareas.'}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Jornada 8h: <strong className="text-slate-800">{eco.tarifaJornadaCalculada.toFixed(2)} €/día</strong></span>
                      {rolUsuario === 'direccion' && (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                          Margen: +{eco.margenEuroHora.toFixed(2)} €/h ({eco.margenPorcentaje.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observaciones comerciales */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" /> Observaciones y cláusulas comerciales especiales
              </div>
              {modoEdicion ? (
                <textarea
                  rows={3}
                  value={formularioPresupuesto.observacionesComerciales}
                  onChange={(e) => handleActualizarCampoPresupuesto('observacionesComerciales', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Añade cláusulas específicas de traspaso a plantilla, revisiones salariales o condiciones especiales..."
                />
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {presupuesto.observacionesComerciales || 'Sin observaciones registradas.'}
                </p>
              )}
            </div>

          </div>
        )}

        {pestanaActiva === 'empresa' && (
          <PestanaEmpresa datos={datosActivos} editable={modoEdicion} onCambiar={actualizarVarios} onEditar={handleIniciarEdicion} />
        )}

        {/* ----------------------------------------------------
            PESTAÑA 2: POSICIONES COTIZADAS (EDITOR DINÁMICO)
           ---------------------------------------------------- */}
        {pestanaActiva === 'posiciones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Desglose de posiciones y perfiles ETT</h3>
                <p className="text-xs text-slate-500">Configura salarios base, convenio, categoría profesional y calcula la tarifa por hora ofertada.</p>
              </div>

              <button
                onClick={() => handleAbrirDrawerPosicion(null)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5 self-start transition-all"
              >
                <Plus className="w-4 h-4" />
                Añadir posición
              </button>
            </div>

            {calculosPosiciones.length === 0 && (
              <EmptyState icon={Briefcase} title="Añade el primer puesto" text="Con el convenio de la empresa, la categoría y el nivel se calcula el salario; la tarifa sale del coste y del margen objetivo." action={<Button variant="primary" icon={Plus} onClick={() => handleAbrirDrawerPosicion(null)}>Añadir puesto</Button>} />
            )}

            {/* Grid de tarjetas de posiciones editables */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-5">
              {calculosPosiciones.map(({ pos, eco }) => (
                <div
                  key={pos.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-indigo-200 shadow-xs p-5 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Cabecera de la tarjeta de posición */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 text-base">{pos.nombre}</h4>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {CATALOGOS.convenios.find(c => c.id === pos.convenio)?.label || pos.convenioCustom || pos.convenio}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold text-indigo-700">{eco.tarifaPVP.toFixed(2)} €/h</div>
                        <div className="text-[11px] text-slate-500">{eco.tarifaJornadaCalculada.toFixed(2)} €/jornada</div>
                        {eco.horasTotales > 0 && (
                          <div className="mt-1 text-[11px] text-slate-600">
                            {eco.personas} × {horasFmt(eco.horasPersona)} h = <strong className="text-slate-900">{eurosTotal(eco.facturacionTotal)}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Peticiones de este puesto: solo cuando el presupuesto está aceptado */}
                    {datosActivos.estado === 'Firmado / Aceptado' && (() => {
                      const delPuesto = (datosActivos.peticionesCreadas || []).filter(x => x.posId === pos.id);
                      const repartidas = delPuesto.reduce((s, x) => s + x.plazas, 0);
                      return (
                        <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-slate-500">Peticiones:</span>
                          {delPuesto.length === 0 ? (
                            <span className="text-slate-500">aún no se han creado</span>
                          ) : (
                            <>
                              {delPuesto.map(x => (
                                <a key={x.codigo} href="#/peticiones" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                  {x.turno.toLowerCase()} · {x.plazas} {x.plazas === 1 ? 'plaza' : 'plazas'} ({x.codigo})
                                </a>
                              ))}
                              <span className={repartidas === eco.personas ? 'text-emerald-700' : 'text-amber-700'}>{repartidas} de {eco.personas} personas</span>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Desglose de Parámetros Laborales */}
                    <div className="grid grid-cols-3 gap-2 py-3.5 text-xs border-b border-slate-100 bg-slate-50/50 rounded-lg p-2.5 my-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Salario Base Anual</span>
                        <span className="font-semibold text-slate-800">{Number(pos.salarioBaseAnual).toLocaleString('es-ES')} €</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Plus Convenio/mes</span>
                        <span className="font-semibold text-slate-800">{Number(pos.plusConvenioMes).toFixed(2)} €</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Salario Bruto/hora</span>
                        <span className="font-semibold text-slate-800">{eco.salarioBrutoHora.toFixed(2)} €/h</span>
                      </div>
                    </div>

                    <DesgloseTarifa eco={eco} rol={rolUsuario} />

                    {pos.descripcionTareas && (
                      <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 line-clamp-2">
                        <strong className="text-slate-700">Tareas:</strong> {pos.descripcionTareas}
                      </p>
                    )}
                  </div>

                  {/* Acciones de la posición */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">ID: {pos.id}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDuplicarPosicion(pos)}
                        className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center gap-1 transition-colors"
                        title="Duplicar posición"
                      >
                        <Copy className="w-3 h-3" />
                        Duplicar
                      </button>
                      <button
                        onClick={() => handleAbrirDrawerPosicion(pos)}
                        className="px-2.5 py-1 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 flex items-center gap-1 font-semibold transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminarPosicion(pos.id)}
                        className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-colors"
                        title="Eliminar posición"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* ----------------------------------------------------
            PESTAÑA 3: ESCANDALLO ECONÓMICO & COSTES
           ---------------------------------------------------- */}
        {pestanaActiva === 'escandallo' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Escandallo económico y conceptos de coste</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded">Fórmulas ETT</span>
                </div>
                <p className="text-xs text-slate-500">Estructura de costes sociales, indemnizaciones legales obligatorias y dotaciones de servicio.</p>
              </div>

              <button
                onClick={() => handleAbrirDrawerConcepto(null)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5 self-start"
              >
                <Plus className="w-4 h-4" />
                Añadir concepto no obligatorio
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <label className="block text-xs font-semibold text-slate-900">Margen ETT objetivo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    disabled={!modoEdicion}
                    value={datosActivos.margenObjetivo ?? 18}
                    onChange={(e) => handleActualizarCampoPresupuesto('margenObjetivo', parseFloat(e.target.value) || 0)}
                    className={`${CAMPO} w-24 text-right disabled:bg-slate-50`}
                  />
                  <span className="text-xs text-slate-500">% sobre la tarifa</span>
                </div>
                <p className="text-[11px] text-slate-500">Con este margen se calcula la tarifa sugerida de cada puesto. Cada puesto puede tener el suyo.</p>
              </div>
              <Notice tone="info" icon={EyeOff}>
                <strong>Todo lo de esta pestaña es interno.</strong> Seguridad Social, indemnización, EPIs, revisión médica y margen
                sirven para calcular la tarifa, pero el cliente no ve el desglose: en la propuesta solo aparecen el salario y la tarifa
                de cada puesto, y sus conceptos extra (horas extra, nocturnas, fin de semana...).
              </Notice>
            </div>

            {/* Tabla de conceptos de escandallo */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Concepto económico</th>
                    <th className="px-4 py-3">Tipo de cálculo</th>
                    <th className="px-4 py-3">Valor / coeficiente</th>
                    <th className="px-4 py-3">Base de aplicación</th>
                    <th className="px-4 py-3">Naturaleza</th>
                    <th className="px-4 py-3">En la propuesta</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {datosActivos.conceptosEscandallo.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{c.nombre}</div>
                        {c.descripcion && <div className="text-[11px] text-slate-500 mt-0.5">{c.descripcion}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {CATALOGOS.tiposConcepto.find(t => t.id === c.tipo)?.label || c.tipoCustom || c.tipo}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-indigo-700">
                        {c.tipo === 'porcentaje' ? `${c.valor} %` : `${Number(c.valor).toFixed(2)} €`}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                        {CATALOGOS.basesCalculo.find(b => b.id === c.baseCalculo)?.label || c.baseCalculoCustom || c.baseCalculo}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.esObligatorioLegal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Lock className="w-3 h-3" /> Legal ETT (bloqueado)
                          </span>
                        ) : (
                          c.recomendado ? (
                            <Badge tone="accent">Siempre incluido · se ajusta por puesto</Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              Opcional
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge icon={EyeOff}>No, interno</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAbrirDrawerConcepto(c)}
                            className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Editar concepto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!c.esObligatorioLegal && !c.recomendado && (
                            <button
                              onClick={() => handleEliminarConcepto(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Eliminar concepto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Qué se aplica en cada puesto */}
            <div className="space-y-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Qué se aplica en cada puesto</h4>
                <p className="text-[11px] text-slate-500">
                  Arriba están los valores por defecto del presupuesto. Aquí decides si cada puesto lleva cada concepto y con qué valor
                  (vacío = el de por defecto). Por ejemplo, un puesto muy físico puede tener más absentismo y uno de oficina no necesitar EPIs.
                  {!modoEdicion && ' Pulsa Editar para cambiarlo.'}
                </p>
              </div>
              <MatrizConceptos
                conceptos={datosActivos.conceptosEscandallo}
                posiciones={datosActivos.posiciones}
                editable={modoEdicion}
                onCambiar={ajustarConceptoPuesto}
              />
            </div>

            {/* Conceptos extra por defecto */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Conceptos extra facturables</h4>
                <p className="text-[11px] text-slate-500">
                  Se copian a cada puesto nuevo y se ajustan allí. <strong className="text-slate-700">Siempre quedan en la oferta</strong> para poder
                  facturarlos si el trabajador los hace, aunque decidas no imprimirlos en la propuesta. Coeficientes de ejemplo: confirmar con cada convenio.
                </p>
              </div>
              <TablaExtras
                extras={datosActivos.extrasDefecto || EXTRAS_DEFECTO}
                editable={modoEdicion}
                onChange={(lista) => handleActualizarCampoPresupuesto('extrasDefecto', lista)}
              />
            </div>

          </div>
        )}

        {/* ----------------------------------------------------
            PESTAÑA 4: CONDICIONES COMERCIALES (ESTRUCTURADO)
           ---------------------------------------------------- */}
        {pestanaActiva === 'condiciones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Condiciones contractuales y forma de pago</h3>
                <p className="text-xs text-slate-500">Define los términos de facturación, plazos de garantía y cláusulas de servicio con catálogo normalizado.</p>
              </div>
              {!modoEdicion && presupuesto.esEditableDirecto && (
                <button
                  onClick={handleIniciarEdicion}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar Condiciones
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Forma de Pago */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-600" /> Forma de pago y plazo de facturación
                </label>
                
                {modoEdicion ? (
                  <div className="space-y-2">
                    <select
                      value={formularioPresupuesto.formaPago}
                      onChange={(e) => handleActualizarCampoPresupuesto('formaPago', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium"
                    >
                      {CATALOGOS.formasPago.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>

                    {formularioPresupuesto.formaPago === 'otro' && (
                      <input
                        type="text"
                        placeholder="Escribe la forma de pago personalizada..."
                        value={formularioPresupuesto.formaPagoCustom}
                        onChange={(e) => handleActualizarCampoPresupuesto('formaPagoCustom', e.target.value)}
                        className="w-full text-xs bg-white border border-amber-300 rounded-lg px-3 py-1.5 mt-1 focus:ring-2 focus:ring-amber-500"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-medium">
                    {formularioPresupuesto.formaPago === 'otro' 
                      ? (formularioPresupuesto.formaPagoCustom || 'Personalizado no especificado')
                      : CATALOGOS.formasPago.find(f => f.id === datosActivos.formaPago)?.label}
                  </div>
                )}
                <p className="text-[11px] text-slate-500">Conforme a la Ley 15/2010 de lucha contra la morosidad en operaciones comerciales.</p>
              </div>

              {/* Garantía de Sustitución */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> SLA y garantía de sustitución de personal
                </label>

                {modoEdicion ? (
                  <div className="space-y-2">
                    <select
                      value={formularioPresupuesto.garantiaSustitucion}
                      onChange={(e) => handleActualizarCampoPresupuesto('garantiaSustitucion', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium"
                    >
                      {CATALOGOS.garantiasSustitucion.map(g => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>

                    {formularioPresupuesto.garantiaSustitucion === 'otro' && (
                      <input
                        type="text"
                        placeholder="Escribe la garantía personalizada..."
                        value={formularioPresupuesto.garantiaSustitucionCustom}
                        onChange={(e) => handleActualizarCampoPresupuesto('garantiaSustitucionCustom', e.target.value)}
                        className="w-full text-xs bg-white border border-amber-300 rounded-lg px-3 py-1.5 mt-1 focus:ring-2 focus:ring-amber-500"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-medium">
                    {formularioPresupuesto.garantiaSustitucion === 'otro'
                      ? (formularioPresupuesto.garantiaSustitucionCustom || 'Garantía personalizada')
                      : CATALOGOS.garantiasSustitucion.find(g => g.id === datosActivos.garantiaSustitucion)?.label}
                  </div>
                )}
                <p className="text-[11px] text-slate-500">Plazo máximo de respuesta ante no adecuación o baja voluntaria del trabajador puesto a disposición.</p>
              </div>

              {/* Modalidad de Contratación */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-600" /> Modalidad del contrato de puesta a disposición (CPD)
                </label>

                {modoEdicion ? (
                  <div className="space-y-2">
                    <select
                      value={formularioPresupuesto.modalidad}
                      onChange={(e) => handleActualizarCampoPresupuesto('modalidad', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium"
                    >
                      {CATALOGOS.modalidades.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>

                    {formularioPresupuesto.modalidad === 'otro' && (
                      <input
                        type="text"
                        placeholder="Escribe la modalidad personalizada..."
                        value={formularioPresupuesto.modalidadCustom}
                        onChange={(e) => handleActualizarCampoPresupuesto('modalidadCustom', e.target.value)}
                        className="w-full text-xs bg-white border border-amber-300 rounded-lg px-3 py-1.5 mt-1"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-medium">
                    {CATALOGOS.modalidades.find(m => m.id === datosActivos.modalidad)?.label || datosActivos.modalidadCustom}
                  </div>
                )}
              </div>

              {/* Moneda e Impuestos */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" /> Moneda y régimen de IVA
                </label>

                {modoEdicion ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Moneda</label>
                      <select
                        value={formularioPresupuesto.moneda}
                        onChange={(e) => handleActualizarCampoPresupuesto('moneda', e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                      >
                        {CATALOGOS.monedas.map(mon => (
                          <option key={mon.id} value={mon.id}>{mon.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Tipo de IVA</label>
                      <select
                        value={formularioPresupuesto.iva}
                        onChange={(e) => handleActualizarCampoPresupuesto('iva', e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                      >
                        {CATALOGOS.tiposIva.map(iv => (
                          <option key={iv.id} value={iv.id}>{iv.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200 font-medium">
                    <div>Moneda: <strong className="text-slate-900">{datosActivos.moneda}</strong></div>
                    <div>IVA: <strong className="text-slate-900">{CATALOGOS.tiposIva.find(i => i.id === datosActivos.iva)?.label}</strong></div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            PESTAÑA 5: HISTORIAL DE VERSIONES
           ---------------------------------------------------- */}
        {pestanaActiva === 'historial' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Historial de revisiones y versiones del presupuesto</h3>
                <p className="text-xs text-slate-500">Trazabilidad inmutable de ofertas emitidas al cliente.</p>
              </div>

              <button
                onClick={() => setModalNuevaVersionAbierto(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1.5"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Generar nueva versión manual
              </button>
            </div>

            <Notice tone="info" icon={Info}>
              Mientras un presupuesto está en <strong>borrador o en preparación</strong> se edita sobre la misma versión. Cuando se
              <strong> envía al cliente</strong> queda cerrado, para que lo enviado no cambie. Para modificarlo después se crea una
              <strong> nueva versión</strong> (v2, v3...): es una copia editable y la anterior queda aquí como "sustituida", con su tarifa y margen, para poder comparar.
            </Notice>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                    <th className="py-2 px-3 font-medium">Versión</th>
                    <th className="py-2 px-3 font-medium">Fecha</th>
                    <th className="py-2 px-3 font-medium">Autor</th>
                    <th className="py-2 px-3 font-medium text-right">Facturación</th>
                    <th className="py-2 px-3 font-medium text-right">Tarifa media</th>
                    {rolUsuario === 'direccion' && <th className="py-2 px-3 font-medium text-right">Margen</th>}
                    <th className="py-2 px-3 font-medium">Estado</th>
                    <th className="py-2 px-3 font-medium">Comentario</th>
                    <th className="py-2 px-3" aria-label="Acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  {[{ codigo: datosActivos.codigoVersion, fecha: datosActivos.fechaEmision, autor: datosActivos.comercial || 'Usuario Demo', estado: datosActivos.estado, comentario: 'Versión actual.', datos: datosActivos, actual: true }, ...versiones].map(v => {
                    const tv = totalesDe(v.datos);
                    return (
                      <tr key={v.codigo} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{v.codigo}{v.actual && <span className="ml-1.5"><Badge tone="accent">Actual</Badge></span>}</td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{v.fecha}</td>
                        <td className="py-2.5 px-3 text-slate-700">{v.autor}</td>
                        <td className="py-2.5 px-3 text-right text-slate-900">{eurosTotal(tv.facturacion)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{euros(tv.tarifaMedia)}</td>
                        {rolUsuario === 'direccion' && <td className="py-2.5 px-3 text-right text-emerald-700">{pct(tv.margenTotalPct)}</td>}
                        <td className="py-2.5 px-3">{renderBadgeEstado(v.estado)}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">{v.comentario}</td>
                        <td className="py-2.5 px-3 text-right">
                          {!v.actual && <Button size="sm" onClick={() => setVersionAComparar(v)}>Comparar con la actual</Button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            PESTAÑA 6: DOCUMENTOS & PDF
           ---------------------------------------------------- */}
        {pestanaActiva === 'documentos' && (
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Documentos del presupuesto</h3>
              <p className="text-xs text-slate-500">Si cambias el presupuesto, elimina el documento y vuelve a generarlo para que recoja los cambios.</p>
            </div>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {[
                { id: 'propuesta', nombre: `Propuesta ${datosActivos.codigoVersion}.pdf`, texto: 'Para el cliente: salario y tarifa de cada puesto, conceptos extra que se imprimen y condiciones.', icono: FileText },
                { id: 'escandallo', nombre: `Escandallo interno ${datosActivos.codigoVersion}.xlsx`, texto: 'Solo uso interno: costes, conceptos internos y margen de cada puesto.', icono: FileSpreadsheet, interno: true },
              ].map(d => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><d.icono className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">{docsPresupuesto.includes(d.id) ? d.nombre : d.nombre.replace(/\.(pdf|xlsx)$/, '') + ' (sin generar)'}</div>
                    <div className="text-[11px] text-slate-500">{d.texto}</div>
                  </div>
                  {d.interno && <Badge icon={EyeOff}>Interno</Badge>}
                  {docsPresupuesto.includes(d.id) ? (
                    <div className="flex items-center gap-1">
                      {d.id === 'propuesta' && <Button size="sm" icon={Eye} onClick={() => setModalPropuesta(true)}>Vista previa</Button>}
                      <Button size="sm" icon={Download} onClick={() => mostrarToast(`Descargando ${d.nombre}...`, 'info')}>Descargar</Button>
                      {d.id === 'propuesta' && datosActivos.emailContacto && (
                        <Button size="sm" icon={Send} onClick={() => mostrarToast('Enviando la propuesta a firma a ' + datosActivos.emailContacto, 'exito')}>Enviar a firma</Button>
                      )}
                      <IconButton icon={Trash2} title="Eliminar documento" className="hover:text-rose-600 hover:bg-rose-50" onClick={() => setDocABorrar(d)} />
                    </div>
                  ) : (
                    <Button size="sm" variant="primary" icon={RefreshCw} disabled={datosActivos.posiciones.length === 0} onClick={() => { setDocsPresupuesto(prev => [...prev, d.id]); mostrarToast(`${d.nombre} generado con los datos actuales.`, 'exito'); }}>
                      Generar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ----------------------------------------------------
            PESTAÑA 7: AUDITORÍA & ACTIVIDAD
           ---------------------------------------------------- */}
        {pestanaActiva === 'auditoria' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Registro de auditoría y trazabilidad de cambios</h3>
                <p className="text-xs text-slate-500">Historial cronológico de modificaciones realizadas en el presupuesto.</p>
              </div>
            </div>

            <div className="space-y-3">
              {datosActivos.auditoria.map(log => (
                <div key={log.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-indigo-100 text-indigo-700 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{log.accion}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{log.fecha}</span>
                    </div>
                    <div className="text-slate-600">{log.detalle}</div>
                    <div className="text-[11px] text-indigo-600 font-medium pt-0.5">Por: {log.usuario}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  )}

  {/* REVISIÓN ANTES DE ENVIAR */}
  {modalRevision && (() => {
    const items = revisarPresupuesto(datosActivos);
    const errores = items.filter(i => !i.ok && i.tipo === 'error');
    const necesitaAprobacion = items.some(i => !i.ok && i.tipo === 'aprobacion');
    const pendiente = datosActivos.aprobacion?.estado === 'pendiente';
    return (
      <Modal
        title="Revisión antes de enviar"
        subtitle={`${datosActivos.codigoVersion} · ${datosActivos.cliente || 'sin empresa'}`}
        onClose={() => setModalRevision(false)}
        footer={
          <div className="flex flex-1 items-center justify-between gap-2">
            <Button icon={Eye} onClick={() => { setModalRevision(false); setModalPropuesta(true); }}>Vista previa</Button>
            <div className="flex items-center gap-2">
              <Button onClick={() => setModalRevision(false)}>Cancelar</Button>
              {errores.length > 0 ? (
                <Button variant="primary" onClick={() => { setPestanaActiva(errores[0].pestana); setModalRevision(false); }}>Ir a corregir</Button>
              ) : necesitaAprobacion ? (
                <Button variant="primary" icon={Send} disabled={pendiente} onClick={solicitarAprobacion}>
                  {pendiente ? 'Aprobación ya solicitada' : 'Pedir aprobación a dirección'}
                </Button>
              ) : (
                <Button variant="primary" icon={Send} onClick={enviarAlCliente}>Enviar al cliente</Button>
              )}
            </div>
          </div>
        }
      >
        <ul className="space-y-1.5 text-xs">
          {items.map(i => (
            <li key={i.texto} className="flex items-start gap-2">
              {i.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : i.tipo === 'error' ? <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
              <span className={i.ok ? 'text-slate-600' : 'text-slate-900'}>{i.texto}</span>
              {!i.ok && (
                <button type="button" onClick={() => { setPestanaActiva(i.pestana); setModalRevision(false); }} className="ml-auto shrink-0 text-[11px] font-medium text-indigo-600 hover:underline">Corregir</button>
              )}
            </li>
          ))}
        </ul>
        {errores.length === 0 && necesitaAprobacion && (
          <div className="mt-4">
            <Notice tone="warning" icon={AlertTriangle}>
              Hay puestos con un margen por debajo del {MARGEN_MINIMO} %. Puedes subir la tarifa o pedir la aprobación de dirección;
              en cuanto lo apruebe, podrás enviarlo.
            </Notice>
          </div>
        )}
        {errores.length === 0 && !necesitaAprobacion && (
          <div className="mt-4">
            <Notice tone="success" icon={CheckCircle2}>
              Todo correcto. Se enviará la propuesta a <strong>{datosActivos.emailContacto}</strong> y el presupuesto quedará cerrado:
              para cambiarlo habrá que crear una versión nueva.
            </Notice>
          </div>
        )}
      </Modal>
    );
  })()}

  {/* VISTA PREVIA DE LA PROPUESTA */}
  {modalPropuesta && (
    <Modal
      title="Vista previa de la propuesta"
      subtitle="Así la recibe el cliente: salario y tarifa de cada puesto, conceptos extra marcados y condiciones. Nada interno."
      onClose={() => setModalPropuesta(false)}
      size="max-w-4xl"
      footer={
        <>
          <Button icon={Download} onClick={() => mostrarToast('Descargando la propuesta en PDF...', 'info')}>Descargar PDF</Button>
          <Button variant="primary" onClick={() => setModalPropuesta(false)}>Cerrar</Button>
        </>
      }
    >
      <VistaPropuesta datos={datosActivos} />
    </Modal>
  )}

  {/* ACEPTADO: confirmar y ofrecer crear la petición */}
  {modalAceptar && (
    <Modal
      title={`¿Marcar ${modalAceptar.id} como aceptado?`}
      onClose={() => setModalAceptar(null)}
      size="max-w-md"
      footer={
        <>
          <Button onClick={() => setModalAceptar(null)}>Cancelar</Button>
          <Button onClick={() => { aplicarEstado(modalAceptar.id, 'Firmado / Aceptado'); setModalAceptar(null); }}>Solo marcar</Button>
          <Button
            variant="primary"
            icon={ArrowUpRight}
            onClick={() => {
              aplicarEstado(modalAceptar.id, 'Firmado / Aceptado');
              const esActual = modalAceptar.id === presupuesto.id;
              setModalAceptar(null);
              if (esActual) abrirCrearPeticiones();
              else { mostrarToast('Aceptado. Abriendo Peticiones para crear las peticiones...', 'exito'); setTimeout(() => { window.location.hash = '#/peticiones'; }, 900); }
            }}
          >
            Aceptar y crear peticiones
          </Button>
        </>
      }
    >
      <p className="text-xs text-slate-600">El presupuesto queda cerrado. Puedes crear ahora las peticiones (una por puesto) con sus tarifas y conceptos extra, sin volver a escribirlos.</p>
    </Modal>
  )}

  {/* RECHAZADO: motivo obligatorio */}
  {modalRechazo && (
    <Modal
      title={`¿Por qué se ha rechazado ${modalRechazo.id}?`}
      subtitle="El motivo sirve para ver por qué se pierden presupuestos."
      onClose={() => setModalRechazo(null)}
      size="max-w-md"
      footer={
        <>
          <Button onClick={() => setModalRechazo(null)}>Cancelar</Button>
          <Button
            variant="danger"
            icon={X}
            disabled={!modalRechazo.motivo}
            onClick={() => {
              aplicarEstado(modalRechazo.id, 'Rechazado', { motivoRechazo: modalRechazo.motivo, notasRechazo: modalRechazo.notas || '' });
              setModalRechazo(null);
            }}
          >
            Marcar como rechazado
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Motivo *</label>
          <SelectConAlta
            value={modalRechazo.motivo || ''}
            onChange={(v) => setModalRechazo(prev => ({ ...prev, motivo: v }))}
            options={motivosRechazo}
            onAdd={(v) => setMotivosRechazo(prev => [...prev, v])}
            placeholder="Elige el motivo"
            nuevoPlaceholder="Nuevo motivo"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Notas (opcional)</label>
          <input type="text" value={modalRechazo.notas || ''} onChange={(e) => setModalRechazo(prev => ({ ...prev, notas: e.target.value }))} placeholder="Ej. la competencia ofreció 1 €/h menos" className={`${CAMPO} w-full`} />
        </div>
      </div>
    </Modal>
  )}

  {/* CREAR PETICIONES DESDE EL PRESUPUESTO ACEPTADO: una por puesto, o varias si se divide */}
  {modalPeticion && (
    <Modal
      title="Crear peticiones"
      subtitle={`Desde ${datosActivos.codigoVersion} · ${datosActivos.cliente}`}
      onClose={() => setModalPeticion(false)}
      size="max-w-3xl"
      footer={
        <>
          <Button onClick={() => setModalPeticion(false)}>Cancelar</Button>
          <Button variant="primary" icon={ArrowUpRight} disabled={!inicioPeticion || repartoPeticiones.some(r => !(r.plazas > 0))} onClick={crearPeticion}>
            Crear {repartoPeticiones.length} {repartoPeticiones.length === 1 ? 'petición' : 'peticiones'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-600">
          Cada petición es <strong className="font-medium text-slate-800">un solo puesto</strong>. Si un puesto necesita varios turnos o fechas, divídelo en varias peticiones.
          Todas heredan la empresa, el contacto y, del puesto, el convenio, la categoría, el salario, la tarifa y todos los conceptos extra (también los que no se imprimieron), para poder facturarlos.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-slate-500 border-b border-slate-200">
                <th className="py-1.5 text-left font-medium">Puesto</th>
                <th className="py-1.5 text-left font-medium">Turno</th>
                <th className="py-1.5 text-right font-medium">Plazas</th>
                <th className="py-1.5 text-right font-medium">Tarifa</th>
                <th className="py-1.5" aria-label="Acciones"></th>
              </tr>
            </thead>
            <tbody>
              {calculosPosiciones.map(({ pos, eco }) => {
                const filas = repartoPeticiones.filter(r => r.posId === pos.id);
                const personas = Number(pos.personas) || 1;
                const repartidas = filas.reduce((s, r) => s + (Number(r.plazas) || 0), 0);
                return (
                  <React.Fragment key={pos.id}>
                    {filas.map((r, i) => (
                      <tr key={r.fila} className={i === filas.length - 1 && repartidas === personas ? 'border-b border-slate-100' : ''}>
                        <td className="py-1.5 pr-2 text-slate-800">
                          {i === 0 ? (
                            <>{pos.nombre}<div className="text-[11px] text-slate-500">{personas} personas en el presupuesto · {eco.extras.length} conceptos extra</div></>
                          ) : (
                            <span className="pl-3 text-slate-500">↳ otra petición del mismo puesto</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          <Select value={r.turno} onChange={(e) => setRepartoPeticiones(prev => prev.map(x => (x.fila === r.fila ? { ...x, turno: e.target.value } : x)))} aria-label="Turno">
                            {TURNOS_PETICION.map(tn => <option key={tn} value={tn}>{tn}</option>)}
                          </Select>
                        </td>
                        <td className="py-1.5 text-right">
                          <input type="number" min="1" value={r.plazas} onChange={(e) => setRepartoPeticiones(prev => prev.map(x => (x.fila === r.fila ? { ...x, plazas: parseInt(e.target.value) || 0 } : x)))} className={`${CAMPO} w-16 text-right`} aria-label="Plazas" />
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">{euros(eco.tarifaPVP)}</td>
                        <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                          {i === 0 ? (
                            <Button size="sm" variant="ghost" icon={Plus} onClick={() => dividirPuesto(r.fila)}>Dividir</Button>
                          ) : (
                            <IconButton icon={X} title="Quitar esta petición" onClick={() => setRepartoPeticiones(prev => prev.filter(x => x.fila !== r.fila))} />
                          )}
                        </td>
                      </tr>
                    ))}
                    {repartidas !== personas && (
                      <tr className="border-b border-slate-100">
                        <td colSpan={5} className="pb-2 text-[11px] text-amber-700">
                          Las plazas ({repartidas}) no coinciden con las personas del presupuesto ({personas}). Se puede crear igualmente.
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="max-w-xs">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Inicio previsto</label>
          <input type="date" value={inicioPeticion} onChange={(e) => setInicioPeticion(e.target.value)} className={`${CAMPO} w-full`} />
        </div>
      </div>
    </Modal>
  )}

  {/* COMPARAR VERSIONES */}
  {versionAComparar && (
    <Modal
      title="Comparar versiones"
      subtitle="En amarillo, lo que ha cambiado."
      onClose={() => setVersionAComparar(null)}
      size="max-w-2xl"
      footer={<Button variant="primary" onClick={() => setVersionAComparar(null)}>Cerrar</Button>}
    >
      <ComparacionVersiones anterior={versionAComparar.datos} actual={datosActivos} />
    </Modal>
  )}

  {docABorrar && (
    <Confirmar
      title="¿Eliminar este documento?"
      onClose={() => setDocABorrar(null)}
      onConfirm={() => {
        setDocsPresupuesto(prev => prev.filter(x => x !== docABorrar.id));
        mostrarToast(`${docABorrar.nombre} eliminado. Puedes volver a generarlo cuando quieras.`, 'info');
        setDocABorrar(null);
      }}
    >
      <p>Se borrará <strong className="text-slate-800">{docABorrar.nombre}</strong>. El presupuesto no cambia: podrás generar el documento de nuevo con los datos actuales.</p>
    </Confirmar>
  )}

  {/* ==========================================
      DRAWER LATERAL: EDICIÓN / ALTA DE POSICIÓN
     ========================================== */}
  {drawerPosicionAbierto && posicionEnEdicion && (
    <Drawer
      title={formularioPresupuesto.posiciones.some(p => p.id === posicionEnEdicion.id) ? 'Editar posición' : 'Añadir posición'}
      subtitle={'Convenio, categoría y cálculo de tarifas'}
      onClose={() => setDrawerPosicionAbierto(false)}
      width="max-w-xl"
      footer={<>
          <button
            onClick={() => setDrawerPosicionAbierto(false)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleGuardarPosicion(posicionEnEdicion)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar posición
          </button>
      </>}
    >

        {/* Formulario en scroll */}
        <div className="space-y-5 text-xs">
          
          {/* Nombre y Perfil */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">Nombre del puesto / perfil ETT *</label>
            <input
              type="text"
              value={posicionEnEdicion.nombre}
              onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Operario/a de Almacén, Carretillero/a..."
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Convenio: parte del de la empresa; se puede cambiar o dar de alta */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">Convenio colectivo de aplicación *</label>
            <SelectConAlta
              value={etiquetaConvenio(posicionEnEdicion.convenio, posicionEnEdicion.convenioCustom)}
              onChange={(label) => {
                const c = CATALOGOS.convenios.find(x => x.label === label);
                setPosicionEnEdicion(prev => ({ ...prev, convenio: c ? c.id : 'otro', convenioCustom: c ? '' : label }));
              }}
              options={[...CATALOGOS.convenios.filter(c => c.id !== 'otro').map(c => c.label), ...conveniosExtra]}
              onAdd={(label) => setConveniosExtra(prev => [...prev, label])}
              placeholder="Selecciona el convenio"
              nuevoPlaceholder="Nombre del convenio (ámbito y sector)"
            />
            {formularioPresupuesto.convenioEmpresa && (
              <p className="text-[11px] text-slate-500">
                {posicionEnEdicion.convenio === formularioPresupuesto.convenioEmpresa
                  ? 'Cargado del convenio de la actividad de la empresa. Se valida con la categoría y el nivel.'
                  : `Distinto del de la empresa (${etiquetaConvenio(formularioPresupuesto.convenioEmpresa)}).`}
              </p>
            )}
          </div>

          {/* Categoría profesional y Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 block">Categoría profesional</label>
              <select
                value={posicionEnEdicion.categoria}
                onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
              >
                {(CATALOGOS.categorias[posicionEnEdicion.convenio] || CATALOGOS.categorias.default).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>

              {posicionEnEdicion.categoria === 'otro' && (
                <input
                  type="text"
                  value={posicionEnEdicion.categoriaCustom}
                  onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, categoriaCustom: e.target.value }))}
                  placeholder="Categoría personalizada..."
                  className="w-full text-xs border border-amber-300 rounded-lg px-2.5 py-1.5 mt-1"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 block">Grupo / Nivel</label>
              <select
                value={posicionEnEdicion.grupoNivel}
                onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, grupoNivel: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
              >
                {CATALOGOS.gruposNivel.map(g => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>

              {posicionEnEdicion.grupoNivel === 'otro' && (
                <input
                  type="text"
                  value={posicionEnEdicion.grupoNivelCustom}
                  onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, grupoNivelCustom: e.target.value }))}
                  placeholder="Grupo/Nivel personalizado..."
                  className="w-full text-xs border border-amber-300 rounded-lg px-2.5 py-1.5 mt-1"
                />
              )}
            </div>
          </div>

          {/* Parámetros Salariales */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs">Parámetros retributivos de convenio</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Salario base anual (€)</label>
                <input
                  type="number"
                  step="50"
                  value={posicionEnEdicion.salarioBaseAnual}
                  onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, salarioBaseAnual: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Plus convenio / mes (€)</label>
                <input
                  type="number"
                  step="10"
                  value={posicionEnEdicion.plusConvenioMes}
                  onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, plusConvenioMes: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Pagas Anuales</label>
                <input
                  type="number"
                  value={posicionEnEdicion.pagasAnuales}
                  onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, pagasAnuales: parseInt(e.target.value) || 12 }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Horas Anuales</label>
                <input
                  type="number"
                  value={posicionEnEdicion.horasAnuales}
                  onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, horasAnuales: parseInt(e.target.value) || 1784 }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Horas / Día</label>
                <input
                  type="number"
                  value={posicionEnEdicion.horasDiaCalculo}
                  onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, horasDiaCalculo: parseFloat(e.target.value) || 8 }))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Costes internos de este puesto */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-slate-900 text-xs">Costes internos de este puesto</h4>
            <p className="text-[11px] text-slate-500">Desmarca lo que este puesto no necesita o cambia su valor (vacío = el del presupuesto). El cliente no ve este desglose.</p>
            <ConceptosPuesto
              conceptos={formularioPresupuesto.conceptosEscandallo}
              pos={posicionEnEdicion}
              onCambiar={(conceptoId, cambio) => setPosicionEnEdicion(prev => ({
                ...prev,
                conceptos: { ...(prev.conceptos || {}), [conceptoId]: { aplica: true, valor: '', ...(prev.conceptos?.[conceptoId] || {}), ...cambio } },
              }))}
            />
          </div>

          {/* Tarifa: margen objetivo, tarifa sugerida y desglose */}
          {(() => {
            const ecoSim = calcularEconomiaPosicion(posicionEnEdicion, formularioPresupuesto.conceptosEscandallo, formularioPresupuesto.margenObjetivo);
            return (
              <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-semibold text-slate-900 text-xs">Tarifa del puesto</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Personas</label>
                    <input type="number" min="1" value={posicionEnEdicion.personas ?? 1} onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, personas: parseInt(e.target.value) || 1 }))} className={`${CAMPO} w-full`} />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Horas por persona (todo el servicio)</label>
                    <input type="number" step="8" value={posicionEnEdicion.horasPersona ?? ''} placeholder="Ej. 480" onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, horasPersona: parseFloat(e.target.value) || 0 }))} className={`${CAMPO} w-full`} />
                  </div>
                </div>
                {ecoSim.horasTotales > 0 && ecoSim.tarifaPVP > 0 && (
                  <p className="text-[11px] text-slate-600">
                    {ecoSim.personas} × {horasFmt(ecoSim.horasPersona)} h = {horasFmt(ecoSim.horasTotales)} h · facturación <strong className="text-slate-900">{eurosTotal(ecoSim.facturacionTotal)}</strong>
                    {rolUsuario === 'direccion' && <> · margen <strong className={ecoSim.margenServicio < 0 ? 'text-rose-600' : 'text-emerald-700'}>{eurosTotal(ecoSim.margenServicio)}</strong></>}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Margen objetivo (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={posicionEnEdicion.margenObjetivo ?? ''}
                      placeholder={String(formularioPresupuesto.margenObjetivo ?? 18)}
                      onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, margenObjetivo: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                      className={`${CAMPO} w-full`}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Vacío: el del presupuesto.</p>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Tarifa hora al cliente (€/h) *</label>
                    <input
                      type="number"
                      step="0.05"
                      value={posicionEnEdicion.tarifaHoraOfertada || ''}
                      onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, tarifaHoraOfertada: parseFloat(e.target.value) || 0 }))}
                      className={`${CAMPO} w-full font-semibold`}
                    />
                    <button
                      type="button"
                      onClick={() => setPosicionEnEdicion(prev => ({ ...prev, tarifaHoraOfertada: Math.round(ecoSim.tarifaSugerida * 100) / 100 }))}
                      className="mt-1 text-[11px] font-medium text-indigo-600 hover:underline"
                    >
                      Usar la sugerida: {ecoSim.tarifaSugerida.toFixed(2).replace('.', ',')} €/h
                    </button>
                  </div>
                </div>
                <DesgloseTarifa eco={ecoSim} rol={rolUsuario} />
                <div className="space-y-1.5">
                  <h5 className="text-xs font-semibold text-slate-900">Conceptos extra de este puesto</h5>
                  <p className="text-[11px] text-slate-500">Siempre quedan en la oferta para poder facturarlos. Desmarca "En la propuesta" si no quieres imprimirlos.</p>
                  <TablaExtras
                    extras={ecoSim.extras}
                    editable
                    onChange={(lista) => setPosicionEnEdicion(prev => ({ ...prev, extras: lista.map(({ salarioHora, tarifaHora, coefTarifaAplicado, ...x }) => x) }))}
                  />
                </div>
              </div>
            );
          })()}

          {/* Descripción de Tareas */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">Descripción operativa de funciones</label>
            <textarea
              rows={2}
              value={posicionEnEdicion.descripcionTareas}
              onChange={(e) => setPosicionEnEdicion(prev => ({ ...prev, descripcionTareas: e.target.value }))}
              placeholder="Funciones principales requeridas por el cliente..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
            />
          </div>

        </div>

        {/* Pie del Drawer */}
    </Drawer>
  )}

  {/* ==========================================
      DRAWER LATERAL: EDICIÓN / ALTA DE CONCEPTO
     ========================================== */}
  {drawerConceptoAbierto && conceptoEnEdicion && (
    <Drawer
      title={formularioPresupuesto.conceptosEscandallo.some(c => c.id === conceptoEnEdicion.id) ? 'Editar concepto' : 'Añadir concepto al escandallo'}
      subtitle={'Coste, provisión o dotación'}
      onClose={() => setDrawerConceptoAbierto(false)}
      width="max-w-lg"
      footer={<>
          <button
            onClick={() => setDrawerConceptoAbierto(false)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleGuardarConcepto(conceptoEnEdicion)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar concepto
          </button>
      </>}
    >

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">Nombre del Concepto *</label>
            <input
              type="text"
              value={conceptoEnEdicion.nombre}
              disabled={conceptoEnEdicion.esObligatorioLegal}
              onChange={(e) => setConceptoEnEdicion(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Plus Turnicidad, Provisión Vestuario..."
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-medium disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 block">Tipo de Aplicación</label>
              <select
                value={conceptoEnEdicion.tipo}
                disabled={conceptoEnEdicion.esObligatorioLegal}
                onChange={(e) => setConceptoEnEdicion(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
              >
                {CATALOGOS.tiposConcepto.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 block">Valor Numérico *</label>
              <input
                type="number"
                step="0.01"
                value={conceptoEnEdicion.valor}
                onChange={(e) => setConceptoEnEdicion(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-semibold text-indigo-700 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">Base de Cálculo</label>
            <select
              value={conceptoEnEdicion.baseCalculo}
              disabled={conceptoEnEdicion.esObligatorioLegal}
              onChange={(e) => setConceptoEnEdicion(prev => ({ ...prev, baseCalculo: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
            >
              {CATALOGOS.basesCalculo.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">Descripción / justificación técnica</label>
            <textarea
              rows={3}
              value={conceptoEnEdicion.descripcion}
              onChange={(e) => setConceptoEnEdicion(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Explica el origen normativo o la causa del coste..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          {conceptoEnEdicion.esObligatorioLegal && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Este concepto es legalmente preceptivo para la contratación vía ETT y solo permite ajustar el coeficiente según la tarifa aplicable de la TGSS.</span>
            </div>
          )}

        </div>

        {/* Pie */}
    </Drawer>
  )}

  {/* ==========================================
      MODAL: RESUMEN DE CAMBIOS (DIFF MODAL ANTES DE GUARDAR)
     ========================================== */}
  {modalResumenCambiosAbierto && (
    <Modal
      title={'Resumen de cambios'}
      subtitle={'Quedarán registrados en la auditoría.'}
      onClose={() => setModalResumenCambiosAbierto(false)}
      size="max-w-2xl"
      footer={<>
      <div className="flex flex-1 items-center justify-between gap-2">
          <button
            onClick={() => handleConfirmarGuardar(true)}
            className="px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
          >
            Guardar como Borrador Provisional
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalResumenCambiosAbierto(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
            >
              Seguir Editando
            </button>
            <button
              onClick={() => handleConfirmarGuardar(false)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Confirmar y aplicar cambios
            </button>
          </div>
      </div>
      </>}
    >

        {/* Contenido Diff */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
          {cambiosPendientes.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No se han detectado modificaciones en los campos principales.</p>
              <p className="text-[11px] text-slate-400">Puedes guardar para refrescar la fecha de revisión técnica.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <th className="px-4 py-2.5">Campo / Sección</th>
                    <th className="px-4 py-2.5 text-rose-700">Valor Anterior</th>
                    <th className="px-4 py-2.5 text-emerald-700">Nuevo Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {cambiosPendientes.map((diff, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{diff.campo}</td>
                      <td className="px-4 py-2.5 text-slate-500 bg-rose-50/30 line-through">{diff.anterior}</td>
                      <td className="px-4 py-2.5 font-semibold text-emerald-700 bg-emerald-50/30">{diff.nuevo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <strong>Auditoría ETT:</strong> Al confirmar, se generará una entrada con tu usuario (<span className="text-indigo-600 font-medium">{rolUsuario === 'direccion' ? 'Dirección' : 'Elena Navarro'}</span>) y marca de tiempo exacta.
          </div>
        </div>

        {/* Pie */}
    </Modal>
  )}

  {/* ==========================================
      MODAL: CONFIRMAR ELIMINACIÓN DE POSICIÓN
     ========================================== */}
  {modalConfirmarEliminarPosicion && (
    <Modal
      title={'¿Eliminar esta posición?'}
      onClose={() => setModalConfirmarEliminarPosicion(null)}
      size="max-w-md"
      footer={<>
          <button
            onClick={() => setModalConfirmarEliminarPosicion(null)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarEliminacionPosicion}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow"
          >
            Eliminar Posición
          </button>
      </>}
    >
      <p className="text-xs text-slate-600">Se borrarán el puesto y todos sus cálculos salariales de este presupuesto.</p>
    </Modal>
  )}

  {/* ==========================================
      MODAL: CREAR NUEVA VERSIÓN EDITABLE
     ========================================== */}
  {modalNuevaVersionAbierto && (
    <Modal
      title={`¿Crear la versión ${presupuesto.versionNumero + 1}?`}
      onClose={() => setModalNuevaVersionAbierto(false)}
      footer={<>
          <button
            onClick={() => setModalNuevaVersionAbierto(false)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            Volver sin crear
          </button>
          <button
            onClick={handleCrearNuevaVersion}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow flex items-center gap-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Crear y Editar v{presupuesto.versionNumero + 1}
          </button>
      </>}
    >
      <div className="space-y-2 text-xs text-slate-600">
        <p>El presupuesto actual (<span className="font-mono">{presupuesto.codigoVersion}</span>) se queda en el historial tal como está.</p>
        <p>Se abrirá una copia en <strong>Borrador</strong> para cambiar tarifas, convenios o puestos.</p>
      </div>
    </Modal>
  )}

</div>
      );
    }

    // ==========================================
    // DESGLOSE DE LA TARIFA DE UN PUESTO
    // Dirección ve cómo se llega a la tarifa (todo interno). El cliente solo ve salario y tarifa.
    // ==========================================
    const euros = (n) => `${Number(n || 0).toFixed(2).replace('.', ',')} €/h`;
    const pct = (n) => `${Number(n || 0).toFixed(1).replace('.', ',')} %`;

    function DesgloseTarifa({ eco, rol, compacto = false }) {
      const t = eco.tarifaPVP || 0;
      const ancho = (v) => (t > 0 ? `${Math.max(0, (v / t) * 100)}%` : '0%');
      const filas = [
        { id: 'salario', nombre: 'Salario bruto', valor: eco.salarioBrutoHora, color: 'bg-indigo-500' },
        ...eco.desgloseConceptos.map(c => ({ id: c.id, nombre: c.propio ? `${c.nombre} (propio del puesto)` : c.nombre, valor: c.importeHora, color: c.esLegal ? 'bg-amber-500' : 'bg-amber-300', interno: true })),
      ];
      const margenNegativo = eco.margenEuroHora < 0;

      return (
        <div className="space-y-3">
          {rol === 'direccion' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Cómo se llega a la tarifa</span>
                <span className="inline-flex items-center gap-1"><EyeOff className="w-3 h-3" /> Interno: el cliente no lo ve</span>
              </div>
              {/* Barra: salario + costes internos + margen = tarifa */}
              <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100" title={`Tarifa ${euros(t)}`}>
                {filas.map(f => (
                  <div key={f.id} className={`${f.color} first:rounded-l-full`} style={{ width: ancho(f.valor) }} title={`${f.nombre}: ${euros(f.valor)}`} />
                ))}
                {!margenNegativo && <div className="bg-emerald-500 rounded-r-full" style={{ width: ancho(eco.margenEuroHora) }} title={`Margen: ${euros(eco.margenEuroHora)}`} />}
              </div>
              {!compacto && (
                <table className="w-full text-xs">
                  <tbody>
                    {filas.map(f => (
                      <tr key={f.id}>
                        <td className="py-0.5 pr-2">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <span className={`w-2 h-2 rounded-sm ${f.color}`} />
                            {f.nombre}
                          </span>
                        </td>
                        <td className="py-0.5 text-right text-slate-800 whitespace-nowrap">{euros(f.valor)}</td>
                        <td className="py-0.5 pl-2 text-right text-[11px] text-slate-400 w-14">{t > 0 ? pct((f.valor / t) * 100) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-100">
                      <td className="pt-1.5 pr-2 font-medium text-slate-700">Coste total ETT</td>
                      <td className="pt-1.5 text-right font-medium text-slate-900 whitespace-nowrap">{euros(eco.costeTotalEmpresaHora)}</td>
                      <td />
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <span className={`w-2 h-2 rounded-sm ${margenNegativo ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          Margen ETT
                        </span>
                      </td>
                      <td className={`py-0.5 text-right font-medium whitespace-nowrap ${margenNegativo ? 'text-rose-600' : 'text-emerald-700'}`}>{euros(eco.margenEuroHora)}</td>
                      <td className={`py-0.5 pl-2 text-right text-[11px] ${margenNegativo ? 'text-rose-600' : 'text-emerald-700'}`}>{pct(eco.margenPorcentaje)}</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="pt-1.5 pr-2 font-semibold text-slate-900">Tarifa al cliente</td>
                      <td className="pt-1.5 text-right font-semibold text-slate-900 whitespace-nowrap">{euros(t)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )}
              {margenNegativo && <Notice tone="danger" icon={AlertTriangle}>La tarifa no cubre el coste: se pierde dinero en este puesto.</Notice>}
              {!margenNegativo && eco.tarifaSugerida > 0 && Math.abs(eco.tarifaSugerida - t) >= 0.01 && (
                <p className="text-[11px] text-slate-500">
                  Con el margen objetivo ({pct(eco.margenObjetivo)}) la tarifa sería <strong className="text-slate-700">{euros(eco.tarifaSugerida)}</strong>.
                </p>
              )}
            </div>
          )}

          {/* Lo que aparece en la propuesta */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> En la propuesta al cliente</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <span className="text-slate-600">Salario <strong className="text-slate-900">{euros(eco.salarioBrutoHora)}</strong></span>
              <span className="text-slate-600">Tarifa <strong className="text-slate-900">{euros(t)}</strong></span>
            </div>
            <TablaExtras extras={eco.extras} />
          </div>
        </div>
      );
    }

    // Conceptos extra (horas extra, nocturnas...). Editable en el panel del puesto; solo lectura en la tarjeta.
    function TablaExtras({ extras, editable = false, onChange }) {
      if (!extras || extras.length === 0) return null;
      const cambiar = (id, campo, valor) => onChange(extras.map(x => (x.id === id ? { ...x, [campo]: valor } : x)));
      const celda = 'h-7 w-16 bg-white border border-slate-200 rounded-md px-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';
      return (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[11px] text-slate-500">
              <th className="py-1 text-left font-medium">Concepto extra</th>
              {editable && <th className="py-1 text-right font-medium">Coef. salario</th>}
              <th className="py-1 text-right font-medium">Salario</th>
              {editable && <th className="py-1 text-right font-medium">Coef. tarifa</th>}
              <th className="py-1 text-right font-medium">Tarifa</th>
              <th className="py-1 text-right font-medium">En la propuesta</th>
            </tr>
          </thead>
          <tbody>
            {extras.map(x => (
              <tr key={x.id} className="border-t border-slate-100">
                <td className="py-1 text-slate-700">{x.concepto}</td>
                {editable && (
                  <td className="py-1 text-right">
                    <input type="number" step="0.05" value={x.coefSalario} onChange={(e) => cambiar(x.id, 'coefSalario', e.target.value)} className={celda} aria-label={`Coeficiente de salario de ${x.concepto}`} />
                  </td>
                )}
                <td className="py-1 text-right text-slate-800 whitespace-nowrap">{x.salarioHora != null ? euros(x.salarioHora) : `×${x.coefSalario}`}</td>
                {editable && (
                  <td className="py-1 text-right">
                    <input type="number" step="0.01" value={x.coefTarifa} placeholder={x.coefTarifaAplicado ? x.coefTarifaAplicado.toFixed(2) : 'auto'} onChange={(e) => cambiar(x.id, 'coefTarifa', e.target.value)} className={celda} aria-label={`Coeficiente de tarifa de ${x.concepto}`} />
                  </td>
                )}
                <td className="py-1 text-right font-medium text-slate-900 whitespace-nowrap">{x.tarifaHora != null ? euros(x.tarifaHora) : '—'}</td>
                <td className="py-1 text-right">
                  {editable ? (
                    <input type="checkbox" checked={x.mostrar} onChange={(e) => cambiar(x.id, 'mostrar', e.target.checked)} className="accent-indigo-600" aria-label={`Mostrar ${x.concepto} en la propuesta`} />
                  ) : x.mostrar ? (
                    <span className="text-slate-600">Sí</span>
                  ) : (
                    <span className="text-slate-400" title="Está en la oferta y se podrá facturar, pero no se imprime en la propuesta">No se imprime</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // ==========================================
    // PESTAÑA EMPRESA: buscador inteligente que rellena los datos del cliente
    // ==========================================
    const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    function PestanaEmpresa({ datos, editable, onCambiar, onEditar }) {
      const [busqueda, setBusqueda] = useState('');
      const [abierto, setAbierto] = useState(false);
      const empresa = EMPRESAS_CLIENTE.find(e => e.id === datos.empresaId);
      const sugerencias = busqueda.trim().length < 2 ? [] : EMPRESAS_CLIENTE.filter(e => sinAcentos(`${e.nombre} ${e.cif} ${e.sector}`).includes(sinAcentos(busqueda.trim())));

      const elegir = (e) => {
        const c = e.contactos[0];
        onCambiar({
          empresaId: e.id, cliente: e.nombre, cif: e.cif, sector: e.sector, ciudad: e.ciudad, convenioEmpresa: e.convenio,
          contacto: c ? `${c.nombre} (${c.cargo})` : '', emailContacto: c?.email || '', telefonoContacto: c?.telefono || '',
          comercial: datos.comercial || e.comercial,
        });
        setBusqueda('');
        setAbierto(false);
      };

      const fila = (k, v) => (
        <div>
          <dt className="text-[11px] text-slate-500">{k}</dt>
          <dd className="text-xs text-slate-800">{v || <span className="text-slate-400">—</span>}</dd>
        </div>
      );

      return (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Empresa, contacto y comercial</h3>
              <p className="text-xs text-slate-500">Busca la empresa y se rellenan sus datos, su contacto y el convenio de su actividad.</p>
            </div>
            {!editable && <Button icon={Edit3} onClick={onEditar}>Editar</Button>}
          </div>

          {editable && (
            <div className="relative max-w-2xl">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">{empresa ? 'Cambiar de empresa' : 'Empresa cliente *'}</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  autoFocus={!empresa}
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
                  onFocus={() => setAbierto(true)}
                  onBlur={() => setTimeout(() => setAbierto(false), 150)}
                  placeholder="Escribe el nombre, el CIF o el sector de la empresa..."
                  className={`${CAMPO} w-full pl-8`}
                />
              </div>
              {abierto && busqueda.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden text-xs">
                  {sugerencias.length === 0 ? (
                    <div className="px-3 py-3 text-slate-500 flex items-center justify-between gap-2">
                      <span>No hay ninguna empresa con «{busqueda}».</span>
                      <a href="#/empresas" className="font-medium text-indigo-600 hover:underline">Dar de alta en Empresas</a>
                    </div>
                  ) : (
                    sugerencias.map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => elegir(e)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-indigo-50"
                      >
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 truncate">{e.nombre}</div>
                          <div className="text-[11px] text-slate-500">{e.cif} · {e.sector} · {e.ciudad}</div>
                        </div>
                        <span className="text-[11px] text-slate-400">{e.contactos.length} contactos</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {!datos.cliente ? (
            <EmptyState icon={Building2} title="Aún no hay empresa" text={editable ? 'Busca la empresa arriba para empezar el presupuesto.' : 'Pulsa Editar para elegir la empresa.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-400" /> Empresa</div>
                <dl className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">{fila('Razón social', datos.cliente)}</div>
                  {fila('CIF', datos.cif)}
                  {fila('Sector', datos.sector)}
                  <div className="col-span-2">{fila('Ubicación', datos.ciudad)}</div>
                  <div className="col-span-2">{fila('Convenio de su actividad', etiquetaConvenio(datos.convenioEmpresa))}</div>
                </dl>
                <p className="text-[11px] text-slate-400">Cada puesto parte de este convenio y se valida con su categoría y nivel.</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> Contacto</div>
                {editable && empresa && empresa.contactos.length > 0 ? (
                  <Select
                    className="w-full"
                    value={empresa.contactos.find(c => datos.contacto.startsWith(c.nombre))?.nombre || ''}
                    onChange={(e) => {
                      const c = empresa.contactos.find(x => x.nombre === e.target.value);
                      if (c) onCambiar({ contacto: `${c.nombre} (${c.cargo})`, emailContacto: c.email, telefonoContacto: c.telefono });
                    }}
                  >
                    <option value="">Elige un contacto</option>
                    {empresa.contactos.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre} · {c.cargo}</option>)}
                  </Select>
                ) : editable ? (
                  <Notice tone="warning" icon={AlertTriangle}>Esta empresa no tiene contactos. Añádelo en Empresas o escríbelo aquí.</Notice>
                ) : null}
                {editable && (!empresa || empresa.contactos.length === 0) && (
                  <input type="text" value={datos.contacto} onChange={(e) => onCambiar({ contacto: e.target.value })} placeholder="Nombre y cargo" className={`${CAMPO} w-full`} />
                )}
                <dl className="space-y-2">
                  {fila('Persona', datos.contacto)}
                  {fila('Email', datos.emailContacto)}
                  {fila('Teléfono', datos.telefonoContacto)}
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" /> Gestión comercial ETT</div>
                {editable ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Comercial responsable *</label>
                      <Select className="w-full" value={datos.comercial} onChange={(e) => onCambiar({ comercial: e.target.value })}>
                        <option value="">Elige el comercial</option>
                        {COMERCIALES.map(c => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Emisión</label>
                        <input type="date" value={datos.fechaEmision} onChange={(e) => onCambiar({ fechaEmision: e.target.value })} className={`${CAMPO} w-full`} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Válido hasta *</label>
                        <input type="date" value={datos.fechaValidez} onChange={(e) => onCambiar({ fechaValidez: e.target.value })} className={`${CAMPO} w-full`} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <dl className="space-y-2">
                    {fila('Comercial', datos.comercial)}
                    {fila('Emisión', datos.fechaEmision)}
                    {fila('Válido hasta', datos.fechaValidez)}
                  </dl>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ==========================================
    // PIPELINE: presupuestos por estado (se pueden arrastrar entre columnas)
    // ==========================================
    const ESTADOS_PIPELINE = [
      { estado: 'Borrador', tono: 'neutral' },
      { estado: 'En preparación', tono: 'warning' },
      { estado: 'Enviado a Cliente', tono: 'info', texto: 'Enviado' },
      { estado: 'Pendiente de Firma', tono: 'info', texto: 'Pendiente de firma' },
      { estado: 'Firmado / Aceptado', tono: 'success', texto: 'Aceptado' },
      { estado: 'Rechazado', tono: 'danger' },
    ];

    function PipelinePresupuestos({ lista, onAbrir, onMover }) {
      const [sobre, setSobre] = useState(null);
      return (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ESTADOS_PIPELINE.map(col => {
            const items = lista.filter(p => p.estado === col.estado);
            return (
              <div
                key={col.estado}
                onDragOver={(e) => { e.preventDefault(); setSobre(col.estado); }}
                onDragLeave={() => setSobre(null)}
                onDrop={(e) => { e.preventDefault(); setSobre(null); onMover(e.dataTransfer.getData('text/plain'), col.estado); }}
                className={`w-64 shrink-0 rounded-xl border p-2 space-y-2 transition-colors ${sobre === col.estado ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-slate-50'}`}
              >
                <div className="flex items-center justify-between px-1 pt-1">
                  <Badge tone={col.tono} dot>{col.texto || col.estado}</Badge>
                  <span className="text-[11px] text-slate-500">{items.length} · {eurosTotal(items.reduce((s, p) => s + (p.importe || 0), 0))}</span>
                </div>
                {items.length === 0 && <div className="px-2 py-6 text-center text-[11px] text-slate-400">Arrastra aquí</div>}
                {items.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                    onClick={() => onAbrir(p)}
                    className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 shadow-xs hover:border-indigo-300 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-500">{p.id}</span>
                      <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-900 line-clamp-2">{p.cliente}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{p.titulo}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{p.puestosCount} puestos · {p.tarifaMedia.toFixed(2).replace('.', ',')} €/h</span>
                      <span>{p.fechaValidez}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{p.comercial}</span>
                      <span className="font-medium text-slate-900">{eurosTotal(p.importe)}</span>
                    </div>
                    {['Enviado a Cliente', 'Pendiente de Firma'].includes(p.estado) && (p.diasSinRespuesta || 0) >= DIAS_RECORDATORIO && (
                      <div className="mt-1 text-[11px] text-amber-700">Sin respuesta · {p.diasSinRespuesta} días</div>
                    )}
                    {p.estado === 'Rechazado' && p.motivoRechazo && <div className="mt-1 text-[11px] text-slate-500">{p.motivoRechazo}</div>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    // ==========================================
    // COSTES INTERNOS POR PUESTO
    // El escandallo del presupuesto da el valor por defecto; cada puesto decide si se le aplica y con qué valor.
    // Los legales (Seguridad Social, indemnización) se aplican siempre.
    // ==========================================
    const unidadConcepto = (c) => ({ porcentaje: '%', fijo_hora: '€/h', fijo_jornada: '€/día', fijo_mes: '€/mes' }[c.tipo] || '');

    function ajusteDe(pos, c) {
      const a = pos.conceptos?.[c.id] || {};
      return { aplica: c.esObligatorioLegal ? true : a.aplica !== false, valor: a.valor ?? '' };
    }

    // Matriz conceptos x puestos (en Escandallo): ver y ajustar de un vistazo
    function MatrizConceptos({ conceptos, posiciones, editable, onCambiar }) {
      if (posiciones.length === 0) return null;
      const celda = 'h-7 w-16 bg-white border border-slate-200 rounded-md px-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400';
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2 px-3 text-left font-medium">Concepto interno</th>
                <th className="py-2 px-3 text-right font-medium whitespace-nowrap">Por defecto</th>
                {posiciones.map(p => <th key={p.id} className="py-2 px-3 text-left font-medium min-w-[150px]">{p.nombre || 'Puesto sin nombre'}</th>)}
              </tr>
            </thead>
            <tbody>
              {conceptos.map(c => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 px-3 text-slate-700">
                    {c.nombre}
                    {c.esObligatorioLegal && <span className="ml-1.5 text-[11px] text-slate-400">(legal, siempre)</span>}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap text-slate-500">{c.valor} {unidadConcepto(c)}</td>
                  {posiciones.map(p => {
                    const a = ajusteDe(p, c);
                    return (
                      <td key={p.id} className="py-2 px-3">
                        {c.esObligatorioLegal ? (
                          <span className="text-slate-400">{c.valor} {unidadConcepto(c)}</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={a.aplica}
                              disabled={!editable}
                              onChange={(e) => onCambiar(p.id, c.id, { aplica: e.target.checked })}
                              className="accent-indigo-600"
                              aria-label={`Aplicar ${c.nombre} a ${p.nombre}`}
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={a.valor}
                              placeholder={String(c.valor)}
                              disabled={!editable || !a.aplica}
                              onChange={(e) => onCambiar(p.id, c.id, { valor: e.target.value })}
                              className={celda}
                              aria-label={`Valor de ${c.nombre} para ${p.nombre}`}
                            />
                            <span className="text-[11px] text-slate-400">{unidadConcepto(c)}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Lista de costes internos de un puesto (panel del puesto)
    function ConceptosPuesto({ conceptos, pos, onCambiar }) {
      const celda = 'h-7 w-20 bg-white border border-slate-200 rounded-md px-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400';
      return (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {conceptos.map(c => {
            const a = ajusteDe(pos, c);
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={a.aplica}
                  disabled={c.esObligatorioLegal}
                  onChange={(e) => onCambiar(c.id, { aplica: e.target.checked })}
                  className="accent-indigo-600"
                  aria-label={`Aplicar ${c.nombre}`}
                />
                <span className={`flex-1 ${a.aplica ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                  {c.nombre}
                  {c.esObligatorioLegal && <span className="ml-1.5 text-[11px] text-slate-400 no-underline">(legal, siempre)</span>}
                </span>
                {c.esObligatorioLegal ? (
                  <span className="text-slate-500 whitespace-nowrap">{c.valor} {unidadConcepto(c)}</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      value={a.valor}
                      placeholder={String(c.valor)}
                      disabled={!a.aplica}
                      onChange={(e) => onCambiar(c.id, { valor: e.target.value })}
                      className={celda}
                      aria-label={`Valor de ${c.nombre} en este puesto`}
                    />
                    <span className="w-9 text-[11px] text-slate-400">{unidadConcepto(c)}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    // ==========================================
    // IMPORTES, REVISIÓN ANTES DE ENVIAR, PROPUESTA Y VERSIONES
    // ==========================================
    const MARGEN_MINIMO = 15; // % por debajo del cual dirección tiene que aprobar (por confirmar)
    const DIAS_RECORDATORIO = 5; // días sin respuesta tras enviar para avisar
    const eurosTotal = (n) => `${Math.round(Number(n) || 0).toLocaleString('es-ES')} €`;
    const horasFmt = (n) => (Number(n) || 0).toLocaleString('es-ES');

    function totalesDe(datos) {
      const ecos = datos.posiciones.map(p => calcularEconomiaPosicion(p, datos.conceptosEscandallo, datos.margenObjetivo));
      const suma = (k) => ecos.reduce((s, e) => s + (e[k] || 0), 0);
      const facturacion = suma('facturacionTotal');
      const margen = suma('margenServicio');
      return {
        ecos,
        facturacion,
        costeTotal: suma('costeServicio'),
        margenTotal: margen,
        margenTotalPct: facturacion > 0 ? (margen / facturacion) * 100 : 0,
        personas: datos.posiciones.reduce((s, p) => s + (Number(p.personas) || 1), 0),
        horas: suma('horasTotales'),
        tarifaMedia: ecos.length ? suma('tarifaPVP') / ecos.length : 0,
        margenMedioPct: ecos.length ? suma('margenPorcentaje') / ecos.length : 0,
      };
    }

    // Comprobaciones antes de enviar. tipo: 'error' bloquea; 'aprobacion' necesita el visto bueno de dirección.
    function revisarPresupuesto(datos) {
      const { ecos } = totalesDe(datos);
      const hoy = new Date().toISOString().slice(0, 10);
      const bajoCoste = datos.posiciones.filter((p, i) => ecos[i].tarifaPVP > 0 && ecos[i].margenEuroHora < 0).map(p => p.nombre);
      const bajoMinimo = datos.posiciones.filter((p, i) => ecos[i].margenEuroHora >= 0 && ecos[i].margenPorcentaje < MARGEN_MINIMO).map(p => p.nombre);
      const aprobado = datos.aprobacion?.estado === 'aprobada';
      return [
        { ok: !!datos.cliente, tipo: 'error', texto: 'Empresa elegida', pestana: 'empresa' },
        { ok: !!datos.contacto && !!datos.emailContacto, tipo: 'error', texto: 'Contacto con email para enviar la propuesta', pestana: 'empresa' },
        { ok: !!datos.comercial, tipo: 'error', texto: 'Comercial responsable', pestana: 'empresa' },
        { ok: !!datos.fechaValidez && datos.fechaValidez >= hoy, tipo: 'error', texto: 'Fecha de validez futura', pestana: 'empresa' },
        { ok: datos.posiciones.length > 0, tipo: 'error', texto: 'Al menos un puesto', pestana: 'posiciones' },
        { ok: datos.posiciones.every(p => Number(p.tarifaHoraOfertada) > 0), tipo: 'error', texto: 'Todos los puestos tienen tarifa', pestana: 'posiciones' },
        { ok: bajoCoste.length === 0, tipo: 'error', texto: bajoCoste.length ? `Tarifa por debajo del coste: ${bajoCoste.join(', ')}` : 'Ninguna tarifa por debajo del coste', pestana: 'posiciones' },
        { ok: bajoMinimo.length === 0 || aprobado, tipo: 'aprobacion', texto: bajoMinimo.length ? `Margen por debajo del ${MARGEN_MINIMO} %: ${bajoMinimo.join(', ')}${aprobado ? ' (aprobado por dirección)' : ''}` : `Margen de todos los puestos ≥ ${MARGEN_MINIMO} %`, pestana: 'posiciones', detalle: bajoMinimo },
      ];
    }

    // La propuesta tal como la recibe el cliente: solo salario, tarifa, conceptos extra que se imprimen y condiciones
    function VistaPropuesta({ datos }) {
      const { ecos } = totalesDe(datos);
      const etiqueta = (lista, id, custom) => CATALOGOS[lista]?.find(x => x.id === id)?.label || custom || '—';
      return (
        <div className="bg-slate-100 rounded-lg p-4 overflow-auto max-h-[65vh]">
          <div className="mx-auto max-w-2xl bg-white border border-slate-200 shadow-sm p-8 space-y-5 text-xs text-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">ETT Global Servicios Temporales, S.L.</div>
                <div className="text-[11px] text-slate-500">Propuesta de servicios de puesta a disposición</div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div className="font-mono text-slate-700">{datos.codigoVersion}</div>
                <div>Emitida el {datos.fechaEmision || '—'}</div>
                <div>Válida hasta el {datos.fechaValidez || '—'}</div>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] text-slate-500">Para</div>
              <div className="font-medium text-slate-900">{datos.cliente || 'Empresa sin elegir'}</div>
              <div>{datos.contacto}</div>
            </div>
            {datos.titulo && <div className="text-sm font-semibold text-slate-900">{datos.titulo}</div>}
            {datos.posiciones.length === 0 ? (
              <p className="text-slate-400">Sin puestos.</p>
            ) : (
              datos.posiciones.map((p, i) => {
                const extras = ecos[i].extras.filter(x => x.mostrar);
                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-baseline justify-between border-b border-slate-200 pb-1">
                      <span className="font-semibold text-slate-900">{p.nombre}</span>
                      <span className="text-[11px] text-slate-500">{Number(p.personas) || 1} {Number(p.personas) === 1 ? 'persona' : 'personas'} · {etiquetaConvenio(p.convenio, p.convenioCustom)}</span>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="text-[11px] text-slate-500">
                          <th className="py-1 text-left font-medium">Concepto</th>
                          <th className="py-1 text-right font-medium">Salario</th>
                          <th className="py-1 text-right font-medium">Tarifa</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-0.5">Hora ordinaria</td>
                          <td className="py-0.5 text-right">{euros(ecos[i].salarioBrutoHora)}</td>
                          <td className="py-0.5 text-right font-medium text-slate-900">{euros(ecos[i].tarifaPVP)}</td>
                        </tr>
                        {extras.map(x => (
                          <tr key={x.id}>
                            <td className="py-0.5">{x.concepto}</td>
                            <td className="py-0.5 text-right">{euros(x.salarioHora)}</td>
                            <td className="py-0.5 text-right font-medium text-slate-900">{euros(x.tarifaHora)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p.descripcionTareas && <p className="text-[11px] text-slate-500">{p.descripcionTareas}</p>}
                  </div>
                );
              })
            )}
            <div className="space-y-1 border-t border-slate-200 pt-3">
              <div className="font-semibold text-slate-900">Condiciones</div>
              <div>Modalidad: {etiqueta('modalidades', datos.modalidad, datos.modalidadCustom)}</div>
              <div>Forma de pago: {etiqueta('formasPago', datos.formaPago, datos.formaPagoCustom)}</div>
              <div>Garantía de sustitución: {etiqueta('garantiasSustitucion', datos.garantiaSustitucion, datos.garantiaSustitucionCustom)}</div>
              <div>Precios sin IVA.</div>
            </div>
            {datos.observacionesComerciales && <p className="text-[11px] text-slate-500">{datos.observacionesComerciales}</p>}
            <div className="grid grid-cols-2 gap-8 pt-6 text-[11px] text-slate-400">
              <div className="border-t border-slate-200 pt-1">Por la ETT</div>
              <div className="border-t border-slate-200 pt-1">Por el cliente</div>
            </div>
          </div>
        </div>
      );
    }

    // Comparación de una versión anterior con la actual
    function ComparacionVersiones({ anterior, actual }) {
      const ta = totalesDe(anterior);
      const tb = totalesDe(actual);
      const ids = [...new Set([...anterior.posiciones.map(p => p.id), ...actual.posiciones.map(p => p.id)])];
      const fila = (nombre, a, b, nota) => {
        const cambia = a !== b;
        return (
          <tr key={nombre} className="border-t border-slate-100">
            <td className="py-1.5 pr-3 text-slate-700">{nombre}{nota}</td>
            <td className="py-1.5 px-3 text-right text-slate-500 whitespace-nowrap">{a}</td>
            <td className={`py-1.5 pl-3 text-right whitespace-nowrap ${cambia ? 'font-medium text-slate-900 bg-amber-50' : 'text-slate-700'}`}>{b}</td>
          </tr>
        );
      };
      return (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[11px] text-slate-500">
              <th className="py-1 text-left font-medium">Qué</th>
              <th className="py-1 px-3 text-right font-medium">{anterior.codigoVersion}</th>
              <th className="py-1 pl-3 text-right font-medium">{actual.codigoVersion} (actual)</th>
            </tr>
          </thead>
          <tbody>
            {ids.map(id => {
              const pa = anterior.posiciones.find(p => p.id === id);
              const pb = actual.posiciones.find(p => p.id === id);
              const ea = pa && calcularEconomiaPosicion(pa, anterior.conceptosEscandallo, anterior.margenObjetivo);
              const eb = pb && calcularEconomiaPosicion(pb, actual.conceptosEscandallo, actual.margenObjetivo);
              const nombre = (pb || pa).nombre;
              const nota = !pa ? <Badge tone="success">Nuevo</Badge> : !pb ? <Badge tone="danger">Quitado</Badge> : null;
              return [
                fila(`${nombre} · tarifa`, ea ? euros(ea.tarifaPVP) : '—', eb ? euros(eb.tarifaPVP) : '—', nota && <span className="ml-1.5">{nota}</span>),
                fila(`${nombre} · personas`, pa ? String(Number(pa.personas) || 1) : '—', pb ? String(Number(pb.personas) || 1) : '—'),
              ];
            })}
            {fila('Facturación estimada', eurosTotal(ta.facturacion), eurosTotal(tb.facturacion))}
            {fila('Margen total', `${eurosTotal(ta.margenTotal)} (${pct(ta.margenTotalPct)})`, `${eurosTotal(tb.margenTotal)} (${pct(tb.margenTotalPct)})`)}
            {fila('Válido hasta', anterior.fechaValidez, actual.fechaValidez)}
          </tbody>
        </table>
      );
    }
