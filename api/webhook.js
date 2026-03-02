export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;
    const email = data.email;

    if (!email) {
      return res.status(400).json({ error: 'Email obligatorio' });
    }

    // 🔍 1. Buscar si existe en "lead_email"
    const searchRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
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

    // 📝 Tus columnas EXACTAS
    const columnValues = JSON.stringify({
      "lead_phone": data.telefono,
      "lead_email": data.email,
      "text_mm12yqx0": data.codigo_postal,
      "dropdown_mksd92xa": data.tipologia_interes,
      "dropdown_mksdgtr8": data.detalle_vivienda,
      "dropdown_mm12gwz0": data.anejos,
      "color_mks9ct6h": data.origen_contacto,
      "lead_status": data.estado_lead,
      "dropdown_mksdhhgc": data.motivo_no_interes || "",
      "color_mm1274dx": data.presupuesto || "",
      "color_mksg46wh": data.rango_edad || "",
      "color_mm0ee37e": data.destino_vivienda || ""
    });

    if (items.length > 0) {
      // ♻️ Actualizar existente
      const itemId = items[0].id;
      await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ($itemId: Int!, $boardId: Int!, $columnValues: JSON!) {
              change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
                id
              }
            }
          `,
          variables: { itemId: parseInt(itemId), boardId: parseInt(BOARD_ID), columnValues }
        })
      });
      return res.json({ status: "updated", itemId });
    } else {
      // ➕ Crear NUEVO en "topics" = "Listado nuevos"
      const createRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ($boardId: Int!, $itemName: String!, $columnValues: JSON!, $groupId: String!) {
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
            boardId: parseInt(BOARD_ID), 
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
        url: `https://tuempresa.monday.com/boards/${BOARD_ID}`
      });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
