> Convertido desde `docs/originales/modelo-backend-tablas.docx`. A partir de ahora, esta versión en Markdown es la canónica.

**Modelo de datos backend — ERP ETT / Trabajo Temporal**

Propuesta de tablas, relaciones y campos para implementar el backend a partir del inventario de pantallas generado previamente.

Criterio clave: todas las entidades operativas se modelan con contexto multiempresa/tenant aunque no siempre aparezca en pantalla, porque el usuario ya opera dentro de una empresa/sucursal al entrar.

## 1. Supuestos de diseño

| Decisión | Recomendación |
|---|---|
| Multi-tenant obligatorio | Usar tenant_id en todas las tablas operativas y aplicar Row Level Security o filtros obligatorios por tenant en repositorios/servicios. |
| Empresa/sucursal activa | Guardar current_company_id y current_branch_id en la sesión/token; además persistir session_company_id/session_branch_id en audit_log. |
| Borrado lógico | deleted_at en entidades maestras y operativas para no romper histórico de ofertas, peticiones, contratos y documentos. |
| Códigos visibles | Mantener id uuid como PK técnica y code/number como identificador visible único por tenant/company/branch. |
| Catálogos | Usar catalog_items para catálogos simples; tablas propias para catálogos con lógica fuerte: contract_types, agreements, professional_categories, payroll_concepts. |
| Datos personales | Cifrar o proteger NIF, Nº SS, teléfonos, e-mails y documentos; auditar acceso y exportación por RGPD. |
| Histórico de precios | No recalcular ofertas antiguas desde catálogos actuales; copiar snapshots de precios/conceptos en líneas de oferta/petición. |
| Documentos y comunicaciones | Guardar generated_documents y communications como entidades transversales relacionadas por related_entity_type + related_entity_id. |

## 2. Diagrama lógico resumido

Flujo principal: Tenant/empresa → clientes/centros → ofertas → peticiones ETT → asignaciones → candidatos/trabajadores → documentos/comunicaciones.

| Desde | Relación | Hacia | Comentario |
|---|---|---|---|
| tenants | 1:N | companies, users, clients, offers, candidates | Aislamiento multiempresa real. |
| users | N:M | roles | A través de user_roles. |
| users | N:M | companies/branches | A través de user_contexts; define empresa activa. |
| companies | 1:N | branches | Sucursales de una empresa. |
| companies | 1:N | clients | Clientes gestionados por la empresa/ETT. |
| clients | 1:1 | client_billing_profiles | Datos de facturación. |
| clients | 1:1 | client_digital_signature_settings | Firma/portal. |
| clients | 1:N | client_centers | Centros de trabajo. |
| clients/client_centers | 1:N | client_contacts | Contactos de cliente o centro. |
| clients | 1:N | client_portal_users | Usuarios portal. |
| client_portal_users | N:M | client_centers | Centros visibles. |
| clients/client_centers | 1:N | offers | Ofertas por cliente/centro. |
| offers | 1:1 | offer_calculation_settings | Parámetros de cálculo. |
| offers | 1:N | offer_price_lines | Conceptos/precios. |
| offers | 0/1:N | ett_requests | Una oferta puede generar una o varias peticiones. |
| ett_requests | 1:1 | ett_request_contract_data | Datos contrato. |
| ett_requests | 1:N | ett_request_characteristics | Características/requisitos. |
| ett_requests | 1:1 | ett_request_web_publications | Oferta web. |
| ett_requests | 1:N | ett_request_price_lines | Precios nómina. |
| ett_requests | 1:N | ett_request_assignments | Asignaciones. |
| candidates | 1:N | ett_request_assignments | Candidatos asignados a peticiones. |
| candidates | 0/1:1 | workers | Candidato formalizado como trabajador. |
| candidates/workers | 1:N | candidate_documents | CV, RGPD, contrato, documentos. |
| Cualquier entidad | 1:N | communications/generated_documents/audit_log | Trazabilidad transversal. |

## 3. Tablas propuestas

### 01. Núcleo multiempresa y seguridad

#### tenants

Organizaciones o empresas que usan la plataforma. Es la raíz de aislamiento de datos.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Identificador tenant. |
| code | varchar(30) |  | No | Código visible o interno. |
| legal_name | varchar(200) |  | No | Razón social. |
| trade_name | varchar(200) |  | Sí | Nombre comercial. |
| tax_id | varchar(30) |  | Sí | CIF/NIF. |
| status | enum(active,inactive) |  | No | Estado. |
| default_locale | varchar(10) |  | Sí | Idioma/locale. |
| timezone | varchar(80) |  | Sí | Zona horaria. |
| settings | jsonb |  | Sí | Configuración global. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(code), UNIQUE(tax_id) cuando aplique.

Notas: No confundir con cliente: tenant es la empresa desde la que se entra al sistema.

#### companies

