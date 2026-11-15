// Área de empresas. Es otra página, aparte del ERP y del portal del trabajador: no comparte menú ni sesión.
// En real irá en la dirección de cada ETT (Mi ETT → Portales): {subdominio}.tramitnow.com/empresas
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Acceso from './Acceso';
import PortalEmpresa, { USUARIOS } from './PortalEmpresa';
import '../index.css';

// La sesión de la demo dura mientras la pestaña está abierta
const CLAVE = 'demo-area-empresas';
const leer = () => { try { return USUARIOS.find(u => u.email === sessionStorage.getItem(CLAVE)) || null; } catch { return null; } };
const guardar = (u) => { try { u ? sessionStorage.setItem(CLAVE, u.email) : sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };

function AreaEmpresas() {
    const [usuario, setUsuario] = useState(leer);
    const cambiar = (u) => { guardar(u); setUsuario(u); window.scrollTo(0, 0); };
    return usuario
        ? <PortalEmpresa key={usuario.email} usuario={usuario} onSalir={() => cambiar(null)} onCambiarUsuario={cambiar} />
        : <Acceso tipo="empresa" usuariosDemo={USUARIOS} onEntrar={cambiar} />;
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AreaEmpresas />
    </StrictMode>,
);
