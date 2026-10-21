const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { Pool } = require("pg");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();

// Roles and scopes defined by tipos_de_usuarios.drawio (1).pdf.
const ROLE_DEFINITIONS = {
  superadmin: {
    name: "Superadministrador",
    modules: [{ codigo: "PLATAFORMA", nombre: "Administracion de la plataforma" }],
  },
  admin: {
    name: "Administrador",
    modules: [
      { codigo: "ADMINISTRACION_ETT", nombre: "Administracion de la ETT" },
      { codigo: "LABORAL", nombre: "Laboral" },
      { codigo: "SELECCION", nombre: "Seleccion" },
      { codigo: "COMERCIAL", nombre: "Comercial" },
    ],
  },
  laboral: {
    name: "Laboral",
    modules: [{ codigo: "LABORAL", nombre: "Laboral" }],
  },
  director_zona: {
    name: "Director de area/zona",
    modules: [
      { codigo: "LABORAL", nombre: "Laboral" },
      { codigo: "SELECCION", nombre: "Seleccion" },
      { codigo: "COMERCIAL", nombre: "Comercial" },
    ],
  },
  seleccion: {
    name: "Seleccion",
    modules: [{ codigo: "SELECCION", nombre: "Seleccion" }],
  },
  comercial: {
    name: "Comercial",
    modules: [{ codigo: "COMERCIAL", nombre: "Comercial" }],
  },
};

const ROLES = Object.keys(ROLE_DEFINITIONS);
const ROLES_ETT = ROLES.filter((role) => role !== "superadmin");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
});

const CORS_ORIGIN = process.env.WEB_ORIGIN || "https://tramitnow-development.web.app";

function setCors(res) {
  res.set("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function requireUuid(value, field) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw httpError(400, `${field} debe ser un UUID valido`);
  }
  return value;
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(String))];
}

