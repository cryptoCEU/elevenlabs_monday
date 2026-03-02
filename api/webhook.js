export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;

    // 1. CREAR ITEM (igual)
    const columnValues = JSON.stringify({
      "lead_email": { "email": data.email || "", "text": data.email || "" },
      "lead_phone": { "phone": data.telefono || "", "text": data.telefono || "" },
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
      "date_mksbjga2": new Date().toISOString().split('T')[0],
      "name": data.nombre || "Nuevo Lead"
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
          itemName: data.nombre || "Nuevo Lead",
          columnValues 
        }
      })
    });

    const createData = await createRes.json();
    const itemId = createData.data?.create_item?.id;

    if (!itemId) {
      return res.status(500).json({ error: 'Error creando item', details: createData.errors });
    }

    // 2. RESUMEN LLAMADA → create_timeline_item_ea
    if (data.resumen_llamada) {
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // -30min
      const end = now.toISOString(); // Ahora

      await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': MONDAY_API_KEY, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          query: `
            mutation ($boardId: ID!, $itemId: ID!, $timeline_item_ea: TimelineItemEaCreateInput!) {
              create_timeline_item_ea(
                board_id: $boardId,
                item_id: $itemId,
                timeline_item_ea: $timeline_item_ea
              ) {
                id
              }
            }
          `,
          variables: { 
            boardId: BOARD_ID,
            itemId,
            timeline_item_ea: {
              start_datetime: start,
              end_datetime: end,
              content: `📞 **RESUMEN LLAMADA**:\n${data.resumen_llamada}`,
              type_id: 1099173150  // ID genérico "Llamada" - CAMBIA por el tuyo
            }
          }
        })
      });
    }

    return res.json({ 
      success: true,
      itemId,
      nombre: data.nombre,
      estado: data.estado_lead,
      timeline: data.resumen_llamada ? '✅ Creado' : '❌ Vacío'
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
