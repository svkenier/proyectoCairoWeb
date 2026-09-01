import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function triggerVercelDeploy() {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK;
  
  if (!hookUrl) {
    console.error('❌ ERROR: VERCEL_DEPLOY_HOOK no está definido en .env o .env.local');
    console.log('💡 Instrucciones:');
    console.log('1. Ve a tu panel de Vercel > Proyecto > Settings > Git > Deploy Hooks');
    console.log('2. Crea un hook para la rama "main"');
    console.log('3. Pega la URL resultante en tu .env.local: VERCEL_DEPLOY_HOOK="https://api.vercel.com/v1/integrations/deploy/..."');
    process.exit(1);
  }

  console.log(`🚀 Iniciando despliegue de producción vía Deploy Hook...`);
  
  try {
    const response = await fetch(hookUrl, { method: 'POST' });
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Despliegue iniciado con éxito en Vercel!');
      console.log('🌐 Job URL:', data.url ?? data.job?.url ?? 'N/A');
    } else {
      console.error('❌ Error al invocar el hook:', data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
    process.exit(1);
  }
}

triggerVercelDeploy();
