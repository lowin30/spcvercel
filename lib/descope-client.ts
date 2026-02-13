import DescopeClient from '@descope/node-sdk';

const projectId = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID || 'P39Y887u1otOQcg8nI38s878J2nT';
// management key opcional para validaciones de lectura, pero obligatoria si quisieramos usar management api (que fallo antes)
// para validateSession solo necesitamos el project id
const managementKey = 'K39YcPRRxj8qeOROrSI6El7VlPoKHg7Wejk1SI6fdrrpsIFxNI6uo49l1XtAOkskk3IuoQ3';

// inicializar cliente
// usar try-catch por si acaso
let descopeClient: any = null; // usar any temporalmente para evitar problemas de tipos si el sdk no esta perfecto

try {
    descopeClient = DescopeClient({
        projectId: projectId,
        baseUrl: 'https://api.descope.com',
        managementKey: managementKey
    });
} catch (error) {
    console.error('spc: error inicializando descope client', error);
}

export { descopeClient };