Empresas legales o empresas de nómina deqntro de un tenant. Puede representar ETT, servicios o merchandising.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Empresa legal. |
| code | varchar(30) |  | No | Código de pantalla. |
| name | varchar(200) |  | No | Nombre/razón social. |
| tax_id_type_id | uuid | FK | Sí | Tipo CIF/NIF. |
| tax_id | varchar(30) |  | Sí | CIF. |
| status | enum(active,inactive) |  | No | Situación. |
| company_type | enum(ett,services,merchandising,other) |  | No | Tipo empresa. |
| phone | varchar(40) |  | Sí | Teléfono. |
| email | varchar(200) |  | Sí | E-mail. |
| website | varchar(250) |  | Sí | Web. |
| address_id | uuid | FK | Sí | Dirección fiscal. |
| postal_address_id | uuid | FK | Sí | Dirección postal alternativa. |
| prevention_config_id | uuid | FK | Sí | Modalidades preventivas. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, code). INDEX(tenant_id, tax_id).

Notas: Campo implícito esencial: tenant_id/company_id contextualiza todas las pantallas.

#### branches

Sucursales/delegaciones usadas en filtros de empresa, cliente, oferta y petición.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Sucursal. |
| company_id | uuid | FK | No | Empresa a la que pertenece. |
| code | varchar(30) |  | No | Código. |
| name | varchar(160) |  | No | Nombre. |
| address_id | uuid | FK | Sí | Dirección. |
| phone | varchar(40) |  | Sí | Teléfono. |
| email | varchar(200) |  | Sí | E-mail. |
| is_default | boolean |  | No | Sucursal por defecto. |
| status | enum(active,inactive) |  | No | Estado. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, company_id, code).

#### users

Usuarios internos del backend/ERP.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Usuario. |
| email | varchar(200) |  | No | Login principal. |
| username | varchar(80) |  | Sí | Alias si aplica. |
| password_hash | varchar(255) |  | No | Credencial interna. |
| full_name | varchar(160) |  | No | Nombre. |
| phone | varchar(40) |  | Sí | Teléfono. |
| status | enum(active,blocked,inactive) |  | No | Estado. |
| last_login_at | timestamp |  | Sí | Último acceso. |
| must_change_password | boolean |  | No | Forzar cambio. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, email).

Notas: Separar usuarios internos de usuarios del portal cliente.

#### roles

Roles de seguridad internos.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Rol. |
| code | varchar(50) |  | No | Código. |
| name | varchar(120) |  | No | Nombre. |
| description | text |  | Sí | Descripción. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, code).

#### user_roles

Asignación N:M de usuarios a roles.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| user_id | uuid | PK/FK | No | Usuario. |
| role_id | uuid | PK/FK | No | Rol. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: PK(user_id, role_id).

#### user_contexts

Empresas/sucursales accesibles por cada usuario interno; resuelve “en qué empresa estás mirando”.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Contexto. |
| user_id | uuid | FK | No | Usuario. |
| company_id | uuid | FK | No | Empresa permitida. |
| branch_id | uuid | FK | Sí | Sucursal permitida. |
| is_default | boolean |  | No | Contexto por defecto. |
| permissions_override | jsonb |  | Sí | Permisos finos por contexto. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(user_id, company_id, branch_id).

Notas: Al iniciar sesión, el backend debería fijar current_company_id/current_branch_id en sesión/token.

### 02. Direcciones, catálogos y parametrización

#### addresses

Direcciones reutilizables para empresas, clientes, centros y candidatos.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Dirección. |
| street_type | varchar(20) |  | Sí | Sigla: CL, PS, etc. |
| street | varchar(200) |  | Sí | Calle. |
| number | varchar(20) |  | Sí | Número. |
| door | varchar(20) |  | Sí | Puerta. |
| postal_code | varchar(20) |  | Sí | Código postal. |
| city | varchar(120) |  | Sí | Población/localidad. |
| municipality_id | uuid | FK | Sí | Municipio. |
| province_id | uuid | FK | Sí | Provincia. |
| country_id | uuid | FK | Sí | País. |
| geo_zone_id | uuid | FK | Sí | Zona geográfica. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(tenant_id, country_id, province_id).

#### catalog_items

Tabla genérica para catálogos simples: tipos ID, países, provincias, formas de pago, estados, causas, sectores, etc.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Ítem. |
| catalog | varchar(80) |  | No | Nombre catálogo. |
| code | varchar(50) |  | No | Código. |
| name | varchar(180) |  | No | Descripción. |
| parent_id | uuid | FK | Sí | Jerarquía opcional. |
| metadata | jsonb |  | Sí | Atributos extra. |
| status | enum(active,inactive) |  | No | Estado. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, catalog, code). INDEX(tenant_id, catalog).

Notas: Evita crear decenas de tablas para catálogos de bajo comportamiento.

#### prevention_configurations

Configuración de organización preventiva de la empresa.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Config. |
| assumed_by_owner | boolean |  | No | Asunción personal por empresario. |
| designated_workers | boolean |  | No | Trabajador/es designado/s. |
| own_prevention_service | boolean |  | No | Servicio prevención propio. |
| joint_prevention_service | boolean |  | No | Mancomunado. |
| external_prevention_service | boolean |  | No | Ajeno. |
| none_selected | boolean |  | No | Ninguna. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

#### agreements

Convenios colectivos usados en cliente, centro, oferta y petición.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Convenio. |
| code | varchar(50) |  | No | Código. |
| name | varchar(200) |  | No | Nombre. |
| agreement_type | enum(client,payroll,general) |  | Sí | Uso principal. |
| valid_from | date |  | Sí | Vigencia desde. |
| valid_to | date |  | Sí | Vigencia hasta. |
| status | enum(active,inactive) |  | No | Estado. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, code).

#### contract_types

