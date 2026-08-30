/**
 * PetDetail — Ficha individual de mascota (/mascotas/:id).
 *
 * Carga el JSON individual desde el CDN:  data/pet-{id}.json
 * Muestra galería de fotos, info detallada y botón de adopción por WhatsApp.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get, formatApiError } from '@/api/client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import ArrowBackIcon  from '@mui/icons-material/ArrowBack';
import WhatsAppIcon   from '@mui/icons-material/WhatsApp';
import ShareIcon      from '@mui/icons-material/Share';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon     from '@mui/icons-material/Cancel';
import MaleIcon       from '@mui/icons-material/Male';
import FemaleIcon     from '@mui/icons-material/Female';
import Navbar         from '@/components/Navbar';
import Footer         from '@/components/Footer';
import AnimatedSection from '@/components/AnimatedSection';
import { getAdoptionUrl, openWhatsApp } from '@/utils/whatsapp';
import type { Pet } from '@/types/pet';
import { PET_IMAGE_FALLBACK } from '@/config';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { Settings } from '@/types/settings';

// ─── Helpers de presentación ──────────────────────────────────────────────────

const STATUS_LABEL: Record<Pet['estado'], { label: string; color: 'success' | 'warning' | 'default' }> = {
  disponible: { label: '✅ Disponible para adopción', color: 'success' },
  en_proceso: { label: '🕐 Proceso en curso',          color: 'warning' },
  adoptado:   { label: '🏠 Ya fue adoptado',           color: 'default' },
};

const SPECIES_LABEL: Record<string, string> = { perro: '🐕 Perro', gato: '🐈 Gato', otro: '🐾 Otro' };
const SIZE_LABEL:    Record<string, string> = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande' };

interface HealthBadgeProps {
  value?: boolean;
  label: string;
}
function HealthBadge({ value, label }: HealthBadgeProps) {
  if (value === undefined) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {value
        ? <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
        : <CancelIcon      sx={{ color: 'text.disabled', fontSize: '1rem' }} />}
      <Typography variant="body2" color={value ? 'success.main' : 'text.disabled'}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PetDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [snackOpen, setSnackOpen]   = useState(false);

  const { data: pet, isLoading, isError, error } = useQuery<Pet>({
    queryKey: ['pet', id],
    queryFn:  async () => {
      const { mascotas } = await get<{ mascotas: Pet[] }>('/public/pets');
      const found = mascotas.find(p => p.id === id);
      if (!found) throw new Error('Mascota no encontrada');
      return found;
    },
    enabled: Boolean(id),
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await get<Settings | {}>('/settings');
      if (Object.keys(res).length === 0) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...res } as Settings;
    },
  });

  const phone = settings?.whatsapp || DEFAULT_SETTINGS.whatsapp;

  // Galería: foto principal + secundarias
  const allImages = pet
    ? [pet.imagen_principal, ...(pet.fotos_secundarias ?? [])]
    : [];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSnackOpen(true);
    } catch {
      setSnackOpen(true); // fallback igualmente
    }
  };

  // ─── Estado de carga ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Skeleton variant="rounded" height={420} />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {[1, 2, 3].map((n) => <Skeleton key={n} variant="rounded" width={80} height={60} />)}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Skeleton variant="text" width="70%" height={40} />
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rounded" height={120} sx={{ mt: 2 }} />
              <Skeleton variant="rounded" height={48} sx={{ mt: 3 }} />
            </Grid>
          </Grid>
        </Container>
        <Footer />
      </Box>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (isError || !pet) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center', flexGrow: 1 }}>
          <Typography fontSize="4rem" mb={2}>🐾</Typography>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Mascota no encontrada
          </Typography>
          <Typography color="text.secondary" mb={3}>
            {isError ? formatApiError(error, 'Ocurrió un problema de conexión al servidor.') : 'Es posible que esta ficha haya sido eliminada o el ID no sea correcto.'}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/mascotas')}>
            Ver catálogo
          </Button>
        </Container>
        <Footer />
      </Box>
    );
  }

  // ─── Vista detalle ────────────────────────────────────────────────────────

  const status   = STATUS_LABEL[pet.estado];
  const isAdopted = pet.estado === 'adoptado';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <Box sx={{ py: { xs: 3, md: 6 }, flexGrow: 1 }}>
        <Container maxWidth="lg">
          {/* Breadcrumb */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 3, color: 'text.secondary' }}
          >
            Volver
          </Button>

          <Grid container spacing={{ xs: 3, md: 5 }}>
            {/* ── Galería ──────────────────────────────────────────────────── */}
            <Grid size={{ xs: 12, md: 7 }}>
              <AnimatedSection direction="left">
                {/* Imagen principal */}
                <Box
                  sx={{
                    borderRadius: 0,
                    overflow:     'hidden',
                    border:       '1px solid',
                    borderColor:  'divider',
                    bgcolor:      'grey.100',
                    aspectRatio:  '4/3',
                  }}
                >
                  <Box
                    component="img"
                    src={allImages[galleryIdx] || PET_IMAGE_FALLBACK}
                    alt={`Foto ${galleryIdx + 1} de ${pet.nombre}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK;
                    }}
                    sx={{
                      width:      '100%',
                      height:     '100%',
                      objectFit:  'cover',
                      transition: 'opacity 250ms',
                    }}
                  />
                </Box>

                {/* Miniaturas */}
                {allImages.length > 1 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {allImages.map((img, idx) => (
                      <Box
                        key={idx}
                        component="img"
                        src={img}
                        alt={`Miniatura ${idx + 1}`}
                        onClick={() => setGalleryIdx(idx)}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK;
                        }}
                        sx={{
                          width:      72,
                          height:     56,
                          objectFit:  'cover',
                          borderRadius: 0,
                          cursor:     'pointer',
                          border:     '2px solid',
                          borderColor: idx === galleryIdx ? 'primary.main' : 'transparent',
                          opacity:    idx === galleryIdx ? 1 : 0.65,
                          transition: 'all 200ms',
                          '&:hover':  { opacity: 1 },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </AnimatedSection>
            </Grid>

            {/* ── Información ───────────────────────────────────────────────── */}
            <Grid size={{ xs: 12, md: 5 }}>
              <AnimatedSection direction="right">
                {/* Estado */}
                <Chip
                  label={status.label}
                  color={status.color}
                  size="small"
                  sx={{ mb: 1.5, fontWeight: 600 }}
                />

                {/* Nombre */}
                <Typography variant="h2" fontWeight={800} mb={0.5}>
                  {pet.nombre}
                </Typography>

                {/* Chips de características */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {pet.especie && (
                    <Chip label={SPECIES_LABEL[pet.especie] ?? pet.especie} variant="outlined" size="small" />
                  )}
                  {pet.sexo === 'macho'  && <Chip icon={<MaleIcon />}   label="Macho"  size="small" variant="outlined" />}
                  {pet.sexo === 'hembra' && <Chip icon={<FemaleIcon />} label="Hembra" size="small" variant="outlined" />}
                  {pet.tamano            && <Chip label={SIZE_LABEL[pet.tamano] ?? pet.tamano} size="small" variant="outlined" />}
                  {pet.edad_aproximada   && <Chip label={pet.edad_aproximada} size="small" variant="outlined" />}
                  {pet.raza              && <Chip label={pet.raza} size="small" variant="outlined" />}
                  {typeof pet.peso_kg !== 'undefined' && (
                    <Chip label={`${pet.peso_kg} kg`} size="small" variant="outlined" />
                  )}
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Descripción */}
                {pet.descripcion && (
                  <Typography variant="body1" color="text.secondary" lineHeight={1.8} mb={3}>
                    {pet.descripcion}
                  </Typography>
                )}

                {/* Salud */}
                {(pet.vacunado !== undefined || pet.esterilizado !== undefined || pet.desparasitado !== undefined) && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 0, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                      Estado de salud
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <HealthBadge value={pet.vacunado}      label="Vacunado" />
                      <HealthBadge value={pet.esterilizado}  label="Esterilizado/a" />
                      <HealthBadge value={pet.desparasitado} label="Desparasitado/a" />
                    </Box>
                  </Box>
                )}

                {/* CTAs */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<WhatsAppIcon />}
                    disabled={isAdopted}
                    onClick={() =>
                      openWhatsApp(getAdoptionUrl(phone, { nombre: pet.nombre, id: pet.id }))
                    }
                    sx={{ flexGrow: 1, borderRadius: 0, py: 1.3, fontWeight: 700 }}
                  >
                    {isAdopted ? 'Ya fue adoptado 🎉' : `Adoptar a ${pet.nombre}`}
                  </Button>

                  <Tooltip title="Copiar enlace">
                    <IconButton
                      onClick={() => void handleShare()}
                      sx={{
                        border:     '1px solid',
                        borderColor: 'divider',
                        borderRadius: 0,
                      }}
                    >
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="caption" color="text.disabled" display="block" mt={1.5}>
                  ID: {pet.id} · Registrado el {new Date(pet.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Snackbar de enlace copiado */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        message="✅ Enlace copiado al portapapeles"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Footer />
    </Box>
  );
}
