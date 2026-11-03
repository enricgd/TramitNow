// Portal del trabajador. Es otra página, aparte del ERP y del Área de empresas: no comparte menú ni sesión.
// En real irá en la dirección de cada ETT (Mi ETT → Portales): {subdominio}.tramitnow.com/trabajadores
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Acceso from './Acceso';
import PortalCandidato from './PortalCandidato';
import { contactoDemo } from '../views/personasDemo';
import '../index.css';

// La sesión de la demo dura mientras la pestaña está abierta
const CLAVE = 'demo-portal-trabajador';
const leer = () => { try { return sessionStorage.getItem(CLAVE) === '1'; } catch { return false; } };
const guardar = (v) => { try { v ? sessionStorage.setItem(CLAVE, '1') : sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };

function PortalTrabajador() {
    const [dentro, setDentro] = useState(leer);
    const cambiar = (v) => { guardar(v); setDentro(v); window.scrollTo(0, 0); };
    return dentro
        ? <PortalCandidato onSalir={() => cambiar(false)} />
        : <Acceso tipo="trabajador" telefono={contactoDemo('Unai García Zabaleta').telefono} onEntrar={() => cambiar(true)} />;
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <PortalTrabajador />
    </StrictMode>,
);