function makeCode(value, prefix = "ITEM") {
  const base = String(value || prefix)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 22) || prefix;
  return `${base}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function setClaims(uid, claims) {
  const user = await admin.auth().getUser(uid);
  await admin.auth().setCustomUserClaims(uid, { ...(user.customClaims || {}), ...claims });
}

// Execute all tenant-sensitive SQL in one transaction. The settings are also
// consumed by the optional RLS policies in sql/backend_model_ett_tramitnow.sql.
async function withDbContext(claim, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [String(claim.tenantId || "")]);
    await client.query("SELECT set_config('app.rol', $1, true)", [claim.rol]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function verifyFirebaseToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw httpError(401, "No autorizado: token no enviado");
  }
  try {
    return await admin.auth().verifyIdToken(authHeader.slice(7));
  } catch {
    throw httpError(401, "No autorizado: token invalido o expirado");
  }
}

async function loadTenantClaim(decoded) {
  const role = decoded.rol;
  const tenantId = requireUuid(decoded.tenantId, "tenantId del token");

  return withDbContext({ rol: role, tenantId }, async (client) => {
    const { rows: users } = await client.query(
      `SELECT u.id, u.email, u.status, u.tenant_id, t.status AS tenant_status
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.firebase_uid = $1
         AND u.tenant_id = $2
         AND u.deleted_at IS NULL
         AND t.deleted_at IS NULL`,
      [decoded.uid, tenantId]
    );
    const user = users[0];
    if (!user || user.status !== "active" || user.tenant_status !== "active") {
      throw httpError(403, "Usuario o ETT inactivos");
    }

    const { rows: assignedRoles } = await client.query(
      `SELECT r.code
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
         AND ur.tenant_id = $2
         AND ur.deleted_at IS NULL
         AND r.deleted_at IS NULL`,
      [user.id, tenantId]
    );
    if (!assignedRoles.some((row) => row.code === role)) {
      throw httpError(403, "El rol del token ya no esta asignado al usuario");
    }

    const { rows: contexts } = await client.query(
      `SELECT company_id, branch_id, is_default
       FROM user_contexts
       WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       ORDER BY is_default DESC, created_at`,
      [user.id, tenantId]
    );
    if (contexts.length === 0) {
      throw httpError(403, "Usuario sin empresa asignada");
    }

    const requestedCompany = decoded.companyId && UUID_PATTERN.test(decoded.companyId)
      ? decoded.companyId
      : null;
    const companyId = contexts.some((row) => row.company_id === requestedCompany)
      ? requestedCompany
      : contexts[0].company_id;
    const companyContexts = contexts.filter((row) => row.company_id === companyId);
    const branchIds = uniqueStrings(companyContexts.filter((row) => row.branch_id).map((row) => row.branch_id));

    let branchId = null;
    if (["seleccion", "comercial"].includes(role)) {
      branchId = branchIds.includes(decoded.branchId) ? decoded.branchId : branchIds[0];
      if (!branchId) throw httpError(403, "Usuario sin sucursal asignada");
    }
    if (role === "director_zona" && branchIds.length === 0) {
      throw httpError(403, "Director de zona sin sucursales asignadas");
    }

    return {
      uid: decoded.uid,
      email: user.email || decoded.email,
      userId: user.id,
      rol: role,
      tenantId,
      companyId,
      branchId,
      branchIds,
    };
  });
}

async function authorize(req, options = {}) {
  const { allowedRoles = null, module = null, branchField = null } = options;
  const decoded = await verifyFirebaseToken(req);
  const role = decoded.rol;

  if (!role || !ROLES.includes(role)) {
    throw httpError(403, "Usuario sin rol valido asignado");
  }

  const claim = role === "superadmin"
    ? {
        uid: decoded.uid,
        email: decoded.email,
        userId: null,
        rol: role,
        tenantId: null,
        companyId: null,
        branchId: null,
        branchIds: [],
      }
    : await loadTenantClaim(decoded);

  if (allowedRoles && !allowedRoles.includes(claim.rol)) {
    throw httpError(403, "Prohibido: rol no autorizado para esta accion");
  }
  if (module && !ROLE_DEFINITIONS[claim.rol].modules.some((item) => item.codigo === module)) {
    throw httpError(403, `Prohibido: sin acceso al modulo ${module}`);
  }
  if (branchField) {
    const branchId = req.body?.[branchField] ?? req.query?.[branchField];
    requireUuid(branchId, branchField);
    if (!canAccessBranch(claim, branchId)) {
      throw httpError(403, "Prohibido: sin acceso a esta sucursal");
    }
  }

  return claim;
}

function canAccessBranch(claim, branchId) {
  if (["superadmin", "admin", "laboral"].includes(claim.rol)) return true;
  if (claim.rol === "director_zona") return claim.branchIds.includes(String(branchId));
  if (["seleccion", "comercial"].includes(claim.rol)) return claim.branchId === String(branchId);
  return false;
}

function publicProfile(claim) {
  return {
    rol: claim.rol,
    tenantId: claim.tenantId,
    companyId: claim.companyId,
    branchId: claim.branchId,
    branches: claim.branchIds,
    email: claim.email,
  };
}

const handler = (fn) => onRequest(
  { region: "us-central1", timeoutSeconds: 60 },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).send("");
    try {
      await fn(req, res);
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status >= 500) logger.error("Error no controlado", error);
      if (!res.headersSent) {
        res.status(status).json({ error: status >= 500 ? "Error interno del servidor" : error.message });
      }
    }
  }
);

async function anySuperadminExists() {
  let pageToken;
  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    if (page.users.some((user) => user.customClaims?.rol === "superadmin")) return true;
    pageToken = page.pageToken;
  } while (pageToken);
  return false;
}

// Bootstrap only affects Firebase Auth. A platform superadmin is global and
// therefore is not stored in the tenant-bound users table.
exports.setupSuperadmin = handler(async (req, res) => {
  const decoded = await verifyFirebaseToken(req);
  if (decoded.rol === "superadmin") {
    return res.status(200).json({ ok: true, mensaje: "Ya eres superadministrador" });
  }

  const allowedUid = process.env.SUPERADMIN_UID;
  const allowedEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase();
  if (!allowedUid && !allowedEmail) {
    throw httpError(412, "Configura SUPERADMIN_UID o SUPERADMIN_EMAIL antes del bootstrap");
  }
  if (allowedUid && decoded.uid !== allowedUid) {
    throw httpError(403, "Este usuario no esta autorizado para el bootstrap");
  }
  if (allowedEmail && decoded.email?.toLowerCase() !== allowedEmail) {
    throw httpError(403, "Este usuario no esta autorizado para el bootstrap");
  }
  if (await anySuperadminExists()) {
    throw httpError(403, "Ya existe un superadministrador");
  }

  await setClaims(decoded.uid, { rol: "superadmin" });
  return res.status(200).json({ ok: true, mensaje: "Ahora eres superadministrador. Recarga la pagina." });
});

exports.iniciarSesion = handler(async (req, res) => {
  const claim = await authorize(req);
  if (claim.userId) {
    await withDbContext(claim, (client) => client.query(
      "UPDATE users SET last_login_at = NOW() WHERE id = $1 AND tenant_id = $2",
      [claim.userId, claim.tenantId]
    ));
  }
  return res.status(200).json({
    perfil: publicProfile(claim),
    modulos: ROLE_DEFINITIONS[claim.rol].modules,
  });
});

exports.cerrarSesion = handler(async (req, res) => {
  await verifyFirebaseToken(req);
  return res.status(200).json({ ok: true });
});

exports.miPerfil = handler(async (req, res) => {
  const claim = await authorize(req);
  return res.status(200).json({
    perfil: publicProfile(claim),
    modulos: ROLE_DEFINITIONS[claim.rol].modules,
  });
});

exports.crearETT = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ["superadmin"] });
  const { nombre, cif, codigo, sucursales = [], adminUsuario } = req.body || {};
  if (!nombre || !adminUsuario?.email || !adminUsuario?.password) {
    throw httpError(400, "Faltan nombre de ETT y administrador (email y password)");
  }

  let firebaseUser;
  try {
    firebaseUser = await admin.auth().createUser({
      email: adminUsuario.email,
      password: adminUsuario.password,
      displayName: `${adminUsuario.nombre || ""} ${adminUsuario.apellido || ""}`.trim(),
    });
  } catch (error) {
    throw httpError(400, `No se pudo crear el administrador: ${error.message}`);
  }

  try {
    const result = await withDbContext(claim, async (client) => {
      const tenantCode = codigo ? String(codigo).toUpperCase().slice(0, 30) : makeCode(nombre, "ETT");
      const { rows: tenantRows } = await client.query(
        `INSERT INTO tenants (code, legal_name, trade_name, tax_id)
         VALUES ($1, $2, $2, $3)
         RETURNING id, code, legal_name, trade_name, tax_id, status, created_at`,
        [tenantCode, nombre, cif || null]
      );
      const tenant = tenantRows[0];

      const { rows: companyRows } = await client.query(
        `INSERT INTO companies (code, name, tax_id, company_type, tenant_id)
         VALUES ($1, $2, $3, 'ett', $4)
         RETURNING id, code, name, tax_id, status`,
        [tenantCode, nombre, cif || null, tenant.id]
      );
      const company = companyRows[0];

      const validBranches = Array.isArray(sucursales)
        ? sucursales.filter((branch) => branch?.nombre)
        : [];
      const hasDefault = validBranches.some((branch) => branch.esSede || branch.isDefault);
      const branches = [];
      for (const [index, branch] of validBranches.entries()) {
        const { rows } = await client.query(
          `INSERT INTO branches (company_id, code, name, is_default, tenant_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, code, name, is_default, status`,
          [
            company.id,
            branch.codigo ? String(branch.codigo).toUpperCase().slice(0, 30) : makeCode(branch.nombre, "SUC"),
            branch.nombre,
            Boolean(branch.esSede || branch.isDefault || (!hasDefault && index === 0)),
            tenant.id,
          ]
        );
        branches.push(rows[0]);
      }

      const roleIds = {};
      for (const role of ROLES_ETT) {
        const definition = ROLE_DEFINITIONS[role];
        const { rows } = await client.query(
          `INSERT INTO roles (code, name, description, tenant_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tenant_id, code)
           DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, deleted_at = NULL
           RETURNING id`,
          [role, definition.name, `Rol ${definition.name}`, tenant.id]
        );
        roleIds[role] = rows[0].id;
      }

      const fullName = `${adminUsuario.nombre || ""} ${adminUsuario.apellido || ""}`.trim()
        || adminUsuario.email.split("@")[0];
      const { rows: userRows } = await client.query(
        `INSERT INTO users (firebase_uid, email, full_name, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, status`,
        [firebaseUser.uid, adminUsuario.email, fullName, tenant.id]
      );
      const user = userRows[0];

      await client.query(
        "INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)",
        [user.id, roleIds.admin, tenant.id]
      );
      await client.query(
        `INSERT INTO user_contexts (user_id, company_id, branch_id, is_default, tenant_id)
         VALUES ($1, $2, NULL, TRUE, $3)`,
        [user.id, company.id, tenant.id]
      );

      await setClaims(firebaseUser.uid, {
        rol: "admin",
        tenantId: tenant.id,
        companyId: company.id,
      });

      return { tenant, company, branches };
    });

    return res.status(200).json({
      ok: true,
      ett: {
        ett_id: result.tenant.id,
        company_id: result.company.id,
        nombre: result.tenant.trade_name || result.tenant.legal_name,
        cif: result.tenant.tax_id,
        activa: result.tenant.status === "active",
      },
      sucursales: result.branches.map((branch) => ({
        sucursal_id: branch.id,
        nombre: branch.name,
        es_sede: branch.is_default,
      })),
    });
  } catch (error) {
    await admin.auth().deleteUser(firebaseUser.uid).catch(() => {});
    throw error;
  }
});

exports.listarETTs = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ["superadmin"] });
  const etts = await withDbContext(claim, async (client) => {
    const { rows } = await client.query(
      `SELECT t.id, t.trade_name, t.legal_name, t.tax_id, t.status, t.created_at,
              COUNT(DISTINCT b.id) AS branch_count,
              COUNT(DISTINCT u.id) AS user_count
       FROM tenants t
       LEFT JOIN branches b ON b.tenant_id = t.id AND b.deleted_at IS NULL
       LEFT JOIN users u ON u.tenant_id = t.id AND u.deleted_at IS NULL
       WHERE t.deleted_at IS NULL
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );
    return rows.map((row) => ({
      ett_id: row.id,
      nombre: row.trade_name || row.legal_name,
      cif: row.tax_id,
      activa: row.status === "active",
      num_sucursales: Number(row.branch_count),
      num_usuarios: Number(row.user_count),
    }));
  });
  return res.status(200).json({ etts });
});