Tipos de contrato de la tabla auxiliar.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Tipo contrato. |
| code | varchar(30) |  | No | Código interno. |
| official_code | varchar(30) |  | Sí | Código oficial. |
| description | varchar(250) |  | No | Descripción. |
| duration_type | enum(temporary,indefinite,other) |  | Sí | Temporal/indefinido. |
| quotation_type | enum(percentages,fixed_amount,other) |  | Sí | Cotización. |
| status | enum(active,inactive) |  | No | Estado. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, code). INDEX(tenant_id, official_code).

#### professional_categories

Categorías TTI-SRV / puestos parametrizados.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Categoría. |
| company_id | uuid | FK | Sí | Empresa si es específica. |
| branch_id | uuid | FK | Sí | Sucursal si es específica. |
| client_id | uuid | FK | Sí | Cliente si es específica. |
| code | varchar(50) |  | No | Código. |
| name | varchar(200) |  | No | Nombre. |
| occupation_id | uuid | FK | Sí | Ocupación. |
| agreement_id | uuid | FK | Sí | Convenio. |
| cno_code | varchar(30) |  | Sí | CNO. |
| statistical_code | varchar(50) |  | Sí | Código estadístico. |
| affiliation_category | varchar(120) |  | Sí | Categoría afiliación. |
| type | enum(position,category,other) |  | Sí | Tipo. |
| status | enum(active,inactive) |  | No | Estado. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, code, COALESCE(company_id,...)) según motor.

Notas: Puede ser global o particularizada por cliente.

#### payroll_concepts

Conceptos de nómina/precio: hora normal, horas extra, recargos, tarifas, etc.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Concepto. |
| code | varchar(50) |  | No | Código. |
| description | varchar(200) |  | No | Descripción. |
| concept_type | enum(normal_hour,extra_hour,allowance,charge,discount,other) |  | No | Tipo. |
| default_print_offer | boolean |  | No | Imprimir oferta. |
| default_print_invoice_cpd | boolean |  | No | Imprimir CPD factura. |
| default_print_salary_cpd | boolean |  | No | Imprimir CPD salario. |
| default_print_contract | boolean |  | No | Imprimir contrato. |
| status | enum(active,inactive) |  | No | Estado. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, code).

### 03. Clientes, centros, contactos y portal

#### clients

Clientes contratantes de la ETT.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Cliente. |
| company_id | uuid | FK | No | Empresa/ETT que gestiona. |
| branch_id | uuid | FK | Sí | Sucursal propietaria. |
| code | varchar(30) |  | No | Código cliente. |
| legal_name | varchar(220) |  | No | Razón social. |
| trade_name | varchar(220) |  | Sí | Nombre comercial. |
| tax_id_type_id | uuid | FK | Sí | Tipo Ident. |
| tax_id | varchar(30) |  | Sí | CIF/NIF. |
| client_type_id | uuid | FK | Sí | Tipo cliente. |
| activity | varchar(250) |  | Sí | Actividad. |
| start_date | date |  | Sí | Fecha alta. |
| status | enum(active,blocked,inactive) |  | No | Estado. |
| blocked | boolean |  | No | Cliente bloqueado. |
| address_id | uuid | FK | Sí | Dirección. |
| phone | varchar(40) |  | Sí | Teléfono. |
| fax | varchar(40) |  | Sí | Fax. |
| email | varchar(200) |  | Sí | E-mail. |
| website | varchar(250) |  | Sí | Web. |
| online_cpd_price_printing | boolean |  | No | Impresión precios CPD en línea. |
| observations | text |  | Sí | Observaciones. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, company_id, code). INDEX(tenant_id, tax_id).

#### client_billing_profiles

Datos de facturación y riesgo del cliente.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Perfil facturación. |
| client_id | uuid | FK | No | Cliente. |
| ccc | varchar(40) |  | Sí | Cuenta clásica. |
| iban | varchar(40) |  | Sí | IBAN. |
| swift_bic | varchar(20) |  | Sí | SWIFT/BIC. |
| payment_method_id | uuid | FK | Sí | Forma de pago. |
| seller_id | uuid | FK | Sí | Vendedor. |
| statistical_sector_id | uuid | FK | Sí | Sector estadístico. |
| invoice_client_id | uuid | FK | Sí | Cliente a facturar. |
| invoice_folder | varchar(500) |  | Sí | Carpeta facturas. |
| risk_limit | numeric(14,2) |  | Sí | Límite riesgo. |
| supplier_reference | varchar(80) |  | Sí | Ref. proveedor. |
| accounting_account | varchar(50) |  | Sí | Cuenta contable. |
| copies_count | integer |  | No | Nº copias. |
| retention_account | varchar(50) |  | Sí | Cuenta retención. |
| offer_coefficient | numeric(10,4) |  | Sí | Coeficiente oferta. |
| fixed_payment_days | integer[] |  | Sí | Días de pago. |
| invoice_type_id | uuid | FK | Sí | Tipo facturación. |
| invoice_print_model_id | uuid | FK | Sí | Modelo impresión. |
| vat_special_cause_id | uuid | FK | Sí | IVA especial/causa. |
| equivalence_surcharge | boolean |  | No | Recargo equivalencia. |
| risk_notes | text |  | Sí | Datos riesgo. |
| fixed_invoice_text | text |  | Sí | Texto fijo. |
| fixed_invoice_text_position | enum(before,after) |  | Sí | Antes/después. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(client_id).

