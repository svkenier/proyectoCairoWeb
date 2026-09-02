/**
 * Catalog — Catálogo completo de mascotas con filtros (/mascotas).
 *
 * Filtros (Rules.md §3 Filtros del Catálogo):
 * - Búsqueda por texto (nombre/raza)
 * - Especie, Sexo, Tamaño, Estado de adopción
 *
 * Datos: TanStack Query → CDN jsDelivr (público, sin auth).
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon  from '@mui/icons-material/Clear';
import PetsIcon   from '@mui/icons-material/Pets';
import Navbar     from '@/components/Navbar';
import Footer     from '@/components/Footer';
import PetCard, { PetCardSkeleton } from '@/components/PetCard';
import AnimatedSection from '@/components/AnimatedSection';
import SEO from '@/components/SEO';
import { get, formatApiError } from '@/api/client';
import type { Pet, PetsIndex, PetFilters } from '@/types/pet';

// ─── Estado inicial de filtros ────────────────────────────────────────────────

const INITIAL_FILTERS: PetFilters = {
  busqueda: '',
  especie:  '',
  sexo:     '',
  tamano:   '',
  estado:   '',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Catalog() {
  const [filters, setFilters] = useState<PetFilters>(INITIAL_FILTERS);

  const { data, isLoading, isError, error, refetch } = useQuery<PetsIndex>({
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

  // Filtrado en el cliente con useMemo
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filters.busqueda?.trim().toLowerCase() ?? '';

    return data.mascotas.filter((p) => {
      if (q && !p.nombre.toLowerCase().includes(q) && !(p.raza ?? '').toLowerCase().includes(q))
        return false;
      if (filters.especie && p.especie !== filters.especie) return false;
      if (filters.sexo    && p.sexo    !== filters.sexo)    return false;
      if (filters.tamano  && p.tamano  !== filters.tamano)  return false;
      if (filters.estado  && p.estado  !== filters.estado)  return false;
      return true;
    });
  }, [data, filters]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');
  const clearFilters     = () => setFilters(INITIAL_FILTERS);

  const set = <K extends keyof PetFilters>(key: K, value: PetFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO 
        title="Catálogo de Mascotas" 
        description="Explora nuestro catálogo de perros y gatos rescatados. Filtra por especie, tamaño y estado para encontrar a tu compañero ideal." 
      />
      <Navbar />

      {/* ── Encabezado de página ────────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor:    'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py:         { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <AnimatedSection>
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing="0.12em">
              Adopción responsable
            </Typography>
            <Typography variant="h2" fontWeight={700} mt={0.5} mb={1}>
              Catálogo de mascotas
            </Typography>
            {data && (
              <Typography variant="body1" color="text.secondary">
                {data.total} mascota{data.total !== 1 ? 's' : ''} en el refugio
              </Typography>
            )}
          </AnimatedSection>
        </Container>
      </Box>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#F8F7F4', borderBottom: '1px solid', borderColor: 'divider', py: 2.5 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterListIcon sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }} />

            {/* Búsqueda de texto */}
            <TextField
              id="catalog-search"
              placeholder="Nombre o raza..."
              value={filters.busqueda}
              onChange={(e) => set('busqueda', e.target.value)}
              size="small"
              sx={{ minWidth: 180, bgcolor: 'white' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Especie */}
            <FormControl size="small" sx={{ minWidth: 130, bgcolor: 'white' }}>
              <InputLabel id="filter-especie-label">Especie</InputLabel>
              <Select
                labelId="filter-especie-label"
                id="filter-especie"
                value={filters.especie ?? ''}
                label="Especie"
                onChange={(e) => set('especie', e.target.value as PetFilters['especie'])}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="perro">Perro</MenuItem>
                <MenuItem value="gato">Gato</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>

            {/* Sexo */}
            <FormControl size="small" sx={{ minWidth: 110, bgcolor: 'white' }}>
              <InputLabel id="filter-sexo-label">Sexo</InputLabel>
              <Select
                labelId="filter-sexo-label"
                id="filter-sexo"
                value={filters.sexo ?? ''}
                label="Sexo"
                onChange={(e) => set('sexo', e.target.value as PetFilters['sexo'])}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="macho">Macho</MenuItem>
                <MenuItem value="hembra">Hembra</MenuItem>
              </Select>
            </FormControl>

            {/* Tamaño */}
            <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'white' }}>
              <InputLabel id="filter-tamano-label">Tamaño</InputLabel>
              <Select
                labelId="filter-tamano-label"
                id="filter-tamano"
                value={filters.tamano ?? ''}
                label="Tamaño"
                onChange={(e) => set('tamano', e.target.value as PetFilters['tamano'])}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="pequeno">Pequeño</MenuItem>
                <MenuItem value="mediano">Mediano</MenuItem>
                <MenuItem value="grande">Grande</MenuItem>
              </Select>
            </FormControl>

            {/* Estado */}
            <FormControl size="small" sx={{ minWidth: 140, bgcolor: 'white' }}>
              <InputLabel id="filter-estado-label">Estado</InputLabel>
              <Select
                labelId="filter-estado-label"
                id="filter-estado"
                value={filters.estado ?? ''}
                label="Estado"
                onChange={(e) => set('estado', e.target.value as PetFilters['estado'])}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="disponible">Disponible</MenuItem>
                <MenuItem value="en_proceso">En proceso</MenuItem>
                <MenuItem value="adoptado">Adoptado</MenuItem>
              </Select>
            </FormControl>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <Button
                size="small"
                color="error"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                variant="outlined"
                sx={{ borderRadius: 0 }}
              >
                Limpiar
              </Button>
            )}
          </Box>

          {/* Contador de resultados */}
          {!isLoading && data && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </Typography>
              {hasActiveFilters && (
                <Chip
                  label="Filtros activos"
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={clearFilters}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          )}
        </Container>
      </Box>

      {/* ── Grid de mascotas ──────────────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, py: { xs: 4, md: 6 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">

          {isError && (
            <Alert
              severity="error"
              action={<Button color="inherit" size="small" onClick={() => void refetch()}>Reintentar</Button>}
              sx={{ mb: 4 }}
            >
              {formatApiError(error, 'No pudimos cargar la lista de mascotas.')}
            </Alert>
          )}

          <Grid container spacing={3}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <PetCardSkeleton />
                  </Grid>
                ))
              : filtered?.map((pet, i) => (
                  <Grid key={pet?.id || i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <AnimatedSection delay={Math.min(i * 40, 320)}>
                      {pet ? <PetCard pet={pet} /> : null}
                    </AnimatedSection>
                  </Grid>
                ))}
          </Grid>

          {/* Estado vacío */}
          {!isLoading && !isError && filtered.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <PetsIcon sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {hasActiveFilters
                  ? 'Sin resultados con esos filtros'
                  : 'Aún no hay mascotas registradas'}
              </Typography>
              <Typography variant="body2" color="text.disabled" mb={3}>
                {hasActiveFilters
                  ? 'Prueba combinaciones diferentes o limpia los filtros.'
                  : 'Vuelve pronto — el equipo sube nuevas fichas regularmente.'}
              </Typography>
              {hasActiveFilters && (
                <Button variant="outlined" color="primary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </Box>
          )}

          <Divider sx={{ mt: 6 }} />
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
