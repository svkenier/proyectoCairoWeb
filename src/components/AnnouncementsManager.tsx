/**
 * AnnouncementsManager — Gestión CRUD de Anuncios y Eventos
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AddIcon    from '@mui/icons-material/Add';
import EditIcon   from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CampaignIcon from '@mui/icons-material/Campaign';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';

import { get, del, formatApiError } from '@/api/client';
import AnnouncementForm from './AnnouncementForm';
import type { Announcement, AnnouncementType } from '@/types/announcement';
import { PET_IMAGE_FALLBACK } from '@/config';

const TYPE_COLORS: Record<AnnouncementType, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'default'> = {
  vacunacion: 'success',
  esterilizacion: 'info',
  adopcion: 'secondary',
  evento: 'warning',
  general: 'default',
};

const TYPE_LABELS: Record<AnnouncementType, string> = {
  vacunacion: 'Vacunación',
  esterilizacion: 'Esterilización',
  adopcion: 'Adopción',
  evento: 'Evento',
  general: 'General',
};

export default function AnnouncementsManager() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: announcements, isLoading, isError } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      // Use internal api bypassing CDN cache for admin
      const data = await get<any>('/announcements');
      return Array.isArray(data) ? data : (data?.announcements || []);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del('/announcements', { data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['announcements'] });
      setDeleting(null);
    },
    onError: (err) => {
      setErrorMsg(formatApiError(err, 'Error al eliminar el anuncio'));
    }
  });

  const handleOpenForm = (a?: Announcement) => {
    setEditing(a || null);
    setFormOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CampaignIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Gestión de Eventos y Anuncios</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          sx={{ borderRadius: 0 }}
        >
          Nuevo Anuncio
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error al cargar los anuncios. Intenta nuevamente.
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {/* ── VISTA DE TARJETAS (MÓVIL) ── */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} variant="outlined" sx={{ borderRadius: 0 }}>
              <CardContent><Skeleton variant="rectangular" height={100} /></CardContent>
            </Card>
          ))
        ) : announcements?.map((a) => (
          <Card key={a.id} variant="outlined" sx={{ borderRadius: 0 }}>
            <CardContent sx={{ display: 'flex', gap: 2, pb: 1 }}>
              <Box
                component="img"
                src={a.image_url || PET_IMAGE_FALLBACK}
                alt={a.title ? `Imagen de ${a.title}` : 'Imagen del anuncio'}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK; }}
                sx={{ width: 80, height: 80, objectFit: 'cover' }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2} mb={0.5}>
                  {a.title}
                </Typography>
                <Chip label={TYPE_LABELS[a.type] || 'Otro'} size="small" color={TYPE_COLORS[a.type]} variant="outlined" sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary" display="block">
                  {a.date} {a.time && `• ${a.time}`}
                </Typography>
                <Chip
                  label={a.is_active ? 'Activo' : 'Inactivo'}
                  size="small"
                  color={a.is_active ? 'success' : 'default'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
              <Stack direction="row" spacing={1} width="100%">
                <Button 
                  size="small" 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  onClick={() => handleOpenForm(a)}
                  startIcon={<EditIcon />}
                >
                  Editar
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="error" 
                  onClick={() => setDeleting(a)}
                  sx={{ minWidth: 40, px: 0 }}
                >
                  <DeleteIcon />
                </Button>
              </Stack>
            </CardActions>
          </Card>
        ))}
        {!isLoading && announcements?.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={4}>No hay anuncios registrados.</Typography>
        )}
      </Box>

      {/* ── VISTA DE TABLA (ESCRITORIO) ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, display: { xs: 'none', md: 'block' } }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8F7F4' }}>
              <TableCell sx={{ width: 60 }}></TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Título</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Fecha / Hora</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton height={40} /></TableCell>
                    ))}
                  </TableRow>
                ))
              : announcements?.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Box
                        component="img"
                        src={a.image_url || PET_IMAGE_FALLBACK}
                        alt={a.title ? `Imagen miniatura de ${a.title}` : 'Imagen del anuncio'}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK; }}
                        sx={{ width: 40, height: 40, borderRadius: 0, objectFit: 'cover' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{a.title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={TYPE_LABELS[a.type] || 'Otro'} size="small" color={TYPE_COLORS[a.type]} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{a.date}</Typography>
                      {a.time && <Typography variant="caption" color="text.secondary">{a.time}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.is_active ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={a.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => handleOpenForm(a)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => setDeleting(a)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && announcements?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No hay anuncios registrados.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {formOpen && (
        <AnnouncementForm
          open={formOpen}
          initial={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Dialog Eliminar */}
      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700} color="error">Eliminar Anuncio</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar <strong>{deleting?.title}</strong>?</Typography>
          <Typography variant="body2" color="error.main" mt={1}>Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleting(null)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
