// Portal de candidatos (y, más adelante, de empresas). Es otra página, aparte del ERP: no comparte menú ni sesión.
// En real irá en el subdominio de cada ETT (Mi ETT → Portales).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PortalCandidato from './PortalCandidato';
import '../index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PortalCandidato />
  </StrictMode>,
);
