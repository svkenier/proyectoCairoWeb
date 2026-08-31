/**
 * UserManagement — Panel de gestión de usuarios del refugio.
 *
 * Funcionalidades:
 * - Tabla de usuarios con rol, creador y último acceso.
 * - Crear usuario (Dialog con form).
 * - Resetear contraseña de un usuario.
 * - Eliminar usuario (con confirmación).
 *
 * Restricciones de jerarquía aplicadas en frontend y backend:
 * - No se puede modificar al superadmin principal.
 * - No se puede modificar a uno mismo.
 * - encargado solo gestiona voluntarios.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import PersonAddIcon  from '@mui/icons-material/PersonAdd';
import LockResetIcon  from '@mui/icons-material/LockReset';
import DeleteIcon     from '@mui/icons-material/Delete';
import { useAuth } from '@/contexts/AuthContext';
import { get, post, del, formatApiError } from '@/api/client';
import { canManage, canCreateRole, ROLE_LEVEL } from '@/types/user';
import type { PublicUser, UserRole } from '@/types/user';

const MAIN_OWNER = 'svkenier';

const ROLE_COLORS: Record<UserRole, 'error' | 'warning' | 'default'> = {
  superadmin: 'error',
  encargado:  'warning',
  voluntario: 'default',
};

// ─── Dialogs internos ─────────────────────────────────────────────────────────

interface CreateUserDialogProps {
  open:        boolean;
  actorRole:   UserRole;
  onClose:     () => void;
  onCreated:   () => void;
}

function CreateUserDialog({ open, actorRole, onClose, onCreated }: CreateUserDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole]         = useState<UserRole>('voluntario');
  const [error, setError]       = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/users/create', { username, password, role }),
    onSuccess:  () => { onCreated(); onClose(); setUsername(''); setPassword(''); setRole('voluntario'); },
    onError:    (e: unknown) => setError(formatApiError(e, 'Error al crear usuario')),
  });

  const availableRoles: UserRole[] = (['voluntario', 'encargado', 'superadmin'] as UserRole[])
    .filter((r) => canCreateRole(actorRole, r));

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: 0 } }}>
      <DialogTitle fontWeight={700}>Crear usuario</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            fullWidth size="small"
            helperText="Solo letras minúsculas, números y _"
          />
          <TextField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth size="small"
            helperText="Mínimo 8 caracteres"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" tabIndex={-1}>
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Rol</InputLabel>
            <Select value={role} label="Rol" onChange={(e) => setRole(e.target.value as UserRole)}>
              {availableRoles.map((r) => (
                <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          disabled={!username || !password || mutation.isPending}
          onClick={() => mutation.mutate()}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ResetPasswordDialogProps {
  target:  PublicUser | null;
  onClose: () => void;
}

function ResetPasswordDialog({ target, onClose }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const mutation = useMutation({
    mutationFn: () => post('/users/reset-password', { target_username: target?.username, new_password: password }),
    onSuccess:  () => setDone(true),
    onError:    (e: unknown) => setError(formatApiError(e, 'Error al resetear la contraseña')),
  });

  const handleClose = () => {
    onClose();
    setPassword('');
    setError('');
    setDone(false);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={Boolean(target)} onClose={handleClose} maxWidth="xs" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: 0 } }}>
      <DialogTitle fontWeight={700}>Resetear contraseña</DialogTitle>
      <DialogContent>
        {done ? (
          <Alert severity="success">
            Contraseña de <strong>{target?.username}</strong> actualizada exitosamente.
          </Alert>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            <Typography variant="body2" color="text.secondary" mb={2} mt={1}>
              Nueva contraseña para <strong>{target?.username}</strong>:
            </Typography>
            <TextField
              type={showPassword ? 'text' : 'password'}
              label="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth size="small"
              helperText="Mínimo 8 caracteres"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" tabIndex={-1}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">{done ? 'Cerrar' : 'Cancelar'}</Button>
        {!done && (
          <Button
            variant="contained"
            color="warning"
            disabled={password.length < 8 || mutation.isPending}
            onClick={() => mutation.mutate()}
            startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Resetear
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const [createOpen,    setCreateOpen]    = useState(false);
  const [resetTarget,   setResetTarget]   = useState<PublicUser | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<PublicUser | null>(null);
  const [deleteError,   setDeleteError]   = useState('');

  const { data, isLoading, isError } = useQuery<{ users: PublicUser[] }>({
    queryKey: ['users-list'],
    queryFn:  () => get('/users/list'),
  });

  const deleteMutation = useMutation({
    mutationFn: (username: string) => del('/users/delete', { data: { target_username: username } }),
    onSuccess:  () => {
      void qc.invalidateQueries({ queryKey: ['users-list'] });
      setDeleteTarget(null);
    },
    onError: (e: unknown) => setDeleteError(formatApiError(e, 'Error al eliminar usuario')),
  });

  const canActOn = (target: PublicUser) => {
    if (!currentUser) return { canReset: false, canDelete: false, disabledReason: '' };
    
    const isMainOwner = currentUser.username === MAIN_OWNER;
    const isTargetMainOwner = target.username === MAIN_OWNER;
    
    // Si el objetivo es el propietario principal
    if (isTargetMainOwner) {
      if (!isMainOwner) {
        return { 
          canReset: true, 
          canDelete: true, 
          disabled: true, 
          disabledReason: 'El superusuario principal no puede ser modificado ni eliminado' 
        };
      } else {
        return { 
          canReset: false, // Usa la función Cambiar Contraseña
          canDelete: false, // No puede eliminarse a sí mismo
          disabled: false, 
          disabledReason: '' 
        };
      }
    }
    
    // Si el objetivo es el usuario actual
    if (target.username === currentUser.username) {
      return { canReset: false, canDelete: false, disabledReason: '' };
    }
    
    // El Owner principal puede eliminar a todos los demás
    if (isMainOwner) {
      return { canReset: true, canDelete: true, disabled: false, disabledReason: '' };
    }
    
    const hasPermission = canManage(currentUser.role, target.role);
    return { 
      canReset: hasPermission, 
      canDelete: hasPermission, 
      disabled: false, 
      disabledReason: '' 
    };
  };

  const users = data?.users ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>Usuarios del sistema</Typography>
        {currentUser && ROLE_LEVEL[currentUser.role] >= ROLE_LEVEL['encargado'] && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ borderRadius: 0 }}
          >
            Nuevo usuario
          </Button>
        )}
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No se pudo cargar la lista de usuarios.
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
        ) : users.map((u) => (
          <Card key={u.username} variant="outlined" sx={{ borderRadius: 0 }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2} mb={0.5}>
                {u.username}
                {u.username === currentUser?.username && (
                  <Typography component="span" variant="caption" color="text.disabled" ml={1}>(tú)</Typography>
                )}
              </Typography>
              <Chip
                label={u.role}
                size="small"
                color={ROLE_COLORS[u.role]}
                variant="outlined"
                sx={{ textTransform: 'capitalize', mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" display="block">
                Creado por: {u.created_by ?? '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary" display="block">
                Último acceso: {u.last_login ? new Date(u.last_login).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </Typography>
            </CardContent>
            {(() => {
              const actionStatus = canActOn(u);
              if (!actionStatus.canReset && !actionStatus.canDelete) return null;
              return (
                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Stack direction="row" spacing={1} width="100%">
                    {actionStatus.canReset && (
                      <Tooltip title={actionStatus.disabled ? actionStatus.disabledReason : "Resetear contraseña"}>
                        <span style={{ width: '100%' }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="warning" 
                            fullWidth
                            disabled={actionStatus.disabled}
                            onClick={() => setResetTarget(u)}
                            startIcon={<LockResetIcon />}
                          >
                            Resetear
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    {actionStatus.canDelete && (
                      <Tooltip title={actionStatus.disabled ? actionStatus.disabledReason : "Eliminar usuario"}>
                        <span style={{ display: 'inline-flex' }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="error"
                            disabled={actionStatus.disabled}
                            onClick={() => { setDeleteError(''); setDeleteTarget(u); }}
                            sx={{ minWidth: 40, px: 0 }}
                          >
                            <DeleteIcon />
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </CardActions>
              );
            })()}
          </Card>
        ))}
        {!isLoading && users.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={4}>No hay usuarios registrados.</Typography>
        )}
      </Box>

      {/* ── VISTA DE TABLA (ESCRITORIO) ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, display: { xs: 'none', md: 'block' } }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8F7F4' }}>
              <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Creado por</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Último acceso</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              : users.map((u) => (
                  <TableRow key={u.username} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{u.username}</Typography>
                      {u.username === currentUser?.username && (
                        <Typography variant="caption" color="text.disabled">(tú)</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.role}
                        size="small"
                        color={ROLE_COLORS[u.role]}
                        variant="outlined"
                        sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{u.created_by ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {(() => {
                        const actionStatus = canActOn(u);
                        return (
                          <>
                            {actionStatus.canReset && (
                              <Tooltip title={actionStatus.disabled ? actionStatus.disabledReason : "Resetear contraseña"}>
                                <span>
                                  <IconButton size="small" color="warning" disabled={actionStatus.disabled} onClick={() => setResetTarget(u)}>
                                    <LockResetIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            {actionStatus.canDelete && (
                              <Tooltip title={actionStatus.disabled ? actionStatus.disabledReason : "Eliminar usuario"}>
                                <span>
                                  <IconButton size="small" color="error" disabled={actionStatus.disabled} onClick={() => { setDeleteError(''); setDeleteTarget(u); }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialogs */}
      <CreateUserDialog
        open={createOpen}
        actorRole={currentUser?.role ?? 'voluntario'}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void qc.invalidateQueries({ queryKey: ['users-list'] })}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />

      {/* Confirmación de eliminación */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle fontWeight={700} color="error">Eliminar usuario</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography>
            ¿Estás seguro de que deseas eliminar a <strong>{deleteTarget?.username}</strong>?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.username); }}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
