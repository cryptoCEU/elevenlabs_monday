export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;

    const columnValues = JSON.stringify({
      // 📧 EMAIL
      "lead_email": {
        "email": data.email || "",
        "text": data.email || ""
      },
      
      // 📱 PHONE
      "lead_phone": {
        "phone": data.telefono || "",
        "text": data.telefono || ""
      },
      
      // 📝 TEXTOS
      "text_mm12yqx0": data.codigo_postal || "",
      
      // ✅ ESTADO LEAD
      "lead_status": { 
        "label": data.estado_lead || "Interesado-seguimiento" 
      },
      
      // ✅ DROPDOWNS (todos los enums)
      "dropdown_mksd92xa": data.tipologia_interes || "Sin definir",
      "dropdown_mksdgtr8": data.detalle_vivienda || "Sin definir",
      "dropdown_mm12gwz0": data.anejos || "Sin definir",
      "dropdown_mksdhhgc": data.motivo_no_interes || "No sabe/no contesta",
      
      // ✅ STATUS COLORS (todos los enums)
      "color_mm0ee37e": { 
        "label": data.destino_vivienda || "Primera vivienda" 
      },
      "color_mksg46wh": { 
        "label": data.rango_edad || "31 - 45" 
      },
      "color_mm1274dx": { 
        "label": data.presupuesto || "300K - 350K" 
      },
      "color_mks9ct6h": { 
        "label": data.origen_contacto || "Google Ads" 
      },
      
      // ✅ CHECKBOX Y FECHA
      "boolean_mkvw55qp": { "checked": true },
      "date_mksbjga2": new Date().toISOString().split('T')[0],
      
      // ✅ NOMBRE (solo nombre)
      "name": data.nombre || "Nuevo Lead"
    });

    // 🚀 1. CREAR ITEM
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
          itemName: data.nombre || "Nuevo Lead",
          columnValues 
        }
      })
    });

    const createData = await createRes.json();
    const itemId = createData.data?.create_item?.id;

    if (!itemId) {
      return res.status(500).json({ 
        error: 'Error creando item', 
        details: createData.errors 
      });
    }

    // 📝 2. RESUMEN LLAMADA → "Emails y actividades"
    if (data.resumen_llamada) {
      await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': MONDAY_API_KEY, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          query: `
            mutation ($itemId: ID!, $body: String!) {
              create_update(
                item_id: $itemId, 
                body: $body
              ) {
                id
              }
            }
          `,
          variables: { 
            itemId,
            body: `📞 **RESUMEN LLAMADA** (${new Date().toLocaleString('es-ES')}):\n\n${data.resumen_llamada}`
          }
        })
      });
    }

    return res.json({ 
      success: true,
      itemId,
      nombre: data.nombre,
      estado: data.estado_lead,
      campos: 15,
      resumen: data.resumen_llamada ? '✅ Actividades' : '❌ Vacío'
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
