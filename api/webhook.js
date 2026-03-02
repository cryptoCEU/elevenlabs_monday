export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;
    console.log('📥 Recibido:', Object.keys(data));

    const columnValues = JSON.stringify({
      // ✅ BÁSICOS (obligatorios)
      "lead_email": {
        "email": data.email || "",
        "text": data.email || ""
      },
      "lead_phone": {
        "phone": data.telefono || "",
        "text": data.telefono || ""
      },
      
      // ✅ TEXTOS
      "text_mm12yqx0": data.codigo_postal || "",
      
      // ✅ ESTADO LEAD (enum exacto)
      "lead_status": { 
        "label": data.estado_lead || "Interesado-seguimiento" 
      },
      
      // ✅ DROPDOWNS (todos los enums)
      "dropdown_mksd92xa": data.tipologia_interes || "Sin definir",     // Tipología
      "dropdown_mksdgtr8": data.detalle_vivienda || "Sin definir",     // Detalle vivienda
      "dropdown_mm12gwz0": data.anejos || "Sin definir",               // Anejos
      "dropdown_mksdhhgc": data.motivo_no_interes || "No sabe/no contesta",
      
      // ✅ STATUS COLORS (todos los enums)
      "color_mm0ee37e": { "label": data.destino_vivienda || "Primera vivienda" },
      "color_mksg46wh": { "label": data.rango_edad || "31 - 45" },
      "color_mm1274dx": { "label": data.presupuesto || "150K - 200K" },
      "color_mks9ct6h": { "label": data.origen_contacto || "Formulario web" },
      
      // ✅ CHECKBOX Y DATE
      "boolean_mkvw55qp": { "checked": true },
      "date_mksbjga2": new Date().toISOString().split('T')[0],
      
      // ✅ NOMBRE
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
          itemName: `${data.nombre || 'Lead'} - ${data.estado_lead || 'Nuevo'}`,
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

    // 📝 2. AGREGAR RESUMEN LLAMADA como actualización
    if (data.resumen_llamada) {
      await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': MONDAY_API_KEY, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          query: `
            mutation ($itemId: ID!, $text: String!) {
              create_update(
                item_id: $itemId, 
                text: $text
              ) {
                id
              }
            }
          `,
          variables: { 
            itemId,
            text: `📞 **RESUMEN LLAMADA** (${new Date().toLocaleString('es-ES')}):\n\n${data.resumen_llamada}`
          }
        })
      });
    }

    return res.json({ 
      success: true,
      itemId,
      nombre: data.nombre,
      estado: data.estado_lead,
      campos_mapeados: 15,
      resumen_agregado: !!data.resumen_llamada
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
