/**
 * PetForm — Dialog modal para crear o editar una mascota.
 *
 * Campos: nombre, especie, raza, sexo, tamaño, edad, peso,
 *         estado, descripción, destacado, vacunado, esterilizado,
 *         desparasitado, foto principal, fotos secundarias (hasta 5).
 *
 * Las imágenes se convierten a WebP (Canvas) antes del envío.
 * Se envían al backend como base64 en el cuerpo JSON.
 */

import { useState, useCallback, type ChangeEvent } from 'react';
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
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CloseIcon     from '@mui/icons-material/Close';
import AddPhotoIcon  from '@mui/icons-material/AddPhotoAlternate';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, formatApiError } from '@/api/client';
import { optimizeImage } from '@/utils/imageOptimizer';
import { PET_IMAGE_FALLBACK } from '@/config';
import type { Pet } from '@/types/pet';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PetFormProps {
  open:    boolean;
  onClose: () => void;
  initial?: Pet | null; // null = crear nuevo
}

interface FormState {
  nombre:          string;
  especie:         string;
  raza:            string;
  sexo:            string;
  tamano:          string;
  edad_aproximada: string;
  peso_kg:         string;
  descripcion:     string;
  estado:          string;
  destacado:       boolean;
  vacunado:        boolean;
  esterilizado:    boolean;
  desparasitado:   boolean;
}

const EMPTY: FormState = {
  nombre: '', especie: '', raza: '', sexo: '',
  tamano: '', edad_aproximada: '', peso_kg: '',
  descripcion: '', estado: 'disponible',
  destacado: false, vacunado: false, esterilizado: false, desparasitado: false,
};

// ─── Helpers de imagen ────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  // Optimizar a WebP primero
  const result = await optimizeImage(file, 0.82, 1200);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      const result = reader.result as string;
      // Quitar el prefijo data:image/webp;base64,
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(result.blob);
  });
}

async function fileToPreview(file: File): Promise<string> {
  const result = await optimizeImage(file, 0.75, 600);
  return URL.createObjectURL(result.blob);
}

// ─── Componente imagen picker ─────────────────────────────────────────────────

interface ImagePickerProps {
  label:   string;
  preview: string;
  onFile:  (file: File) => void;
  onClear?: () => void;
  size?:   'small' | 'large';
}

