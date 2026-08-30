import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testConnections() {
  console.log('--- TEST: UPSTASH REDIS ---');
  try {
    const { getUser, setUser } = await import('./api/_lib/kv.js');
    const superadmin = {
      username: process.env.SUPERADMIN_USERNAME || 'svkenier',
      password_hash: process.env.ADMIN_PASSWORD_HASH,
      role: 'superadmin',
      created_at: new Date().toISOString(),
    };

    console.log('Inicializando usuario SuperAdmin...');
    await setUser(superadmin as any);
    
    const user = await getUser(superadmin.username);
    if (user && user.username === superadmin.username) {
      console.log('✅ Conexión con Upstash Redis exitosa y usuario guardado.');
    } else {
      console.error('❌ Error guardando el usuario en Upstash Redis.');
    }
  } catch (err) {
    console.error('❌ Falló la conexión con Upstash Redis:', err);
  }

  console.log('\n--- TEST: GITHUB API ---');
  try {
    const { getFile, PETS_JSON_PATH } = await import('./api/_lib/github.js');
    const file = await getFile(PETS_JSON_PATH);
    if (file) {
      console.log('✅ Conexión con GitHub exitosa. Archivo pets.json leído (SHA: ' + file.sha + ').');
    } else {
      console.log('✅ Conexión con GitHub exitosa. El archivo pets.json no existe todavía (retornó null).');
    }
  } catch (err) {
    console.error('❌ Falló la conexión con GitHub API:', err);
  }
}

testConnections();
