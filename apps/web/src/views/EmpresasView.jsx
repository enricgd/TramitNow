// Partió de design/empresas.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
    import { 
      Building2, Users, MapPin, CreditCard, FileText, History, Plus, Search, 
      Filter, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Clock, 
      Lock, X, Edit3, ArrowRight, Sparkles, Phone, Mail, Globe, Shield, 
      Info, Trash2, Check, AlertCircle, Eye, ExternalLink, HelpCircle, 
      Building, Briefcase, FileCheck, Layers, ArrowLeft, RefreshCw, BookmarkCheck,
      Upload, Download, ZoomIn, ZoomOut, CirclePause, CirclePlay, CloudUpload, FileImage,
    } from 'lucide-react';
import { Page, PageHeader, Card, EmptyState, Notice, Button, IconButton, Badge, SearchInput, Select, SelectConAlta, Tabs, Modal, Drawer, Confirmar, Interruptor } from '../ui';
import { PERMISOS_PORTAL, permisosPorRoles } from '../portal/permisosEmpresa';

    // DATOS DEMO INICIALES
    const INITIAL_COMPANIES = [
      {
id: 'comp-1',
cif: 'B-87654321',
name: 'Trans-Logística Ibérica Norte, S.L.',
tradeName: 'TransLog Norte',
status: 'active',
readiness: {
  basic: true,
  quote: true,
  operations: false, // falta centros
  billing: false     // faltan datos facturación
},
readinessLabel: 'Lista para presupuestar',
readinessStep: 2,
owner: 'Carlos Mendoza (Consultor ETT)',
country: 'España',
email: 'contacto@translog-norte.es',
phone: '+34 944 123 456',
address: 'Polígono Industrial Artunduaga, Pabellón 14',
postalCode: '48970',
city: 'Basauri',
province: 'Bizkaia',
sector: 'Logística y almacén',
notes: 'Cliente con alta demanda en picos de campaña Black Friday y verano. Exige perfiles carretilleros con carnet vigente.',
lastActivity: 'Hace 2 horas — Presupuesto PRE-2026-0048 en borrador',
createdAt: '2026-03-15',
contacts: [
  {
    id: 'cont-1',
    name: 'Marta Gómez Arana',
    email: 'marta.gomez@translog-norte.es',
    phone: '+34 654 987 321',
    role: 'Responsable de RRHH y Selección',
    types: ['RR. HH.', 'Solicitante', 'Destinatario de Presupuestos'],
    isMain: true,
    isQuoteRecipient: true,
    notes: 'Contacto principal para firma de presupuestos y gestión de altas de personal.',
    portal: { activo: true, desde: '2026-03-20', ultimoAcceso: 'Ayer 17:40', permisos: ['pedir', 'personal', 'facturas', 'documentos'] }
  },
  {
    id: 'cont-2',
    name: 'Javier Ugarte Elorza',
    email: 'j.ugarte@translog-norte.es',
    phone: '+34 611 223 344',
    role: 'Jefe de Planta / Operaciones',
    types: ['Operativo', 'Valida horas', 'Prevención / PRL'],
    isMain: false,
    isQuoteRecipient: false,
    notes: 'Gestiona la entrada a muelle y la entrega de EPIs a carretilleros.',
    portal: { activo: true, desde: '2026-06-25', ultimoAcceso: 'Hoy 08:15', permisos: ['personal', 'horas', 'documentos'] }
  }
],
centers: [], // VACÍO INTENCIONAL PARA DEMO DE PENDIENTE
billing: {
  taxName: 'Trans-Logística Ibérica Norte, S.L.',
  taxAddress: 'Polígono Industrial Artunduaga, Pabellón 14, 48970 Basauri (Bizkaia)',
  vatRegime: 'Régimen general 21 %',
  paymentMethod: 'Transferencia a 60 días',
  billingContactEmail: 'facturacion@translog-norte.es',
  iban: '',
  swift: '',
  riskLimit: '30.000 € (Pendiente scoring Coface)',
  specialVat: false,
  fixedPayDays: 'Día 10 y 25',
  isComplete: false
},
activity: [
  { id: 'act-1', date: '2026-04-12 11:30', user: 'Carlos Mendoza', action: 'Presupuesto PRE-2026-0048 generado en borrador', type: 'quote' },
  { id: 'act-2', date: '2026-04-10 16:45', user: 'Marta Gómez (Cliente)', action: 'Contacto añadido y validado como destinatario de presupuestos', type: 'contact' },
  { id: 'act-3', date: '2026-04-09 10:15', user: 'Carlos Mendoza', action: 'Alta rápida completada desde llamada comercial inicial', type: 'system' }
]
      },
      {
id: 'comp-2',
cif: 'A-28193847',
name: 'Manufacturas Metálicas del Henares, S.A.',
tradeName: 'MetalHenares',
status: 'active',
readiness: { basic: true, quote: true, operations: true, billing: true },
readinessLabel: 'Facturación y Operativa listas',
readinessStep: 4,
owner: 'Elena Rivas',
country: 'España',
email: 'info@metalhenares.com',
phone: '+34 918 765 432',
address: 'C/ del Torno 8, Alcalá de Henares',
postalCode: '28806',
city: 'Madrid',
province: 'Madrid',
sector: 'Industria metalúrgica',
notes: 'Cliente consolidado. 4 centros activos y facturación mensual agrupada.',
lastActivity: 'Ayer — Petición PET-2026-102 confirmada',
createdAt: '2026-01-20',
contacts: [
  { id: 'cont-201', name: 'Alfonso Serrano', email: 'aserrano@metalhenares.com', phone: '+34 600 112 233', role: 'Dir. Financiero', types: ['Facturación', 'Dirección'], isMain: true, isQuoteRecipient: true }
],
centers: [
  { id: 'cent-201', name: 'Planta Principal Alcalá', address: 'C/ del Torno 8', postalCode: '28806', city: 'Alcalá de Henares', country: 'España', notes: 'Sede central' }
],
billing: { taxName: 'Manufacturas Metálicas del Henares, S.A.', taxAddress: 'C/ del Torno 8', vatRegime: 'Régimen general 21 %', paymentMethod: 'Confirming bancario', iban: 'ES91 2100 **** **** **** 4432', isComplete: true },
activity: []
      },
      {
id: 'comp-3',
cif: 'B-65432198',
name: 'Mediterránea Agrícola y Envasado, S.L.',
tradeName: 'AgroMediterráneo',
status: 'prospect',
readiness: { basic: true, quote: false, operations: false, billing: false },
readinessLabel: 'Alta básica (Falta contacto)',
readinessStep: 1,
owner: 'Carlos Mendoza',
country: 'España',
email: 'info@agromediterranea-demo.es',
phone: '+34 968 112 233',
address: 'Carretera del Palmar km 3',
postalCode: '30120',
city: 'Murcia',
province: 'Murcia',
sector: 'Agroalimentario',
notes: 'Lead entrante feria Fruit Attraction. Pendiente validar contacto de contratación.',
lastActivity: 'Hace 3 días — Alta básica registrada',
createdAt: '2026-04-05',
contacts: [],
centers: [],
billing: { isComplete: false },
activity: []
      },
      {
id: 'comp-4',
cif: 'B-99887766',
name: 'Hostelería & Eventos Premium BCN, S.L.',
tradeName: 'Premium Events BCN',
status: 'active',
readiness: { basic: true, quote: true, operations: true, billing: false },
readinessLabel: 'Petición operativa lista',
readinessStep: 3,
owner: 'Laura Vidal',
country: 'España',
email: 'rrhh@premiumeventsbcn.cat',
phone: '+34 932 456 789',
address: 'Passeig de Gràcia 112, 4º',
postalCode: '08008',
city: 'Barcelona',
province: 'Barcelona',
sector: 'Hostelería y eventos',
notes: 'Requieren camareros con idiomas y protocolo para hoteles 5* GL.',
lastActivity: 'Hace 5 días — Centro "Palau de Congressos" añadido',
createdAt: '2026-02-14',
contacts: [
  { id: 'cont-401', name: 'Sergi Pujol', email: 'spujol@premiumeventsbcn.cat', phone: '+34 688 990 011', role: 'Coordinador de Eventos', types: ['Comercial', 'Operativo'], isMain: true, isQuoteRecipient: true, portal: { activo: true, desde: '2026-09-28', ultimoAcceso: 'Hace 3 días', permisos: ['pedir', 'personal', 'facturas', 'documentos'] } },
  { id: 'cont-402', name: 'Montse Ferrer', email: 'mferrer@premiumeventsbcn.cat', phone: '+34 688 990 022', role: 'Jefa de sala', types: ['Operativo', 'Valida horas'], isMain: false, isQuoteRecipient: false, portal: { activo: true, desde: '2026-10-08', ultimoAcceso: 'Hoy 09:02', permisos: ['personal', 'horas'] } }
],
centers: [
  { id: 'cent-401', name: 'Palau de Congressos BCN', address: 'Av. Diagonal 661', postalCode: '08028', city: 'Barcelona', country: 'España', notes: 'Acceso puerta de proveedores c/ Martí i Franquès' }
],
billing: { isComplete: false },
activity: []
      }
    ];

    // Categorías de empresa. Se pueden ampliar desde el formulario con "Añadir".
    const SECTORES = [
      'Agroalimentario',
      'Comercio y distribución',
      'Construcción',
      'Hostelería y eventos',
      'Industria metalúrgica',
      'Limpieza y servicios',
      'Logística y almacén',
      'Oficinas y administración',
      'Sanidad y cuidados',
    ];

    // Listas de facturación y tipos de documento (se pueden ampliar con "Añadir")
    const FORMAS_PAGO = ['Transferencia a 30 días', 'Transferencia a 60 días', 'Recibo SEPA a 30 días', 'Recibo SEPA a 60 días', 'Confirming a 90 días', 'Al contado'];
    const DIAS_PAGO = ['Sin día fijo', 'Día 5 de cada mes', 'Día 10 de cada mes', 'Día 10 y 25 de cada mes', 'Día 15 de cada mes', 'Último día del mes'];
    const REGIMENES_IVA = ['Régimen general 21 %', 'Reducido 10 %', 'Exento', 'Inversión del sujeto pasivo', 'Recargo de equivalencia', 'IGIC (Canarias)'];
    const TIPOS_DOCUMENTO = ['Acuerdo de confidencialidad', 'CIF', 'Certificado de Hacienda', 'Certificado de la Seguridad Social', 'Contrato', 'Escrituras', 'Mandato SEPA', 'Póliza de seguro'];

    // Documentos de ejemplo por empresa
    const INITIAL_DOCUMENTOS = {
      'comp-1': [
        { id: 'doc-1', nombre: 'Contrato marco ETT - TransLogística 2026.pdf', tipo: 'Contrato', subidoPor: 'Carlos Mendoza', fecha: '12/02/2026', tamano: '1,4 MB', estado: 'Borrador', paginas: 6 },
        { id: 'doc-2', nombre: 'Tarjeta CIF B-87654321.pdf', tipo: 'CIF', subidoPor: 'Sistema', fecha: '03/02/2026', tamano: '420 KB', estado: 'Validado', paginas: 1 },
      ],
    };

    export default function EmpresasView() {
      // Estado de datos
      const [companies, setCompanies] = useState(INITIAL_COMPANIES);
      const [selectedCompanyId, setSelectedCompanyId] = useState('comp-1');
      const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'datos' | 'contactos' | 'centros' | 'facturacion' | 'documentos' | 'actividad'
      
      // Filtros del listado
      const [searchTerm, setSearchTerm] = useState('');
      const [filterStatus, setFilterStatus] = useState('all');
      const [filterOwner, setFilterOwner] = useState('all');
      const [filterReadiness, setFilterReadiness] = useState('all');
      const [filterSector, setFilterSector] = useState('all');
      const [sectores, setSectores] = useState(SECTORES);
      const anadirSector = (s) => setSectores(prev => [...prev, s].sort((a, b) => a.localeCompare(b, 'es')));

      // Documentos: visor y confirmación de borrado
      const [documentos, setDocumentos] = useState(INITIAL_DOCUMENTOS);
      const [docAbierto, setDocAbierto] = useState(null);
      const [docABorrar, setDocABorrar] = useState(null);
      const [zoomDoc, setZoomDoc] = useState(100);
      const [subiendoDocs, setSubiendoDocs] = useState(false);
      const [tiposDoc, setTiposDoc] = useState(TIPOS_DOCUMENTO);

      // Contactos y centros: suspender (reversible) o eliminar (definitivo, con confirmación)
      const [aBorrar, setABorrar] = useState(null); // { tipo: 'contacto' | 'centro', item }

      // Listas de facturación ampliables
      const [formasPago, setFormasPago] = useState(FORMAS_PAGO);
      const [diasPago, setDiasPago] = useState(DIAS_PAGO);
      const [regimenesIva, setRegimenesIva] = useState(REGIMENES_IVA);
      const anadirA = (setter) => (v) => setter(prev => [...prev, v]);

      // Contexto simulado (ej: abierto desde Presupuesto)
      const [simulationContext, setSimulationContext] = useState({
active: true,
code: 'Presupuesto PRE-2026-0048',
role: 'Consultor Comercial ETT',
origin: 'Negociación tarifa carretilleros turno noche'
      });

      // Drawers / Modales
      const [drawerState, setDrawerState] = useState({
isOpen: false,
type: null, // 'new-company' | 'edit-company' | 'new-contact' | 'edit-contact' | 'new-center' | 'edit-center'
data: null,
hasUnsavedChanges: false
      });

      const [discardModalOpen, setDiscardModalOpen] = useState(false);
      const [toast, setToast] = useState(null);
      const [showRulesDrawer, setShowRulesDrawer] = useState(false);
      const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'

      // Obtener empresa activa
      const currentCompany = useMemo(() => {
return companies.find(c => c.id === selectedCompanyId) || companies[0];
      }, [companies, selectedCompanyId]);

      // Toast helper
      const actualizarEmpresa = (cambio) => setCompanies(prev => prev.map(c => (c.id === currentCompany.id ? cambio(c) : c)));
      const campoDe = (tipo) => (tipo === 'contacto' ? 'contacts' : 'centers');

      const alternarSuspension = (tipo, item) => {
        const suspendido = !item.suspendido;
        actualizarEmpresa(c => ({ ...c, [campoDe(tipo)]: c[campoDe(tipo)].map(x => (x.id === item.id ? { ...x, suspendido } : x)) }));
        showToast(`${item.name}: ${suspendido ? (tipo === 'centro' ? 'desactivado' : 'suspendido') : 'reactivado'}`);
      };

      const eliminarElemento = () => {
        const { tipo, item } = aBorrar;
        actualizarEmpresa(c => {
          const lista = c[campoDe(tipo)].filter(x => x.id !== item.id);
          const nueva = { ...c, [campoDe(tipo)]: lista };
          if (tipo === 'centro' && lista.length === 0) nueva.readiness = { ...c.readiness, operations: false };
          return nueva;
        });
        showToast(`${item.name} eliminado`);
        setABorrar(null);
      };

      // Acceso al Área de empresas: lo da la ETT; el contacto recibe una invitación por correo
      const [accesoPortal, setAccesoPortal] = useState(null); // { contacto, permisos, nuevo }
      const guardarAccesoPortal = () => {
        const { contacto, permisos, nuevo } = accesoPortal;
        const hoy = new Date().toISOString().slice(0, 10);
        actualizarEmpresa(c => ({ ...c, contacts: c.contacts.map(x => (x.id === contacto.id ? { ...x, portal: { ...(x.portal || {}), activo: true, permisos, desde: x.portal?.activo ? x.portal.desde : hoy, ...(nuevo ? { invitado: hoy, ultimoAcceso: null } : {}) } } : x)) }));
        showToast(nuevo ? `Invitación al Área de empresas enviada a ${contacto.email}` : `Permisos de ${contacto.name} actualizados`);
        setAccesoPortal(null);
      };
      const quitarAccesoPortal = (contacto) => {
        actualizarEmpresa(c => ({ ...c, contacts: c.contacts.map(x => (x.id === contacto.id ? { ...x, portal: { ...x.portal, activo: false } } : x)) }));
        showToast(`${contacto.name} ya no puede entrar en el Área de empresas`);
      };

      const actualizarFacturacion = (campo, valor) => actualizarEmpresa(c => ({ ...c, billing: { ...c.billing, [campo]: valor } }));

      const showToast = (message, type = 'success') => {
setToast({ message, type });
setTimeout(() => setToast(null), 3800);
      };

      // Manejar cierre de panel con confirmación si hay cambios
      const handleCloseDrawer = (force = false) => {
if (!force && drawerState.hasUnsavedChanges) {
  setDiscardModalOpen(true);
} else {
  setDrawerState({ isOpen: false, type: null, data: null, hasUnsavedChanges: false });
  setDiscardModalOpen(false);
}
      };

      // Guardado de empresa rápida
      const handleSaveCompany = (formData, isEdit = false) => {
if (isEdit) {
  setCompanies(prev => prev.map(c => {
    if (c.id === currentCompany.id) {
      return {
        ...c,
        ...formData,
        activity: [
          {
            id: 'act-' + Date.now(),
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            user: 'Carlos Mendoza',
            action: 'Datos de empresa actualizados desde el panel lateral',
            type: 'system'
          },
          ...c.activity
        ]
      };
    }
    return c;
  }));
  showToast('Empresa actualizada correctamente');
} else {
  const newId = 'comp-' + Date.now();
  const newComp = {
    id: newId,
    cif: formData.cif,
    name: formData.name,
    tradeName: formData.tradeName || formData.name,
    status: 'active',
    readiness: { basic: true, quote: false, operations: false, billing: false },
    readinessLabel: 'Alta básica (Falta contacto)',
    readinessStep: 1,
    owner: formData.owner || 'Carlos Mendoza',
    country: formData.country || 'España',
    email: formData.email || '',
    phone: formData.phone || '',
    address: formData.address || '',
    postalCode: formData.postalCode || '',
    city: formData.city || '',
    province: formData.province || '',
    sector: formData.sector || 'General',
    notes: formData.notes || '',
    lastActivity: 'Ahora — Alta rápida creada',
    createdAt: new Date().toISOString().substring(0, 10),
    contacts: [],
    centers: [],
    billing: { isComplete: false },
    activity: [
      {
        id: 'act-' + Date.now(),
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        user: formData.owner || 'Carlos Mendoza',
        action: 'Alta rápida inicial registrada en ERP',
        type: 'system'
      }
    ]
  };
  setCompanies(prev => [newComp, ...prev]);
  setSelectedCompanyId(newId);
  setViewMode('detail');
  setActiveTab('resumen');
  showToast('Empresa creada con éxito (Borrador inicial)');
}
setDrawerState({ isOpen: false, type: null, data: null, hasUnsavedChanges: false });
      };

      // Guardar Contacto
      const handleSaveContact = (contactData, isEdit = false) => {
setCompanies(prev => prev.map(c => {
  if (c.id === currentCompany.id) {
    let updatedContacts;
    if (isEdit) {
      updatedContacts = c.contacts.map(ct => ct.id === contactData.id ? contactData : (contactData.isMain ? { ...ct, isMain: false } : ct));
    } else {
      const newContact = { ...contactData, id: 'cont-' + Date.now() };
      updatedContacts = contactData.isMain 
        ? [newContact, ...c.contacts.map(ct => ({ ...ct, isMain: false }))]
        : [...c.contacts, newContact];
    }

    // Actualizar readiness si ya tiene contacto principal
    const hasQuoteContact = updatedContacts.some(ct => ct.isQuoteRecipient || ct.isMain);
    const newReadiness = {
      ...c.readiness,
      quote: hasQuoteContact
    };

    let label = c.readinessLabel;
    if (newReadiness.quote && !newReadiness.operations) {
      label = 'Lista para presupuestar';
    }

    return {
      ...c,
      contacts: updatedContacts,
      readiness: newReadiness,
      readinessLabel: label,
      activity: [
        {
          id: 'act-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          user: 'Carlos Mendoza',
          action: isEdit ? `Contacto modificado: ${contactData.name}` : `Nuevo contacto añadido: ${contactData.name} (${contactData.types.join(', ')})`,
          type: 'contact'
        },
        ...c.activity
      ]
    };
  }
  return c;
}));
showToast(isEdit ? 'Contacto actualizado' : 'Contacto añadido y vinculado a presupuesto');
setDrawerState({ isOpen: false, type: null, data: null, hasUnsavedChanges: false });
      };

      // Guardar Centro
      const handleSaveCenter = (centerData, isEdit = false) => {
setCompanies(prev => prev.map(c => {
  if (c.id === currentCompany.id) {
    let updatedCenters;
    if (isEdit) {
      updatedCenters = c.centers.map(ct => ct.id === centerData.id ? centerData : ct);
    } else {
      const newCenter = { ...centerData, id: 'cent-' + Date.now() };
      updatedCenters = [...c.centers, newCenter];
    }

    const hasCenters = updatedCenters.length > 0;
    const newReadiness = {
      ...c.readiness,
      operations: hasCenters
    };

    let label = c.readinessLabel;
    if (newReadiness.operations && newReadiness.quote) {
      label = newReadiness.billing ? 'Facturación y Operativa listas' : 'Petición operativa lista';
    }

    return {
      ...c,
      centers: updatedCenters,
      readiness: newReadiness,
      readinessLabel: label,
      activity: [
        {
          id: 'act-' + Date.now(),
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          user: 'Carlos Mendoza',
          action: isEdit ? `Centro de trabajo modificado: ${centerData.name}` : `Nuevo centro operativo añadido: ${centerData.name}`,
          type: 'center'
        },
        ...c.activity
      ]
    };
  }
  return c;
}));
showToast(isEdit ? 'Centro actualizado' : 'Centro operativo creado (desbloquea Petición)');
setDrawerState({ isOpen: false, type: null, data: null, hasUnsavedChanges: false });
      };

      // Filtrado en tabla
      const filteredCompanies = useMemo(() => {
return companies.filter(c => {
  const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase()));
  const matchStatus = filterStatus === 'all' || c.status === filterStatus;
  const matchOwner = filterOwner === 'all' || c.owner.toLowerCase().includes(filterOwner.toLowerCase());
  const matchReadiness = filterReadiness === 'all' || 
    (filterReadiness === 'quote' && c.readiness.quote) ||
    (filterReadiness === 'operations' && c.readiness.operations) ||
    (filterReadiness === 'billing' && c.readiness.billing);
  const matchSector = filterSector === 'all' || c.sector === filterSector;
  return matchSearch && matchStatus && matchOwner && matchReadiness && matchSector;
});
      }, [companies, searchTerm, filterStatus, filterOwner, filterReadiness, filterSector]);

      return (
<div className="flex min-h-full text-sm">
  {/* TOAST FLOTANTE */}
  {toast && (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-800 animate-bounce">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      <span className="font-medium text-xs md:text-sm">{toast.message}</span>
      <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  )}

  {/* BARRA LATERAL DEL SISTEMA ERP (SaaS Navigation) */}

  {/* CONTENIDO PRINCIPAL */}
  <div className="flex-1 flex flex-col min-w-0">

    {/* Aviso de contexto: se llega desde un presupuesto */}
    {simulationContext.active && (
      <div className="w-full px-4 sm:px-6 pt-5">
        <Notice tone="warning" icon={Info}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Estás editando la empresa desde el presupuesto <strong>{simulationContext.code}</strong>, sin salir de la venta.</span>
            <button
              type="button"
              onClick={() => setSimulationContext(prev => ({ ...prev, active: false }))}
              className="text-[11px] font-medium underline hover:no-underline"
            >
              Ocultar
            </button>
          </div>
        </Notice>
      </div>
    )}

    {/* VISTA 1: LISTADO DE EMPRESAS */}
    {viewMode === 'list' && (
      <Page>
        <PageHeader
          title="Empresas"
          count={companies.length}
          subtitle="Clientes y posibles clientes, y qué les falta para presupuestar, operar y facturar."
          actions={
            <Button variant="primary" icon={Plus} onClick={() => setDrawerState({ isOpen: true, type: 'new-company', data: null, hasUnsavedChanges: false })}>
              Nueva empresa
            </Button>
          }
        />

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
            <SearchInput
              className="flex-1 min-w-[220px] max-w-md"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por razón social, nombre comercial o CIF..."
            />
            <Select value={filterReadiness} onChange={(e) => setFilterReadiness(e.target.value)}>
              <option value="all">Toda la preparación</option>
              <option value="quote">Listas para presupuestar</option>
              <option value="operations">Listas para operar</option>
              <option value="billing">Listas para facturar</option>
            </Select>
            <Select value={filterSector} onChange={(e) => setFilterSector(e.target.value)}>
              <option value="all">Todas las categorías</option>
              {sectores.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
              <option value="all">Todos los responsables</option>
              <option value="carlos">Carlos Mendoza</option>
              <option value="elena">Elena Rivas</option>
              <option value="laura">Laura Vidal</option>
            </Select>
            <span className="ml-auto text-[11px] text-slate-500">{filteredCompanies.length} de {companies.length}</span>
          </div>

          {filteredCompanies.length === 0 ? (
            <EmptyState icon={Building2} title="No hay empresas con estos filtros" text="Prueba con otra búsqueda o cambia los filtros." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                    <th className="py-2 px-3 font-medium">Empresa</th>
                    <th className="py-2 px-3 font-medium">Categoría</th>
                    <th className="py-2 px-3 font-medium">CIF</th>
                    <th className="py-2 px-3 font-medium">Contacto principal</th>
                    <th className="py-2 px-3 font-medium">Preparación</th>
                    <th className="py-2 px-3 font-medium">Responsable</th>
                    <th className="py-2 px-3 font-medium">Última actividad</th>
                    <th className="py-2 px-3" aria-label="Acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map(company => {
                    const mainContact = company.contacts.find(c => c.isMain) || company.contacts[0];
                    const pasos = [
                      { label: 'Alta', ok: true },
                      { label: 'Presupuesto', ok: company.readiness.quote },
                      { label: 'Operativa', ok: company.readiness.operations },
                      { label: 'Factura', ok: company.readiness.billing },
                    ];
                    return (
                      <tr
                        key={company.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setSelectedCompanyId(company.id);
                          setViewMode('detail');
                        }}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 min-w-[180px]">{company.name}</div>
                          {company.tradeName && company.tradeName !== company.name && (
                            <div className="text-[11px] text-slate-500">{company.tradeName}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {company.sector ? <Badge>{company.sector}</Badge> : <span className="text-slate-400">Sin categoría</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{company.cif}</td>
                        <td className="py-2.5 px-3">
                          {mainContact ? (
                            <>
                              <div className="text-slate-700">{mainContact.name}</div>
                              <div className="text-[11px] text-slate-500">{mainContact.email || mainContact.phone}</div>
                            </>
                          ) : (
                            <Badge tone="warning">Sin contacto</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge tone={company.readiness.quote ? 'success' : 'warning'} dot>{company.readinessLabel}</Badge>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]">
                            {pasos.map(p => (
                              <span key={p.label} className={`whitespace-nowrap ${p.ok ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {p.ok ? '✓' : '·'} {p.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{company.owner}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500"><div className="max-w-[180px] truncate" title={company.lastActivity}>{company.lastActivity}</div></td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCompanyId(company.id);
                              setViewMode('detail');
                            }}
                          >
                            Abrir
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Notice tone="info" icon={Info}>
          <span className="font-medium">Alta progresiva:</span> se puede presupuestar con los datos básicos. Los centros, el IBAN
          y los convenios solo se piden cuando el cliente acepta la propuesta.
        </Notice>
      </Page>
    )}

    {/* VISTA 2: FICHA 360º DE LA EMPRESA */}
    {viewMode === 'detail' && (
      <div className="w-full px-4 sm:px-6 py-5 space-y-4">
        <PageHeader
          breadcrumbs={[{ label: 'Empresas', onClick: () => setViewMode('list') }, { label: currentCompany.name }]}
          title={currentCompany.name}
          status={
            <>
              <Badge tone="success" dot>Cliente activo</Badge>
              <Badge tone={currentCompany.readiness.quote ? 'success' : 'warning'}>{currentCompany.readinessLabel}</Badge>
            </>
          }
          subtitle={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono">CIF {currentCompany.cif}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{currentCompany.city ? `${currentCompany.city} (${currentCompany.province})` : 'Sin dirección fiscal'}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" />{currentCompany.sector || 'Sector sin indicar'}</span>
              <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" />Responsable: {currentCompany.owner}</span>
            </span>
          }
          actions={
            <>
              <Button icon={Edit3} onClick={() => setDrawerState({ isOpen: true, type: 'edit-company', data: currentCompany, hasUnsavedChanges: false })}>
                Editar ficha
              </Button>
              <Button variant="primary" icon={FileCheck} onClick={() => showToast(`Iniciando presupuesto para ${currentCompany.name}...`)}>
                Crear presupuesto
              </Button>
            </>
          }
        />

        <Tabs
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'resumen', label: 'Resumen' },
            { id: 'datos', label: 'Datos generales' },
            { id: 'contactos', label: 'Contactos', count: currentCompany.contacts.length },
            { id: 'centros', label: 'Centros', count: currentCompany.centers.length },
            { id: 'facturacion', label: 'Facturación' },
            { id: 'documentos', label: 'Documentos' },
            { id: 'actividad', label: 'Historial' },
          ]}
        />

        {/* CONTENIDO DE LA PESTAÑA SELECCIONADA */}
        <div>
          
          {/* TAB 1: RESUMEN FUNCIONAL */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              
              {/* ESTADOS FUNCIONALES DESCRIPTIVOS (Sin porcentajes vacíos) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Estado operativo y desbloqueo de acciones</h3>
                    <p className="text-xs text-slate-500">Explicación clara de qué datos faltan y qué operativa habilitan.</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2.5 py-1 rounded-lg">
                    Flujo ETT progresivo
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
                  
                  {/* ESTADO 1: ALTA BÁSICA */}
                  <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-emerald-950">1. Alta Básica Completada</div>
                      <p className="text-xs text-slate-600">
                        Razón social, CIF (<strong className="font-mono">{currentCompany.cif}</strong>), país, teléfono de contacto y asesor comercial asignado.
                      </p>
                      <div className="text-[11px] text-emerald-700 font-medium">✓ Empresa registrada en el sistema</div>
                    </div>
                  </div>

                  {/* ESTADO 2: LISTA PARA PRESUPUESTAR */}
                  <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-950">2. Lista para Presupuestar</span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">HABILITADO</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Tiene contacto destinatario (<strong>{currentCompany.contacts[0]?.name || 'Marta Gómez'}</strong>) listo para recibir propuestas de tarifa/hora.
                      </p>
                      <div className="pt-1">
                        <button
                          onClick={() => showToast(`Iniciando presupuesto para ${currentCompany.name}...`)}
                          className="text-xs font-semibold text-emerald-700 hover:text-indigo-900 flex items-center gap-1 underline"
                        >
                          Crear presupuesto comercial ahora →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ESTADO 3: PETICIÓN OPERATIVA (Falta centro) */}
                  <div className={`p-4 rounded-lg border ${
                    currentCompany.centers.length > 0 
                      ? 'border-emerald-200 bg-emerald-50/40' 
                      : 'border-amber-200 bg-amber-50/50'
                  } flex items-start gap-3`}>
                    {currentCompany.centers.length > 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">3. Petición Operativa de Personal</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          currentCompany.centers.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {currentCompany.centers.length > 0 ? 'DESBLOQUEADO' : 'PENDIENTE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {currentCompany.centers.length > 0 
                          ? `Tiene ${currentCompany.centers.length} centro(s) configurado(s). Ya se pueden asignar trabajadores y turnos.`
                          : 'Falta centro de trabajo para crear una petición operativa. No bloquea el presupuesto comercial.'}
                      </p>
                      {currentCompany.centers.length === 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setDrawerState({ isOpen: true, type: 'new-center', data: null, hasUnsavedChanges: false })}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-600 text-white rounded text-xs font-medium transition"
                          >
                            Completar centro ahora
                          </button>
                          <span className="text-[11px] text-slate-400">o hacerlo más tarde al cerrar el contrato</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ESTADO 4: FACTURACIÓN */}
                  <div className={`p-4 rounded-lg border ${
                    currentCompany.billing.isComplete 
                      ? 'border-emerald-200 bg-emerald-50/40' 
                      : 'border-slate-200 bg-slate-50'
                  } flex items-start gap-3`}>
                    {currentCompany.billing.isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">4. Facturación Mensual / Nóminas</span>
                        <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          {currentCompany.billing.isComplete ? 'CONFIGURADO' : 'PENDIENTE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Faltan datos fiscales avanzados (IBAN, días de pago y scoring de riesgo). Se requerirán antes de la primera factura mensual.
                      </p>
                      <div className="pt-1">
                        <button
                          onClick={() => setActiveTab('facturacion')}
                          className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 underline"
                        >
                          Revisar requisitos de facturación →
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* DATOS RÁPIDOS & ÚLTIMA ACTIVIDAD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tarjeta Contacto Principal */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      Contacto Destinatario
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                      Principal
                    </span>
                  </div>
                  
                  {currentCompany.contacts.length > 0 ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-800">{currentCompany.contacts[0].name}</div>
                      <div className="text-slate-500">{currentCompany.contacts[0].role}</div>
                      <div className="pt-1 text-slate-600 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {currentCompany.contacts[0].email}
                      </div>
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {currentCompany.contacts[0].phone}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600">No hay contactos registrados.</div>
                  )}

                  <button
                    onClick={() => setActiveTab('contactos')}
                    className="w-full text-center text-xs text-slate-600 hover:text-indigo-700 font-medium pt-2 border-t border-slate-100 block"
                  >
                    Ver todos los contactos ({currentCompany.contacts.length}) →
                  </button>
                </div>

                {/* Tarjeta Centros de Trabajo */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Centros operativos ETT
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      currentCompany.centers.length > 0 ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {currentCompany.centers.length} centro(s)
                    </span>
                  </div>

                  {currentCompany.centers.length > 0 ? (
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-slate-800">{currentCompany.centers[0].name}</div>
                      <div className="text-slate-500">{currentCompany.centers[0].address}</div>
                      <div className="text-slate-500">{currentCompany.centers[0].city}</div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-2">
                      <div>Ningún centro registrado aún. Es necesario para asignar carretilleros o peones a una nave física.</div>
                      <button
                        onClick={() => setDrawerState({ isOpen: true, type: 'new-center', data: null, hasUnsavedChanges: false })}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-600 text-white rounded text-[11px] font-medium"
                      >
                        + Añadir primer centro
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTab('centros')}
                    className="w-full text-center text-xs text-slate-600 hover:text-indigo-700 font-medium pt-2 border-t border-slate-100 block"
                  >
                    Gestionar centros y accesos PRL →
                  </button>
                </div>

                {/* Tarjeta de Acciones rápidas ETT */}
                <div className="bg-white p-4 rounded-xl text-slate-900 space-y-3 shadow-sm border border-slate-200">
                  <div className="text-xs font-semibold text-emerald-600">
                    Operativa de venta ETT
                  </div>
                  <div className="text-xs text-slate-500">
                    ¿Listo para enviar la propuesta económica de carretilleros / mozos?
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => showToast(`Creando propuesta comercial para ${currentCompany.name}`)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Nuevo presupuesto ETT
                    </button>

                    <button
                      onClick={() => setDrawerState({ isOpen: true, type: 'new-contact', data: null, hasUnsavedChanges: false })}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs transition"
                    >
                      + Añadir otro contacto comercial
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: DATOS GENERALES */}
          {activeTab === 'datos' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Identificación y datos fiscales básicos</h3>
                  <p className="text-xs text-slate-500">Datos registrados en el alta rápida inicial.</p>
                </div>
                <button
                  onClick={() => setDrawerState({ isOpen: true, type: 'edit-company', data: currentCompany, hasUnsavedChanges: false })}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modificar datos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">Razón Social</div>
                    <div className="font-semibold text-slate-800 text-sm mt-0.5">{currentCompany.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">Nombre Comercial</div>
                    <div className="text-slate-700 mt-0.5">{currentCompany.tradeName || 'Igual a la razón social'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">CIF / NIF</div>
                    <div className="font-mono font-semibold text-slate-800 text-sm mt-0.5">{currentCompany.cif}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">País</div>
                    <div className="text-slate-700 mt-0.5">{currentCompany.country}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">Dirección Fiscal</div>
                    <div className="text-slate-700 mt-0.5">{currentCompany.address || 'No especificada'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-slate-400 text-[11px] font-semibold">C.P.</div>
                      <div className="text-slate-700 mt-0.5">{currentCompany.postalCode || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px] font-semibold">Localidad</div>
                      <div className="text-slate-700 mt-0.5">{currentCompany.city || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px] font-semibold">Provincia</div>
                      <div className="text-slate-700 mt-0.5">{currentCompany.province || '-'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">Sector / Actividad Principal</div>
                    <div className="text-slate-700 mt-0.5">{currentCompany.sector || 'General'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px] font-semibold">Responsable ETT Asignado</div>
                    <div className="text-emerald-700 font-semibold mt-0.5">{currentCompany.owner}</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="text-slate-400 text-[11px] font-semibold mb-1">Observaciones Comerciales</div>
                <div className="bg-slate-50 p-3 rounded-lg text-slate-700 text-xs leading-relaxed border border-slate-200">
                  {currentCompany.notes || 'Sin observaciones registradas.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTACTOS */}
          {activeTab === 'contactos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Directorio de contactos de la empresa</h3>
                  <p className="text-xs text-slate-500">
                    Solo se exige nombre y teléfono/email. No pedimos DNI.
                  </p>
                </div>
                <button
                  onClick={() => setDrawerState({ isOpen: true, type: 'new-contact', data: null, hasUnsavedChanges: false })}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Añadir contacto
                </button>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
                {currentCompany.contacts.map(contact => (
                  <div 
                    key={contact.id}
                    className={`bg-white p-5 rounded-xl border transition shadow-sm space-y-3 ${
                      contact.isMain ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-slate-200'
                    } ${contact.suspendido ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs ${
                          contact.isMain ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {contact.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                            {contact.name}
                            {contact.isMain && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.2 rounded-full">
                                Principal
                              </span>
                            )}
                            {contact.suspendido && <Badge tone="warning">Suspendido</Badge>}
                          </div>
                          <div className="text-xs text-slate-500">{contact.role || 'Sin cargo especificado'}</div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <IconButton icon={Edit3} title="Editar contacto" onClick={() => setDrawerState({ isOpen: true, type: 'edit-contact', data: contact, hasUnsavedChanges: false })} />
                        <IconButton
                          icon={contact.suspendido ? CirclePlay : CirclePause}
                          title={contact.suspendido ? 'Reactivar contacto' : 'Suspender: deja de recibir presupuestos y avisos'}
                          onClick={() => alternarSuspension('contacto', contact)}
                        />
                        <IconButton icon={Trash2} title="Eliminar contacto" className="hover:text-rose-600 hover:bg-rose-50" onClick={() => setABorrar({ tipo: 'contacto', item: contact })} />
                      </div>
                    </div>

                    {/* Etiquetas de tipo */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {contact.types.map((type, idx) => (
                        <span 
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            type === 'Destinatario de Presupuestos' 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
                              : type === 'RR. HH.' || type === 'Dirección'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {type}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`mailto:${contact.email}`} className="hover:underline text-emerald-700 font-medium">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.notes && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded mt-2">
                          {contact.notes}
                        </div>
                      )}
                    </div>

                    {/* Acceso al Área de empresas */}
                    <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-400" />Acceso al Área de empresas</span>
                        <Interruptor
                          label={contact.portal?.activo ? 'Quitar el acceso' : 'Dar acceso'}
                          checked={!!contact.portal?.activo}
                          onChange={(v) => (v
                            ? (contact.email ? setAccesoPortal({ contacto: contact, permisos: contact.portal?.permisos || permisosPorRoles(contact.types), nuevo: true }) : showToast('Añade un email al contacto para poder invitarlo', 'error'))
                            : quitarAccesoPortal(contact))}
                        />
                      </div>
                      {contact.portal?.activo ? (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {contact.portal.permisos.map(id => <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{PERMISOS_PORTAL.find(p => p.id === id)?.texto}</span>)}
                            {contact.portal.permisos.length === 0 && <span className="text-amber-700">Sin permisos: solo ve el inicio</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span>{contact.portal.ultimoAcceso ? `Último acceso: ${contact.portal.ultimoAcceso}` : `Invitado el ${contact.portal.invitado?.split('-').reverse().join('/')} · aún no ha entrado`}</span>
                            <button type="button" className="text-indigo-700 hover:underline" onClick={() => setAccesoPortal({ contacto: contact, permisos: contact.portal.permisos, nuevo: false })}>Cambiar permisos</button>
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-500">{contact.email ? 'Sin acceso. Al activarlo le llega una invitación por correo.' : 'Necesita un email para poder entrar.'}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {accesoPortal && (
                <Modal
                  title={accesoPortal.nuevo ? 'Dar acceso al Área de empresas' : 'Permisos en el Área de empresas'}
                  subtitle={`${accesoPortal.contacto.name} · ${accesoPortal.contacto.role || currentCompany.name}`}
                  onClose={() => setAccesoPortal(null)}
                  size="max-w-lg"
                  footer={<>
                    <Button onClick={() => setAccesoPortal(null)}>Cancelar</Button>
                    <Button variant="primary" icon={accesoPortal.nuevo ? Mail : Check} onClick={guardarAccesoPortal}>{accesoPortal.nuevo ? 'Enviar invitación' : 'Guardar'}</Button>
                  </>}
                >
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-600">Qué puede hacer en el Área de empresas. Todos ven el inicio y su cuenta. {accesoPortal.nuevo && 'Proponemos los permisos según sus roles en la ficha.'}</p>
                    <div className="space-y-1.5">
                      {PERMISOS_PORTAL.map(p => {
                        const activo = accesoPortal.permisos.includes(p.id);
                        return (
                          <label key={p.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer ${activo ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'}`}>
                            <input type="checkbox" checked={activo} onChange={() => setAccesoPortal(a => ({ ...a, permisos: activo ? a.permisos.filter(x => x !== p.id) : [...a.permisos, p.id] }))} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <span><span className="block font-medium text-slate-800">{p.texto}</span><span className="block text-xs text-slate-500">{p.detalle}</span></span>
                          </label>
                        );
                      })}
                    </div>
                    {accesoPortal.permisos.includes('horas') && !accesoPortal.contacto.types.includes('Valida horas') && (
                      <Notice tone="warning" icon={AlertTriangle}>No tiene el rol «Valida horas» en la ficha: en Horas e incidencias no saldrá como contacto que valida.</Notice>
                    )}
                    {accesoPortal.nuevo && <Notice tone="info" icon={Mail}>Le enviaremos una invitación a <strong>{accesoPortal.contacto.email}</strong> para que elija su contraseña. El texto del correo está en Mi ETT → Portales.</Notice>}
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* TAB 4: CENTROS */}
          {activeTab === 'centros' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Centros de trabajo / naves operativas</h3>
                  <p className="text-xs text-slate-500">
                    Requeridos únicamente para <strong>Peticiones Operativas</strong> (asignar trabajadores al centro y turno).
                  </p>
                </div>
                <button
                  onClick={() => setDrawerState({ isOpen: true, type: 'new-center', data: null, hasUnsavedChanges: false })}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Añadir centro
                </button>
              </div>

              {currentCompany.centers.length === 0 ? (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="text-sm font-semibold text-amber-950">No hay centros de trabajo configurados</h4>
                    <p className="text-xs text-amber-800 mt-1">
                      Esta empresa puede recibir y firmar presupuestos comerciales sin problemas. Solo necesitarás registrar el centro cuando vayas a tramitar la petición operativa de incorporación de carretilleros.
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerState({ isOpen: true, type: 'new-center', data: null, hasUnsavedChanges: false })}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    + Añadir centro operativo (pabellón / sede)
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
                  {currentCompany.centers.map(center => (
                    <div key={center.id} className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 ${center.suspendido ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">{center.name}{center.suspendido && <Badge tone="warning">Inactivo</Badge>}</h4>
                            <p className="text-xs text-slate-500">{center.address}, {center.postalCode} {center.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <IconButton icon={Edit3} title="Editar centro" onClick={() => setDrawerState({ isOpen: true, type: 'edit-center', data: center, hasUnsavedChanges: false })} />
                          <IconButton
                            icon={center.suspendido ? CirclePlay : CirclePause}
                            title={center.suspendido ? 'Reactivar centro' : 'Desactivar: no se podrá usar en peticiones nuevas'}
                            onClick={() => alternarSuspension('centro', center)}
                          />
                          <IconButton icon={Trash2} title="Eliminar centro" className="hover:text-rose-600 hover:bg-rose-50" onClick={() => setABorrar({ tipo: 'centro', item: center })} />
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                        <div className="font-semibold text-slate-700 text-[11px]">Datos Operativos</div>
                        <div>Convenio aplicación: {center.laborAgreement || 'General ETT Sectorial'}</div>
                        {center.notes && <div className="text-slate-500 italic">"{center.notes}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FACTURACIÓN & FINANCIERO */}
          {activeTab === 'facturacion' && (
            <div className="space-y-6">
              
              {/* BANNER RESTRINGIDO / EXPLICATIVO */}
              <div className="bg-white text-slate-900 p-5 rounded-xl flex items-start justify-between gap-4 shadow-sm border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">Módulo financiero y facturación ETT</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                        Área Avanzada
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl">
                      Estos datos no bloquean la creación de presupuestos comerciales ni las llamadas de prospección. Solo serán requeridos y validados por el departamento de Administración antes de la emisión de la primera factura mensual.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs font-semibold whitespace-nowrap">
                  Estado: Pendiente de scoring
                </span>
              </div>

              {/* CHECKLIST DE REQUISITOS PARA FACTURAR */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h4 className="text-xs font-semibold text-slate-900">
                  Requisitos previos a la emisión de facturas
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">Razón Social y CIF Fiscal</span>
                      <div className="text-[11px] text-slate-500">{currentCompany.name} ({currentCompany.cif})</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">Dirección Fiscal Completa</span>
                      <div className="text-[11px] text-slate-500">Basauri (Bizkaia)</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">IBAN / Mandato SEPA B2B</span>
                      <div className="text-[11px] text-amber-700">Pendiente de recibir firmado</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">Límite de Riesgo / Crédito ETT</span>
                      <div className="text-[11px] text-amber-700">Límite propuesto 30.000 € (Pendiente riesgo)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETALLE DE CAMPOS FINANCIEROS */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-semibold text-slate-900">
                    Condiciones comerciales y días de pago
                  </h4>
                  <span className="text-[11px] text-slate-400">Editable por rol Administración</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 text-[11px] font-semibold">Forma de pago acordada</label>
                    <div className="mt-1">
                      <SelectConAlta
                        value={currentCompany.billing.paymentMethod || ''}
                        onChange={(v) => actualizarFacturacion('paymentMethod', v)}
                        options={formasPago}
                        onAdd={anadirA(setFormasPago)}
                        placeholder="Selecciona una opción"
                        nuevoPlaceholder="Ej. Transferencia a 45 días"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] font-semibold">Días fijos de pago del cliente</label>
                    <div className="mt-1">
                      <SelectConAlta
                        value={currentCompany.billing.fixedPayDays || ''}
                        onChange={(v) => actualizarFacturacion('fixedPayDays', v)}
                        options={diasPago}
                        onAdd={anadirA(setDiasPago)}
                        placeholder="Selecciona una opción"
                        nuevoPlaceholder="Ej. Día 20 de cada mes"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-500 text-[11px] font-semibold">IBAN bancario cliente</label>
                      <span className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold">
                        <Lock className="w-3 h-3" /> Requiere rol financiero
                      </span>
                    </div>
                    <div className="mt-1 relative">
                      <input 
                        type="text" 
                        disabled 
                        value="ES00 0000 •••• •••• •••• 0000 (Bloqueado)" 
                        className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] font-semibold">Régimen de IVA aplicable</label>
                    <div className="mt-1">
                      <SelectConAlta
                        value={currentCompany.billing.vatRegime || ''}
                        onChange={(v) => actualizarFacturacion('vatRegime', v)}
                        options={regimenesIva}
                        onAdd={anadirA(setRegimenesIva)}
                        placeholder="Selecciona una opción"
                        nuevoPlaceholder="Ej. Régimen especial agrario"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 text-right">
                  <button
                    onClick={() => showToast('Solicitud de revisión de riesgo enviada al Dpto. Financiero')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-600 text-white rounded text-xs font-semibold"
                  >
                    Solicitar validación a administración
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: DOCUMENTOS */}
          {activeTab === 'documentos' && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Documentación mercantil y contratos</h3>
                  <p className="text-xs text-slate-500">Contratos mercantiles, acuerdos de confidencialidad y CIF digitalizado.</p>
                </div>
                <Button icon={Upload} onClick={() => setSubiendoDocs(true)}>Subir documento</Button>
              </div>

              {(documentos[currentCompany.id] || []).length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Sin documentos"
                  text="Esta empresa no tiene documentos guardados."
                  action={<Button icon={Upload} onClick={() => setSubiendoDocs(true)}>Subir documento</Button>}
                />
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {(documentos[currentCompany.id] || []).map(doc => (
                    <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <button type="button" onClick={() => { setDocAbierto(doc); setZoomDoc(100); }} className="min-w-0 flex-1 text-left">
                        <div className="font-medium text-slate-900 truncate hover:text-indigo-700">{doc.nombre}</div>
                        <div className="text-[11px] text-slate-500">
                          {doc.subidoPor} · {doc.fecha} · {doc.tamano}
                          {doc.caduca && <> · <span className="text-amber-700">caduca el {doc.caduca}</span></>}
                          {doc.visibleCliente && <> · visible para el cliente</>}
                        </div>
                      </button>
                      <Badge>{doc.tipo}</Badge>
                      <Badge tone={doc.estado === 'Validado' ? 'success' : 'warning'} dot>{doc.estado}</Badge>
                      <div className="flex items-center gap-1">
                        <Button size="sm" icon={Eye} onClick={() => { setDocAbierto(doc); setZoomDoc(100); }}>Ver</Button>
                        <IconButton icon={Download} title="Descargar" onClick={() => showToast(`Descargando ${doc.nombre}...`)} />
                        <IconButton icon={Trash2} title="Eliminar" className="hover:text-rose-600 hover:bg-rose-50" onClick={() => setDocABorrar(doc)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* TAB 7: HISTORIAL Y ACTIVIDAD */}
          {activeTab === 'actividad' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Historial y trazabilidad de cambios</h3>
                <p className="text-xs text-slate-500">Registro inmutable de acciones realizadas sobre esta empresa.</p>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 text-xs">
                {currentCompany.activity.map(act => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                    <div className="font-semibold text-slate-800">{act.action}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {act.date} • Por <strong className="text-slate-600">{act.user}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    )}

  </div>

  {/* DRAWER / PANEL LATERAL: ALTA RÁPIDA & EDICIÓN */}
  {drawerState.isOpen && (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/30 transition-opacity">
      <div className="w-full max-w-xl bg-white h-full shadow-lg flex flex-col animate-drawer border-l border-slate-200">
        
        {/* RENDER FORMULARIOS DEL DRAWER */}
        {drawerState.type === 'new-company' && (
          <DrawerCompanyForm
            sectores={sectores}
            onAddSector={anadirSector}
            title="Alta rápida de empresa / cliente"
            subtitle="Solo 5 campos indispensables para empezar a presupuestar de inmediato."
            initialData={null}
            onClose={() => handleCloseDrawer()}
            onSave={(data) => handleSaveCompany(data, false)}
            onChange={() => setDrawerState(prev => ({ ...prev, hasUnsavedChanges: true }))}
          />
        )}

        {drawerState.type === 'edit-company' && (
          <DrawerCompanyForm
            sectores={sectores}
            onAddSector={anadirSector}
            title="Editar datos de empresa"
            subtitle={`Modificando ficha de ${drawerState.data?.name || currentCompany.name}`}
            initialData={drawerState.data || currentCompany}
            isEdit={true}
            onClose={() => handleCloseDrawer()}
            onSave={(data) => handleSaveCompany(data, true)}
            onChange={() => setDrawerState(prev => ({ ...prev, hasUnsavedChanges: true }))}
          />
        )}

        {drawerState.type === 'new-contact' && (
          <DrawerContactForm
            title="Añadir contacto a la empresa"
            subtitle={`Vinculado automáticamente a: ${currentCompany.name}`}
            companyName={currentCompany.name}
            initialData={null}
            onClose={() => handleCloseDrawer()}
            onSave={(data) => handleSaveContact(data, false)}
            onChange={() => setDrawerState(prev => ({ ...prev, hasUnsavedChanges: true }))}
          />
        )}

        {drawerState.type === 'edit-contact' && (
          <DrawerContactForm
            title="Editar Contacto"
            subtitle={`Editando contacto de ${currentCompany.name}`}
            companyName={currentCompany.name}
            initialData={drawerState.data}
            isEdit={true}
            onClose={() => handleCloseDrawer()}
            onSave={(data) => handleSaveContact(data, true)}
            onChange={() => setDrawerState(prev => ({ ...prev, hasUnsavedChanges: true }))}
          />
        )}

        {drawerState.type === 'new-center' && (
          <DrawerCenterForm
            title="Nuevo centro / nave operativa"
            subtitle="Datos de la ubicación donde trabajarán los carretilleros o mozos."
            companyFiscalAddress={currentCompany.address}
            companyCity={currentCompany.city}
            companyPostalCode={currentCompany.postalCode}
            initialData={null}
            onClose={() => handleCloseDrawer()}
            onSave={(data) => handleSaveCenter(data, false)}
            onChange={() => setDrawerState(prev => ({ ...prev, hasUnsavedChanges: true }))}
          />
        )}

        {drawerState.type === 'edit-center' && (
          <DrawerCenterForm
            title="Editar centro operativo"
            subtitle="Modificación de ubicación o reglas laborales particulares."
            initialData={drawerState.data}
            isEdit={true}
            onClose={() => handleCloseDrawer()}
            onSave={(data) => handleSaveCenter(data, true)}
            onChange={() => setDrawerState(prev => ({ ...prev, hasUnsavedChanges: true }))}
          />
        )}

      </div>
    </div>
  )}

  {/* MODAL DE CAMBIOS SIN GUARDAR (Microinteracción UX) */}
  {discardModalOpen && (
    <Modal
      title={'¿Descartar los cambios sin guardar?'}
      onClose={() => setDiscardModalOpen(false)}
      size="max-w-md"
      footer={<>
          <button
            onClick={() => setDiscardModalOpen(false)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Seguir editando
          </button>
          <button
            onClick={() => handleCloseDrawer(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-sm"
          >
            Descartar cambios
          </button>
      </>}
    >
      <p className="text-xs text-slate-600">Si cierras ahora perderás los datos introducidos.</p>
    </Modal>
  )}

  {/* VISOR DE DOCUMENTOS */}
  {docAbierto && (
    <Modal
      title={docAbierto.nombre}
      subtitle={<>{docAbierto.tipo} · {docAbierto.paginas} {docAbierto.paginas === 1 ? 'página' : 'páginas'} · {docAbierto.tamano}</>}
      status={<Badge tone={docAbierto.estado === 'Validado' ? 'success' : 'warning'} dot>{docAbierto.estado}</Badge>}
      onClose={() => setDocAbierto(null)}
      size="max-w-5xl"
      toolbar={
        <div className="flex items-center justify-between gap-2 px-5 py-2 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>Página 1 de {docAbierto.paginas}</span>
          <div className="flex items-center gap-1">
            <IconButton icon={ZoomOut} title="Alejar" onClick={() => setZoomDoc(z => Math.max(50, z - 25))} />
            <span className="w-10 text-center">{zoomDoc} %</span>
            <IconButton icon={ZoomIn} title="Acercar" onClick={() => setZoomDoc(z => Math.min(200, z + 25))} />
          </div>
        </div>
      }
      footer={
        <div className="flex flex-1 items-center justify-between gap-2">
          <Button variant="danger" icon={Trash2} onClick={() => setDocABorrar(docAbierto)}>Eliminar</Button>
          <div className="flex items-center gap-2">
            <Button icon={Download} onClick={() => showToast(`Descargando ${docAbierto.nombre}...`)}>Descargar</Button>
            <Button variant="primary" onClick={() => setDocAbierto(null)}>Cerrar</Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        {/* Vista previa (en la demo, una página simulada) */}
        <div className="bg-slate-100 rounded-lg p-4 overflow-auto max-h-[60vh] flex justify-center">
          <div
            className="bg-white shadow-sm border border-slate-200 p-8 space-y-3 origin-top transition-transform"
            style={{ width: 420, minHeight: 560, transform: `scale(${zoomDoc / 100})` }}
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="text-[10px] text-slate-400">{docAbierto.fecha}</div>
            </div>
            <div className="pt-4 text-sm font-semibold text-slate-800">{docAbierto.nombre.replace(/\.pdf$/i, '')}</div>
            <div className="text-[10px] text-slate-400">{currentCompany.name} · CIF {currentCompany.cif}</div>
            {[92, 100, 86, 97, 64, 100, 90, 78, 100, 55].map((w, i) => (
              <div key={i} className="h-2 rounded bg-slate-100" style={{ width: `${w}%` }} />
            ))}
            <div className="pt-6 grid grid-cols-2 gap-6">
              <div className="h-10 border-b border-slate-200" />
              <div className="h-10 border-b border-slate-200" />
            </div>
            <p className="pt-4 text-center text-[10px] text-slate-400">Vista previa de ejemplo</p>
          </div>
        </div>

        {/* Datos del documento */}
        <dl className="text-xs space-y-3">
          {[
            ['Tipo', docAbierto.tipo],
            ['Empresa', currentCompany.name],
            ['Subido por', docAbierto.subidoPor],
            ['Fecha', docAbierto.fecha],
            ['Tamaño', docAbierto.tamano],
            ['Páginas', docAbierto.paginas],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-slate-500">{k}</dt>
              <dd className="text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  )}

  {/* CONFIRMAR BORRADO DE DOCUMENTO */}
  {docABorrar && (
    <Confirmar
      title="¿Eliminar este documento?"
      onClose={() => setDocABorrar(null)}
      onConfirm={() => {
        setDocumentos(prev => ({
          ...prev,
          [currentCompany.id]: (prev[currentCompany.id] || []).filter(d => d.id !== docABorrar.id),
        }));
        if (docAbierto?.id === docABorrar.id) setDocAbierto(null);
        showToast(`Documento eliminado: ${docABorrar.nombre}`);
        setDocABorrar(null);
      }}
    >
      <p>
        De la ficha de {currentCompany.name} se borrará <strong className="text-slate-800">{docABorrar.nombre}</strong>.
        En el historial quedará anotado quién lo eliminó y cuándo, pero no el documento.
      </p>
    </Confirmar>
  )}

  {/* CONFIRMAR BORRADO DE CONTACTO O CENTRO */}
  {aBorrar && (
    <Confirmar
      title={aBorrar.tipo === 'contacto' ? `¿Eliminar a ${aBorrar.item.name}?` : `¿Eliminar el centro ${aBorrar.item.name}?`}
      confirmLabel="Eliminar definitivamente"
      onClose={() => setABorrar(null)}
      onConfirm={eliminarElemento}
      alternativa={
        aBorrar.item.suspendido
          ? undefined
          : {
              label: aBorrar.tipo === 'contacto' ? 'Suspender' : 'Desactivar',
              icon: CirclePause,
              onClick: () => {
                alternarSuspension(aBorrar.tipo, aBorrar.item);
                setABorrar(null);
              },
            }
      }
    >
      {aBorrar.tipo === 'contacto' ? (
        <>
          <p>Se borrarán sus datos de contacto y dejará de aparecer en presupuestos, avisos y portal del cliente.</p>
          {aBorrar.item.isMain && <Notice tone="warning" icon={AlertTriangle}>Es el contacto principal: tendrás que elegir otro.</Notice>}
          {!aBorrar.item.suspendido && (
            <p>
              Si solo deja de estar disponible por un tiempo, <strong className="text-slate-800">suspéndelo</strong>: no recibirá nada y podrás reactivarlo cuando quieras.
            </p>
          )}
        </>
      ) : (
        <>
          <p>Se borrará el centro con su dirección y sus datos operativos. Las peticiones ya cerradas conservan su copia.</p>
          {!aBorrar.item.suspendido && (
            <p>
              Si el centro solo cierra una temporada, <strong className="text-slate-800">desactívalo</strong>: no se podrá usar en peticiones nuevas y podrás reactivarlo.
            </p>
          )}
        </>
      )}
    </Confirmar>
  )}

  {/* SUBIR DOCUMENTOS */}
  {subiendoDocs && (
    <SubirDocumentos
      empresa={currentCompany.name}
      tipos={tiposDoc}
      onAddTipo={(v) => setTiposDoc(prev => [...prev, v].sort((x, y) => x.localeCompare(y, 'es')))}
      onClose={() => setSubiendoDocs(false)}
      onSubir={(nuevos) => {
        setDocumentos(prev => ({ ...prev, [currentCompany.id]: [...nuevos, ...(prev[currentCompany.id] || [])] }));
        setSubiendoDocs(false);
        showToast(nuevos.length === 1 ? 'Documento subido. Queda pendiente de validar.' : `${nuevos.length} documentos subidos. Quedan pendientes de validar.`);
      }}
    />
  )}

  {/* PANEL EXPLICATIVO: REGLAS UX APLICADAS */}
  {showRulesDrawer && (
    <Drawer
      title={'Reglas de diseño para ETT'}
      onClose={() => setShowRulesDrawer(false)}
      width="max-w-md"
      footer={<>
          <button
            onClick={() => setShowRulesDrawer(false)}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-600 text-slate-900 font-semibold rounded-lg text-xs"
          >
            Entendido, continuar probando
          </button>
      </>}
    >

        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 1. Alta rápida en 5 campos obligatorios
            </div>
            <p className="text-slate-500 leading-relaxed">
              El consultor comercial puede dar de alta un prospecto en 30 segundos mientras habla por teléfono. Solo se exigen: <strong>Razón Social, CIF/NIF, País, Email/Teléfono</strong> y <strong>Responsable</strong>.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 2. Desacople total: Presupuesto vs operativa
            </div>
            <p className="text-slate-500 leading-relaxed">
              Para emitir una oferta comercial (precio/hora de carretillero o peón), <strong>NO se requiere</strong> centros de trabajo, convenios nómina, turnos ni datos bancarios. No bloqueamos la venta con burocracia técnica.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 3. Petición operativa requiere centro
            </div>
            <p className="text-slate-500 leading-relaxed">
              Cuando el cliente aprueba la propuesta y se inicia la <strong>Petición de Personal</strong>, el sistema solicita el Centro Operativo para coordinar la entrada de los trabajadores y prevención PRL.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 4. Facturación y IBAN como paso final
            </div>
            <p className="text-slate-500 leading-relaxed">
              Los datos de pago e IBAN quedan restringidos al departamento de facturación y se piden antes de emitir la primera factura mensual, con estados "Pendiente" y avisos transparentes.
            </p>
          </div>
        </div>

    </Drawer>
  )}

</div>
      );
    }

    // COMPONENTE: FORMULARIO DE ALTA RÁPIDA / EDICIÓN DE EMPRESA
    function DrawerCompanyForm({ title, subtitle, initialData, isEdit = false, onClose, onSave, onChange, sectores, onAddSector }) {
      const [name, setName] = useState(initialData?.name || '');
      const [cif, setCif] = useState(initialData?.cif || '');
      const [country, setCountry] = useState(initialData?.country || 'España');
      const [email, setEmail] = useState(initialData?.email || '');
      const [phone, setPhone] = useState(initialData?.phone || '');
      const [owner, setOwner] = useState(initialData?.owner || 'Carlos Mendoza (Consultor ETT)');

      // Campos opcionales (Más datos)
      const [showMore, setShowMore] = useState(isEdit || false);
      const [tradeName, setTradeName] = useState(initialData?.tradeName || '');
      const [address, setAddress] = useState(initialData?.address || '');
      const [postalCode, setPostalCode] = useState(initialData?.postalCode || '');
      const [city, setCity] = useState(initialData?.city || '');
      const [province, setProvince] = useState(initialData?.province || '');
      const [sector, setSector] = useState(initialData?.sector || '');
      const [notes, setNotes] = useState(initialData?.notes || '');

      // Validación & Duplicados Demo
      const [errors, setErrors] = useState({});
      const [duplicateWarning, setDuplicateWarning] = useState(null);
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleCifChange = (val) => {
setCif(val);
onChange();
if (val.trim().toUpperCase() === 'B-87654321' && !isEdit) {
  setDuplicateWarning('Aviso: Ya existe una empresa registrada con CIF B-87654321 ("Trans-Logística Ibérica Norte, S.L.").');
} else {
  setDuplicateWarning(null);
}
      };

      const handleSubmit = (e) => {
e.preventDefault();
const errs = {};

if (!name.trim()) errs.name = 'La Razón Social es obligatoria';
if (!cif.trim()) errs.cif = 'El CIF/NIF es obligatorio';
if (!country.trim()) errs.country = 'El país es obligatorio';
if (!email.trim() && !phone.trim()) {
  errs.contact = 'Indica al menos un Email o un Teléfono de contacto inicial';
}
if (!owner.trim()) errs.owner = 'Asigna un responsable interno';

if (Object.keys(errs).length > 0) {
  setErrors(errs);
  return;
}

setIsSubmitting(true);
setTimeout(() => {
  onSave({
    name,
    cif: cif.toUpperCase(),
    country,
    email,
    phone,
    owner,
    tradeName: tradeName || name,
    address,
    postalCode,
    city,
    province,
    sector,
    notes
  });
}, 400);
      };

      return (
<div className="flex flex-col h-full bg-white">
  {/* Header */}
  <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="text-[11px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded-lg">
          {isEdit ? 'Edición' : '5 Campos Clave'}
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </div>
    <button 
      onClick={onClose}
      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
    >
      <X className="w-4 h-4" />
    </button>
  </div>

  {/* Form Body */}
  <form id="company-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
    
    {/* Aviso de duplicados si aplica */}
    {duplicateWarning && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3 text-amber-900 animate-in fade-in">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <div className="font-semibold text-xs">{duplicateWarning}</div>
          <div className="text-[11px] text-amber-800">
            Puedes revisar la ficha existente o continuar si se trata de otra filial con NIF específico.
          </div>
        </div>
      </div>
    )}

    {/* SECCIÓN OBLIGATORIA (MÁXIMO 5 CAMPOS) */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Datos indispensables (alta rápida)
        </span>
        <span className="text-[10px] text-slate-400">* Campos obligatorios</span>
      </div>

      {/* 1. Razón Social */}
      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Razón Social *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); onChange(); }}
          placeholder="Ej. Trans-Logística Ibérica Norte, S.L."
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs ${
            errors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
          }`}
        />
        {errors.name && <p className="text-rose-600 text-[11px] mt-1">{errors.name}</p>}
      </div>

      {/* 2. CIF / NIF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            CIF / NIF *
          </label>
          <input
            type="text"
            value={cif}
            onChange={(e) => handleCifChange(e.target.value)}
            placeholder="Ej. B-87654321"
            className={`w-full px-3 py-2 border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs ${
              errors.cif ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
            }`}
          />
          {errors.cif && <p className="text-rose-600 text-[11px] mt-1">{errors.cif}</p>}
        </div>

        {/* 3. País */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            País *
          </label>
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); onChange(); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
          >
            <option value="España">España</option>
            <option value="Portugal">Portugal</option>
            <option value="Francia">Francia</option>
            <option value="Otro">Otro (Internacional)</option>
          </select>
        </div>
      </div>

      {/* 4. Teléfono y Email (Al menos uno) */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
        <div className="font-semibold text-slate-800 text-[11px]">
          Contacto rápido de la empresa (indica al menos uno) *
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 text-[11px] mb-1">Teléfono principal</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); onChange(); }}
              placeholder="Ej. +34 944 123 456"
              className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 text-[11px] mb-1">Email general</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); onChange(); }}
              placeholder="contacto@empresa.es"
              className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
            />
          </div>
        </div>
        {errors.contact && <p className="text-rose-600 text-[11px] font-medium">{errors.contact}</p>}
      </div>

      {/* 5. Responsable Interno */}
      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Responsable ETT asignado *
        </label>
        <select
          value={owner}
          onChange={(e) => { setOwner(e.target.value); onChange(); }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
        >
          <option value="Carlos Mendoza (Consultor ETT)">Carlos Mendoza (Consultor ETT)</option>
          <option value="Elena Rivas (Consultora Senior)">Elena Rivas (Consultora Senior)</option>
          <option value="Laura Vidal (Key Account Manager)">Laura Vidal (Key Account Manager)</option>
        </select>
      </div>
    </div>

    {/* SECCIÓN OPCIONAL COLAPSABLE (MÁS DATOS) */}
    <div className="pt-2 border-t border-slate-200">
      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
      >
        <span className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-slate-500" />
          Más datos recomendados (Dirección fiscal, sector, notas...)
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showMore ? 'rotate-180' : ''}`} />
      </button>

      {showMore && (
        <div className="pt-4 space-y-4 animate-in fade-in">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nombre Comercial (si difiere)</label>
            <input
              type="text"
              value={tradeName}
              onChange={(e) => { setTradeName(e.target.value); onChange(); }}
              placeholder="Ej. TransLog Norte"
              className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dirección Fiscal</label>
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); onChange(); }}
              placeholder="Calle, Polígono, Nave..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">C. Postal</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => { setPostalCode(e.target.value); onChange(); }}
                placeholder="48970"
                className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Localidad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => { setCity(e.target.value); onChange(); }}
                placeholder="Basauri"
                className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Provincia</label>
              <input
                type="text"
                value={province}
                onChange={(e) => { setProvince(e.target.value); onChange(); }}
                placeholder="Bizkaia"
                className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sector o actividad</label>
            <SelectConAlta
              value={sector}
              onChange={(v) => { setSector(v); onChange(); }}
              options={sectores}
              onAdd={onAddSector}
              placeholder="Selecciona un sector"
              nuevoPlaceholder="Nombre del nuevo sector"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observaciones Comerciales</label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); onChange(); }}
              placeholder="Detalles sobre picos de campaña, requerimientos de carnet de carretillero, etc."
              className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            ></textarea>
          </div>
        </div>
      )}
    </div>

  </form>

  {/* Footer */}
  <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
    >
      Cancelar
    </button>

    <div className="flex items-center gap-2">
      {!isEdit && (
        <button
          type="button"
          onClick={handleSubmit}
          className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
        >
          Guardar borrador
        </button>
      )}
      <button
        type="submit"
        form="company-form"
        disabled={isSubmitting}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
      >
        {isSubmitting ? 'Guardando...' : (isEdit ? 'Actualizar Empresa' : 'Crear Empresa')}
      </button>
    </div>
  </div>
</div>
      );
    }

    // COMPONENTE: FORMULARIO DE CONTACTO
    function DrawerContactForm({ title, subtitle, companyName, initialData, isEdit = false, onClose, onSave, onChange }) {
      const [name, setName] = useState(initialData?.name || '');
      const [email, setEmail] = useState(initialData?.email || '');
      const [phone, setPhone] = useState(initialData?.phone || '');
      const [role, setRole] = useState(initialData?.role || '');
      const [isMain, setIsMain] = useState(initialData?.isMain || false);
      const [isQuoteRecipient, setIsQuoteRecipient] = useState(initialData?.isQuoteRecipient || true);
      const [types, setTypes] = useState(initialData?.types || ['Comercial', 'Solicitante']);
      const [notes, setNotes] = useState(initialData?.notes || '');
      const [errors, setErrors] = useState({});

      const ROLES_BASE = ['Comercial', 'Solicitante', 'Operativo', 'Valida horas', 'Facturación', 'RR. HH.', 'Prevención / PRL', 'Dirección'];
      // Roles propios que ya tenía el contacto (escritos con "Otro") se muestran como uno más
      const availableTypes = [...ROLES_BASE, ...types.filter(t => !ROLES_BASE.includes(t) && t !== 'Otro' && t !== 'Destinatario de Presupuestos'), 'Otro'];
      const [otroRol, setOtroRol] = useState('');

      const toggleType = (t) => {
onChange();
if (types.includes(t)) {
  setTypes(types.filter(item => item !== t));
} else {
  setTypes([...types, t]);
}
      };

      const handleSubmit = (e) => {
e.preventDefault();
const errs = {};
if (!name.trim()) errs.name = 'El nombre y apellidos son obligatorios';
if (!email.trim() && !phone.trim()) {
  errs.contact = 'Indica al menos un email o teléfono para este contacto';
}

if (types.includes('Otro') && !otroRol.trim()) {
  errs.otro = 'Escribe qué función tiene este contacto';
}

if (Object.keys(errs).length > 0) {
  setErrors(errs);
  return;
}

// "Otro" se guarda con el texto que ha escrito el usuario
const finalTypes = types.map(t => (t === 'Otro' ? otroRol.trim() : t));
if (isQuoteRecipient && !finalTypes.includes('Destinatario de Presupuestos')) {
  finalTypes.push('Destinatario de Presupuestos');
}

onSave({
  id: initialData?.id,
  name,
  email,
  phone,
  role,
  isMain,
  isQuoteRecipient,
  types: finalTypes,
  notes
});
      };

      return (
<div className="flex flex-col h-full bg-white">
  <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </div>
    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
      <X className="w-4 h-4" />
    </button>
  </div>

  <form id="contact-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
    
    {/* Empresa vinculada automáticamente */}
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
      <span className="text-slate-400 font-semibold text-[11px] block">Empresa vinculada:</span>
      <span className="font-semibold text-slate-800">{companyName}</span>
    </div>

    <div>
      <label className="block font-semibold text-slate-700 mb-1">Nombre y Apellidos *</label>
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); onChange(); }}
        placeholder="Ej. Marta Gómez Arana"
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs ${
          errors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
        }`}
      />
      {errors.name && <p className="text-rose-600 text-[11px] mt-1">{errors.name}</p>}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Email directo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); onChange(); }}
          placeholder="marta.gomez@empresa.es"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Teléfono / Móvil</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); onChange(); }}
          placeholder="+34 654 987 321"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
        />
      </div>
    </div>
    {errors.contact && <p className="text-rose-600 text-[11px]">{errors.contact}</p>}

    <div>
      <label className="block font-semibold text-slate-700 mb-1">Cargo o área (opcional)</label>
      <input
        type="text"
        value={role}
        onChange={(e) => { setRole(e.target.value); onChange(); }}
        placeholder="Ej. Responsable de RRHH / Jefe de Planta"
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
      />
    </div>

    {/* Tipos / Etiquetas */}
    <div>
      <label className="block font-semibold text-slate-700 mb-2">Rol / perfil del contacto</label>
      <div className="flex flex-wrap gap-1.5">
        {availableTypes.map(t => {
          const selected = types.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                selected 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {selected ? '✓ ' : '+ '}{t}
            </button>
          );
        })}
      </div>
      {types.includes('Otro') && (
        <div className="mt-2">
          <input
            type="text"
            autoFocus
            value={otroRol}
            onChange={(e) => { setOtroRol(e.target.value); onChange(); }}
            placeholder="¿Qué función tiene? Ej. Responsable de calidad"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
          />
          {errors.otro && <p className="mt-1 text-rose-600 text-[11px]">{errors.otro}</p>}
        </div>
      )}
    </div>

    {/* Opciones de Presupuesto y Principal */}
    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isQuoteRecipient}
          onChange={(e) => { setIsQuoteRecipient(e.target.checked); onChange(); }}
          className="rounded text-emerald-600 focus:ring-indigo-500"
        />
        <span className="font-semibold text-slate-800">
          Marcar como destinatario habitual de presupuestos
        </span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isMain}
          onChange={(e) => { setIsMain(e.target.checked); onChange(); }}
          className="rounded text-emerald-600 focus:ring-indigo-500"
        />
        <span className="text-slate-700">
          Establecer como contacto principal de la ficha de empresa
        </span>
      </label>
    </div>

    <div>
      <label className="block font-semibold text-slate-700 mb-1">Notas / Observaciones del contacto</label>
      <textarea
        rows="2"
        value={notes}
        onChange={(e) => { setNotes(e.target.value); onChange(); }}
        placeholder="Horario preferente de contacto, disponibilidad..."
        className="w-full px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
      ></textarea>
    </div>

  </form>

  <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
    >
      Cancelar
    </button>
    <button
      type="submit"
      form="contact-form"
      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm"
    >
      {isEdit ? 'Actualizar Contacto' : 'Añadir Contacto'}
    </button>
  </div>
</div>
      );
    }

    // COMPONENTE: FORMULARIO DE CENTRO OPERATIVO
    function DrawerCenterForm({ title, subtitle, companyFiscalAddress, companyCity, companyPostalCode, initialData, isEdit = false, onClose, onSave, onChange }) {
      const [name, setName] = useState(initialData?.name || '');
      const [address, setAddress] = useState(initialData?.address || '');
      const [postalCode, setPostalCode] = useState(initialData?.postalCode || '');
      const [city, setCity] = useState(initialData?.city || '');
      const [country, setCountry] = useState(initialData?.country || 'España');
      
      // Opciones avanzadas
      const [showAdvanced, setShowAdvanced] = useState(false);
      const [laborAgreement, setLaborAgreement] = useState(initialData?.laborAgreement || 'Convenio Logística y Transporte');
      const [notes, setNotes] = useState(initialData?.notes || '');
      const [errors, setErrors] = useState({});

      const handleUseFiscalAddress = () => {
if (companyFiscalAddress) setAddress(companyFiscalAddress);
if (companyCity) setCity(companyCity);
if (companyPostalCode) setPostalCode(companyPostalCode);
onChange();
      };

      const handleSubmit = (e) => {
e.preventDefault();
const errs = {};
if (!name.trim()) errs.name = 'El nombre del centro es obligatorio';
if (!address.trim()) errs.address = 'La dirección es obligatoria';
if (!postalCode.trim()) errs.postalCode = 'El código postal es obligatorio';
if (!city.trim()) errs.city = 'La localidad es obligatoria';

if (Object.keys(errs).length > 0) {
  setErrors(errs);
  return;
}

onSave({
  id: initialData?.id,
  name,
  address,
  postalCode,
  city,
  country,
  laborAgreement,
  notes
});
      };

      return (
<div className="flex flex-col h-full bg-white">
  <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </div>
    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
      <X className="w-4 h-4" />
    </button>
  </div>

  <form id="center-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
    
    <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-950 flex items-start justify-between gap-2">
      <div>
        <span className="font-semibold block">Alta mínima de centro:</span>
        Solo requerimos ubicación física para habilitar <strong>Peticiones Operativas</strong>.
      </div>
      <button
        type="button"
        onClick={handleUseFiscalAddress}
        className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded font-semibold text-[11px] shrink-0"
      >
        Usar dirección fiscal
      </button>
    </div>

    <div>
      <label className="block font-semibold text-slate-700 mb-1">Nombre del centro / sede *</label>
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); onChange(); }}
        placeholder="Ej. Pabellón 14 - Muelle de Carga"
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs ${
          errors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
        }`}
      />
      {errors.name && <p className="text-rose-600 text-[11px] mt-1">{errors.name}</p>}
    </div>

    <div>
      <label className="block font-semibold text-slate-700 mb-1">Dirección física *</label>
      <input
        type="text"
        value={address}
        onChange={(e) => { setAddress(e.target.value); onChange(); }}
        placeholder="Polígono Industrial Artunduaga, Pabellón 14"
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs ${
          errors.address ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
        }`}
      />
      {errors.address && <p className="text-rose-600 text-[11px] mt-1">{errors.address}</p>}
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Código Postal *</label>
        <input
          type="text"
          value={postalCode}
          onChange={(e) => { setPostalCode(e.target.value); onChange(); }}
          placeholder="48970"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs ${
            errors.postalCode ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
          }`}
        />
        {errors.postalCode && <p className="text-rose-600 text-[11px] mt-1">{errors.postalCode}</p>}
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Localidad *</label>
        <input
          type="text"
          value={city}
          onChange={(e) => { setCity(e.target.value); onChange(); }}
          placeholder="Basauri"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs ${
            errors.city ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
          }`}
        />
        {errors.city && <p className="text-rose-600 text-[11px] mt-1">{errors.city}</p>}
      </div>
    </div>

    {/* OPCIONALES: DATOS OPERATIVOS Y LABORALES */}
    <div className="pt-3 border-t border-slate-200">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
      >
        <span>Datos Operativos y Laborales (Opcional)</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced && (
        <div className="pt-3 space-y-3 animate-in fade-in">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Convenio colectivo aplicable</label>
            <input
              type="text"
              value={laborAgreement}
              onChange={(e) => { setLaborAgreement(e.target.value); onChange(); }}
              placeholder="Convenio Provincial de Logística"
              className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Instrucciones de acceso / PRL</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); onChange(); }}
              placeholder="Entrada por garita 2, botas de seguridad obligatorias..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs"
            ></textarea>
          </div>
        </div>
      )}
    </div>

  </form>

  <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
    >
      Cancelar
    </button>
    <button
      type="submit"
      form="center-form"
      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm"
    >
      {isEdit ? 'Actualizar Centro' : 'Crear Centro Operativo'}
    </button>
  </div>
</div>
      );
    }

    // ===================================================================
    // SUBIR DOCUMENTOS: arrastrar o elegir archivos, clasificarlos y subirlos
    // ===================================================================
    const FORMATOS_DOC = ['application/pdf', 'image/jpeg', 'image/png'];
    const MAX_MB_DOC = 10;

    const tamanoLegible = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

    function SubirDocumentos({ empresa, tipos, onAddTipo, onClose, onSubir }) {
      const [archivos, setArchivos] = useState([]);
      const [arrastrando, setArrastrando] = useState(false);
      const [progreso, setProgreso] = useState(null); // null = sin subir; 0-100 = subiendo
      const entrada = useRef(null);

      const anadir = (lista) => {
        const nuevos = Array.from(lista).map((f, i) => {
          const formatoOk = FORMATOS_DOC.includes(f.type);
          const tamanoOk = f.size <= MAX_MB_DOC * 1024 * 1024;
          return {
            id: `${Date.now()}-${i}-${f.name}`,
            nombre: f.name,
            bytes: f.size,
            esImagen: f.type.startsWith('image/'),
            error: !formatoOk ? 'Formato no admitido (solo PDF, JPG o PNG)' : !tamanoOk ? `Supera los ${MAX_MB_DOC} MB` : '',
            tipo: /cif/i.test(f.name) ? 'CIF' : /contrato/i.test(f.name) ? 'Contrato' : '',
            caduca: '',
            visible: 'interno',
            notas: '',
          };
        });
        setArchivos((prev) => [...prev, ...nuevos]);
      };

      // Para probar la demo sin tener archivos a mano
      const anadirEjemplos = () =>
        anadir([
          { name: 'Escrituras de constitución.pdf', size: 2.3 * 1024 * 1024, type: 'application/pdf' },
          { name: 'Certificado Seguridad Social 2026.pdf', size: 380 * 1024, type: 'application/pdf' },
          { name: 'Foto acceso muelle.png', size: 950 * 1024, type: 'image/png' },
          { name: 'Presentación comercial.pptx', size: 4.1 * 1024 * 1024, type: 'application/vnd.ms-powerpoint' },
        ]);

      const cambiar = (id, campo, valor) => setArchivos((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
      const quitar = (id) => setArchivos((prev) => prev.filter((a) => a.id !== id));

      const validos = archivos.filter((a) => !a.error);
      const sinTipo = validos.filter((a) => !a.tipo).length;
      const puedeSubir = validos.length > 0 && sinTipo === 0 && progreso === null;

      const subir = () => {
        setProgreso(0);
        let p = 0;
        const t = setInterval(() => {
          p += 20;
          setProgreso(p);
          if (p >= 100) {
            clearInterval(t);
            const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            onSubir(
              validos.map((a) => ({
                id: `doc-${a.id}`,
                nombre: a.nombre,
                tipo: a.tipo,
                subidoPor: 'Usuario Demo',
                fecha: hoy,
                tamano: tamanoLegible(a.bytes),
                estado: 'Pendiente de validar',
                paginas: 1,
                caduca: a.caduca ? new Date(a.caduca).toLocaleDateString('es-ES') : '',
                visibleCliente: a.visible === 'cliente',
                notas: a.notas,
              })),
            );
          }
        }, 250);
      };

      return (
        <Modal
          title="Subir documentos"
          subtitle={`A la ficha de ${empresa}`}
          onClose={onClose}
          size="max-w-3xl"
          footer={
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                {archivos.length === 0
                  ? 'Ningún archivo elegido'
                  : `${validos.length} de ${archivos.length} listos${sinTipo ? ` · falta el tipo en ${sinTipo}` : ''}`}
              </span>
              <div className="flex items-center gap-2">
                <Button onClick={onClose} disabled={progreso !== null}>Cancelar</Button>
                <Button variant="primary" icon={CloudUpload} disabled={!puedeSubir} onClick={subir}>
                  {validos.length > 1 ? `Subir ${validos.length} documentos` : 'Subir documento'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Zona para arrastrar */}
            <div
              onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastrando(false); anadir(e.dataTransfer.files); }}
              onClick={() => entrada.current?.click()}
              className={`rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
                arrastrando ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <CloudUpload className={`w-8 h-8 mx-auto ${arrastrando ? 'text-indigo-600' : 'text-slate-400'}`} />
              <div className="mt-2 text-sm font-medium text-slate-800">Arrastra aquí los archivos o pulsa para elegirlos</div>
              <div className="mt-1 text-[11px] text-slate-500">PDF, JPG o PNG · hasta {MAX_MB_DOC} MB por archivo · puedes subir varios a la vez</div>
              <input
                ref={entrada}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => { anadir(e.target.files); e.target.value = ''; }}
              />
            </div>
            {archivos.length === 0 && (
              <div className="text-center">
                <button type="button" onClick={anadirEjemplos} className="text-[11px] font-medium text-indigo-600 hover:underline">
                  Probar con archivos de ejemplo
                </button>
              </div>
            )}

            {/* Archivos elegidos */}
            {archivos.length > 0 && (
              <ul className="space-y-2">
                {archivos.map((a) => {
                  const Icono = a.esImagen ? FileImage : FileText;
                  return (
                    <li key={a.id} className={`rounded-lg border p-3 ${a.error ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.error ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Icono className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-900 truncate">{a.nombre}</div>
                          <div className="text-[11px] text-slate-500">{tamanoLegible(a.bytes)}</div>
                        </div>
                        {a.error && <Badge tone="danger" icon={AlertCircle}>{a.error}</Badge>}
                        {progreso !== null && !a.error && (
                          <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progreso}%` }} />
                          </div>
                        )}
                        <IconButton icon={X} title="Quitar de la lista" onClick={() => quitar(a.id)} disabled={progreso !== null} />
                      </div>

                      {!a.error && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de documento *</label>
                            <SelectConAlta
                              value={a.tipo}
                              onChange={(v) => cambiar(a.id, 'tipo', v)}
                              options={tipos}
                              onAdd={onAddTipo}
                              placeholder="Selecciona el tipo"
                              nuevoPlaceholder="Nombre del nuevo tipo de documento"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Caduca el (opcional)</label>
                            <input
                              type="date"
                              value={a.caduca}
                              onChange={(e) => cambiar(a.id, 'caduca', e.target.value)}
                              className="h-8 w-full bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">Avisaremos antes de que caduque.</p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Quién lo puede ver</label>
                            <Select value={a.visible} onChange={(e) => cambiar(a.id, 'visible', e.target.value)} className="w-full">
                              <option value="interno">Solo el equipo de la ETT</option>
                              <option value="cliente">También el cliente, en su portal</option>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Notas (opcional)</label>
                            <input
                              type="text"
                              value={a.notas}
                              onChange={(e) => cambiar(a.id, 'notas', e.target.value)}
                              placeholder="Ej. versión firmada por el cliente"
                              className="h-8 w-full bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <Notice tone="info" icon={Info}>
              Los documentos nuevos quedan como <strong>pendientes de validar</strong> hasta que administración los revise.
              No subas aquí documentos personales de trabajadores (DNI, nóminas): van en la ficha de cada persona.
            </Notice>
          </div>
        </Modal>
      );
    }
