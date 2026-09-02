/**
 * Admin — Panel de Administración Principal.
 *
 * Secciones (Pestañas):
 * 1. Mascotas: Tabla con todas las mascotas. CRUD (crear, editar, eliminar).
 * 2. Usuarios: Gestión de usuarios del refugio (solo encargado/superadmin).
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon       from '@mui/icons-material/Add';
import EditIcon      from '@mui/icons-material/Edit';
import DeleteIcon    from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import Navbar from '@/components/Navbar';
import PetForm from '@/components/PetForm';
import UserManagement from '@/components/UserManagement';
import SettingsManager from '@/components/SettingsManager';
import AnnouncementsManager from '@/components/AnnouncementsManager';
import { useAuth } from '@/contexts/AuthContext';
import { get, del, formatApiError } from '@/api/client';
import { ROLE_LEVEL } from '@/types/user';
import type { Pet, PetsIndex } from '@/types/pet';
import { PET_IMAGE_FALLBACK } from '@/config';

// ─── Pestañas ─────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`admin-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [tabIndex, setTabIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Estados Mascotas
  const [petFormOpen, setPetFormOpen] = useState(false);
  const [petToEdit, setPetToEdit]     = useState<Pet | null>(null);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);

  // Carga de mascotas (desde CDN)
  const { data: petsData, isLoading: petsLoading, isError: petsError } = useQuery<PetsIndex>({
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
    staleTime: 60000,
  });

  // Eliminar mascota (API)
  const deletePetMutation = useMutation({
    mutationFn: (id: string) => del('/pets', { data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pets-index'] });
      setPetToDelete(null);
    },
    onError: (error) => {
      // Usaremos un alert nativo simplificado ya que SnackMsg no está en este scope
      alert(formatApiError(error, 'Error al eliminar la mascota'));
    },
  });

  const handleOpenEdit = (pet: Pet) => {
    setPetToEdit(pet);
    setPetFormOpen(true);
  };

  const handleCloseForm = () => {
    setPetFormOpen(false);
    setPetToEdit(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const canManageUsers = user && ROLE_LEVEL[user.role] >= ROLE_LEVEL['encargado'];
  const isSuperadmin   = user && ROLE_LEVEL[user.role] >= ROLE_LEVEL['superadmin'];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, flexGrow: 1 }}>
        {/* Header Admin */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          {/* Hamburger Menu solo en móvil */}
          <IconButton 
            onClick={() => setDrawerOpen(true)} 
            sx={{ display: { xs: 'block', md: 'none' }, color: 'primary.main' }}
          >
            <MenuIcon fontSize="large" />
          </IconButton>
          
          <AdminPanelSettingsIcon sx={{ fontSize: '2.5rem', color: 'primary.main', display: { xs: 'none', md: 'block' } }} />
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>Panel de Administración</Typography>
            {user && (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label={user.username} size="small" />
                <Chip label={user.role} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Tabs de Escritorio */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: { xs: 'none', md: 'block' } }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} aria-label="admin tabs" variant="scrollable">
            <Tab label="Mascotas" />
            <Tab label="Eventos y Anuncios" />
            {canManageUsers && <Tab label="Usuarios" />}
            {isSuperadmin && <Tab label="Configuración del Refugio" />}
          </Tabs>
        </Box>

        {/* Drawer de Móvil */}
        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 260, borderRadius: 0 } }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" fontWeight={700}>Menú Admin</Typography>
          </Box>
          <List>
            {['Mascotas', 'Eventos y Anuncios'].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton 
                  selected={tabIndex === index} 
                  onClick={() => { setTabIndex(index); setDrawerOpen(false); }}
                >
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
            {canManageUsers && (
              <ListItem disablePadding>
                <ListItemButton selected={tabIndex === 2} onClick={() => { setTabIndex(2); setDrawerOpen(false); }}>
                  <ListItemText primary="Usuarios" />
                </ListItemButton>
              </ListItem>
            )}
            {isSuperadmin && (
              <ListItem disablePadding>
                <ListItemButton selected={tabIndex === (canManageUsers ? 3 : 2)} onClick={() => { setTabIndex(canManageUsers ? 3 : 2); setDrawerOpen(false); }}>
                  <ListItemText primary="Configuración del Refugio" />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Drawer>

        {/* ── PANEL MASCOTAS ──────────────────────────────────────────────── */}
        <TabPanel value={tabIndex} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setPetToEdit(null); setPetFormOpen(true); }}
              sx={{ borderRadius: 0 }}
            >
              Nueva mascota
            </Button>
          </Box>

          {petsError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              No se pudo cargar el índice de mascotas. Verifica la configuración de GitHub.
            </Alert>
          )}

          {/* ── VISTA DE TARJETAS (MÓVIL) ── */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {petsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} variant="outlined" sx={{ borderRadius: 0 }}>
                  <CardContent><Skeleton variant="rectangular" height={100} /></CardContent>
                </Card>
              ))
            ) : petsData?.mascotas.map((pet) => (
              <Card key={pet.id} variant="outlined" sx={{ borderRadius: 0 }}>
                <CardContent sx={{ display: 'flex', gap: 2, pb: 1 }}>
                  <Box
                    component="img"
                    src={pet.imagen_principal || PET_IMAGE_FALLBACK}
                    alt={pet.nombre ? `Foto de ${pet.nombre}` : 'Foto de mascota'}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK; }}
                    sx={{ width: 80, height: 80, objectFit: 'cover' }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                      {pet.nombre} {pet.destacado && '⭐'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      {pet.especie} • {pet.sexo} • {pet.edad_aproximada || 'Edad desc.'}
                    </Typography>
                    <Chip
                      label={pet.estado}
                      size="small"
                      variant="outlined"
                      color={pet.estado === 'adoptado' ? 'default' : pet.estado === 'en_proceso' ? 'warning' : 'success'}
                    />
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Stack direction="row" spacing={1} width="100%">
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="inherit" 
                      fullWidth 
                      href={`/mascotas/${pet.id}`} 
                      target="_blank"
                      startIcon={<OpenInNewIcon />}
                    >
                      Ver
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary" 
                      fullWidth
                      onClick={() => handleOpenEdit(pet)}
                      startIcon={<EditIcon />}
                    >
                      Editar
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error" 
                      onClick={() => setPetToDelete(pet)}
                      sx={{ minWidth: 40, px: 0 }}
                    >
                      <DeleteIcon />
                    </Button>
                  </Stack>
                </CardActions>
              </Card>
            ))}
            {(!petsData || petsData.mascotas.length === 0) && !petsLoading && (
              <Typography color="text.secondary" textAlign="center" py={4}>No hay mascotas registradas.</Typography>
            )}
          </Box>

          {/* ── VISTA DE TABLA (ESCRITORIO) ── */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, display: { xs: 'none', md: 'block' } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8F7F4' }}>
                  <TableCell sx={{ width: 60 }}></TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mascota</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Especie</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Destacado</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {petsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}><Skeleton height={40} /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : petsData?.mascotas.map((pet) => (
                      <TableRow key={pet.id} hover>
                        <TableCell>
                          <Box
                            component="img"
                            src={pet.imagen_principal || PET_IMAGE_FALLBACK}
                            alt={pet.nombre ? `Miniatura de ${pet.nombre}` : 'Miniatura de mascota'}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PET_IMAGE_FALLBACK; }}
                            sx={{ width: 40, height: 40, borderRadius: 0, objectFit: 'cover' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{pet.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">{pet.id}</Typography>
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{pet.especie || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={pet.estado}
                            size="small"
                            variant="outlined"
                            color={pet.estado === 'adoptado' ? 'default' : pet.estado === 'en_proceso' ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell>
                          {pet.destacado ? <Chip label="⭐" size="small" /> : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Ver ficha pública">
                            <IconButton size="small" href={`/mascotas/${pet.id}`} target="_blank" rel="noopener noreferrer">
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar mascota">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(pet)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar mascota">
                            <IconButton size="small" color="error" onClick={() => setPetToDelete(pet)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                {(!petsData || petsData.mascotas.length === 0) && !petsLoading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No hay mascotas registradas.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── PANEL ANUNCIOS Y EVENTOS ───────────────────────────────────────── */}
        <TabPanel value={tabIndex} index={1}>
          <AnnouncementsManager />
        </TabPanel>

        {/* ── PANEL USUARIOS ──────────────────────────────────────────────── */}
        {canManageUsers && (
          <TabPanel value={tabIndex} index={2}>
            <UserManagement />
          </TabPanel>
        )}

        {/* ── PANEL CONFIGURACIÓN ─────────────────────────────────────────── */}
        {isSuperadmin && (
          <TabPanel value={tabIndex} index={canManageUsers ? 3 : 2}>
            <SettingsManager />
          </TabPanel>
        )}
      </Container>

      {/* ── Dialog Formulario de Mascota ──────────────────────────────────── */}
      {petFormOpen && (
        <PetForm
          open={petFormOpen}
          initial={petToEdit}
          onClose={handleCloseForm}
        />
      )}

      {/* ── Dialog Eliminar Mascota ───────────────────────────────────────── */}
      <Dialog open={Boolean(petToDelete)} onClose={() => setPetToDelete(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle fontWeight={700} color="error">Eliminar Mascota</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar a <strong>{petToDelete?.nombre}</strong>?
          </Typography>
          <Typography variant="body2" color="error.main" mt={1}>
            Esta acción eliminará su ficha y todas sus fotos de forma permanente.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPetToDelete(null)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deletePetMutation.isPending}
            onClick={() => { if (petToDelete) deletePetMutation.mutate(petToDelete.id); }}
            startIcon={deletePetMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
