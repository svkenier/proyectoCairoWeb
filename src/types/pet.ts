/**
 * Tipos TypeScript para el modelo de datos de Mascotas.
 * Basado en el PetSchema definido en src/docs/Rules.md.
 */

// ─── Enumeraciones de dominio ───────────────────────────────────────────────

export type PetSpecies = 'perro' | 'gato' | 'otro';
export type PetSex     = 'macho' | 'hembra';
export type PetSize    = 'pequeno' | 'mediano' | 'grande';
export type PetStatus  = 'disponible' | 'en_proceso' | 'adoptado';

// ─── Interfaz principal ──────────────────────────────────────────────────────

/**
 * Ficha completa de una mascota en el refugio.
 * Se persiste como `data/pet-{id}.json` en el repositorio de GitHub.
 *
 * Campos OBLIGATORIOS: `id`, `nombre`, `imagen_principal`, `estado`,
 * `created_at`, `updated_at`.
 * El resto son opcionales y pueden completarse posteriormente.
 */
export interface Pet {
  /** Identificador único generado en el backend (ej: "pet-1718293049"). */
  id: string;

  /** Nombre de la mascota — REQUERIDO. */
  nombre: string;

  /** URL absoluta de la foto principal en WebP (CDN jsDelivr) — REQUERIDO. */
  imagen_principal: string;

  /** Array de URLs de fotos secundarias en WebP — OPCIONAL. */
  fotos_secundarias?: string[];

  /** Especie del animal — OPCIONAL. */
  especie?: PetSpecies;

  /** Raza o descripción de cruce — OPCIONAL. */
  raza?: string;

  /**
   * Edad aproximada en lenguaje natural — OPCIONAL.
   * Ejemplos: "2 meses", "1 año", "3 años aprox."
   */
  edad_aproximada?: string;

  /** Sexo biológico — OPCIONAL. */
  sexo?: PetSex;

  /** Tamaño estimado al crecer — OPCIONAL. */
  tamano?: PetSize;

  /**
   * Peso en kilogramos — OPCIONAL.
   * Se acepta `number` o `string` para flexibilidad en la entrada del formulario.
   * Ej: 12.5 ó "~12"
   */
  peso_kg?: number | string;

  /** Esquema de vacunación completado — OPCIONAL. */
  vacunado?: boolean;

  /** Mascota esterilizada/castrada — OPCIONAL. */
  esterilizado?: boolean;

  /** Tratamiento antiparasitario aplicado — OPCIONAL. */
  desparasitado?: boolean;

  /** Estado de adopción — REQUERIDO. Default: "disponible". */
  estado: PetStatus;

  /** Historia, personalidad y notas adicionales — OPCIONAL. */
  descripcion?: string;

  /** Marca la mascota para aparecer en sección "Destacados" de Home — OPCIONAL. */
  destacado?: boolean;

  /** Fecha de creación de la ficha en formato ISO 8601. */
  created_at: string;

  /** Fecha de última actualización en formato ISO 8601. */
  updated_at: string;
}

// ─── DTOs para operaciones de API ────────────────────────────────────────────

/**
 * Payload para crear una nueva ficha de mascota.
 * `nombre` e `imagen_principal` (como File) son los únicos campos obligatorios.
 */
export type CreatePetPayload = Omit<Pet, 'id' | 'created_at' | 'updated_at'> & {
  /** Archivo de imagen principal (se convierte a WebP en el cliente antes de enviarse). */
  imagen_principal_file: File;
  /** Archivos de fotos secundarias — OPCIONAL. */
  fotos_secundarias_files?: File[];
};

/**
 * Payload para actualizar una ficha existente.
 * Todos los campos son opcionales salvo el `id`.
 */
export type UpdatePetPayload = Partial<Omit<Pet, 'id' | 'created_at'>> & {
  id: string;
  /** Nuevo archivo de imagen principal — OPCIONAL (reemplaza la existente). */
  imagen_principal_file?: File;
  /** Nuevos archivos de fotos secundarias — OPCIONAL. */
  fotos_secundarias_files?: File[];
};

// ─── Respuesta de la API del catálogo ────────────────────────────────────────

/**
 * Estructura del archivo `dist/mascotas-index.json` generado por GitHub Actions.
 * Se consume a través del CDN jsDelivr.
 */
export interface PetsIndex {
  generated_at: string;
  total: number;
  mascotas: Pet[];
}

// ─── Filtros del catálogo (/mascotas) ────────────────────────────────────────

/**
 * Parámetros de filtrado disponibles en la página `/mascotas`.
 * Todos son opcionales; una cadena vacía o `undefined` significa "sin filtro".
 */
export interface PetFilters {
  /** Búsqueda de texto libre (coincide con `nombre` o `raza`). */
  busqueda?: string;
  especie?: PetSpecies | '';
  sexo?: PetSex | '';
  tamano?: PetSize | '';
  estado?: PetStatus | '';
  /** Texto de edad aproximada para filtrado parcial. */
  edad_aproximada?: string;
}
