import type { VercelRequest, VercelResponse } from '@vercel/node';
import init from '../_lib/auth_handlers/init.js';
import login from '../_lib/auth_handlers/login.js';
import logout from '../_lib/auth_handlers/logout.js';
import rescue from '../_lib/auth_handlers/rescue.js';
import session from '../_lib/auth_handlers/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  switch (action) {
    case 'init':
      return init(req, res);
    case 'login':
      return login(req, res);
    case 'logout':
      return logout(req, res);
    case 'rescue':
      return rescue(req, res);
    case 'session':
      return session(req, res);
    default:
      return res.status(404).json({ error: 'Ruta no encontrada' });
  }
}