exports.cambiarEstadoETT = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ["superadmin"] });
  const tenantId = requireUuid(req.body?.tenantId || req.body?.ettId, "tenantId");
  const active = req.body?.activa;
  if (typeof active !== "boolean") throw httpError(400, "activa debe ser boolean");

  const updated = await withDbContext(claim, async (client) => {
    const { rowCount } = await client.query(
      "UPDATE tenants SET status = $1 WHERE id = $2 AND deleted_at IS NULL",
      [active ? "active" : "inactive", tenantId]
    );
    return rowCount > 0;
  });
  if (!updated) throw httpError(404, "ETT no encontrada");
  return res.status(200).json({ ok: true, mensaje: `ETT ${active ? "activada" : "desactivada"}` });
});

exports.listarSucursales = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ROLES_ETT });
  const branches = await withDbContext(claim, async (client) => {
    const params = [claim.tenantId, claim.companyId];
    let scope = "";
    if (["director_zona", "seleccion", "comercial"].includes(claim.rol)) {
      const allowed = claim.rol === "director_zona" ? claim.branchIds : [claim.branchId];
      params.push(allowed);
      scope = " AND id = ANY($3::uuid[])";
    }
    const { rows } = await client.query(
      `SELECT id, code, name, is_default, status
       FROM branches
       WHERE tenant_id = $1 AND company_id = $2 AND deleted_at IS NULL${scope}
       ORDER BY is_default DESC, name`,
      params
    );
    return rows.map((row) => ({
      sucursal_id: row.id,
      codigo: row.code,
      nombre: row.name,
      es_sede: row.is_default,
      activa: row.status === "active",
    }));
  });
  return res.status(200).json({ sucursales: branches });
});

