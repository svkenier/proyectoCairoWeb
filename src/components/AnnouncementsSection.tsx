/**
 * AnnouncementsSection — Sección pública para visualizar eventos activos
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import LocationOnIcon    from '@mui/icons-material/LocationOn';
import WhatsAppIcon      from '@mui/icons-material/WhatsApp';
import CampaignIcon      from '@mui/icons-material/Campaign';
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon  from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useRef } from 'react';

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

function formatDateNatural(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      const dayStr = day.padStart(2, '0');
      const monthNames = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      const monthStr = monthNames[date.getMonth()];
      return `${dayStr} de ${monthStr} del ${year}`;
    }
  }
  return dateString;
}


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
            <Typography variant="body2">{formatDateNatural(announcement.date)}</Typography>
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const itemsVisible = isMobile ? 1 : isTablet ? 2 : 3;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const numPages = Math.ceil(activeAnnouncements.length / itemsVisible);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const page = Math.round(scrollLeft / clientWidth);
    if (page !== currentPage && page >= 0 && page < numPages) {
      setCurrentPage(page);
    }
  };

  const handleNext = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = scrollContainerRef.current;
    if (scrollLeft + clientWidth >= scrollWidth - 10) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      scrollContainerRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = scrollContainerRef.current;
    if (scrollLeft <= 10) {
      scrollContainerRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
    } else {
      scrollContainerRef.current.scrollBy({ left: -clientWidth, behavior: 'smooth' });
    }
  };

  const handleDotClick = (index: number) => {
    if (!scrollContainerRef.current) return;
    const { clientWidth } = scrollContainerRef.current;
    scrollContainerRef.current.scrollTo({ left: clientWidth * index, behavior: 'smooth' });
  };

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
          <Box sx={{ position: 'relative', px: { xs: 0, md: 6 } }}>
            {!isMobile && activeAnnouncements.length > itemsVisible && (
              <IconButton 
                onClick={handlePrev}
                sx={{ position: 'absolute', left: { xs: 0, md: 0 }, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
              >
                <ChevronLeftIcon />
              </IconButton>
            )}
            
            <Box 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              sx={{ 
                display: 'flex', 
                gap: 4, 
                overflowX: 'auto', 
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollBehavior: 'smooth',
                px: { xs: 2, md: 0 },
                pb: 2
              }}
            >
              {isLoading
                ? Array.from({ length: itemsVisible }).map((_, i) => (
                    <Box key={i} sx={{ scrollSnapAlign: 'start', flex: '0 0 auto', width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.333% - 21.33px)' } }}>
                      <Card sx={{ height: '100%' }}>
                        <Skeleton variant="rectangular" height={220} />
                        <CardContent>
                          <Skeleton variant="text" width="60%" height={32} />
                          <Skeleton variant="text" width="100%" height={24} />
                          <Skeleton variant="text" width="80%" height={24} />
                        </CardContent>
                      </Card>
                    </Box>
                  ))
                : activeAnnouncements.map((announcement, i) => (
                    <Box key={announcement.id} sx={{ scrollSnapAlign: 'start', flex: '0 0 auto', width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.333% - 21.33px)' } }}>
                      <AnimatedSection delay={i * 100} sx={{ height: '100%' }}>
                        <AnnouncementCard announcement={announcement} whatsappNumber={whatsappNumber} />
                      </AnimatedSection>
                    </Box>
                  ))}
            </Box>

            {!isMobile && activeAnnouncements.length > itemsVisible && (
              <IconButton 
                onClick={handleNext}
                sx={{ position: 'absolute', right: { xs: 0, md: 0 }, top: '50%', transform: 'translateY(-50%)', zIndex: 2, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'grey.100' } }}
              >
                <ChevronRightIcon />
              </IconButton>
            )}

            {/* Pagination Dots */}
            {numPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                {Array.from({ length: numPages }).map((_, i) => (
                  <Box
                    key={i}
                    onClick={() => handleDotClick(i)}
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: i === currentPage ? 'primary.main' : 'grey.300',
                      cursor: 'pointer',
                      transition: 'background-color 0.3s',
                      '&:hover': { bgcolor: 'primary.light' }
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}
