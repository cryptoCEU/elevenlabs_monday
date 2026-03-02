export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;

    // ✅ TODOS los formatos correctos Monday.com API
    const columnValues = JSON.stringify({
      // 📧 EMAIL ✓
      "lead_email": {
        "email": data.email || "",
        "text": data.email || ""
      },
      
      // 📱 PHONE ✓
      "lead_phone": {
        "phone": data.telefono || "",
        "text": data.telefono || ""
      },
      
      // 📝 TEXT ✓
      "text_mm12yqx0": data.codigo_postal || "",
      
      // ✅ STATUS ✓
      "lead_status": { "label": data.estado_lead || "Interesado-seguimiento" },
      
      // ✅ DROPDOWNS ✓
      "dropdown_mksd92xa": data.tipologia_interes || "Sin definir",
      "dropdown_mksdgtr8": data.detalle_vivienda || "Sin definir",
      "dropdown_mm12gwz0": data.anejos || "Sin definir",
      "dropdown_mksdhhgc": data.motivo_no_interes || "No sabe/no contesta",
      
      // ✅ STATUS COLORS ✓
      "color_mm0ee37e": { "label": data.destino_vivienda || "Primera vivienda" },
      "color_mksg46wh": { "label": data.rango_edad || "31 - 45" },
      "color_mm1274dx": { "label": data.presupuesto || "300K - 350K" },
      "color_mks9ct6h": { "label": data.origen_contacto || "Google Ads" },
      
      // ✅ CHECKBOX - FORMATO CORRECTO
      "boolean_mkvw55qp": { "checked": true },
      
      // ✅ DATE - Solo YYYY-MM-DD
      "date_mksbjga2": "2026-03-02",
      
      // ✅ NOMBRE
      "name": data.nombre || "Nuevo Lead"
    });

    const createRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: { 
        'Authorization': MONDAY_API_KEY, 
        'Content-Type': 'application/json' 
      },
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
          itemName: `${data.nombre || 'Lead'} - ${data.estado_lead || 'Nuevo'}`,
          columnValues 
        }
      })
    });

    const createData = await createRes.json();
    
    if (!createData.data?.create_item?.id) {
      return res.status(500).json({ 
        error: 'Monday API Error', 
        details: createData.errors 
      });
    }

    return res.json({ 
      success: true,
      itemId: createData.data.create_item.id,
      lead: data.nombre,
      estado: data.estado_lead
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
