/**
 * Home — Portada principal de petRescue.
 *
 * Secciones:
 * 1. Hero — gradient terracota→salvia, headline principal, CTAs.
 * 2. Mascotas Destacadas — grid de PetCard con TanStack Query.
 * 3. Cómo funciona — 3 pasos con iconos.
 * 4. Contacto — ContactSection (3 canales WhatsApp).
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import SearchOutlinedIcon      from '@mui/icons-material/SearchOutlined';
import ChatOutlinedIcon        from '@mui/icons-material/ChatOutlined';
import HomeOutlinedIcon        from '@mui/icons-material/HomeOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PetsIcon from '@mui/icons-material/Pets';
import Navbar          from '@/components/Navbar';
import Footer          from '@/components/Footer';
import PetCard, { PetCardSkeleton } from '@/components/PetCard';
import AnimatedSection from '@/components/AnimatedSection';
import ContactSection  from '@/components/ContactSection';
import AnnouncementsSection from '@/components/AnnouncementsSection';
import SEO             from '@/components/SEO';
import { get, formatApiError } from '@/api/client';
import type { Pet, PetsIndex } from '@/types/pet';

// ─── Pasos de adopción ────────────────────────────────────────────────────────

const STEPS = [
  {
    icon:     <SearchOutlinedIcon sx={{ fontSize: 28 }} />,
    title:    'Explora el catálogo',
    desc:     'Conoce a nuestras mascotas, lee sus historias y encuentra la que conecte contigo.',
  },
  {
    icon:     <ChatOutlinedIcon sx={{ fontSize: 28 }} />,
    title:    'Contáctanos por WhatsApp',
    desc:     'Escríbenos directamente. Te informamos sobre el proceso y requisitos de adopción.',
  },
  {
    icon:     <HomeOutlinedIcon sx={{ fontSize: 28 }} />,
    title:    '¡Bienvenido a casa!',
    desc:     'Firma el acuerdo, prepara el espacio y dale a tu nueva mascota el hogar que merece.',
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Home() {
  // Fetch del índice de mascotas desde el CDN
  const { data, isLoading, isError, error } = useQuery<PetsIndex>({
    queryKey: ['pets-index'],
    queryFn: async () => {
      const res = await get<{ mascotas: Pet[] }>('/public/pets');
      const pets = res.mascotas ?? [];
      return { 
        mascotas: pets, 
        generated_at: new Date().toISOString(),
        total: pets.length 
      } as PetsIndex;
    },
    staleTime: 5 * 60 * 1000,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Mobile Pagination State for Pets Carousel
  const [currentPetPage, setCurrentPetPage] = useState(0);
  const petScrollContainerRef = useRef<HTMLDivElement>(null);

  // Mostrar hasta 8 mascotas: priorizar destacadas, rellenar con recientes
  const displayPets = useMemo(() => {
    if (!data?.mascotas) return [];
    const available = data.mascotas.filter((p) => p.estado !== 'adoptado');
    const featured = available.filter(p => p.destacado === true);
    const regular = available.filter(p => p.destacado !== true).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [...featured, ...regular].slice(0, 8);
  }, [data]);

  // --- Infinite Loop Logic ---
  const N = displayPets.length;
  const infinitePets = useMemo(() => {
    if (N === 0) return [];
    return [...displayPets, ...displayPets, ...displayPets];
  }, [displayPets, N]);

  const getCardWidth = (container: HTMLDivElement) => {
    const firstChild = container.children[0] as HTMLElement;
    if (!firstChild) return 0;
    const gap = parseFloat(window.getComputedStyle(container).gap) || 0;
    return firstChild.offsetWidth + gap;
  };

  // Initial scroll to the middle block
  useEffect(() => {
    if (isMobile && N > 0 && petScrollContainerRef.current) {
      const container = petScrollContainerRef.current;
      const cardWidth = getCardWidth(container);
      if (cardWidth > 0) {
        container.style.scrollBehavior = 'auto';
        container.scrollLeft = cardWidth * N;
        setTimeout(() => {
          if (petScrollContainerRef.current) {
            petScrollContainerRef.current.style.scrollBehavior = 'smooth';
          }
        }, 50);
      }
    }
  }, [isMobile, N]);

  const handlePetScroll = () => {
    if (!petScrollContainerRef.current || N === 0) return;
    const container = petScrollContainerRef.current;
    const { scrollLeft } = container;
    const cardWidth = getCardWidth(container);
    if (cardWidth === 0) return;
    
    // Calculate current page based on middle block
    let normalizedIndex = Math.round(scrollLeft / cardWidth) - N;
    if (normalizedIndex < 0) normalizedIndex = (normalizedIndex % N) + N;
    if (normalizedIndex >= N) normalizedIndex = normalizedIndex % N;
    
    if (normalizedIndex !== currentPetPage && normalizedIndex >= 0 && normalizedIndex < N) {
      setCurrentPetPage(normalizedIndex);
    }

    // Infinite loop jump
    if (scrollLeft <= cardWidth * (N - 0.5)) {
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = scrollLeft + cardWidth * N;
      setTimeout(() => { container.style.scrollBehavior = 'smooth'; }, 10);
    } else if (scrollLeft >= cardWidth * (N * 2 - 0.5)) {
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = scrollLeft - cardWidth * N;
      setTimeout(() => { container.style.scrollBehavior = 'smooth'; }, 10);
    }
  };

  const handlePetDotClick = (index: number) => {
    if (!petScrollContainerRef.current || N === 0) return;
    const container = petScrollContainerRef.current;
    const cardWidth = getCardWidth(container);
    const targetLeft = cardWidth * (N + index);
    container.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };
  // ---------------------------

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO 
        title="Inicio" 
        description="Refugio de mascotas: perros y gatos en adopción responsable. Encuentra a tu compañero ideal y dale un hogar para siempre." 
      />
      <Navbar />

      {/* ── Hero (Split Layout / Sharp UI) ──────────────────────────────────── */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          minHeight: { xs: '75vh', md: '80vh' },
          display: 'flex',
          alignItems: 'center',
          backgroundImage: "url('/hero-bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.90) 0%, rgba(16, 42, 67, 0.65) 50%, rgba(16, 42, 67, 0.40) 100%)',
            zIndex: 1,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{ maxWidth: '750px' }}>
            <AnimatedSection>
              <Chip
                label="Refugio & Rescate Animal"
                sx={{
                  mb: 3,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: '#F59E0B',
                  border: '1px solid #F59E0B',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              />
            </AnimatedSection>

            <AnimatedSection delay={80}>
              <Typography
                variant="h2"
                component="h1"
                fontWeight={800}
                color="#FFFFFF"
                mb={2.5}
                sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                Dale un hogar a quien más lo necesita
              </Typography>
            </AnimatedSection>

            <AnimatedSection delay={160}>
              <Typography
                variant="body1"
                mb={4.5}
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: { xs: '1rem', md: '1.2rem' },
                }}
              >
                Perros y gatos en busca de un hogar lleno de amor.
                Adoptar salva dos vidas: la de ellos y la tuya.
              </Typography>
            </AnimatedSection>

            <AnimatedSection delay={240}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component={RouterLink}
                  to="/mascotas"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: '#F59E0B',
                    color: '#102A43',
                    fontWeight: 700,
                    '&:hover': { bgcolor: '#D97706' },
                  }}
                >
                  Ver mascotas
                </Button>
                <Button
                  component={RouterLink}
                  to="/requisitos"
                  variant="outlined"
                  size="large"
                  sx={{
                    color: '#FFFFFF',
                    borderColor: '#FFFFFF',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      borderColor: '#FFFFFF',
                    },
                  }}
                >
                  ¿Cómo adoptar?
                </Button>
              </Box>
            </AnimatedSection>
          </Box>
        </Container>
      </Box>

      {/* ── Eventos y Anuncios ─────────────────────────────────────────────── */}
      <AnnouncementsSection />

      {/* ── Mascotas en busca de hogar ───────────────────────────────────────── */}

      <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing="0.12em">
                Adopción responsable
              </Typography>
              <Typography variant="h2" fontWeight={700} mt={0.5} mb={1.5}>
                Mascotas en busca de hogar
              </Typography>
              <Typography variant="body1" color="text.secondary" maxWidth={480} mx="auto">
                Cada uno tiene una historia. Encuentra a tu compañero ideal y
                cambia su vida para siempre.
              </Typography>
            </Box>
          </AnimatedSection>

          {isError && (
            <Alert severity="error" sx={{ mb: 4 }}>
              {formatApiError(error, 'No pudimos cargar la lista de mascotas.')}
            </Alert>
          )}

          {isMobile ? (
            <Box sx={{ position: 'relative', px: 0 }}>
              <Box 
                ref={petScrollContainerRef}
                onScroll={handlePetScroll}
                sx={{ 
                  display: 'flex', 
                  gap: 0, 
                  overflowX: 'auto', 
                  scrollSnapType: 'x mandatory',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollBehavior: 'smooth',
                  px: 0,
                  pb: 2
                }}
              >
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Box key={i} sx={{ scrollSnapAlign: 'center', flex: '0 0 auto', width: '100%' }}>
                        <Box sx={{ maxWidth: '92%', mx: 'auto', height: '100%' }}>
                          <PetCardSkeleton />
                        </Box>
                      </Box>
                    ))
                  : infinitePets.map((pet, i) => (
                      <Box key={`${pet.id}-${i}`} sx={{ scrollSnapAlign: 'center', flex: '0 0 auto', width: '100%' }}>
                        <AnimatedSection delay={0} sx={{ height: '100%' }}>
                          <Box sx={{ maxWidth: '92%', mx: 'auto', height: '100%' }}>
                            <PetCard pet={pet} />
                          </Box>
                        </AnimatedSection>
                      </Box>
                    ))}
              </Box>
              
              {displayPets.length > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                  {displayPets.map((_, i) => (
                    <Box
                      key={i}
                      onClick={() => handlePetDotClick(i)}
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: i === currentPetPage ? 'primary.main' : 'grey.300',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s',
                        '&:hover': { bgcolor: 'primary.light' }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                      <PetCardSkeleton />
                    </Grid>
                  ))
                : displayPets.map((pet, i) => (
                    <Grid key={pet.id} size={{ xs: 12, sm: 6, md: 3 }}>
                      <AnimatedSection delay={i * 60}>
                        <PetCard pet={pet} />
                      </AnimatedSection>
                    </Grid>
                  ))}
            </Grid>
          )}

          {!isLoading && displayPets.length > 0 && (
            <AnimatedSection sx={{ textAlign: 'center', mt: 5 }}>
              <Button
                component={RouterLink}
                to="/mascotas"
                variant="outlined"
                color="primary"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ px: 4 }}
              >
                Ver todas las mascotas
              </Button>
            </AnimatedSection>
          )}

          {!isLoading && displayPets.length === 0 && (
            <AnimatedSection>
              <Box component={Card} elevation={0} sx={{ bgcolor: 'transparent', textAlign: 'center', py: 8 }}>
                <PetsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
                  No hay mascotas registradas por el momento
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pronto publicaremos nuevos peludos que buscan un hogar lleno de amor.
                </Typography>
              </Box>
            </AnimatedSection>
          )}
        </Container>
      </Box>

      {/* ── Cómo funciona ────────────────────────────────────────────────────── */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8FAFC' }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography variant="overline" color="secondary" fontWeight={700} letterSpacing="0.12em">
                El proceso
              </Typography>
              <Typography variant="h2" fontWeight={700} mt={0.5}>
                Adoptar es fácil
              </Typography>
            </Box>
          </AnimatedSection>

          <Grid container spacing={4}>
            {STEPS.map((step, i) => (
              <Grid key={step.title} size={{ xs: 12, md: 4 }}>
                <AnimatedSection delay={i * 100}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p:         3,
                      bgcolor:   'background.paper',
                      border:    '1px solid',
                      borderColor: 'divider',
                      height:    '100%',
                      position:  'relative',
                    }}
                  >
                    <Box
                      sx={{
                        display:  'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width:    52,
                        height:   52,
                        bgcolor:  '#E0E7FF',
                        color:    '#102A43',
                        mb:       2,
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        top:      16,
                        left:     16,
                        width:    28,
                        height:   28,
                        bgcolor:  'primary.main',
                        color:    'white',
                        display:  'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                      {step.desc}
                    </Typography>
                  </Box>
                </AnimatedSection>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Contacto / WhatsApp ────────────────────────────────────────────── */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing="0.12em">
                Contáctanos
              </Typography>
              <Typography variant="h2" fontWeight={700} mt={0.5} mb={1.5}>
                ¿Cómo podemos ayudarte?
              </Typography>
              <Typography variant="body1" color="text.secondary" maxWidth={480} mx="auto">
                Toda nuestra comunicación es directa por WhatsApp.
                Sin formularios, sin esperas.
              </Typography>
            </Box>
          </AnimatedSection>

          <AnimatedSection delay={80}>
            <ContactSection />
          </AnimatedSection>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