#### client_digital_signature_settings

Firma digital de facturas/CPDs y web.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Config. |
| client_id | uuid | FK | No | Cliente. |
| invoice_signature_authorized | boolean |  | No | Autoriza firma facturas. |
| invoice_contact_name | varchar(160) |  | Sí | Contacto facturas. |
| invoice_email | varchar(200) |  | Sí | E-mail facturas. |
| send_single_email_all_contacts | boolean |  | No | Un único e-mail. |
| cpd_signature_authorized | boolean |  | No | Autoriza firma CPDs. |
| cpd_contact_name | varchar(160) |  | Sí | Contacto CPDs. |
| cpd_email | varchar(200) |  | Sí | E-mail CPDs. |
| web_account_responsible_email | varchar(200) |  | Sí | Responsable web. |
| web_cpd_signature_authorization_status | varchar(80) |  | Sí | Estado autorización web. |
| generate_e_invoice | boolean |  | No | Generar factura electrónica. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(client_id).

#### client_centers

Centros de trabajo del cliente.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Centro. |
| client_id | uuid | FK | No | Cliente. |
| branch_id | uuid | FK | Sí | Sucursal gestora. |
| code | varchar(30) |  | No | Código centro. |
| name | varchar(200) |  | No | Nombre. |
| tax_id_type_id | uuid | FK | Sí | Tipo ID. |
| tax_id | varchar(30) |  | Sí | CIF/NIF. |
| social_security_number | varchar(50) |  | Sí | Núm. Seguridad Social. |
| is_autonomous_contribution_account | boolean |  | No | CCC autónomo. |
| blocked | boolean |  | No | Centro bloqueado. |
| address_id | uuid | FK | Sí | Dirección. |
| phone | varchar(40) |  | Sí | Teléfono. |
| fax | varchar(40) |  | Sí | Fax. |
| email | varchar(200) |  | Sí | E-mail. |
| ss_regime_id | uuid | FK | Sí | Régimen SS. |
| cnae_id | uuid | FK | Sí | CNAE. |
| client_agreement_id | uuid | FK | Sí | Convenio cliente. |
| payroll_agreement_id | uuid | FK | Sí | Convenio nómina. |
| project_code | varchar(50) |  | Sí | Proyecto. |
| grda_agreement_id | uuid | FK | Sí | Convenio GRDA. |
| tc_branch_id | uuid | FK | Sí | Sucursal TC. |
| compensation_type_id | uuid | FK | Sí | Compensación. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, client_id, code).

#### client_contacts

Contactos de cliente/centro.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Contacto. |
| client_id | uuid | FK | No | Cliente. |
| center_id | uuid | FK | Sí | Centro. |
| sort_order | integer |  | Sí | Orden. |
| name | varchar(160) |  | No | Nombre. |
| position | varchar(120) |  | Sí | Cargo. |
| department | varchar(120) |  | Sí | Departamento. |
| tax_id_type_id | uuid | FK | Sí | Tipo documento. |
| document_number | varchar(40) |  | Sí | Documento. |
| phone | varchar(40) |  | Sí | Teléfono. |
| mobile | varchar(40) |  | Sí | Móvil. |
| email | varchar(200) |  | Sí | E-mail. |
| birth_date | date |  | Sí | Fecha nacimiento. |
| signs_cpds | boolean |  | No | Firma CPDs. |
| receives_digital_signature | boolean |  | No | Recibe firma digital. |
| invoice_send_type | varchar(50) |  | Sí | Tipo envío factura. |
| send_collection_claims | boolean |  | No | Reclamaciones cobro. |
| observations | text |  | Sí | Observaciones. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(client_id, center_id).

#### client_portal_users

Usuarios externos del portal de cliente.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Usuario portal. |
| client_id | uuid | FK | No | Cliente. |
| contact_id | uuid | FK | Sí | Contacto asociado. |
| username | varchar(80) |  | No | Usuario. |
| password_hash | varchar(255) |  | No | Contraseña. |
| name | varchar(160) |  | Sí | Nombre. |
| document_number | varchar(40) |  | Sí | Documento identificación. |
| position | varchar(120) |  | Sí | Cargo. |
| phone | varchar(40) |  | Sí | Teléfono. |
| email | varchar(200) |  | Sí | E-mail. |
| user_type | varchar(60) |  | No | Tipo usuario. |
| must_change_password | boolean |  | No | Cambio al acceder. |
| blocked | boolean |  | No | Bloqueado. |
| blocked_by | uuid | FK | Sí | Usuario bloqueador. |
| blocked_at | timestamp |  | Sí | Fecha bloqueo. |
| last_password_change_at | timestamp |  | Sí | Último cambio contraseña. |
| last_access_at | timestamp |  | Sí | Último acceso. |
| web_history_months | integer |  | Sí | Histórico visible. |
| permissions | jsonb |  | No | Preferencias, contratos, facturas, documentos, CPDs, presencias, etc. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, client_id, username).

Notas: Los permisos pueden normalizarse si se requiere reporting detallado.

#### client_portal_user_centers

Centros visibles para cada usuario portal.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| portal_user_id | uuid | PK/FK | No | Usuario portal. |
| center_id | uuid | PK/FK | No | Centro. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: PK(portal_user_id, center_id).

