// Partió de design/empresas.html (scripts/import-design.py). Ahora se edita aquí directamente: no regenerar.
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
    import { 
      Building2, Users, MapPin, CreditCard, FileText, History, Plus, Search, 
      Filter, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Clock, 
      Lock, X, Edit3, ArrowRight, Sparkles, Phone, Mail, Globe, Shield, 
      Info, Trash2, Check, AlertCircle, Eye, ExternalLink, HelpCircle, 
      Building, Briefcase, FileCheck, Layers, ArrowLeft, RefreshCw, BookmarkCheck,
      Upload, Download, ZoomIn, ZoomOut, CirclePause, CirclePlay, CloudUpload, FileImage, Archive, RotateCcw,
    } from 'lucide-react';
import { Page, PageHeader, Card, EmptyState, Notice, Button, IconButton, Badge, SearchInput, Select, SelectConAlta, Tabs, Modal, Drawer, Confirmar, Interruptor, CargandoPagina, ErrorCarga } from '../ui';
import { DEMO } from '../modo';
import { useEmpresas, mensajeError } from './empresas/useEmpresas';
import { SelectorCnae } from './empresas/SelectorCnae';
import { Eliminados } from './empresas/Eliminados';
import { PERMISOS_PORTAL, permisosPorRoles } from '../portal/permisosEmpresa';
import { CLAVE_SERVICIO_PENDIENTE } from './serviciosDemo';
import { CLAVE_PRESUPUESTO_EMPRESA, dejarTraspaso } from './traspasos';

    // Los datos (y los de ejemplo del modo demo) llegan de useEmpresas: ver src/views/empresas/useEmpresas.ts.

    export default function EmpresasView() {
      // Estado de datos
      const [selectedCompanyId, setSelectedCompanyId] = useState(null);
      const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'datos' | 'contactos' | 'centros' | 'facturacion' | 'documentos' | 'actividad'
      
      // Filtros del listado
      const [searchTerm, setSearchTerm] = useState('');
      const [filterStatus, setFilterStatus] = useState('all');
      const [filterOwner, setFilterOwner] = useState('all');
      const [filterReadiness, setFilterReadiness] = useState('all');
      const [filterSector, setFilterSector] = useState('all');
      // Lista paginada en el servidor y filtro «Eliminadas» (las bajas son recuperables)
      const [pagina, setPagina] = useState(0);
      const [verEliminadas, setVerEliminadas] = useState(false);
      // En la ficha: lista de contactos, centros o documentos eliminados ('contacto' | 'centro' | 'documento')
      const [verEliminados, setVerEliminados] = useState(null);
      // Lo que no se puede eliminar porque ya se ha usado (la API responde 409 en_uso)
      const [noSePuede, setNoSePuede] = useState(null); // { tipo, item, motivo }

      // Documentos: visor y confirmación de borrado
      const [docAbierto, setDocAbierto] = useState(null);
      const [urlDoc, setUrlDoc] = useState(null); // URL temporal del fichero abierto en el visor
      const [docABorrar, setDocABorrar] = useState(null);
      const [zoomDoc, setZoomDoc] = useState(100);
      const [subiendoDocs, setSubiendoDocs] = useState(false);

      // Contactos y centros: suspender (reversible) o eliminar (definitivo, con confirmación)
      const [aBorrar, setABorrar] = useState(null); // { tipo: 'contacto' | 'centro', item }


      // Contexto simulado (ej: abierto desde Presupuesto)
      const [simulationContext, setSimulationContext] = useState({
active: DEMO,
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

      // Datos: lista, ficha abierta, catálogos y acciones (API o datos de ejemplo en modo demo)
      const emp = useEmpresas({ busqueda: searchTerm, eliminadas: verEliminadas, pagina, seleccionada: viewMode === 'detail' ? selectedCompanyId : null });
      const companies = emp.lista.empresas;
      const currentCompany = emp.ficha.empresa;
      const cat = emp.catalogos;
      const abrirEmpresa = (id) => { setSelectedCompanyId(id); setViewMode('detail'); setActiveTab('resumen'); setVerEliminados(null); };

      // Ejecuta una acción de guardado con su aviso; si la API la rechaza, muestra el motivo.
      const ejecutar = async (accion, mensajeOk) => {
        try {
          const r = await accion();
          if (mensajeOk) showToast(typeof mensajeOk === 'function' ? mensajeOk(r) : mensajeOk);
          return r ?? true;
        } catch (e) {
          showToast(mensajeError(e), 'error');
          return false;
        }
      };

      // Abre Presupuestos con un presupuesto nuevo para esta empresa (contacto destinatario y comercial incluidos)
      const crearPresupuesto = () => {
        const c = currentCompany.contacts.find(x => x.isQuoteRecipient) || currentCompany.contacts.find(x => x.isMain) || currentCompany.contacts[0];
        dejarTraspaso(CLAVE_PRESUPUESTO_EMPRESA, {
          nombre: currentCompany.name, cif: currentCompany.cif, sector: currentCompany.sector,
          ciudad: currentCompany.province ? `${currentCompany.city} (${currentCompany.province})` : (currentCompany.city || ''),
          comercial: (currentCompany.owner || '').replace(/\s*\(.*\)$/, ''),
          contacto: c ? { nombre: c.name, cargo: c.role || '', email: c.email || '', telefono: c.phone || '' } : null,
        });
        window.location.hash = '#/presupuestos';
      };

      const alternarSuspension = (tipo, item) =>
        ejecutar(() => emp.alternarSuspension(tipo, item), (suspendido) => `${item.name}: ${suspendido ? (tipo === 'centro' ? 'desactivado' : 'suspendido') : 'reactivado'}`);

      // Baja lógica: se recupera desde «Eliminados». Si ya se ha usado (409 en_uso), se explica y se ofrece la alternativa.
      const eliminarElemento = async (tipo = aBorrar.tipo, item = aBorrar.item) => {
        setABorrar(null);
        try {
          await emp.eliminar(tipo, item.id);
          if (tipo === 'empresa') { setViewMode('list'); setSelectedCompanyId(null); }
          showToast(`${item.name || item.nombre} eliminado. Se puede recuperar desde «Eliminados».`);
          return true;
        } catch (e) {
          if (e?.code === 'en_uso') setNoSePuede({ tipo, item, motivo: e.message });
          else showToast(mensajeError(e), 'error');
          return false;
        }
      };
      const restaurar = async (tipo, id) => !!(await ejecutar(() => emp.restaurar(tipo, id), 'Recuperado'));

      // Acceso al Área de empresas: lo da la ETT; el contacto recibe una invitación por correo
      const [accesoPortal, setAccesoPortal] = useState(null); // { contacto, permisos, nuevo }
      const guardarAccesoPortal = async () => {
        const { contacto, permisos, nuevo } = accesoPortal;
        if (await ejecutar(() => emp.guardarAccesoPortal(contacto.id, permisos), nuevo ? `Invitación al Área de empresas enviada a ${contacto.email}` : `Permisos de ${contacto.name} actualizados`)) setAccesoPortal(null);
      };
      const quitarAccesoPortal = (contacto) => ejecutar(() => emp.quitarAccesoPortal(contacto.id), `${contacto.name} ya no puede entrar en el Área de empresas`);

      const actualizarFacturacion = (campo, valor) =>
        ejecutar(() => emp.actualizarFacturacion(campo, valor)).then((avisos) => { if (Array.isArray(avisos) && avisos.length) showToast(avisos.join(' '), 'error'); else if (avisos) showToast('Datos de facturación guardados'); });
      const anadirOpcion = (tipo) => (nombre) => ejecutar(() => emp.catalogos.anadirOpcion(tipo, nombre), `«${nombre}» añadido a la lista`);

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
      const handleSaveCompany = async (formData, isEdit = false) => {
        const id = await ejecutar(() => emp.guardarEmpresa(formData, isEdit), isEdit ? 'Empresa actualizada correctamente' : formData.borrador ? 'Empresa guardada como borrador' : 'Empresa creada con éxito');
        if (!id) return false;
        if (!isEdit) abrirEmpresa(id);
        setDrawerState({ isOpen: false, type: null, data: null, hasUnsavedChanges: false });
        return true;
      };

      // Guardar Contacto
      const handleSaveContact = async (contactData, isEdit = false) => {
        if (!(await ejecutar(() => emp.guardarContacto(contactData), isEdit ? 'Contacto actualizado' : 'Contacto añadido'))) return false;
        setDrawerState({ isOpen: false, type: null, data: null, hasUnsavedChanges: false });
        return true;
      };

      // Guardar Centro
      const handleSaveCenter = async (centerData, isEdit = false) => {
        if (!(await ejecutar(() => emp.guardarCentro(centerData), isEdit ? 'Centro actualizado' : 'Centro operativo creado (desbloquea Petición)'))) return false;
        setDrawerState({ isOpen: false, type: null, data: null, hasUnsavedChanges: false });
        return true;
      };

      // Documentos: el visor pide la URL temporal del fichero
      const abrirDocumento = (doc) => {
        setDocAbierto(doc);
        setZoomDoc(100);
        setUrlDoc(null);
        emp.urlDocumento(doc.id).then(setUrlDoc, () => setUrlDoc(null));
      };
      const descargarDocumento = async (doc) => {
        const url = await ejecutar(() => emp.urlDocumento(doc.id));
        if (typeof url === 'string') window.open(url, '_blank', 'noopener');
        else if (url) showToast('Es un documento de ejemplo: no tiene fichero que descargar', 'error');
      };

      // Filtrado en tabla
      const filteredCompanies = useMemo(() => {
// La búsqueda va al servidor; preparación, categoría y responsable se aplican a la página cargada.
return companies.filter(c => {
  const matchSearch = true;
  const matchStatus = filterStatus === 'all' || c.status === filterStatus;
  const matchOwner = filterOwner === 'all' || c.ownerUserId === filterOwner;
  const matchReadiness = filterReadiness === 'all' || 
    (filterReadiness === 'quote' && c.readiness.quote) ||
    (filterReadiness === 'operations' && c.readiness.operations) ||
    (filterReadiness === 'billing' && c.readiness.billing);
  const matchSector = filterSector === 'all' || c.sectorCode === filterSector;
  return matchSearch && matchStatus && matchOwner && matchReadiness && matchSector;
});
      }, [companies, filterStatus, filterOwner, filterReadiness, filterSector]);

      return (
<div className="flex min-h-full text-sm">
  {/* TOAST FLOTANTE */}
  {toast && (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 max-w-md bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-800 ${toast.type === 'error' ? '' : 'animate-bounce'}`}>
      {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
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
          count={emp.lista.total}
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
              onChange={(v) => { setSearchTerm(v); setPagina(0); }}
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
              {cat.sectores.filter(s => companies.some(c => c.sectorCode === s.code)).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </Select>
            <Select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
              <option value="all">Todos los responsables</option>
              {cat.responsables.filter(r => companies.some(c => c.ownerUserId === r.id)).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </Select>
            <Select value={verEliminadas ? 'eliminadas' : 'activas'} onChange={(e) => { setVerEliminadas(e.target.value === 'eliminadas'); setPagina(0); }} aria-label="Activas o eliminadas">
              <option value="activas">Empresas activas</option>
              <option value="eliminadas">Eliminadas</option>
            </Select>
            <span className="ml-auto text-[11px] text-slate-500">{filteredCompanies.length === companies.length ? `${emp.lista.desde}–${emp.lista.hasta} de ${emp.lista.total}` : `${filteredCompanies.length} de ${companies.length} en esta página`}</span>
          </div>

          {emp.lista.estado === 'error' ? (
            <ErrorCarga mensaje={emp.lista.error} onReintentar={emp.lista.reintentar} />
          ) : emp.lista.estado === 'cargando' ? (
            <CargandoPagina texto="Cargando empresas…" />
          ) : filteredCompanies.length === 0 ? (
            verEliminadas
              ? <EmptyState icon={Archive} title="No hay empresas eliminadas" text="Las empresas que se eliminen aparecerán aquí y se podrán recuperar." />
              : <EmptyState icon={Building2} title={companies.length ? 'No hay empresas con estos filtros' : 'Todavía no hay empresas'} text={companies.length || searchTerm ? 'Prueba con otra búsqueda o cambia los filtros.' : 'Da de alta la primera con «Nueva empresa».'} />
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
                    <th className="py-2 px-3 font-medium">{verEliminadas ? 'Eliminada' : 'Última actividad'}</th>
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
                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${verEliminadas ? '' : 'cursor-pointer'}`}
                        onClick={() => { if (!verEliminadas) abrirEmpresa(company.id); }}
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
                        <td className="py-2.5 px-3 text-[11px] text-slate-500"><div className="max-w-[180px] truncate" title={company.lastActivity}>{verEliminadas ? `El ${company.deletedAt}` : company.lastActivity}</div></td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {verEliminadas ? (
                            <Button size="sm" icon={RotateCcw} onClick={() => restaurar('empresa', company.id)}>Recuperar</Button>
                          ) : (
                            <Button size="sm" onClick={() => abrirEmpresa(company.id)}>Abrir</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {emp.lista.paginas > 1 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-200 text-[11px] text-slate-500">
              <span>Página {pagina + 1} de {emp.lista.paginas}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={pagina === 0 || emp.lista.cargando} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
                <Button size="sm" disabled={pagina + 1 >= emp.lista.paginas || emp.lista.cargando} onClick={() => setPagina(p => p + 1)}>Siguiente</Button>
              </div>
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
    {viewMode === 'detail' && emp.ficha.estado === 'cargando' && <CargandoPagina texto="Cargando la ficha…" />}
    {viewMode === 'detail' && emp.ficha.estado === 'error' && (
      <div className="w-full px-4 sm:px-6 py-5 space-y-4">
        <PageHeader breadcrumbs={[{ label: 'Empresas', onClick: () => setViewMode('list') }]} title="Empresa" />
        <ErrorCarga mensaje={emp.ficha.error} onReintentar={emp.ficha.reintentar} />
      </div>
    )}
    {viewMode === 'detail' && emp.ficha.estado === 'listo' && (
      <div className="w-full px-4 sm:px-6 py-5 space-y-4">
        <PageHeader
          breadcrumbs={[{ label: 'Empresas', onClick: () => setViewMode('list') }, { label: currentCompany.name }]}
          title={currentCompany.name}
          status={
            <>
              <Badge tone={currentCompany.statusTone} dot>{currentCompany.statusLabel}</Badge>
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
              <Button variant="primary" icon={FileCheck} onClick={crearPresupuesto}>
                Crear presupuesto
              </Button>
              <IconButton icon={Trash2} title="Eliminar empresa" className="hover:text-rose-600 hover:bg-rose-50" onClick={() => setABorrar({ tipo: 'empresa', item: currentCompany })} />
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
            { id: 'documentos', label: 'Documentos', count: currentCompany.documentos.length },
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
                        {currentCompany.readiness.quote
                          ? <>Tiene contacto destinatario (<strong>{(currentCompany.contacts.find(c => c.isQuoteRecipient && !c.suspendido) || currentCompany.contacts.find(c => c.isMain) || currentCompany.contacts[0])?.name}</strong>) listo para recibir propuestas de tarifa/hora.</>
                          : 'Falta un contacto que reciba los presupuestos. Se puede presupuestar igualmente y añadirlo después.'}
                      </p>
                      <div className="pt-1">
                        <button
                          onClick={crearPresupuesto}
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
                        {currentCompany.billing.isComplete
                          ? `Forma de pago (${currentCompany.billing.paymentMethod}) e IBAN configurados.`
                          : 'Faltan datos fiscales avanzados (IBAN, días de pago y scoring de riesgo). Se requerirán antes de la primera factura mensual.'}
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
                      onClick={crearPresupuesto}
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
                    <div className="text-slate-400 text-[11px] font-semibold">Convenio por defecto</div>
                    <div className="text-slate-700 mt-0.5">{currentCompany.defaultAgreement || 'Sin convenio por defecto (se elige en cada centro)'}</div>
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
                <div className="flex items-center gap-2">
                  <Button size="sm" icon={Archive} onClick={() => setVerEliminados(v => (v === 'contacto' ? null : 'contacto'))}>{verEliminados === 'contacto' ? 'Ver activos' : 'Eliminados'}</Button>
                  <button
                    onClick={() => setDrawerState({ isOpen: true, type: 'new-contact', data: null, hasUnsavedChanges: false })}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir contacto
                  </button>
                </div>
              </div>

              {verEliminados === 'contacto' && (
                <Eliminados titulo="Contactos eliminados" vacio="Los contactos que se eliminen aparecerán aquí." cargar={() => emp.eliminados('contacto')} onRestaurar={(id) => restaurar('contacto', id)} />
              )}
              {verEliminados !== 'contacto' && currentCompany.contacts.length === 0 && (
                <EmptyState icon={Users} title="Sin contactos" text="Añade la persona que recibe los presupuestos para poder enviarle una propuesta." />
              )}
              {verEliminados !== 'contacto' && <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
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

                    {/* Acceso al Área de empresas (aún no está en la API: en modo real, «Disponible próximamente») */}
                    {!emp.ficha.portalDisponible ? (
                      <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-400" />Acceso al Área de empresas</span>
                        <Badge>Disponible próximamente</Badge>
                      </div>
                    ) : (
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
                            {contact.portal.permisos.filter(id => PERMISOS_PORTAL.some(p => p.id === id)).map(id => <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{PERMISOS_PORTAL.find(p => p.id === id)?.texto}</span>)}
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
                    )}
                  </div>
                ))}
              </div>}

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
                <div className="flex items-center gap-2">
                  <Button size="sm" icon={Archive} onClick={() => setVerEliminados(v => (v === 'centro' ? null : 'centro'))}>{verEliminados === 'centro' ? 'Ver activos' : 'Eliminados'}</Button>
                  <button
                    onClick={() => setDrawerState({ isOpen: true, type: 'new-center', data: null, hasUnsavedChanges: false })}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir centro
                  </button>
                </div>
              </div>

              {verEliminados === 'centro' ? (
                <Eliminados titulo="Centros eliminados" vacio="Los centros que se eliminen aparecerán aquí." cargar={() => emp.eliminados('centro')} onRestaurar={(id) => restaurar('centro', id)} />
              ) : currentCompany.centers.length === 0 ? (
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
                            <p className="text-xs text-slate-500">{[center.address, [center.postalCode, center.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Sin dirección'}</p>
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
                        <div>Convenio aplicación: {center.laborAgreement || 'Sin convenio'}{center.heredado && <span className="text-slate-400"> (el de la empresa)</span>}</div>
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
                      <div className="text-[11px] text-slate-500">{currentCompany.city ? `${currentCompany.city}${currentCompany.province ? ` (${currentCompany.province})` : ''}` : 'Sin dirección fiscal'}</div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${currentCompany.billing.tieneIban ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                    {currentCompany.billing.tieneIban ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                    <div>
                      <span className="font-semibold text-slate-900">IBAN / Mandato SEPA B2B</span>
                      <div className={`text-[11px] ${currentCompany.billing.tieneIban ? 'text-slate-500' : 'text-amber-700'}`}>{currentCompany.billing.tieneIban ? 'IBAN registrado' : 'Pendiente de recibir firmado'}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">Límite de Riesgo / Crédito ETT</span>
                      <div className="text-[11px] text-amber-700">{currentCompany.billing.riskLimit ? `Límite propuesto ${currentCompany.billing.riskLimit} (Pendiente riesgo)` : 'Sin límite propuesto'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SERVICIOS QUE SE LE FACTURAN ADEMÁS DE LAS HORAS */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">Servicios a facturar</div>
                  <div className="text-slate-500">Selección de personal, formación, reconocimientos... Se registran y salen en Facturación con sus horas del mes.</div>
                </div>
                <Button size="sm" icon={Briefcase} onClick={() => { try { sessionStorage.setItem(CLAVE_SERVICIO_PENDIENTE, currentCompany.name); } catch { /* sin almacenamiento */ } window.location.hash = '#/facturacion'; }}>Añadir servicio a facturar</Button>
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
                        options={cat.formasPago}
                        onAdd={anadirOpcion('payment_method')}
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
                        onChange={(v) => v && actualizarFacturacion('fixedPayDays', v)}
                        options={cat.diasPago}
                        onAdd={() => {}}
                        placeholder="Selecciona una opción"
                        nuevoPlaceholder="Ej. Día 20 o Días 5 y 20 (hasta 3)"
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
                    <label className="text-slate-500 text-[11px] font-semibold">Cómo quiere las facturas de horas</label>
                    <div className="mt-1">
                      {currentCompany.billing.facturaDetalleDisponible ? (
                      <Select value={currentCompany.billing.facturaDetalle || 'concepto'} onChange={(e) => actualizarFacturacion('facturaDetalle', e.target.value)} className="w-full" aria-label="Cómo quiere las facturas de horas">
                        <option value="concepto">Por concepto: una línea por tipo de hora, con anexo de horas e importe por persona</option>
                        <option value="persona">Por persona: una línea por persona y tipo de hora</option>
                      </Select>
                      ) : <Badge>Disponible próximamente</Badge>}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Es lo que sale al preparar cada factura en Facturación; allí se puede cambiar en una factura concreta.</p>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] font-semibold">Régimen de IVA aplicable</label>
                    <div className="mt-1">
                      {currentCompany.billing.vatRegimeDisponible ? (
                      <SelectConAlta
                        value={currentCompany.billing.vatRegime || ''}
                        onChange={(v) => actualizarFacturacion('vatRegime', v)}
                        options={cat.regimenesIva}
                        onAdd={anadirOpcion('vat_regime')}
                        placeholder="Selecciona una opción"
                        nuevoPlaceholder="Ej. Régimen especial agrario"
                      />
                      ) : <Badge>Disponible próximamente</Badge>}
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
                <div className="flex items-center gap-2">
                  <Button icon={Archive} onClick={() => setVerEliminados(v => (v === 'documento' ? null : 'documento'))}>{verEliminados === 'documento' ? 'Ver activos' : 'Eliminados'}</Button>
                  <Button icon={Upload} onClick={() => setSubiendoDocs(true)}>Subir documento</Button>
                </div>
              </div>

              {verEliminados === 'documento' ? (
                <div className="p-4"><Eliminados titulo="Documentos eliminados" vacio="Los documentos que se eliminen aparecerán aquí." cargar={() => emp.eliminados('documento')} onRestaurar={(id) => restaurar('documento', id)} /></div>
              ) : currentCompany.documentos.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Sin documentos"
                  text="Esta empresa no tiene documentos guardados."
                  action={<Button icon={Upload} onClick={() => setSubiendoDocs(true)}>Subir documento</Button>}
                />
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {currentCompany.documentos.map(doc => (
                    <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <button type="button" onClick={() => abrirDocumento(doc)} className="min-w-0 flex-1 text-left">
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
                        <Button size="sm" icon={Eye} onClick={() => abrirDocumento(doc)}>Ver</Button>
                        <IconButton icon={Download} title="Descargar" onClick={() => descargarDocumento(doc)} />
                        <IconButton icon={Trash2} title={doc.conservar ? `Los documentos de tipo «${doc.tipo}» se conservan: no se pueden eliminar` : 'Eliminar'} disabled={doc.conservar} className="hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40" onClick={() => setDocABorrar(doc)} />
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
                {currentCompany.activity.length === 0 && <div className="text-slate-400">Todavía no hay cambios registrados.</div>}
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
            catalogos={cat}
            comprobarCif={emp.comprobarCif}
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
            catalogos={cat}
            comprobarCif={emp.comprobarCif}
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
            convenios={cat.convenios}
            convenioEmpresa={currentCompany.defaultAgreement}
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
            convenios={cat.convenios}
            convenioEmpresa={currentCompany.defaultAgreement}
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
      subtitle={<>{docAbierto.tipo} · {docAbierto.tamano}</>}
      status={<Badge tone={docAbierto.estado === 'Validado' ? 'success' : 'warning'} dot>{docAbierto.estado}</Badge>}
      onClose={() => setDocAbierto(null)}
      size="max-w-5xl"
      toolbar={
        <div className="flex items-center justify-between gap-2 px-5 py-2 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>{urlDoc ? 'Vista previa del fichero' : 'Vista previa de ejemplo'}</span>
          <div className="flex items-center gap-1">
            <IconButton icon={ZoomOut} title="Alejar" onClick={() => setZoomDoc(z => Math.max(50, z - 25))} />
            <span className="w-10 text-center">{zoomDoc} %</span>
            <IconButton icon={ZoomIn} title="Acercar" onClick={() => setZoomDoc(z => Math.min(200, z + 25))} />
          </div>
        </div>
      }
      footer={
        <div className="flex flex-1 items-center justify-between gap-2">
          {docAbierto.conservar ? <span className="text-[11px] text-slate-500">Se conserva: no se puede eliminar</span> : <Button variant="danger" icon={Trash2} onClick={() => setDocABorrar(docAbierto)}>Eliminar</Button>}
          <div className="flex items-center gap-2">
            <Button icon={Download} onClick={() => descargarDocumento(docAbierto)}>Descargar</Button>
            <Button variant="primary" onClick={() => setDocAbierto(null)}>Cerrar</Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        {/* Vista previa: el fichero si hay URL; si no (documentos de ejemplo), una página simulada */}
        <div className="bg-slate-100 rounded-lg p-4 overflow-auto max-h-[60vh] flex justify-center">
          {urlDoc && docAbierto.esImagen ? (
            <img src={urlDoc} alt={docAbierto.nombre} className="origin-top transition-transform max-w-full" style={{ transform: `scale(${zoomDoc / 100})` }} />
          ) : urlDoc ? (
            <iframe src={urlDoc} title={docAbierto.nombre} className="w-full min-h-[55vh] bg-white border border-slate-200" />
          ) : (
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
          )}
        </div>

        {/* Datos del documento */}
        <dl className="text-xs space-y-3">
          {[
            ['Tipo', docAbierto.tipo],
            ['Empresa', currentCompany.name],
            ['Subido por', docAbierto.subidoPor],
            ['Fecha', docAbierto.fecha],
            ['Tamaño', docAbierto.tamano],
            ['Estado', docAbierto.estado],
            ...(docAbierto.caduca ? [['Caduca', docAbierto.caduca]] : []),
            ['Quién lo ve', docAbierto.visibleCliente ? 'También el cliente, en su portal' : 'Solo el equipo de la ETT'],
            ...(docAbierto.notas ? [['Notas', docAbierto.notas]] : []),
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
      recuperable={<>Se podrá recuperar desde <strong>Eliminados</strong>, en esta misma pestaña.</>}
      onConfirm={async () => {
        const doc = docABorrar;
        setDocABorrar(null);
        if (await ejecutar(() => emp.eliminar('documento', doc.id), `Documento eliminado: ${doc.nombre}`) && docAbierto?.id === doc.id) setDocAbierto(null);
      }}
    >
      <p>
        <strong className="text-slate-800">{docABorrar.nombre}</strong> dejará de verse en la ficha de {currentCompany.name} y en el portal del cliente.
        En el historial quedará anotado quién lo eliminó y cuándo.
      </p>
    </Confirmar>
  )}

  {/* CONFIRMAR BORRADO DE CONTACTO O CENTRO */}
  {aBorrar && (
    <Confirmar
      title={aBorrar.tipo === 'contacto' ? `¿Eliminar a ${aBorrar.item.name}?` : aBorrar.tipo === 'empresa' ? `¿Eliminar la empresa ${aBorrar.item.name}?` : `¿Eliminar el centro ${aBorrar.item.name}?`}
      confirmLabel="Eliminar"
      onClose={() => setABorrar(null)}
      onConfirm={() => eliminarElemento()}
      recuperable={aBorrar.tipo === 'empresa'
        ? <>Se podrá recuperar desde la lista de Empresas, con el filtro <strong>Eliminadas</strong>.</>
        : <>Se podrá recuperar desde <strong>Eliminados</strong>, en la pestaña {aBorrar.tipo === 'contacto' ? 'Contactos' : 'Centros'}.</>}
      alternativa={
        aBorrar.item.suspendido || aBorrar.tipo === 'empresa'
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
      {aBorrar.tipo === 'empresa' ? (
        <p>Dejará de salir en la lista de Empresas y en los buscadores de presupuestos y peticiones. Si ya tiene presupuestos o peticiones, no se puede eliminar: solo darla de baja.</p>
      ) : aBorrar.tipo === 'contacto' ? (
        <>
          <p>Dejará de aparecer en presupuestos, avisos y portal del cliente.</p>
          {aBorrar.item.isMain && <Notice tone="warning" icon={AlertTriangle}>Es el contacto principal: tendrás que elegir otro.</Notice>}
          {!aBorrar.item.suspendido && (
            <p>
              Si solo deja de estar disponible por un tiempo, <strong className="text-slate-800">suspéndelo</strong>: no recibirá nada y podrás reactivarlo cuando quieras.
            </p>
          )}
        </>
      ) : (
        <>
          <p>Dejará de salir en la ficha y no se podrá usar en peticiones. Si ya tiene peticiones, no se puede eliminar: solo desactivar.</p>
          {!aBorrar.item.suspendido && (
            <p>
              Si el centro solo cierra una temporada, <strong className="text-slate-800">desactívalo</strong>: no se podrá usar en peticiones nuevas y podrás reactivarlo.
            </p>
          )}
        </>
      )}
    </Confirmar>
  )}

  {/* NO SE PUEDE ELIMINAR: ya se ha usado (409 en_uso). Se explica el motivo y se ofrece la alternativa. */}
  {noSePuede && (
    <Modal
      title={`No se puede eliminar ${noSePuede.item.name}`}
      onClose={() => setNoSePuede(null)}
      size="max-w-md"
      footer={<>
        <Button onClick={() => setNoSePuede(null)}>Cancelar</Button>
        {noSePuede.tipo === 'empresa' ? (
          noSePuede.item.status !== 'inactive' && <Button variant="primary" icon={CirclePause} onClick={async () => { const { item } = noSePuede; setNoSePuede(null); await ejecutar(() => emp.darDeBaja(item.id), `${item.name}: dada de baja`); }}>Dar de baja</Button>
        ) : !noSePuede.item.suspendido && (
          <Button variant="primary" icon={CirclePause} onClick={() => { const { tipo, item } = noSePuede; setNoSePuede(null); alternarSuspension(tipo, item); }}>{noSePuede.tipo === 'contacto' ? 'Suspender' : 'Desactivar'}</Button>
        )}
      </>}
    >
      <div className="space-y-3 text-xs text-slate-600">
        <Notice tone="warning" icon={AlertTriangle}>{noSePuede.motivo}</Notice>
        <p>
          {noSePuede.tipo === 'empresa'
            ? 'Lo que ya se ha usado se conserva para el historial. Dándola de baja no saldrá para nuevos presupuestos ni peticiones.'
            : noSePuede.tipo === 'contacto'
              ? 'Lo que ya se ha usado se conserva. Suspendido, no recibirá presupuestos ni avisos y se puede reactivar.'
              : 'Lo que ya se ha usado se conserva. Desactivado, no se podrá usar en peticiones nuevas y se puede reactivar.'}
        </p>
      </div>
    </Modal>
  )}

  {/* SUBIR DOCUMENTOS */}
  {subiendoDocs && (
    <SubirDocumentos
      empresa={currentCompany.name}
      tipos={cat.tiposDocumento}
      onAddTipo={anadirOpcion('document_type')}
      onClose={() => setSubiendoDocs(false)}
      onSubir={async (archivos, alAvanzar) => {
        const fallos = await emp.subirDocumentos(archivos, alAvanzar);
        const subidos = archivos.length - fallos.length;
        if (subidos) showToast(subidos === 1 ? 'Documento subido. Queda pendiente de validar.' : `${subidos} documentos subidos. Quedan pendientes de validar.`);
        if (!fallos.length) setSubiendoDocs(false);
        return fallos;
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
    function DrawerCompanyForm({ title, subtitle, initialData, isEdit = false, onClose, onSave, onChange, catalogos, comprobarCif }) {
      const [name, setName] = useState(initialData?.name || '');
      const [cif, setCif] = useState(initialData?.cif || '');
      const [country, setCountry] = useState(initialData?.country || 'España');
      const [email, setEmail] = useState(initialData?.email || '');
      const [phone, setPhone] = useState(initialData?.phone || '');
      // Responsable: un usuario de la ETT (por defecto, quien da el alta)
      const [owner, setOwner] = useState(initialData?.ownerUserId || (catalogos.responsables.some(r => r.id === catalogos.yo) ? catalogos.yo : ''));

      // Campos opcionales (Más datos)
      const [showMore, setShowMore] = useState(isEdit || false);
      const [tradeName, setTradeName] = useState(initialData?.tradeName || '');
      const [address, setAddress] = useState(initialData?.address || '');
      const [postalCode, setPostalCode] = useState(initialData?.postalCode || '');
      const [city, setCity] = useState(initialData?.city || '');
      const [province, setProvince] = useState(initialData?.province || '');
      const [sector, setSector] = useState(initialData?.sectorCode || ''); // división CNAE
      const [defaultAgreementId, setDefaultAgreementId] = useState(initialData?.defaultAgreementId || '');
      const [notes, setNotes] = useState(initialData?.notes || '');

      // Validación & Duplicados Demo
      const [errors, setErrors] = useState({});
      const [duplicateWarning, setDuplicateWarning] = useState(null);
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleCifChange = (val) => {
setCif(val);
onChange();
setDuplicateWarning(null);
      };
      // Al salir del campo, avisa si ya hay otra empresa con ese CIF
      const revisarCif = async () => {
const otra = cif.trim() ? await comprobarCif(cif) : null;
setDuplicateWarning(otra ? `Aviso: Ya existe una empresa registrada con CIF ${cif.trim().toUpperCase()} ("${otra}").` : null);
      };

      const handleSubmit = async (e, borrador = false) => {
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
const ok = await onSave({
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
    defaultAgreementId,
    notes,
    borrador,
});
if (!ok) setIsSubmitting(false);
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
            onBlur={revisarCif}
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
          <option value="">Elige quién la lleva</option>
          {catalogos.responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
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
            <SelectorCnae value={sector} onChange={(v) => { setSector(v); onChange(); }} opciones={catalogos.sectores} />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Convenio por defecto</label>
            <Select value={defaultAgreementId} onChange={(e) => { setDefaultAgreementId(e.target.value); onChange(); }} className="w-full" aria-label="Convenio por defecto">
              <option value="">Sin decidir (se elige en cada centro)</option>
              {catalogos.convenios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <p className="mt-1 text-[11px] text-slate-400">Lo heredan los centros que no tengan un convenio propio.</p>
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
          onClick={(e) => handleSubmit(e, true)}
          disabled={isSubmitting}
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
      const [isQuoteRecipient, setIsQuoteRecipient] = useState(initialData?.isQuoteRecipient ?? true);
      const [guardando, setGuardando] = useState(false);
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

      const handleSubmit = async (e) => {
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

setGuardando(true);
const ok = await onSave({
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
if (!ok) setGuardando(false);
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
      disabled={guardando}
      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm"
    >
      {guardando ? 'Guardando...' : isEdit ? 'Actualizar Contacto' : 'Añadir Contacto'}
    </button>
  </div>
</div>
      );
    }

    // COMPONENTE: FORMULARIO DE CENTRO OPERATIVO
    function DrawerCenterForm({ title, subtitle, companyFiscalAddress, companyCity, companyPostalCode, convenios = [], convenioEmpresa = '', initialData, isEdit = false, onClose, onSave, onChange }) {
      const [name, setName] = useState(initialData?.name || '');
      const [address, setAddress] = useState(initialData?.address || '');
      const [postalCode, setPostalCode] = useState(initialData?.postalCode || '');
      const [city, setCity] = useState(initialData?.city || '');
      const [country, setCountry] = useState(initialData?.country || 'España');
      
      // Opciones avanzadas
      const [showAdvanced, setShowAdvanced] = useState(false);
      // Convenio propio del centro ('' = hereda el convenio por defecto de la empresa)
      const [laborAgreementId, setLaborAgreementId] = useState(initialData?.laborAgreementId || '');
      const [guardando, setGuardando] = useState(false);
      const [notes, setNotes] = useState(initialData?.notes || '');
      const [errors, setErrors] = useState({});

      const handleUseFiscalAddress = () => {
if (companyFiscalAddress) setAddress(companyFiscalAddress);
if (companyCity) setCity(companyCity);
if (companyPostalCode) setPostalCode(companyPostalCode);
onChange();
      };

      const handleSubmit = async (e) => {
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

setGuardando(true);
const ok = await onSave({
  id: initialData?.id,
  name,
  address,
  postalCode,
  city,
  country,
  laborAgreementId,
  notes
});
if (!ok) setGuardando(false);
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
            <Select value={laborAgreementId} onChange={(e) => { setLaborAgreementId(e.target.value); onChange(); }} className="w-full" aria-label="Convenio colectivo aplicable">
              <option value="">{convenioEmpresa ? `El de la empresa: ${convenioEmpresa}` : 'Sin convenio (la empresa no tiene uno por defecto)'}</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
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
      disabled={guardando}
      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm"
    >
      {guardando ? 'Guardando...' : isEdit ? 'Actualizar Centro' : 'Crear Centro Operativo'}
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
            archivo: f,
            nombre: f.name,
            bytes: f.size,
            esImagen: f.type.startsWith('image/'),
            error: !formatoOk ? 'Formato no admitido (solo PDF, JPG o PNG)' : !tamanoOk ? `Supera los ${MAX_MB_DOC} MB` : '',
            // Se propone el tipo por el nombre, si existe en la tabla maestra
            tipo: /cif/i.test(f.name) && tipos.includes('CIF') ? 'CIF' : /contrato/i.test(f.name) && tipos.includes('Contrato') ? 'Contrato' : '',
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

      // Sube los válidos uno a uno (URL firmada, fichero a Storage y registro). Los que fallan se quedan en la
      // lista con el motivo; los subidos se quitan.
      const subir = async () => {
        setProgreso(0);
        const fallos = await onSubir(validos, setProgreso);
        const conError = new Map(fallos.map((f) => [f.id, f.error]));
        setArchivos((prev) => prev.filter((a) => a.error || conError.has(a.id)).map((a) => (conError.has(a.id) ? { ...a, error: conError.get(a.id) } : a)));
        setProgreso(null);
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
            {archivos.length === 0 && DEMO && (
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
