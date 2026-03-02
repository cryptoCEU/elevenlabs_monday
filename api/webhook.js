export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  try {
    const data = req.body;
    
    res.status(200).json({ 
      status: 'OK',
      message: '✅ Webhook funcionando perfectamente',
      received: data,
      env: {
        hasApiKey: !!process.env.MONDAY_API_KEY,
        hasBoardId: !!process.env.MONDAY_BOARD_ID
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
