export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;
    
    // 📧 1. BUSCAR por email O teléfono
    const searchRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: { 
        'Authorization': MONDAY_API_KEY, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        query: `
          query ($boardId: ID!) {
            boards(ids: [$boardId]) {
              items_page(limit: 1) {
                items {
                  id
                  name
                  column_values(ids: ["lead_email", "lead_phone"]) {
                    id
                    value
                  }
                }
              }
            }
          }
        `,
        variables: { boardId: BOARD_ID }
      })
    });

    const searchData = await searchRes.json();
    const items = searchData.data.boards[0].items_page.items;
    
    // 🎯 MATCH por email O teléfono
    let existingItem = null;
    for (const item of items) {
      const emailCol = item.column_values.find(col => col.id === 'lead_email');
      const phoneCol = item.column_values.find(col => col.id === 'lead_phone');
      
      const itemEmail = emailCol?.value ? JSON.parse(emailCol.value).email : '';
      const itemPhone = phoneCol?.value ? JSON.parse(phoneCol.value).phone : '';
      
      if (itemEmail === data.email || itemPhone === data.telefono) {
        existingItem = item;
        break;
      }
    }

    const columnValues = JSON.stringify({
      "lead_email": { "email": data.email, "text": data.email },
      "lead_phone": { "phone": data.telefono, "text": data.telefono },
      "text_mm12yqx0": data.codigo_postal || "",
      "lead_status": { "label": data.estado_lead || "Interesado-seguimiento" },
      "dropdown_mksd92xa": data.tipologia_interes || "Sin definir",
      "dropdown_mksdgtr8": data.detalle_vivienda || "Sin definir",
      "dropdown_mm12gwz0": data.anejos || "Sin definir",
      "dropdown_mksdhhgc": data.motivo_no_interes || "No sabe/no contesta",
      "color_mm0ee37e": { "label": data.destino_vivienda || "Primera vivienda" },
      "color_mksg46wh": { "label": data.rango_edad || "31 - 45" },
      "color_mm1274dx": { "label": data.presupuesto || "300K - 350K" },
      "color_mks9ct6h": { "label": data.origen_contacto || "Google Ads" },
      "boolean_mkvw55qp": { "checked": true },
      "date_mksbjga2": "2026-03-02",
      "name": data.nombre || "Nuevo Lead"
    });

    let result;
    
    if (existingItem) {
      // 🔄 UPDATE existente
      const updateRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ($itemId: ID!, $columnValues: JSON!) {
              change_multiple_column_values(item_id: $itemId, column_values: $columnValues) {
                id
              }
            }
          `,
          variables: { 
            itemId: existingItem.id, 
            columnValues 
          }
        })
      });
      
      result = await updateRes.json();
      return res.json({ 
        success: true, 
        action: "UPDATED", 
        itemId: existingItem.id,
        message: `Lead actualizado: ${data.nombre}`
      });
      
    } else {
      // ➕ CREATE nuevo
      const createRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
              create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) { id }
            }
          `,
          variables: { 
            boardId: BOARD_ID, 
            groupId: "topics",
            itemName: `${data.nombre} - Nuevo`,
            columnValues 
          }
        })
      });
      
      result = await createRes.json();
      return res.json({ 
        success: true, 
        action: "CREATED", 
        itemId: result.data.create_item.id,
        message: `Nuevo lead creado: ${data.nombre}`
      });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
