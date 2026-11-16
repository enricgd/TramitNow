// Web corporativa de TramitNow, versión «estilo Perk» (web2.html), para compararla con la de web.html.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WebPerk from './WebPerk';
import '../index.css';
import './web.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <WebPerk />
    </StrictMode>,
);
