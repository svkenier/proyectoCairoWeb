/**
 * Generador de URLs de WhatsApp para los canales de contacto institucionales.
 */

/** URL base de la API de WhatsApp. */
const WA_BASE  = 'https://wa.me';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface WhatsAppAdoptionParams {
  /** Nombre de la mascota. */
  nombre: string;
  /** Identificador único (ej: "pet-1718293049"). */
  id: string;
  /** URL absoluta de la ficha. Si se omite, se construye con window.location.origin. */
  fichaUrl?: string;
}



// ─── Función interna ──────────────────────────────────────────────────────────

/** Construye la URL de WhatsApp con el mensaje encodeado. */
function buildWaUrl(phone: string, message: string): string {
  if (!phone) {
    console.warn('[whatsapp.ts] El número de teléfono no está configurado.');
    return '#';
  }
  return `${WA_BASE}/${phone}?text=${encodeURIComponent(message)}`;
}

// ─── URLs de cada canal ───────────────────────────────────────────────────────

/**
 * Genera el enlace de WhatsApp para solicitar la adopción de una mascota específica.
 */
export function getAdoptionUrl(phone: string, params: WhatsAppAdoptionParams): string {
  const fichaUrl =
    params.fichaUrl ??
    `${window.location.origin}/mascotas/${params.id}`;

  const capitalizedPetName = params.nombre ? params.nombre.charAt(0).toUpperCase() + params.nombre.slice(1) : '';

  const message = 
`¡Hola! Me interesa adoptar a *${capitalizedPetName}* (ID: ${params.id}).

Vi su ficha aquí: ${fichaUrl}

¿Podrían darme más información sobre el proceso de adopción?`;

  return buildWaUrl(phone, message);
}

/**
 * Genera el enlace de WhatsApp para información general sobre el proceso de adopción.
 */
export function getGenericAdoptionUrl(phone: string): string {
  const message = `¡Hola! Me gustaría recibir información sobre el proceso de adopción y conocer a las mascotas disponibles para darles un hogar.`;
  return buildWaUrl(phone, message);
}

/**
 * Genera el enlace de WhatsApp para reportar un animal en situación de calle o emergencia.
 */
export function getRescueUrl(phone: string): string {
  const message = 
`¡Hola! *Reporte de Rescate / Emergencia*

Encontré un animal que necesita ayuda urgente.
Ubicación: [Enviaré mi ubicación a continuación por este chat]

¿Podrían indicarme cómo proceder o si pueden asistir?`;

  return buildWaUrl(phone, message);
}

/**
 * Genera el enlace de WhatsApp para coordinar donaciones, apadrinamiento
 * o entrega responsable de un animal.
 */
export function getDonationUrl(phone: string): string {
  const message = `¡Hola! Quisiera apoyar al refugio.

Me gustaría recibir información sobre:
- Apadrinamiento de mascotas
- Donaciones al refugio
- Entrega o rescate responsable de animales

¿Cómo puedo colaborar?`;

  return buildWaUrl(phone, message);
}

/**
 * Genera el enlace de WhatsApp para postularse como voluntario.
 */
export function getVolunteerUrl(phone: string): string {
  const message = 
`¡Hola! Me gustaría postularme como voluntario en el refugio para colaborar en las actividades del equipo.

¿Cuáles son los requisitos o cómo puedo sumarme?`;
  return buildWaUrl(phone, message);
}

/**
 * Abre el canal de WhatsApp en una nueva pestaña.
 */
export function openWhatsApp(url: string): void {
  if (url && url !== '#') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
