export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;
    console.log('📥 Datos recibidos:', JSON.stringify(data, null, 2));
    
    // 🔍 1. BUSCAR (con try-catch específico)
    console.log('🔍 Buscando ítems existentes...');
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
              items_page(limit: 500) {
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

    const searchText = await searchRes.text();
    console.log('🔍 Search RAW response:', searchText.substring(0, 500));
    
    const searchData = JSON.parse(searchText);
    
    if (!searchData.data?.boards?.[0]?.items_page) {
      return res.status(500).json({ 
        error: 'Monday Search Error', 
        response: searchData,
        boardId: BOARD_ID 
      });
    }

    const items = searchData.data.boards[0].items_page.items;
    console.log(`🔍 Encontrados ${items.length} ítems`);
    
    // 🎯 BUSCAR MATCH
    let existingItem = null;
    for (const item of items.slice(0, 10)) { // Solo debug primeros 10
      const emailCol = item.column_values.find(col => col.id === 'lead_email');
      const phoneCol = item.column_values.find(col => col.id === 'lead_phone');
      
      let itemEmail = '';
      let itemPhone = '';
      
      try {
        itemEmail = emailCol?.value ? JSON.parse(emailCol.value)?.email || '' : '';
        itemPhone = phoneCol?.value ? JSON.parse(phoneCol.value)?.phone || '' : '';
      } catch(e) {
        console.log(`⚠️ Parse error item ${item.id}:`, e.message);
      }
      
      console.log(`📧 Item ${item.id}: "${itemEmail}" | "${itemPhone}"`);
      console.log(`🎯 Query:    "${data.email}" | "${data.telefono}"`);
      
      if (itemEmail === data.email || itemPhone === data.telefono) {
        existingItem = item;
        console.log(`✅ ✅ MATCH! Item ${item.id}`);
        break;
      }
    }

    // ... resto del código igual (columnValues, update/create)
    const columnValues = JSON.stringify({
      "lead_email": { "email": data.email, "text": data.email },
      "lead_phone": { "phone": data.telefono, "text": data.telefono },
      "text_mm12yqx0": data.codigo_postal || "",
      "lead_status": { "label": data.estado_lead || "Interesado-seguimiento" },
      "boolean_mkvw55qp": { "checked": true },
      "date_mksbjga2": new Date().toISOString().split('T')[0],
      "name": data.nombre || "Nuevo Lead"
    });

    if (existingItem) {
      // UPDATE
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
          variables: { itemId: existingItem.id, columnValues }
        })
      });
      
      return res.json({ 
        success: true, 
        action: "UPDATED",
        itemId: existingItem.id
      });
      
    } else {
      // CREATE
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
              ) { id }
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
      
      const createData = await createRes.json();
      return res.json({ 
        success: true, 
        action: "CREATED", 
        itemId: createData.data.create_item.id
      });
    }

  } catch (error) {
    console.error('❌ ERROR TOTAL:', error);
    return res.status(500).json({ 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
  }
}
