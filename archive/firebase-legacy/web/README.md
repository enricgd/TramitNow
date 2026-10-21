# tramitNow Web

Frontend de tramitNow construido con Next.js y Firebase Authentication.

## Configuracion local

Desde la raiz del repositorio:

```powershell
Copy-Item web/.env.example web/.env.local
cd web
npm ci
npm run dev
```

Completar `web/.env.local` con la configuracion de la aplicacion web registrada
en Firebase. El archivo real no se versiona.

La aplicacion queda disponible en `http://localhost:3000`.

## Comprobaciones

```powershell
npm run lint
npm run build
```

El build estatico se genera en `web/out` y Firebase Hosting publica esa carpeta.

## Despliegue

Desde la raiz del repositorio:

```powershell
firebase deploy --only hosting
```

La URL de las Cloud Functions esta definida actualmente en
`web/src/lib/api.ts`. Si cambia el proyecto o la region de Functions, tambien
debe actualizarse ese archivo.
