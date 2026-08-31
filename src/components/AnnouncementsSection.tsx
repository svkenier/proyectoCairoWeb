/**
 * AnnouncementsSection — Sección pública para visualizar eventos activos
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import LocationOnIcon    from '@mui/icons-material/LocationOn';
import WhatsAppIcon      from '@mui/icons-material/WhatsApp';
import CampaignIcon      from '@mui/icons-material/Campaign';

import { get } from '@/api/client';
import AnimatedSection from '@/components/AnimatedSection';
import type { Announcement, AnnouncementType } from '@/types/announcement';
import { PET_IMAGE_FALLBACK } from '@/config';
import type { Settings } from '@/types/settings';

const TYPE_COLORS: Record<AnnouncementType, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'default'> = {
  vacunacion: 'success',
  esterilizacion: 'info',
  adopcion: 'secondary',
  evento: 'warning',
  general: 'default',
};

const TYPE_LABELS: Record<AnnouncementType, string> = {
  vacunacion: 'Jornada de Vacunación',
  esterilizacion: 'Jornada de Esterilización',
  adopcion: 'Jornada de Adopción',
  evento: 'Evento Especial',
  general: 'Anuncio',
};

function AnnouncementCard({ announcement, whatsappNumber }: { announcement: Announcement; whatsappNumber: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = encodeURIComponent(`¡Hola! Quisiera más información sobre el evento: ${announcement.title}`);
  const waUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${text}` : '#';
  const isLong = announcement.description.length > 120;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          loading="lazy"
          height="220"
          image={announcement.image_url || PET_IMAGE_FALLBACK}
          alt={announcement.title ? `Imagen de ${announcement.title}` : 'Imagen del anuncio'}
          sx={{ objectFit: 'cover' }}
        />
        <Chip
          label={TYPE_LABELS[announcement.type] || 'Evento'}
          color={TYPE_COLORS[announcement.type]}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            fontWeight: 700,
            backdropFilter: 'blur(4px)',
          }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom lineHeight={1.2}>
          {announcement.title}
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CalendarTodayIcon fontSize="small" />
            <Typography variant="body2">{announcement.date}</Typography>
          </Box>
          
          {announcement.time && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <AccessTimeIcon fontSize="small" />
              <Typography variant="body2">{announcement.time}</Typography>
            </Box>
          )}

          {announcement.location && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, color: 'text.secondary' }}>
              <LocationOnIcon fontSize="small" sx={{ mt: 0.3 }} />
              <Typography variant="body2" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {announcement.location}
              </Typography>
            </Box>
          )}
        </Box>

        <Box>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={!expanded ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : { whiteSpace: 'pre-line' }}
          >
            {announcement.description}
          </Typography>
          {isLong && (
            <Typography
              variant="body2"
              component="span"
              onClick={() => setExpanded(!expanded)}
              sx={{
                color: 'primary.main',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-block',
                mt: 0.5,
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {expanded ? 'Ver menos' : 'Ver más'}
            </Typography>
          )}
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<WhatsAppIcon />}
          href={waUrl}
          disabled={!whatsappNumber}
        >
          Más Información
        </Button>
      </CardActions>
    </Card>
  );
}

export default function AnnouncementsSection() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await get<Settings | {}>('/settings');
      return res as Settings;
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const { data: announcements, isLoading, isError } = useQuery<Announcement[]>({
    queryKey: ['announcements-public'],
    queryFn: async () => {
      const data = await get<any>('/announcements');
      return Array.isArray(data) ? data : (data?.announcements || []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeAnnouncements = announcements?.filter(a => 
    a.is_active === true || 
    String(a.is_active) === 'true' || 
    (a.is_active as unknown) === 1
  ) || [];

  // Pre-codificamos el teléfono si existe
  const whatsappNumber = settings?.whatsapp ? settings.whatsapp.replace(/\D/g, '') : '';

  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }}>
      <Container maxWidth="lg">
        <AnimatedSection>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="overline" color="warning" fontWeight={700} letterSpacing="0.12em">
              Próximos Eventos y Jornadas
            </Typography>
            <Typography variant="h3" fontWeight={700} mt={0.5} mb={1.5}>
              ¡Participa y ayúdanos a ayudar!
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={500} mx="auto">
              Únete a nuestras actividades para seguir transformando las vidas de cientos de peluditos.
            </Typography>
          </Box>
        </AnimatedSection>

        {isError && !isLoading && (
          <Typography color="error" textAlign="center">
            No pudimos cargar los eventos.
          </Typography>
        )}

        {(!isLoading && activeAnnouncements.length === 0 && !isError) ? (
          <AnimatedSection>
            <Card elevation={0} sx={{ bgcolor: 'transparent', textAlign: 'center', py: 8 }}>
              <CampaignIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
                No hay eventos ni anuncios activos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mantente atento a nuestras próximas jornadas y actividades comunitarias.
              </Typography>
            </Card>
          </AnimatedSection>
        ) : (
          <Grid container spacing={4} justifyContent="center">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card sx={{ height: '100%' }}>
                      <Skeleton variant="rectangular" height={220} />
                      <CardContent>
                        <Skeleton variant="text" width="60%" height={32} />
                        <Skeleton variant="text" width="100%" height={24} />
                        <Skeleton variant="text" width="80%" height={24} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              : activeAnnouncements.map((announcement, i) => (
                  <Grid key={announcement.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <AnimatedSection delay={i * 100} sx={{ height: '100%' }}>
                      <AnnouncementCard announcement={announcement} whatsappNumber={whatsappNumber} />
                    </AnimatedSection>
                  </Grid>
                ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
