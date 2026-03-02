export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;
    
    // Verificar configuración
    if (!MONDAY_API_KEY || !BOARD_ID) {
      return res.status(400).json({ 
        error: 'Monday.com NO configurado',
        apiKey: !!MONDAY_API_KEY,
        boardId: !!BOARD_ID
      });
    }

    const email = data.email;
    if (!email) {
      return res.status(400).json({ error: 'Email obligatorio' });
    }

    // 🔍 1. Buscar por COLUMNA "lead_email" (NO "email")
    const searchRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query ($boardId: Int!, $columnId: String!, $value: String!) {
            items_page_by_column_values (
              board_id: $boardId,
              column_id: "lead_email",
              column_value: $value,
              limit: 1
            ) {
              items { id }
            }
          }
        `,
        variables: {
          boardId: parseInt(BOARD_ID),
          columnId: "lead_email",
          value: email
        }
      })
    });

    const searchData = await searchRes.json();
    const items = searchData.data?.items_page_by_column_values?.items || [];

    // 📝 2. Valores para TUS columnas EXACTAS
    const columnValues = JSON.stringify({
      // Columna nombre va al nombre del ITEM
      "name": data.nombre,
      
      // Tus columnas reales:
      "lead_phone": data.telefono,
      "lead_email": data.email,
      "text_mm12yqx0": data.codigo_postal,        // Código Postal
      "color_mm0ee37e": data.destino_vivienda,    // Destino vivienda
      "dropdown_mksd92xa": data.tipologia_interes, // Tipología int
