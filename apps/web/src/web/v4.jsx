// Web corporativa de TramitNow, versión 4 (web4.html): la 3 con ideas de las webs de referencia del diseñador.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WebV4 from './WebV4';
import '../index.css';
import './web.css';
import './v4.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <WebV4 />
    </StrictMode>,
);
