export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;
    
    // 🔍 Búsqueda (limit 500)
    const searchRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query ($boardId: ID!) {
            boards(ids: [$boardId]) {
              items_page(limit: 500) {
                items {
                  id
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
    
    // 🎯 Buscar match
    let existingItem = null;
    for (const item of items) {
      const emailCol = item.column_values.find(col => col.id === 'lead_email');
      const phoneCol = item.column_values.find(col => col.id === 'lead_phone');
      
      const itemEmail = emailCol?.value ? JSON.parse(emailCol.value)?.email : '';
      const itemPhone = phoneCol?.value ? JSON.parse(phoneCol.value)?.phone : '';
      
      if (itemEmail === data.email || itemPhone === data.telefono) {
        existingItem = item;
        break;
      }
    }

    if (existingItem) {
      // 🔥 UPDATE INDIVIDUAL (FUNCIONA SIEMPRE)
      const updates = [
        { columnId: "lead_email", value: JSON.stringify({ "email": data.email, "text": data.email }) },
        { columnId: "lead_phone", value: JSON.stringify({ "phone": data.telefono, "text": data.telefono }) },
        { columnId: "text_mm12yqx0", value: JSON.stringify(data.codigo_postal || "") },
        { columnId: "lead_status", value: JSON.stringify({ "label": data.estado_lead || "Interesado-seguimiento" }) },
        { columnId: "dropdown_mksd92xa", value: JSON.stringify(data.tipologia_interes || "Sin definir") },
        { columnId: "dropdown_mm12gwz0", value: JSON.stringify(data.anejos || "Sin definir") },
        { columnId: "color_mm1274dx", value: JSON.stringify({ "label": data.presupuesto || "300K - 350K" }) }
      ];

      const updatePromises = updates.map(({ columnId, value }) =>
        fetch(MONDAY_API_URL, {
          method: 'POST',
          headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
                change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
              }
            `,
            variables: { boardId: BOARD_ID, itemId: existingItem.id, columnId, value }
          })
        })
      );

      await Promise.all(updatePromises);
      
      return res.json({ 
        success: true, 
        action: "UPDATED", 
        itemId: existingItem.id,
        updated: updates.length 
      });

    } else {
      // CREATE (tu código anterior que funciona)
      // ... código create_item igual
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
