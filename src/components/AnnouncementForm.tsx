/**
 * AnnouncementForm — Dialog modal para crear o editar un anuncio/evento.
 */

import { useState, type ChangeEvent } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
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
dayjs.locale('es');
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



const EMPTY = {
  title: '',
  type: 'general' as AnnouncementType,
  description: '',
  date: new Date().toISOString().split('T')[0],
  time: '',
  location: '',
  is_active: true,
};

const validationSchema = Yup.object({
  title: Yup.string().required('El título es obligatorio'),
  type: Yup.string().required('El tipo es obligatorio'),
  description: Yup.string().required('La descripción es obligatoria'),
  date: Yup.string().required('La fecha es obligatoria'),
  time: Yup.string(),
  location: Yup.string(),
  is_active: Yup.boolean(),
});

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

  const formik = useFormik({
    initialValues: initial
      ? {
          title:       initial.title,
          type:        initial.type,
          description: initial.description,
          date:        initial.date,
          time:        initial.time ?? '',
          location:    initial.location ?? '',
          is_active:   initial.is_active,
        }
      : EMPTY,
    enableReinitialize: true,
    validationSchema,
    onSubmit: () => {
      mutation.mutate();
    },
  });

  const [preview, setPreview] = useState<string>(initial?.image_url ?? '');
  const [base64, setBase64]   = useState<string>('');
  const [imgLoading, setImgLoading] = useState(false);
  const [error, setError] = useState('');

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
        ...formik.values,
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
    formik.handleSubmit();
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
                    alt={formik.values.title ? `Flyer de ${formik.values.title}` : 'Flyer del anuncio'}
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
              label="Título *"
              name="title"
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && (formik.errors.title as string)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" error={formik.touched.type && Boolean(formik.errors.type)}>
              <InputLabel>Tipo</InputLabel>
              <Select name="type" value={formik.values.type} label="Tipo" onChange={formik.handleChange} onBlur={formik.handleBlur}>
                <MenuItem value="vacunacion">Vacunación</MenuItem>
                <MenuItem value="esterilizacion">Esterilización</MenuItem>
                <MenuItem value="adopcion">Jornada Adopción</MenuItem>
                <MenuItem value="evento">Evento</MenuItem>
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="perdida">Mascota Perdida</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                label="Fecha"
                format="DD/MM/YYYY"
                value={formik.values.date ? dayjs(formik.values.date, 'YYYY-MM-DD') : null}
                onChange={(newValue) => formik.setFieldValue('date', newValue ? newValue.format('YYYY-MM-DD') : '')}
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    size: 'small', 
                    name: 'date',
                    onBlur: formik.handleBlur,
                    error: formik.touched.date && Boolean(formik.errors.date),
                    helperText: formik.touched.date && (formik.errors.date as string)
                  } 
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Hora (Opcional)"
              placeholder="Ej. 9:00 AM - 2:00 PM"
              name="time"
              value={formik.values.time}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              fullWidth size="small"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label={formik.values.type === 'perdida' ? "Último lugar donde se vio (opcional)" : "Ubicación (Opcional)"}
              placeholder={formik.values.type === 'perdida' ? "Ej: Sector La Paragua, visto por última vez cerca del parque..." : ""}
              name="location"
              value={formik.values.location}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              fullWidth size="small"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Descripción *"
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && (formik.errors.description as string)}
              fullWidth multiline rows={3} size="small"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch name="is_active" checked={formik.values.is_active} onChange={formik.handleChange} color="success" />}
              label={formik.values.is_active ? "Activo (Visible en Home)" : "Inactivo (Oculto)"}
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
          disabled={mutation.isPending || imgLoading || formik.isSubmitting}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ borderRadius: 0 }}
        >
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear anuncio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
