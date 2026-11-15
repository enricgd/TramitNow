// Piezas de animación de la web corporativa: aparecer al entrar en pantalla e iconos que se dibujan solos.
// Sin librerías: IntersectionObserver y CSS (web.css). Con «reducir movimiento», todo se ve directamente.
import React, { useEffect, useRef, useState } from 'react';

export const movimientoReducido = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// Devuelve [ref, visible]: visible pasa a true la primera vez que el elemento entra en pantalla
export function useVisible(umbral = 0.15) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        if (movimientoReducido() || !('IntersectionObserver' in window)) { setVisible(true); return undefined; }
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { threshold: umbral });
        io.observe(el);
        return () => io.disconnect();
    }, [umbral]);
    return [ref, visible];
}

// Sube y aparece suavemente al entrar en pantalla
export function Aparece({ children, retraso = 0, className = '' }) {
    const [ref, visible] = useVisible();
    return (
        <div ref={ref} style={{ transitionDelay: `${retraso}ms` }} className={`transition duration-700 ease-out motion-reduce:transition-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>
            {children}
        </div>
    );
}

// Icono de lucide con el trazo dibujándose al aparecer
export function IconoDibujado({ icono: Icono, className = '', retraso = 0 }) {
    const [ref, visible] = useVisible(0.4);
    return (
        <span ref={ref} className={`dibuja inline-flex ${visible ? 'visible' : ''}`} style={{ '--retraso': `${retraso}ms` }}>
            <Icono className={className} strokeWidth={1.5} />
        </span>
    );
}

// Titular que aparece palabra a palabra
export function TitularPorPalabras({ texto, final, className = '' }) {
    const palabras = texto.split(' ');
    return (
        <h1 className={className}>
            {palabras.map((p, i) => (
                <React.Fragment key={`${p}-${i}`}>
                    <span className="palabra" style={{ animationDelay: `${120 + i * 90}ms` }}>{p}{i === palabras.length - 1 && final}</span>
                    {i < palabras.length - 1 && ' '}
                </React.Fragment>
            ))}
        </h1>
    );
}

// Cuenta desde 0 hasta el número cuando aparece en pantalla
export function Contador({ hasta, sufijo = '', duracion = 1400 }) {
    const [ref, visible] = useVisible(0.5);
    const [valor, setValor] = useState(0);
    useEffect(() => {
        if (!visible) return undefined;
        if (movimientoReducido()) { setValor(hasta); return undefined; }
        let inicio = null;
        let id;
        const paso = (t) => {
            if (inicio === null) inicio = t;
            const p = Math.min((t - inicio) / duracion, 1);
            setValor(Math.round(hasta * (1 - Math.pow(1 - p, 3))));
            if (p < 1) id = requestAnimationFrame(paso);
        };
        id = requestAnimationFrame(paso);
        return () => cancelAnimationFrame(id);
    }, [visible, hasta, duracion]);
    return <span ref={ref}>{valor}{sufijo}</span>;
}

// Avance (0 a 1) de un elemento al cruzar la pantalla: 0 cuando entra por abajo, 1 cuando llega a la mitad
export function useProgresoScroll() {
    const ref = useRef(null);
    const [progreso, setProgreso] = useState(movimientoReducido() ? 1 : 0);
    useEffect(() => {
        if (movimientoReducido()) return undefined;
        let pendiente = false;
        const medir = () => {
            pendiente = false;
            const el = ref.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const alto = window.innerHeight;
            const p = (alto - r.top) / (alto * 0.5 + r.height * 0.6);
            setProgreso(Math.max(0, Math.min(1, p)));
        };
        const alMover = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(medir); } };
        medir();
        window.addEventListener('scroll', alMover, { passive: true });
        window.addEventListener('resize', alMover);
        return () => { window.removeEventListener('scroll', alMover); window.removeEventListener('resize', alMover); };
    }, []);
    return [ref, progreso];
}

// Texto que se ilumina palabra a palabra al hacer scroll
export function TextoQueSeIlumina({ texto, className = '' }) {
    const [ref, progreso] = useProgresoScroll();
    const palabras = texto.split(' ');
    const encendidas = Math.round(progreso * palabras.length);
    return (
        <p ref={ref} className={className}>
            {palabras.map((p, i) => <span key={i} className={`transition-colors duration-300 ${i < encendidas ? 'text-[#003A70]' : 'text-slate-200'}`}>{p}{i < palabras.length - 1 ? ' ' : ''}</span>)}
        </p>
    );
}

// Tarjeta que se inclina un poco y lleva un foco de luz que sigue al ratón
export function TarjetaViva({ children, className = '' }) {
    const ref = useRef(null);
    const mover = (e) => {
        const el = ref.current;
        if (!el || movimientoReducido()) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--x', `${x * 100}%`);
        el.style.setProperty('--y', `${y * 100}%`);
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 4}deg) rotateY(${(x - 0.5) * 5}deg)`;
    };
    const salir = () => { if (ref.current) ref.current.style.transform = ''; };
    return (
        <div ref={ref} onMouseMove={mover} onMouseLeave={salir} className={`tarjeta-viva relative transition-transform duration-200 ease-out ${className}`}>
            {children}
        </div>
    );
}
