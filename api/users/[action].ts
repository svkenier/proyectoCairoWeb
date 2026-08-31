import type { VercelRequest, VercelResponse } from '@vercel/node';
import changePassword from '../_lib/users/change-password.js';
import create from '../_lib/users/create.js';
import del from '../_lib/users/delete.js';
import list from '../_lib/users/list.js';
import resetPassword from '../_lib/users/reset-password.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  switch (action) {
    case 'change-password':
      return changePassword(req, res);
    case 'create':
      return create(req, res);
    case 'delete':
      return del(req, res);
    case 'list':
      return list(req, res);
    case 'reset-password':
      return resetPassword(req, res);
    default:
      return res.status(404).json({ error: 'Ruta no encontrada' });
  }
}
