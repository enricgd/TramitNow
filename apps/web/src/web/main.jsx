// Web corporativa de TramitNow. Es otra página, aparte del ERP y de los portales.
// En real irá en la raíz (tramitnow.com); el ERP y los portales, en subdominios.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WebCorporativa from './WebCorporativa';
import '../index.css';
import './web.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <WebCorporativa />
    </StrictMode>,
);
