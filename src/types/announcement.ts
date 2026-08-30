/**
 * Tipos de datos para el módulo de Eventos y Anuncios
 */

export type AnnouncementType = 'vacunacion' | 'esterilizacion' | 'adopcion' | 'evento' | 'general';

export interface Announcement {
  /** Identificador único (UUID o timestamp) */
  id: string;
  
  /** Título del anuncio o evento */
  title: string;
  
  /** Tipo de evento/jornada */
  type: AnnouncementType;
  
  /** Descripción o detalles del evento */
  description: string;
  
  /** Fecha programada del evento (Formato recomendado: YYYY-MM-DD o string libre) */
  date: string;
  
  /** Hora programada del evento (opcional) */
  time?: string;
  
  /** Ubicación física o enlace si es virtual (opcional) */
  location?: string;
  
  /** URL pública de la imagen o flyer en GitHub (generada tras subir base64) */
  image_url: string;
  
  /** Estado del anuncio (true = visible en la web pública) */
  is_active: boolean;
  
  /** Fecha de creación en formato ISO */
  created_at: string;
  
  /** Fecha de última actualización en formato ISO */
  updated_at: string;
}

/** 
 * Payload recibido del cliente al crear/editar un anuncio.
 * Puede incluir la imagen en base64 si el usuario sube una nueva.
 */
export interface AnnouncementUpsertBody extends Omit<Announcement, 'id' | 'created_at' | 'updated_at' | 'image_url'> {
  id?: string; // Si no viene, es creación
  image_url?: string; // URL existente si no se cambia la imagen
  image_base64?: string; // Imagen nueva en base64 para subir
}
