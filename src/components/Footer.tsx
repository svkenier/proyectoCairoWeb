/**
 * Footer — Pie de página institucional.
 */

import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon    from '@mui/icons-material/Phone';
import EmailIcon    from '@mui/icons-material/Email';
import PlaceIcon    from '@mui/icons-material/Place';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon  from '@mui/icons-material/Twitter';
import Skeleton     from '@mui/material/Skeleton';
import logo         from '@/assets/logo.webp';
import { getGenericAdoptionUrl, getRescueUrl, getDonationUrl, getVolunteerUrl, openWhatsApp } from '@/utils/whatsapp';
import { get } from '@/api/client';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { Settings } from '@/types/settings';

const NAV_LINKS = [
  { label: 'Inicio',      to: '/' },
  { label: 'Mascotas',    to: '/mascotas' },
  { label: 'Requisitos',  to: '/requisitos' },
];

const LEGAL_LINKS = [
  { label: 'Términos y Condiciones', to: '/terminos' },
  { label: 'Política de Privacidad', to: '/privacidad' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    staleTime: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await get<Settings | {}>('/settings');
      if (Object.keys(res).length === 0) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...res } as Settings;
    },
  });

  const config = settings || DEFAULT_SETTINGS;
  const phone = config.whatsapp;

  const WA_CHANNELS = [
    { label: 'Adoptar una mascota', getUrl: () => getGenericAdoptionUrl(phone) },
    { label: 'Reportar un rescate', getUrl: () => getRescueUrl(phone) },
    { label: 'Donar / Apadrinar',   getUrl: () => getDonationUrl(phone) },
    { label: 'Voluntariado',        getUrl: () => getVolunteerUrl(phone) },
  ];

  // Map logic
  let finalMapEmbedUrl = '';
  let finalMapLinkUrl = '';

  if (config.map_url || config.address) {
    let query = config.address || '';
    if (!query && config.map_url) {
      if (config.map_url.includes('/place/')) {
        const match = config.map_url.match(/\/place\/([^/]+)/);
        if (match) query = decodeURIComponent(match[1].replace(/\+/g, ' '));
      } else if (config.map_url.includes('?q=')) {
        const match = config.map_url.match(/[?&]q=([^&]+)/);
        if (match) query = decodeURIComponent(match[1].replace(/\+/g, ' '));
      } else if (!config.map_url.startsWith('http')) {
        query = config.map_url;
      }
    }
    if (!query) query = config.map_url || '';

    finalMapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    finalMapLinkUrl = config.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return (
    <Box
      component="footer"
      sx={{
        bgcolor:    '#0F2439',
        color:      '#CBD5E1',
        mt:         'auto',
        pt:         6,
        pb:         3,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} mb={4}>

          {/* Columna 1: Marca + misión + Contacto */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box component="img" src={logo} alt="Proyecto Cairo" sx={{ width: 32, height: 32, objectFit: 'contain' }} />
              <Typography variant="h6" fontWeight={800} color="#FFFFFF">
                Proyecto Cairo
              </Typography>
            </Box>
            <Typography variant="body2" color="#CBD5E1" lineHeight={1.8}>
              Somos un refugio benéfico dedicado a rescatar y dar en adopción a
              perros y gatos que merecen una segunda oportunidad. Operamos 100%
              con voluntarios y donaciones.
            </Typography>
            
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="overline" color="#FFFFFF" fontWeight={700} fontSize="1rem" letterSpacing="0.5px" display="block" mb={0.5} sx={{ textTransform: 'none' }}>
                Información de Contacto
              </Typography>
              {isLoading ? (
                <Skeleton sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} height={80} />
              ) : (
                <>
                  {config.phone && (
                    <Link href={`tel:${config.phone.replace(/\s+/g, '')}`} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', color: '#FFFFFF', transition: 'color 0.2s ease-in-out', cursor: 'pointer', textDecoration: 'none', '&:hover': { color: '#F59E0B' } }}>
                      <PhoneIcon sx={{ color: '#F59E0B', fontSize: '1.2rem', mr: 1 }} /> 
                      <Typography sx={{ color: 'inherit', fontSize: '0.9rem', fontWeight: 400 }}>{config.phone}</Typography>
                    </Link>
                  )}
                  {config.email && (
                    <Link href={`mailto:${config.email}`} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', color: '#FFFFFF', transition: 'color 0.2s ease-in-out', cursor: 'pointer', textDecoration: 'none', '&:hover': { color: '#F59E0B' } }}>
                      <EmailIcon sx={{ color: '#F59E0B', fontSize: '1.2rem', mr: 1 }} /> 
                      <Typography sx={{ color: 'inherit', fontSize: '0.9rem', fontWeight: 400 }}>{config.email}</Typography>
                    </Link>
                  )}
                  {config.address && (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', color: '#FFFFFF' }}>
                      <PlaceIcon sx={{ color: '#F59E0B', fontSize: '1.2rem', mt: 0.3, mr: 1 }} /> 
                      <Typography sx={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 400 }}>{config.address}</Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>

            {/* Redes Sociales */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              {config.whatsapp && (
                <IconButton
                  href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  sx={{ bgcolor: '#1E293B', color: '#E2E8F0', borderRadius: 0, transition: 'all 0.2s ease-in-out', '&:hover': { bgcolor: '#25D366', color: '#FFFFFF' } }}
                >
                  <WhatsAppIcon />
                </IconButton>
              )}
              {config.social_links?.facebook && (
                <IconButton
                  href={config.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  sx={{ bgcolor: '#1E293B', color: '#E2E8F0', borderRadius: 0, transition: 'all 0.2s ease-in-out', '&:hover': { bgcolor: '#1877F2', color: '#FFFFFF' } }}
                >
                  <FacebookIcon />
                </IconButton>
              )}
              {config.social_links?.instagram && (
                <IconButton
                  href={config.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  sx={{ bgcolor: '#1E293B', color: '#E2E8F0', borderRadius: 0, transition: 'all 0.2s ease-in-out', '&:hover': { background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#FFFFFF' } }}
                >
                  <InstagramIcon />
                </IconButton>
              )}
              {config.social_links?.twitter && (
                <IconButton
                  href={config.social_links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  sx={{ bgcolor: '#1E293B', color: '#E2E8F0', borderRadius: 0, transition: 'all 0.2s ease-in-out', '&:hover': { bgcolor: '#FFFFFF', color: '#000000' } }}
                >
                  <TwitterIcon />
                </IconButton>
              )}
            </Box>
          </Grid>

          {/* Columna 2: Navegación */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="overline" color="#FFFFFF" fontWeight={700} fontSize="1rem" letterSpacing="0.5px" display="block" mb={1.5} sx={{ textTransform: 'none' }}>
              Navegación
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  component={RouterLink}
                  to={l.to}
                  underline="none"
                  sx={{ color: '#E2E8F0', fontSize: '0.875rem', transition: 'color 0.2s ease-in-out', '&:hover': { color: '#F59E0B' } }}
                >
                  {l.label}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* Columna 3: WhatsApp */}
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="overline" color="#FFFFFF" fontWeight={700} fontSize="1rem" letterSpacing="0.5px" display="block" mb={1.5} sx={{ textTransform: 'none' }}>
              Contacto
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {WA_CHANNELS.map((ch) => (
                <Link
                  key={ch.label}
                  component="button"
                  underline="none"
                  onClick={() => openWhatsApp(ch.getUrl())}
                  sx={{
                    color:     '#E2E8F0',
                    fontSize:  '0.875rem',
                    display:   'flex',
                    alignItems: 'center',
                    gap:       0.5,
                    background: 'none',
                    border:    'none',
                    cursor:    'pointer',
                    p:         0,
                    textAlign: 'left',
                    transition: 'color 0.2s ease-in-out',
                    '&:hover': { color: '#F59E0B' },
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: '1.2rem', color: '#F59E0B' }} />
                  {ch.label}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* Columna 4: Mapa */}
          {finalMapEmbedUrl && (
            <Grid size={{ xs: 12, md: 3 }}>
              <Link
                href={finalMapLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir mapa en nueva pestaña"
                sx={{
                  display: 'block',
                  width: '100%',
                  height: 180,
                  overflow: 'hidden',
                  opacity: 0.9,
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 1 }
                }}
              >
                <iframe
                  title="Ubicación del Refugio"
                  src={finalMapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, pointerEvents: 'none' }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </Link>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)', mb: 2.5 }} />

        {/* Bottom bar */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Typography variant="caption" color="rgba(255,255,255,0.40)">
            © {year} Proyecto Cairo · Todos los derechos reservados
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.to}
                component={RouterLink}
                to={l.to}
                underline="hover"
                sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', '&:hover': { color: 'primary.light' } }}
              >
                {l.label}
              </Link>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
