export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;

    // 🎯 TUS COLUMNAS EXACTAS del Playground
    const columnValues = JSON.stringify({
      // EMAIL (tu ID real)
      "email_mm0zf8xc": { "email": data.email },
      
      // PHONE (tu formato directo)
      "phone_mm0z9evz": data.telefono,
      
      // Código postal
      "text_mm0zz0cc": data.codigo_postal,
      
      // Status colores (usa labels exactos)
      "color_mm0zwptv": data.estado_lead || "No cualificado",
      
      // Dropdowns (usa labels exactos)
      "dropdown_mm0zfhhp": data.destino_vivienda || "Uso personal",
      "dropdown_mm0zw343": data.tipologia_interes || "2 Dormitorios",
      "dropdown_mm0zpwn1": data.presupuesto || "150K - 200K", 
      "dropdown_mm0zp09r": data.rango_edad || "36 - 45",
      "dropdown_mm0zp09r": data.origen_contacto || "Google"
    });

    const createRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
            create_item(
              board_id: $boardId, 
              group_id: $groupId,
              item_name: $itemName, 
              column_values: $columnValues
            ) { 
              id 
            }
          }
        `,
        variables: { 
          boardId: BOARD_ID, 
          groupId: "topics",
          itemName: data.nombre || 'Nuevo Lead',
          columnValues 
        }
      })
    });

    const createData = await createRes.json();
    const itemId = createData.data?.create_item?.id;

    return res.json({ 
      status: "created", 
      itemId,
      group: "topics (Listado nuevos)",
      columns_used: [
        "email_mm0zf8xc", "phone_mm0z9evz", "text_mm0zz0cc",
        "color_mm0zwptv", "dropdown_mm0zfhhp", "dropdown_mm0zw343"
      ],
      debug: createData
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