function ImagePicker({ label, preview, onFile, onClear, size = 'large' }: ImagePickerProps) {
  const h = size === 'large' ? 180 : 110;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = ''; // reset para re-selección del mismo archivo
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component="label"
        htmlFor={`img-picker-${label}`}
        sx={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          height:         h,
          border:         '2px dashed',
          borderColor:    preview ? 'primary.main' : 'divider',
          borderRadius: 0,
          cursor:         'pointer',
          overflow:       'hidden',
          bgcolor:        'background.default',
          transition:     'border-color 200ms',
          '&:hover':      { borderColor: 'primary.main' },
        }}
      >
        {preview ? (
          <Box
            component="img"
            src={preview}
            alt={label}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK; }}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', p: 1, pointerEvents: 'none' }}>
            <AddPhotoIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="caption" color="text.disabled" display="block">
              {label}
            </Typography>
          </Box>
        )}
      </Box>
      <input
        id={`img-picker-${label}`}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {preview && onClear && (
        <Tooltip title="Quitar foto">
          <IconButton
            size="small"
            onClick={onClear}
            sx={{
              position: 'absolute', top: 4, right: 4,
              bgcolor: 'rgba(0,0,0,0.55)', color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PetForm({ open, onClose, initial }: PetFormProps) {
  const isEdit = Boolean(initial?.id);
  const qc     = useQueryClient();

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          nombre:          initial.nombre,
          especie:         initial.especie         ?? '',
          raza:            initial.raza            ?? '',
          sexo:            initial.sexo            ?? '',
          tamano:          initial.tamano          ?? '',
          edad_aproximada: initial.edad_aproximada ?? '',
          peso_kg:         String(initial.peso_kg  ?? ''),
          descripcion:     initial.descripcion     ?? '',
          estado:          initial.estado          ?? 'disponible',
          destacado:       initial.destacado       ?? false,
          vacunado:        initial.vacunado        ?? false,
          esterilizado:    initial.esterilizado    ?? false,
          desparasitado:   initial.desparasitado   ?? false,
        }
      : EMPTY
  );

  // Imágenes
  const [mainPreview,  setMainPreview]  = useState<string>(initial?.imagen_principal ?? '');
  const [mainBase64,   setMainBase64]   = useState<string>('');
  const [extraFiles,   setExtraFiles]   = useState<{ preview: string; base64: string }[]>([]);
  const [imgLoading,   setImgLoading]   = useState(false);
  const [error,        setError]        = useState('');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // ─── Procesamiento de imagen principal ────────────────────────────────────

  const handleMainFile = useCallback(async (file: File) => {
    setImgLoading(true);
    try {
      const [preview, b64] = await Promise.all([fileToPreview(file), fileToBase64(file)]);
      setMainPreview(preview);
      setMainBase64(b64);
    } finally {
      setImgLoading(false);
    }
  }, []);

  // ─── Procesamiento de imagen secundaria ──────────────────────────────────

  const handleExtraFile = useCallback(async (file: File) => {
    if (extraFiles.length >= 5) return;
    setImgLoading(true);
    try {
      const [preview, b64] = await Promise.all([fileToPreview(file), fileToBase64(file)]);
      setExtraFiles((p) => [...p, { preview, base64: b64 }]);
    } finally {
      setImgLoading(false);
    }
  }, [extraFiles.length]);

  const removeExtra = (idx: number) =>
    setExtraFiles((p) => p.filter((_, i) => i !== idx));

  // ─── Mutación ─────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(isEdit && initial?.id ? { id: initial.id } : {}),
        ...form,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : undefined,
        ...(mainBase64 ? { imagen_principal_base64: mainBase64 } : {}),
        ...(extraFiles.length > 0
          ? { fotos_secundarias_base64: extraFiles.map((f) => f.base64) }
          : {}),
        ...(isEdit
          ? { fotos_secundarias_existing: initial?.fotos_secundarias ?? [] }
          : {}),
      };
      return post('/pets', payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pets-index'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = formatApiError(err, isEdit ? 'Error al actualizar la mascota' : 'Error al crear la mascota');
      setError(msg);
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    mutation.mutate();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 0 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? `Editar: ${initial?.nombre}` : 'Nueva mascota'}
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

        {/* ── Datos básicos ────────────────────────────────────────────────── */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1.5}>
          Datos básicos
        </Typography>
        <Grid container spacing={2} mb={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              fullWidth size="small" required
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Especie</InputLabel>
              <Select value={form.especie} label="Especie" onChange={(e) => set('especie', e.target.value)}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="perro">Perro</MenuItem>
                <MenuItem value="gato">Gato</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Sexo</InputLabel>
              <Select value={form.sexo} label="Sexo" onChange={(e) => set('sexo', e.target.value)}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="macho">Macho</MenuItem>
                <MenuItem value="hembra">Hembra</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Raza"
              value={form.raza}
              onChange={(e) => set('raza', e.target.value)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tamaño</InputLabel>
              <Select value={form.tamano} label="Tamaño" onChange={(e) => set('tamano', e.target.value)}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="pequeno">Pequeño</MenuItem>
                <MenuItem value="mediano">Mediano</MenuItem>
                <MenuItem value="grande">Grande</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Edad aproximada"
              placeholder="ej: 2 años"
              value={form.edad_aproximada}
              onChange={(e) => set('edad_aproximada', e.target.value)}
              fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Peso (kg)"
              type="number"
              value={form.peso_kg}
              onChange={(e) => set('peso_kg', e.target.value)}
              fullWidth size="small"
              inputProps={{ min: 0, step: 0.1 }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* ── Estado + descripción ─────────────────────────────────────────── */}
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1.5}>
          Estado y descripción
        </Typography>
        <Grid container spacing={2} mb={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select value={form.estado} label="Estado" onChange={(e) => set('estado', e.target.value)}>
                <MenuItem value="disponible">Disponible</MenuItem>
                <MenuItem value="en_proceso">En proceso</MenuItem>
                <MenuItem value="adoptado">Adoptado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} color="warning" />}
                label="Destacado ⭐"
              />
              <FormControlLabel
                control={<Switch checked={form.vacunado} onChange={(e) => set('vacunado', e.target.checked)} color="success" />}
                label="Vacunado"
              />
              <FormControlLabel
                control={<Switch checked={form.esterilizado} onChange={(e) => set('esterilizado', e.target.checked)} color="success" />}
                label="Esterilizado"
              />
              <FormControlLabel
                control={<Switch checked={form.desparasitado} onChange={(e) => set('desparasitado', e.target.checked)} color="success" />}
                label="Desparasitado"
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Historia, personalidad, necesidades especiales..."
            />
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* ── Fotos ────────────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
            Fotos
          </Typography>
          {imgLoading && <CircularProgress size={16} />}
        </Box>

        <Grid container spacing={2}>
          {/* Foto principal */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Foto principal *
            </Typography>
            <ImagePicker
              label="Subir foto principal"
              preview={mainPreview}
              onFile={handleMainFile}
              onClear={() => { setMainPreview(''); setMainBase64(''); }}
            />
          </Grid>

          {/* Fotos secundarias */}
          <Grid size={{ xs: 12, sm: 8 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Fotos adicionales (máx. 5)
            </Typography>
            <Grid container spacing={1}>
              {extraFiles.map((ef, idx) => (
                <Grid key={idx} size={{ xs: 4 }}>
                  <ImagePicker
                    label={`Foto ${idx + 2}`}
                    preview={ef.preview}
                    onFile={() => {/* no re-selección en extra */}}
                    onClear={() => removeExtra(idx)}
                    size="small"
                  />
                </Grid>
              ))}
              {extraFiles.length < 5 && (
                <Grid size={{ xs: 4 }}>
                  <ImagePicker
                    label="Agregar foto"
                    preview=""
                    onFile={handleExtraFile}
                    size="small"
                  />
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={mutation.isPending} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending || imgLoading || !form.nombre.trim()}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ borderRadius: 0, px: 3 }}
        >
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear mascota'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