### 04. Ofertas y precios

#### offers

Oferta comercial enviada al cliente.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Oferta. |
| company_id | uuid | FK | No | Empresa gestora. |
| branch_id | uuid | FK | No | Sucursal. |
| offer_number | varchar(40) |  | Sí | Nº oferta. |
| offer_date | date |  | No | Fecha. |
| status | enum(draft,pending,sent,accepted,rejected,cancelled) |  | No | Situación. |
| type | enum(client,internal,other) |  | Sí | Tipo. |
| crm_offer_ref | varchar(80) |  | Sí | Oferta CRM. |
| is_agrarian | boolean |  | No | Oferta agraria. |
| client_id | uuid | FK | No | Cliente. |
| center_id | uuid | FK | Sí | Centro. |
| order_reference | varchar(120) |  | Sí | Referencia pedido. |
| valid_until | date |  | Sí | Fecha válida. |
| accepted_rejected_at | date |  | Sí | Fecha aceptada/rechazada. |
| ss_regime_id | uuid | FK | Sí | Régimen SS. |
| agreement_id | uuid | FK | Sí | Convenio. |
| agreement_price_year | integer |  | Sí | Año precios convenio. |
| category_id | uuid | FK | Sí | Categoría. |
| seller_id | uuid | FK | Sí | Vendedor. |
| estimated_hours | numeric(10,2) |  | Sí | Horas estimadas. |
| rejection_cause_id | uuid | FK | Sí | Causa rechazo. |
| enjoys_vacation | boolean |  | No | Disfruta vacaciones. |
| annual_payments | integer |  | Sí | Número pagas año. |
| hours_per_day | numeric(8,2) |  | Sí | Horas día. |
| hours_per_year | numeric(10,2) |  | Sí | Horas año. |
| part_time_coefficient | numeric(10,4) |  | Sí | Coef. parcialidad. |
| employer_ss_cost_percent | numeric(7,4) |  | Sí | % coste empresarial SS. |
| payment_method_id | uuid | FK | Sí | Forma pago. |
| observations | text |  | Sí | Observaciones. |
| printed | boolean |  | No | Oferta impresa. |
| printed_at | date |  | Sí | Fecha impresión. |
| sent | boolean |  | No | Oferta enviada. |
| sent_at | date |  | Sí | Fecha envío. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, company_id, branch_id, offer_number). INDEX(client_id, center_id, status).

#### offer_calculation_settings

Parámetros de cálculo económico de oferta.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Cálculo. |
| offer_id | uuid | FK | No | Oferta. |
| margin_percent | numeric(8,4) |  | Sí | Margen. |
| indemnity_percent | numeric(8,4) |  | Sí | Indemnización. |
| absenteeism_percent | numeric(8,4) |  | Sí | Absentismo. |
| training_percent | numeric(8,4) |  | Sí | Formación. |
| medical_check_percent | numeric(8,4) |  | Sí | Reconocimiento médico. |
| medical_check_amount | numeric(12,2) |  | Sí | Importe reconocimiento. |
| normal_hour_concept_id | uuid | FK | Sí | Hora normal. |
| monthly_rate_concept_id | uuid | FK | Sí | Tarifa mes. |
| short_contract_rate_concept_id | uuid | FK | Sí | Tarifa corta duración. |
| short_contract_surcharge_concept_id | uuid | FK | Sí | Recargo <30 días. |
| short_contract_amount | numeric(12,2) |  | Sí | Importe recargo. |
| short_contract_margin | numeric(8,4) |  | Sí | Margen recargo. |
| short_contract_sale_rate | numeric(12,2) |  | Sí | Tarifa venta recargo. |
| short_contract_coefficient | numeric(10,4) |  | Sí | Coeficiente. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(offer_id).

#### offer_price_lines

Líneas de precio/concepto de oferta.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Línea. |
| offer_id | uuid | FK | No | Oferta. |
| position_code | varchar(50) |  | Sí | Puesto. |
| occupation_id | uuid | FK | Sí | Ocupación. |
| salary_level_id | uuid | FK | Sí | Nivel salarial. |
| concept_id | uuid | FK | No | Concepto. |
| description | varchar(250) |  | Sí | Descripción. |
| annual_gross | numeric(12,2) |  | Sí | Bruto anual. |
| monthly_gross | numeric(12,2) |  | Sí | Bruto mes. |
| hour_salary | numeric(12,4) |  | Sí | Salario hora. |
| monthly_salary | numeric(12,2) |  | Sí | Salario mes. |
| margin_percent | numeric(8,4) |  | Sí | Margen. |
| it_ims_percent | numeric(8,4) |  | Sí | IT + IMS. |
| hourly_rate | numeric(12,4) |  | Sí | Tarifa horas. |
| monthly_rate | numeric(12,2) |  | Sí | Tarifa mensual. |
| normal_hours_coefficient | numeric(10,4) |  | Sí | Coef. horas normales. |
| monthly_coefficient | numeric(10,4) |  | Sí | Coef. mensual. |
| print_offer | boolean |  | No | Imprimir oferta. |
| print_invoice_cpd | boolean |  | No | Imprimir CPD factura. |
| print_salary_cpd | boolean |  | No | Imprimir CPD salario. |
| print_contract | boolean |  | No | Imprimir contrato. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(offer_id, concept_id).

