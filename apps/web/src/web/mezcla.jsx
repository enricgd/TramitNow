// Web corporativa de TramitNow, versión 3 (web3.html): mezcla de web.html y web2.html, con la letra del logo (Poppins).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WebMezcla from './WebMezcla';
import '../index.css';
import './web.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <WebMezcla />
    </StrictMode>,
);
