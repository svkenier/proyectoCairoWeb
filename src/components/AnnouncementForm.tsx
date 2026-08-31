/**
 * AnnouncementForm — Dialog modal para crear o editar un anuncio/evento.
 */

import { useState, type ChangeEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CloseIcon     from '@mui/icons-material/Close';
import AddPhotoIcon  from '@mui/icons-material/AddPhotoAlternate';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, put, formatApiError } from '@/api/client';
import { optimizeImage } from '@/utils/imageOptimizer';
import { PET_IMAGE_FALLBACK } from '@/config';
import type { Announcement, AnnouncementType } from '@/types/announcement';

interface AnnouncementFormProps {
  open:    boolean;
  onClose: () => void;
  initial?: Announcement | null;
}

interface FormState {
  title:       string;
  type:        AnnouncementType;
  description: string;
  date:        string;
  time:        string;
  location:    string;
  is_active:   boolean;
}

const EMPTY: FormState = {
  title: '',
  type: 'general',
  description: '',
  date: new Date().toISOString().split('T')[0],
  time: '',
  location: '',
  is_active: true,
};

// ─── Helpers de imagen ────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  const result = await optimizeImage(file, 0.85, 1200);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(result.blob);
  });
}

async function fileToPreview(file: File): Promise<string> {
  const result = await optimizeImage(file, 0.85, 800);
  return URL.createObjectURL(result.blob);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AnnouncementForm({ open, onClose, initial }: AnnouncementFormProps) {
  const isEdit = Boolean(initial?.id);
  const qc     = useQueryClient();

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          title:       initial.title,
          type:        initial.type,
          description: initial.description,
          date:        initial.date,
          time:        initial.time ?? '',
          location:    initial.location ?? '',
          is_active:   initial.is_active,
        }
      : EMPTY
  );

  const [preview, setPreview] = useState<string>(initial?.image_url ?? '');
  const [base64, setBase64]   = useState<string>('');
  const [imgLoading, setImgLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try {
      const [prev, b64] = await Promise.all([fileToPreview(file), fileToBase64(file)]);
      setPreview(prev);
      setBase64(b64);
    } catch (err) {
      console.error(err);
      setError('Error al procesar la imagen');
    } finally {
      setImgLoading(false);
      e.target.value = '';
    }
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(isEdit && initial?.id ? { id: initial.id } : {}),
        ...form,
        ...(base64 ? { image_base64: base64 } : {}),
        ...(isEdit ? { image_url: initial?.image_url } : {}),
      };
      
      if (isEdit) {
        return put(`/announcements`, payload);
      } else {
        return post('/announcements', payload);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['announcements'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = formatApiError(err, isEdit ? 'Error al actualizar el anuncio' : 'Error al crear el anuncio');
      setError(msg);
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!form.title.trim() || !form.description.trim()) {
      setError('El título y la descripción son requeridos');
      return;
    }
    mutation.mutate();
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: 0 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Editar Anuncio' : 'Nuevo Anuncio'}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={mutation.isPending}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Box
              component="label"
              htmlFor="announcement-img"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200,
                border: '2px dashed',
                borderColor: preview ? 'primary.main' : 'divider',
                borderRadius: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                bgcolor: 'background.default',
                position: 'relative',
                '&:hover': { borderColor: 'primary.main' },
                mb: 1,
              }}
            >
              {imgLoading ? (
                <CircularProgress />
              ) : preview ? (
                <>
                  <Box
                    component="img"
                    src={preview}
                    alt={form.title ? `Flyer de ${form.title}` : 'Flyer del anuncio'}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK; }}
                    sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <Tooltip title="Cambiar foto">
                    <IconButton
                      component="span"
                      size="small"
                      sx={{
                        position: 'absolute', top: 8, right: 8,
                        bgcolor: 'rgba(0,0,0,0.55)', color: 'white',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                      }}
                    >
                      <AddPhotoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', p: 1, pointerEvents: 'none' }}>
                  <AddPhotoIcon sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.disabled">
                    Subir Flyer o Imagen (Opcional pero recomendado)
                  </Typography>
                </Box>
              )}
            </Box>
            <input
              id="announcement-img"
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              label="Título"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              fullWidth size="small" required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select value={form.type} label="Tipo" onChange={(e) => set('type', e.target.value as AnnouncementType)}>
                <MenuItem value="vacunacion">Vacunación</MenuItem>
                <MenuItem value="esterilizacion">Esterilización</MenuItem>
                <MenuItem value="adopcion">Jornada Adopción</MenuItem>
                <MenuItem value="evento">Evento</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                label="Fecha"
                format="DD/MM/YYYY"
                value={form.date ? dayjs(form.date, 'YYYY-MM-DD') : null}
                onChange={(newValue) => set('date', newValue ? newValue.format('YYYY-MM-DD') : '')}
                slotProps={{ textField: { fullWidth: true, size: 'small', required: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Hora (Opcional)"
              placeholder="Ej. 9:00 AM - 2:00 PM"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              fullWidth size="small"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Ubicación (Opcional)"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              fullWidth size="small"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              fullWidth multiline rows={3} size="small" required
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} color="success" />}
              label={form.is_active ? "Activo (Visible en Home)" : "Inactivo (Oculto)"}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={mutation.isPending} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending || imgLoading || !form.title.trim()}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ borderRadius: 0 }}
        >
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear anuncio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