### 05. Peticiones ETT, publicación web y asignaciones

#### ett_requests

Petición de ETT derivada o no de una oferta.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Petición. |
| company_id | uuid | FK | No | Empresa. |
| branch_id | uuid | FK | No | Sucursal. |
| request_number | varchar(40) |  | No | Nº petición. |
| offer_id | uuid | FK | Sí | Oferta origen. |
| client_id | uuid | FK | No | Cliente. |
| center_id | uuid | FK | Sí | Centro. |
| responsible_user_id | uuid | FK | Sí | Responsable. |
| request_date | date |  | No | Fecha petición. |
| start_date | date |  | Sí | Fecha inicio. |
| end_date | date |  | Sí | Fecha cierre/fin. |
| status | enum(pending,accepted,partial,completed,cancelled,rejected) |  | No | Estado. |
| position_id | uuid | FK | Sí | Puesto. |
| order_reference | varchar(120) |  | Sí | Referencia pedido. |
| workers_requested | integer |  | No | Trabajadores pedidos. |
| workers_assigned | integer |  | No | Trabajadores asignados. |
| workers_accepted | integer |  | No | Trabajadores aceptados. |
| workers_rejected | integer |  | No | Trabajadores rechazados. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, company_id, branch_id, request_number). INDEX(client_id, center_id, status).

#### ett_request_contract_data

Pestaña Datos contrato de la petición.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Datos contrato. |
| request_id | uuid | FK | No | Petición. |
| category_id | uuid | FK | Sí | Categoría. |
| salary_level_id | uuid | FK | Sí | Nivel salarial. |
| page_code | varchar(50) |  | Sí | Cód. página. |
| contract_type_id | uuid | FK | Sí | Tipo contrato. |
| occupation_id | uuid | FK | Sí | Ocupación. |
| rate_group_id | uuid | FK | Sí | Grupo tarifa. |
| quotation_type | varchar(80) |  | Sí | Tipo cotización. |
| salary_type | enum(hourly,monthly,annual,other) |  | Sí | Tipo salario. |
| authorization | varchar(250) |  | Sí | Autorización. |
| weekly_schedule | jsonb |  | Sí | Horario lunes-domingo. |
| schedule_from | time |  | Sí | Desde. |
| schedule_to | time |  | Sí | Hasta. |
| internal_observations | text |  | Sí | Observaciones internas. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(request_id).

Notas: weekly_schedule puede normalizarse si se requiere gestión de turnos avanzada.

#### ett_request_characteristics

Características/requisitos asociados a una petición.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Característica. |
| request_id | uuid | FK | No | Petición. |
| characteristic_id | uuid | FK | No | Característica catálogo. |
| value | varchar(250) |  | Sí | Valor. |
| is_required | boolean |  | No | Obligatoria. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(request_id, characteristic_id).

#### ett_request_web_publications

Pestaña Oferta WEB para publicar petición/oferta.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Publicación. |
| request_id | uuid | FK | No | Petición. |
| publish_web | boolean |  | No | Publicar en web. |
| status | enum(draft,published,closed) |  | No | Estado web. |
| contact_name | varchar(160) |  | Sí | Contacto. |
| contact_email | varchar(200) |  | Sí | E-mail contacto. |
| web_position_title | varchar(200) |  | Sí | Puesto web. |
| web_category_id | uuid | FK | Sí | Categoría web. |
| functions_description | text |  | Sí | Descripción funciones. |
| requirements | text |  | Sí | Requisitos. |
| schedule_description | text |  | Sí | Horario. |
| city_id | uuid | FK | Sí | Población. |
| published_at | date |  | Sí | Fecha publicación. |
| publication_ends_at | date |  | Sí | Fecha fin publicación. |
| salary_public_text | varchar(250) |  | Sí | Condiciones/salario visible. |
| external_slug | varchar(200) |  | Sí | URL pública. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, external_slug). INDEX(request_id, status).

#### ett_request_price_lines

Precios nómina vinculados a petición.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Línea precio. |
| request_id | uuid | FK | No | Petición. |
| concept_id | uuid | FK | No | Concepto. |
| description | varchar(250) |  | Sí | Descripción. |
| valid_from | date |  | Sí | Fecha inicio. |
| valid_to | date |  | Sí | Fecha fin. |
| price | numeric(12,4) |  | Sí | Precio. |
| payments | integer |  | Sí | Pagas. |
| print_flags | jsonb |  | Sí | Indicadores de impresión. |
| reference | varchar(120) |  | Sí | Referencia. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(request_id, concept_id).

#### ett_request_assignments

Asignaciones de candidatos/trabajadores a peticiones.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Asignación. |
| request_id | uuid | FK | No | Petición. |
| candidate_id | uuid | FK | No | Candidato. |
| worker_id | uuid | FK | Sí | Trabajador generado/asociado. |
| origin | enum(manual,web,import,other) |  | No | Origen. |
| status | enum(proposed,accepted,rejected,cancelled,hired) |  | No | Estado asignación. |
| status_date | date |  | Sí | Fecha estado. |
| rejection_cause_id | uuid | FK | Sí | Causa rechazo. |
| notes | text |  | Sí | Notas. |
| phone_snapshot | varchar(40) |  | Sí | Teléfono en el momento. |
| notified_at | timestamp |  | Sí | Última notificación. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(request_id, candidate_id). INDEX(candidate_id, status).

