/**
 * PetCard — Tarjeta de adopción de mascota.
 *
 * Diseño: superficie blanca (#FFFFFF), borde 1px #E5E7EB, hover translateY(-4px).
 * El hover está definido en el override global del tema (MuiCard).
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import MaleIcon       from '@mui/icons-material/Male';
import FemaleIcon     from '@mui/icons-material/Female';
import PetsIcon       from '@mui/icons-material/Pets';
import type { Pet } from '@/types/pet';
import { PET_IMAGE_FALLBACK } from '@/config';

// ─── Configuración de chips de estado ────────────────────────────────────────

const STATUS_CONFIG = {
  disponible: { label: 'Disponible', color: '#E8F5E9', textColor: '#2E7D32' },
  en_proceso: { label: 'En proceso', color: '#FFF8E1', textColor: '#F57F17' },
  adoptado:   { label: 'Adoptado',   color: '#F3F4F6', textColor: '#6B7280' },
} as const;

const SPECIES_LABEL: Record<string, string> = {
  perro: 'Perro',
  gato:  'Gato',
  otro:  'Otro',
};

const SIZE_LABEL: Record<string, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande:  'Grande',
};

// ─── Componente ───────────────────────────────────────────────────────────────

interface PetCardProps {
  pet: Pet;
  /** Estrategia de carga de la imagen. Prioridad alta ('eager') para LCP. */
  loading?: 'lazy' | 'eager';
}

const PetCard = memo(function PetCard({ pet, loading = 'lazy' }: PetCardProps) {
  const navigate = useNavigate();
  const status   = STATUS_CONFIG[pet.estado] ?? STATUS_CONFIG.disponible;
  const isAdopted = pet.estado === 'adoptado';

  return (
    <Card
      sx={{
        height:      '100%',
        display:     'flex',
        flexDirection: 'column',
        opacity: isAdopted ? 0.72 : 1,
        transition: 'opacity 250ms',
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/mascotas/${pet.id}`)}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        {/* Imagen */}
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            loading={loading}
            fetchPriority={loading === 'eager' ? 'high' : 'auto'}
            decoding="async"
            image={pet.imagen_principal || PET_IMAGE_FALLBACK}
            alt={pet.nombre ? `Foto de ${pet.nombre}` : 'Foto de mascota'}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK;
            }}
            sx={{
              height:     220,
              objectFit:  'cover',
              bgcolor:    'grey.100',
            }}
          />

          {/* Estado badge */}
          <Box
            sx={{
              position:    'absolute',
              top:          10,
              right:        10,
              px:           1.2,
              py:           0.4,
              bgcolor:      status.color,
              color:        status.textColor,
              fontSize:     '0.7rem',
              fontWeight:   700,
              letterSpacing: '0.04em',
              backdropFilter: 'blur(4px)',
            }}
          >
            {status.label}
          </Box>

          {/* Destacado badge */}
          {pet.destacado === true && (
            <Box
              sx={{
                position:    'absolute',
                top:          10,
                left:         10,
                px:           1.2,
                py:           0.4,
                bgcolor:      'primary.main',
                color:        'white',
                fontSize:     '0.7rem',
                fontWeight:   700,
              }}
            >
              ⭐ Destacado
            </Box>
          )}
        </Box>

        {/* Contenido */}
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Typography
            variant="h6"
            component="h3"
            fontWeight={700}
            gutterBottom
            sx={{ lineHeight: 1.3 }}
          >
            {pet.nombre}
          </Typography>

          {/* Info chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1 }}>
            {pet.especie && (
              <Chip
                icon={<PetsIcon sx={{ fontSize: '0.9rem !important' }} />}
                label={SPECIES_LABEL[pet.especie] ?? pet.especie}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            )}
            {pet.sexo === 'macho' && (
              <Chip
                icon={<MaleIcon sx={{ fontSize: '0.9rem !important', color: '#1976D2 !important' }} />}
                label="Macho"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            )}
            {pet.sexo === 'hembra' && (
              <Chip
                icon={<FemaleIcon sx={{ fontSize: '0.9rem !important', color: '#C2185B !important' }} />}
                label="Hembra"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            )}
            {pet.tamano && (
              <Chip
                label={SIZE_LABEL[pet.tamano] ?? pet.tamano}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            )}
            {pet.edad_aproximada && (
              <Chip
                label={pet.edad_aproximada}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 24 }}
              />
            )}
          </Box>

          {/* Descripción truncada */}
          {pet.descripcion && (
            <Typography
              variant="body2"
              color="#4A4A4A"
              sx={{
                display:           '-webkit-box',
                WebkitLineClamp:   2,
                WebkitBoxOrient:   'vertical',
                overflow:          'hidden',
                lineHeight:        1.5,
              }}
            >
              {pet.descripcion}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      {/* Acción */}
      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          size="small"
          disabled={isAdopted}
          onClick={() => navigate(`/mascotas/${pet.id}`)}
        >
          {isAdopted ? 'Ya adoptado 🎉' : 'Conocer más'}
        </Button>
      </CardActions>
    </Card>
  );
});

export default PetCard;

// ─── Skeleton de carga ────────────────────────────────────────────────────────

export function PetCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={220} />
      <CardContent>
        <Skeleton variant="text" width="60%" height={28} />
        <Box sx={{ display: 'flex', gap: 0.6, my: 1 }}>
          <Skeleton variant="rounded" width={70} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
        </Box>
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Skeleton variant="rounded" width="100%" height={34} />
      </CardActions>
    </Card>
  );
}
