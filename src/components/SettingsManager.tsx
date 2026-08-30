import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import { get, put, formatApiError } from '@/api/client';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { Settings } from '@/types/settings';

export default function SettingsManager() {
  const qc = useQueryClient();
  const [formData, setFormData] = useState<Settings>(DEFAULT_SETTINGS);
  const [successMsg, setSuccessMsg] = useState('');

  const { data, isLoading, isError } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await get<Settings | {}>('/settings');
      if (Object.keys(res).length === 0) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...res } as Settings;
    },
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (newSettings: Settings) => put('/settings', newSettings),
    onSuccess: () => {
      setSuccessMsg('Configuración guardada exitosamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('social_')) {
      const field = name.split('_')[1];
      setFormData((prev) => ({
        ...prev,
        social_links: {
          ...prev.social_links,
          [field]: value
        }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">{formatApiError(mutation.error, 'Error al cargar la configuración.')}</Alert>;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Configuración General
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Estos datos se mostrarán públicamente en el pie de página, en los botones de WhatsApp y en otras secciones de la plataforma.
      </Typography>

      {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}
      {mutation.isError && <Alert severity="error" sx={{ mb: 3 }}>{formatApiError(mutation.error, 'Error al guardar la configuración.')}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Teléfono de Contacto"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            helperText="Ej. +58 412 000 0000"
            required
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="WhatsApp (Sólo números)"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleChange}
            helperText="Sin espacios ni '+'. Ej. 584120000000"
            required
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Correo Electrónico"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Enlace de Google Maps (URL)"
            name="map_url"
            value={formData.map_url || ''}
            onChange={handleChange}
            helperText="Enlace corto o directo a la ubicación (opcional)"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Dirección Física"
            name="address"
            value={formData.address}
            onChange={handleChange}
            multiline
            rows={2}
            required
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle1" fontWeight={700} mt={2} mb={1}>
            Redes Sociales
          </Typography>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Instagram (URL)"
            name="social_instagram"
            value={formData.social_links?.instagram || ''}
            onChange={handleChange}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Facebook (URL)"
            name="social_facebook"
            value={formData.social_links?.facebook || ''}
            onChange={handleChange}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Twitter / X (URL)"
            name="social_twitter"
            value={formData.social_links?.twitter || ''}
            onChange={handleChange}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          disabled={mutation.isPending}
        >
          Guardar Configuración
        </Button>
      </Box>
    </Box>
  );
}