Notas: Puede disparar eventos de comunicación y generación documental.

### 06. Candidatos, trabajadores y documentos

#### candidates

Candidatos/personas disponibles para asignación.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Candidato. |
| candidate_code | varchar(40) |  | No | Código candidato. |
| worker_code | varchar(40) |  | Sí | Código trabajador si existe. |
| first_name | varchar(100) |  | Sí | Nombre. |
| last_name | varchar(160) |  | Sí | Apellidos. |
| full_name | varchar(260) |  | No | Nombre completo. |
| tax_id | varchar(40) |  | Sí | NIF/NIE. |
| social_security_number | varchar(60) |  | Sí | Nº SS. |
| phone | varchar(40) |  | Sí | Teléfono. |
| mobile | varchar(40) |  | Sí | Móvil. |
| email | varchar(200) |  | Sí | E-mail. |
| address_id | uuid | FK | Sí | Dirección. |
| city | varchar(120) |  | Sí | Población snapshot. |
| province_id | uuid | FK | Sí | Provincia. |
| available | boolean |  | No | Disponible. |
| active | boolean |  | No | Activo. |
| disability | boolean |  | No | Discapacidad. |
| expected_end_date | date |  | Sí | Fecha fin prevista. |
| block_status_id | uuid | FK | Sí | Bloqueo. |
| cv_web | boolean |  | No | CV web. |
| cv_attached | boolean |  | No | CV anexado. |
| cv_date | date |  | Sí | Fecha CV. |
| data_entry_source | varchar(80) |  | Sí | Origen de entrada. |
| initial_origin | varchar(80) |  | Sí | Origen inicial. |
| attention_mark | boolean |  | No | Marca de atención. |
| discontinuous_fixed | boolean |  | No | Fijo discontinuo. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, candidate_code). INDEX(tax_id), INDEX(email), INDEX(available, active).

Notas: Cifrar o proteger campos personales sensibles según RGPD.

#### workers

Trabajadores formalizados a partir de candidatos.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Trabajador. |
| candidate_id | uuid | FK | No | Candidato origen. |
| worker_code | varchar(40) |  | No | Código trabajador. |
| company_id | uuid | FK | No | Empresa gestora. |
| branch_id | uuid | FK | Sí | Sucursal. |
| status | enum(active,inactive,blocked) |  | No | Estado. |
| hire_date | date |  | Sí | Alta. |
| termination_date | date |  | Sí | Baja. |
| payroll_profile | jsonb |  | Sí | Datos laborales/nómina específicos. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, company_id, worker_code).

Notas: No mezclar candidato y trabajador si hay ciclo laboral/formal distinto.

#### candidate_documents

Documentos anexos, CV, RGPD, contratos, permisos, etc.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Documento. |
| candidate_id | uuid | FK | Sí | Candidato. |
| worker_id | uuid | FK | Sí | Trabajador. |
| document_type_id | uuid | FK | No | Tipo documento. |
| file_name | varchar(250) |  | No | Nombre archivo. |
| storage_key | varchar(500) |  | No | Ruta/objeto storage. |
| mime_type | varchar(120) |  | Sí | MIME. |
| file_size | bigint |  | Sí | Tamaño. |
| signed | boolean |  | No | Firmado. |
| signed_at | timestamp |  | Sí | Fecha firma. |
| expires_at | date |  | Sí | Caducidad. |
| visibility | enum(internal,client_portal,candidate_portal) |  | No | Visibilidad. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(candidate_id, document_type_id).

#### candidate_followups

Seguimientos, valoraciones e incidencias de candidatos.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Seguimiento. |
| candidate_id | uuid | FK | No | Candidato. |
| user_id | uuid | FK | Sí | Usuario. |
| followup_type | varchar(80) |  | No | Tipo. |
| status | varchar(80) |  | Sí | Estado. |
| score | numeric(5,2) |  | Sí | Valoración. |
| comments | text |  | Sí | Comentarios. |
| followup_at | timestamp |  | No | Fecha seguimiento. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(candidate_id, followup_at).

### 07. Comunicación, documentos generados y auditoría

#### communications

Comunicaciones por e-mail, SMS, notificación o portal.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Comunicación. |
| channel | enum(email,sms,push,portal) |  | No | Canal. |
| direction | enum(outbound,inbound) |  | No | Sentido. |
| related_entity_type | varchar(80) |  | No | Entidad relacionada. |
| related_entity_id | uuid |  | No | Id entidad. |
| recipient_name | varchar(160) |  | Sí | Destinatario. |
| recipient_address | varchar(250) |  | Sí | Teléfono/e-mail. |
| subject | varchar(250) |  | Sí | Asunto. |
| body | text |  | Sí | Contenido. |
| status | enum(queued,sent,failed,delivered,read) |  | No | Estado. |
| sent_at | timestamp |  | Sí | Envío. |
| provider_message_id | varchar(160) |  | Sí | Id proveedor. |
| metadata | jsonb |  | Sí | Respuesta proveedor. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(tenant_id, related_entity_type, related_entity_id).

#### generated_documents

