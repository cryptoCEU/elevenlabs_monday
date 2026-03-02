export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;

    // ✅ FORMATO CORRECTO Monday.com API (email/phone/status)
    const columnValues = JSON.stringify({
      // 📧 EMAIL - Formato OBLIGATORIO
      "lead_email": {
        "email": data.email || "",
        "text": data.email || ""
      },
      
      // 📱 PHONE - Formato OBLIGATORIO  
      "lead_phone": {
        "phone": data.telefono || "",
        "text": data.telefono || ""
      },
      
      // 📝 Text simple
      "text_mm12yqx0": data.codigo_postal || "",
      
      // ✅ Status (label exacto del enum)
      "lead_status": {
        "label": data.estado_lead || "Interesado-seguimiento"
      },
      
      // ✅ Dropdowns (label exacto)
      "dropdown_mksd92xa": data.tipologia_interes || "Sin definir",
      "dropdown_mksdgtr8": data.detalle_vivienda || "Sin definir",
      "dropdown_mm12gwz0": data.anejos || "Sin definir",
      "dropdown_mksdhhgc": data.motivo_no_interes || "No sabe/no contesta",
      
      // ✅ Status colors (labels de tus enums)
      "color_mm0ee37e": { "label": data.destino_vivienda || "Primera vivienda" },
      "color_mksg46wh": { "label": data.rango_edad || "31 - 45" },
      "color_mm1274dx": { "label": data.presupuesto || "150K - 200K" },
      "color_mks9ct6h": { "label": data.origen_contacto || "Formulario web" },
      
      // ✅ Automáticos
      "name": data.nombre || "Nuevo Lead",
      "date_mksbjga2": new Date().toISOString().split('T')[0], // YYYY-MM-DD
      "boolean_mkvw55qp": true // Política privacidad
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
              column_values: $columnValues,
              create_labels_if_missing: true
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
        details: createData.errors,
        debug: { columnValues } 
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
