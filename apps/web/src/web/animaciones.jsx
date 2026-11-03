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