Ofertas, contratos, CPDs, RGPD y PDFs generados.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Documento generado. |
| document_kind | varchar(80) |  | No | Tipo: oferta, contrato, CPD, RGPD... |
| related_entity_type | varchar(80) |  | No | Entidad. |
| related_entity_id | uuid |  | No | Id entidad. |
| template_id | uuid | FK | Sí | Plantilla. |
| file_name | varchar(250) |  | No | Nombre. |
| storage_key | varchar(500) |  | No | Storage. |
| format | enum(pdf,docx,html) |  | No | Formato. |
| generated_by | uuid | FK | Sí | Usuario. |
| generated_at | timestamp |  | No | Fecha generación. |
| signature_status | enum(not_required,pending,signed,rejected) |  | No | Firma. |
| signature_provider_id | varchar(160) |  | Sí | Proveedor firma. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(related_entity_type, related_entity_id).

#### document_templates

Plantillas de documentos y comunicaciones.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Plantilla. |
| code | varchar(80) |  | No | Código. |
| name | varchar(160) |  | No | Nombre. |
| template_type | varchar(80) |  | No | Tipo. |
| version | integer |  | No | Versión. |
| storage_key | varchar(500) |  | No | Archivo plantilla. |
| active | boolean |  | No | Activa. |
| metadata | jsonb |  | Sí | Campos, idioma, marca. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: UNIQUE(tenant_id, code, version).

#### audit_log

Auditoría funcional y de seguridad.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Evento. |
| user_id | uuid | FK | Sí | Usuario. |
| session_company_id | uuid | FK | Sí | Empresa contextual. |
| session_branch_id | uuid | FK | Sí | Sucursal contextual. |
| action | varchar(120) |  | No | Acción. |
| entity_type | varchar(80) |  | No | Tabla/entidad. |
| entity_id | uuid |  | Sí | Registro. |
| before_data | jsonb |  | Sí | Valores anteriores. |
| after_data | jsonb |  | Sí | Valores nuevos. |
| ip_address | inet |  | Sí | IP. |
| user_agent | text |  | Sí | User agent. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(tenant_id, entity_type, entity_id), INDEX(user_id, created_at).

Notas: Debe registrar empresa/sucursal activa para reproducir contexto de pantalla.

#### import_exports

Histórico de importaciones/exportaciones Excel/PDF/listados.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Proceso. |
| process_type | enum(import,export) |  | No | Tipo. |
| entity_type | varchar(80) |  | No | Entidad. |
| file_name | varchar(250) |  | Sí | Archivo. |
| storage_key | varchar(500) |  | Sí | Storage. |
| status | enum(pending,running,completed,failed) |  | No | Estado. |
| started_by | uuid | FK | Sí | Usuario. |
| started_at | timestamp |  | No | Inicio. |
| finished_at | timestamp |  | Sí | Fin. |
| rows_total | integer |  | Sí | Filas. |
| rows_ok | integer |  | Sí | Correctas. |
| rows_error | integer |  | Sí | Errores. |
| error_report | jsonb |  | Sí | Detalle errores. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; filtro obligatorio. |
| created_at | timestamp |  | No | Alta del registro. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Soft delete. |

Índices/constraints: INDEX(tenant_id, entity_type, status).

## 4. Campos implícitos que no se ven en pantalla

#### Campos técnicos transversales

Campos recomendados en prácticamente todas las tablas persistentes.

| Campo | Tipo sugerido | Clave | Nulo | Notas |
|---|---|---|---|---|
| id | uuid | PK | No | Clave técnica no visible. |
| tenant_id | uuid | FK | No | Empresa/organización en sesión; indispensable para multi-tenant. |
| company_id | uuid | FK | Depende | Empresa legal activa si la tabla es operativa. |
| branch_id | uuid | FK | Depende | Sucursal activa si afecta a operación diaria. |
| created_by | uuid | FK | Sí | Usuario creador. |
| updated_by | uuid | FK | Sí | Último usuario modificador. |
| created_at | timestamp |  | No | Alta. |
| updated_at | timestamp |  | No | Última modificación. |
| deleted_at | timestamp |  | Sí | Borrado lógico. |
| version | integer |  | No | Control de concurrencia optimista. |
| source | varchar(80) |  | Sí | Manual, importación, portal, integración. |
| metadata | jsonb |  | Sí | Extensión segura para campos menores no modelados todavía. |

Índices/constraints: INDEX(tenant_id), INDEX(company_id), INDEX(deleted_at) según tabla.

Notas: No todos deben aparecer en formularios, pero sí son necesarios para backend real.

## 5. MVP recomendado

| Decisión | Recomendación |
|---|---|
| Fase 1 — Núcleo | tenants, companies, branches, users, roles, user_contexts, catalog_items, addresses. |
| Fase 2 — Clientes | clients, client_centers, client_contacts, billing_profiles, portal_users. |
| Fase 3 — Ofertas | offers, offer_calculation_settings, offer_price_lines, contract_types, agreements, categories, concepts. |
| Fase 4 — Peticiones | ett_requests, contract_data, web_publications, request_price_lines, assignments. |
| Fase 5 — Candidatos | candidates, workers, candidate_documents, followups. |
| Fase 6 — Operación avanzada | communications, generated_documents, document_templates, audit_log, import_exports. |

Este modelo está pensado como punto de partida normalizado. Antes de implementar conviene validarlo con procesos reales: alta de cliente, creación de oferta, aceptación, generación de petición, búsqueda/asignación de candidato, emisión documental y facturación/CPDs.
