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
      return res.status(500).json({ 
        error: 'Monday.com no configurado',
        missing: {
          apiKey: !MONDAY_API_KEY,
          boardId: !BOARD_ID
        }
      });
    }

    const email = data.email;
    if (!email) {
      return res.status(400).json({ error: 'Email obligatorio' });
    }

    // 1️⃣ Buscar si existe por email (columna "email")
    const querySearch = `
      query ($boardId: Int!, $columnId: String!, $value: String!) {
        items_page_by_column_values (
          board_id: $boardId,
          column_id: "email",
          column_value: $value,
          limit: 1
        ) {
          items { id }
        }
      }`;

    const searchRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': MONDAY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: querySearch,
        variables: {
          boardId: parseInt(BOARD_ID),
          columnId: "email",
          value: email
        }
      })
    });

    const searchData = await searchRes.json();
    const items = searchData.data?.items_page_by_column_values?.items || [];

    const columnValues = JSON.stringify({
      nombre: data.nombre,
      telefono: data.telefono,
      "codigo_postal": data.codigo_postal,
      "destino_vivienda": data.destino_vivienda,
      "tipologia_interes": data.tipologia_interes,
      "detalle_vivienda": data.detalle_vivienda,
      presupuesto: data.presupuesto,
      "rango_edad": data.rango_edad,
      "origen_contacto": data.origen_contacto,
      "resumen_llamada": data.resumen_llamada,
      "motivo_no_interes": data.motivo_no_interes,
      anejos: data.anejos,
      "estado_lead": data.estado_lead
    });

    if (items.length > 0) {
      // 2️⃣ ACTUALIZAR item existente
      const itemId = items[0].id;
      
      const updateRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': MONDAY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation ($itemId: Int!, $boardId: Int!, $columnValues: JSON!) {
              change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
                id
              }
            }
          `,
          variables: {
            itemId: parseInt(itemId),
            boardId: parseInt(BOARD_ID),
            columnValues
          }
        })
      });

      return res.json({ status: "updated", itemId });
      
    } else {
      // 3️⃣ CREAR nuevo item
      const createRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': MONDAY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation ($boardId: Int!, $itemName: String!, $columnValues: JSON!) {
              create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
                id
              }
            }
          `,
          variables: {
            boardId: parseInt(BOARD_ID),
            itemName: `${data.nombre || 'Nuevo Lead'} - ${email}`,
            columnValues
          }
        })
      });

      const createData = await createRes.json();
      const itemId = createData.data?.create_item?.id;
      
      return res.json({ status: "created", itemId });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error procesando lead',
      details: error.message 
    });
  }
}