exports.crearSucursal = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ["admin"] });
  const { nombre, codigo, esSede, isDefault } = req.body || {};
  if (!nombre) throw httpError(400, "El nombre de la sucursal es obligatorio");

  const branch = await withDbContext(claim, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO branches (company_id, code, name, is_default, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code, name, is_default, status`,
      [
        claim.companyId,
        codigo ? String(codigo).toUpperCase().slice(0, 30) : makeCode(nombre, "SUC"),
        nombre,
        Boolean(esSede || isDefault),
        claim.tenantId,
      ]
    );
    return rows[0];
  });
  return res.status(200).json({
    ok: true,
    sucursal: {
      sucursal_id: branch.id,
      codigo: branch.code,
      nombre: branch.name,
      es_sede: branch.is_default,
    },
  });
});

async function managementScope(req, claim, client) {
  if (claim.rol === "admin") {
    return { tenantId: claim.tenantId, companyId: claim.companyId };
  }

  const tenantId = requireUuid(req.body?.tenantId || req.query?.tenantId, "tenantId");
  let companyId = req.body?.companyId || req.query?.companyId;
  if (companyId) requireUuid(companyId, "companyId");

  const params = [tenantId];
  let companyFilter = "";
  if (companyId) {
    params.push(companyId);
    companyFilter = " AND id = $2";
  }
  const { rows } = await client.query(
    `SELECT id FROM companies
     WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL${companyFilter}
     ORDER BY created_at LIMIT 1`,
    params
  );
  if (!rows[0]) throw httpError(404, "Empresa activa no encontrada en la ETT");
  companyId = rows[0].id;
  return { tenantId, companyId };
}

exports.listarUsuariosETT = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ["superadmin", "admin"] });
  const users = await withDbContext(claim, async (client) => {
    const scope = await managementScope(req, claim, client);
    const { rows } = await client.query(
      `SELECT u.id, u.firebase_uid, u.email, u.full_name, u.status,
              array_agg(DISTINCT r.code) AS roles,
              COALESCE(
                array_agg(DISTINCT uc.branch_id) FILTER (WHERE uc.branch_id IS NOT NULL),
                ARRAY[]::uuid[]
              ) AS branch_ids
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
       JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       LEFT JOIN user_contexts uc ON uc.user_id = u.id
         AND uc.company_id = $2 AND uc.deleted_at IS NULL
       WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
       GROUP BY u.id
       ORDER BY u.full_name, u.email`,
      [scope.tenantId, scope.companyId]
    );
    return rows.map((row) => ({
      usuario_id: row.id,
      firebase_uid: row.firebase_uid,
      email: row.email,
      nombre: row.full_name,
      apellido: "",
      rol: row.roles[0],
      sucursal_id: row.branch_ids.length === 1 ? row.branch_ids[0] : null,
      activo: row.status === "active",
      sucursales: row.branch_ids,
    }));
  });
  return res.status(200).json({ usuarios: users });
});

exports.crearUsuarioETT = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ["superadmin", "admin"] });
  const { email, password, nombre, apellido, rol } = req.body || {};
  if (!email || !password || !rol) {
    throw httpError(400, "email, password y rol son obligatorios");
  }
  if (!ROLES_ETT.includes(rol)) {
    throw httpError(400, `Rol invalido. Permitidos: ${ROLES_ETT.join(", ")}`);
  }

  const singleBranch = req.body?.branchId || req.body?.sucursalId;
  const requestedBranches = req.body?.branches || req.body?.sucursales || [];
  let branchIds = [];
  if (["seleccion", "comercial"].includes(rol)) {
    branchIds = [requireUuid(singleBranch, "branchId")];
  } else if (rol === "director_zona") {
    if (!Array.isArray(requestedBranches) || requestedBranches.length === 0) {
      throw httpError(400, "director_zona requiere una lista de sucursales");
    }
    branchIds = uniqueStrings(requestedBranches);
    branchIds.forEach((id) => requireUuid(id, "branches"));
  }

  let firebaseUser;
  try {
    firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${nombre || ""} ${apellido || ""}`.trim(),
    });
  } catch (error) {
    throw httpError(400, `No se pudo crear el usuario: ${error.message}`);
  }

  try {
    const user = await withDbContext(claim, async (client) => {
      const scope = await managementScope(req, claim, client);
      if (branchIds.length > 0) {
        const { rows } = await client.query(
          `SELECT id FROM branches
           WHERE tenant_id = $1 AND company_id = $2
             AND id = ANY($3::uuid[]) AND status = 'active' AND deleted_at IS NULL`,
          [scope.tenantId, scope.companyId, branchIds]
        );
        if (rows.length !== branchIds.length) {
          throw httpError(400, "Alguna sucursal no pertenece a la empresa seleccionada");
        }
      }

      const definition = ROLE_DEFINITIONS[rol];
      const { rows: roleRows } = await client.query(
        `INSERT INTO roles (code, name, description, tenant_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, code)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, deleted_at = NULL
         RETURNING id`,
        [rol, definition.name, `Rol ${definition.name}`, scope.tenantId]
      );

      const fullName = `${nombre || ""} ${apellido || ""}`.trim() || email.split("@")[0];
      const { rows: userRows } = await client.query(
        `INSERT INTO users (firebase_uid, email, full_name, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, status`,
        [firebaseUser.uid, email, fullName, scope.tenantId]
      );
      const created = userRows[0];

      await client.query(
        "INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)",
        [created.id, roleRows[0].id, scope.tenantId]
      );

      if (branchIds.length === 0) {
        await client.query(
          `INSERT INTO user_contexts (user_id, company_id, branch_id, is_default, tenant_id)
           VALUES ($1, $2, NULL, TRUE, $3)`,
          [created.id, scope.companyId, scope.tenantId]
        );
      } else {
        for (const [index, branchId] of branchIds.entries()) {
          await client.query(
            `INSERT INTO user_contexts (user_id, company_id, branch_id, is_default, tenant_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [created.id, scope.companyId, branchId, index === 0, scope.tenantId]
          );
        }
      }

      const customClaims = {
        rol,
        tenantId: scope.tenantId,
        companyId: scope.companyId,
      };
      if (["seleccion", "comercial"].includes(rol)) customClaims.branchId = branchIds[0];
      if (rol === "director_zona") customClaims.branchIds = branchIds;
      await setClaims(firebaseUser.uid, customClaims);

      return { ...created, rol, branchIds };
    });

    return res.status(200).json({
      ok: true,
      usuario: {
        usuario_id: user.id,
        email: user.email,
        nombre: user.full_name,
        apellido: "",
        rol: user.rol,
        sucursal_id: user.branchIds.length === 1 ? user.branchIds[0] : null,
        sucursales: user.branchIds,
      },
    });
  } catch (error) {
    await admin.auth().deleteUser(firebaseUser.uid).catch(() => {});
    throw error;
  }
});

exports.cambiarEstadoUsuario = handler(async (req, res) => {
  const claim = await authorize(req, { allowedRoles: ["superadmin", "admin"] });
  const userId = requireUuid(req.body?.userId || req.body?.usuarioId, "userId");
  const active = req.body?.activo;
  if (typeof active !== "boolean") throw httpError(400, "activo debe ser boolean");

  const user = await withDbContext(claim, async (client) => {
    const params = [active ? "active" : "inactive", userId];
    let tenantFilter = "";
    if (claim.rol === "admin") {
      params.push(claim.tenantId);
      tenantFilter = " AND tenant_id = $3";
    }
    const { rows } = await client.query(
      `UPDATE users SET status = $1
       WHERE id = $2 AND deleted_at IS NULL${tenantFilter}
       RETURNING firebase_uid`,
      params
    );
    if (!rows[0]) throw httpError(404, "Usuario no encontrado");
    await admin.auth().updateUser(rows[0].firebase_uid, { disabled: !active });
    return rows[0];
  });

  return res.status(200).json({
    ok: true,
    firebase_uid: user.firebase_uid,
    mensaje: `Usuario ${active ? "activado" : "desactivado"}`,
  });
});
