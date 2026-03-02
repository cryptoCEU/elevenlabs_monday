export default async function handler(req, res) {
  // Solo permite POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  // Respuesta de prueba simple
  const data = req.body || {};
  
  res.status(200).json({ 
    success: true,
    message: '🎉 Webhook FUNCIONANDO perfectamente',
    received: data,
    timestamp: new Date().toISOString()
  });
}
