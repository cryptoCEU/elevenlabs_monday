export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permite POST' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Construcción de los valores de columna
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

      // ✅ Nueva columna: fecha y hora de visita
      "date_mks930kf": data.datetime_visita_agendada
        ? { 
            "date": data.datetime_visita_agendada.split('T')[0], 
            "time": data.datetime_visita_agendada.split('T')[1] 
          }
        : null,

      "name": data.nombre || "Nuevo Lead"
    });

    // 1️⃣ Crear el ítem en Monday
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
    const itemId = createData?.data?.create_item?.id;

    if (!itemId) {
      console.error("Error creando Item en Monday:", createData);
      return res.status(500).json({ error: 'Error creando item', details: createData.errors });
    }

    // 2️⃣ Crear timeline (actividad personalizada)
    if (data.resumen_llamada) {
      const now = new Date().toISOString();

      // Si hay una fecha de visita, la añadimos al título
      const titleBase = "Resumen llamada IA";
      const title = data.datetime_visita_agendada
        ? `${titleBase} — visita ${new Date(data.datetime_visita_agendada).toLocaleString('es-ES', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
          })}`
        : titleBase;

      const timelineRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': MONDAY_API_KEY, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          query: `
            mutation ($itemId: ID!, $custom_activity_id: String!, $title: String!, $content: String!, $timestamp: String!) {
              create_timeline_item(
                item_id: $itemId,
                custom_activity_id: $custom_activity_id,
                title: $title,
                content: $content,
                timestamp: $timestamp
              ) {
                id
              }
            }
          `,
          variables: {
            itemId,
            custom_activity_id: "587c0c1e-a5b2-44cd-a268-48210c319855",
            title,
            content: data.resumen_llamada,
            timestamp: now
          }
        })
      });

      const timelineData = await timelineRes.json();
      if (timelineData.errors) console.error('Error creando timeline:', timelineData.errors);
    }

    // 3️⃣ Respuesta final al webhook
    return res.json({ 
      success: true,
      itemId,
      nombre: data.nombre,
      estado: data.estado_lead,
      fecha_visita: data.datetime_visita_agendada || null,
      timeline: data.resumen_llamada ? '✅ Creado en actividades' : '❌ Sin resumen'
    });

  } catch (error) {
    console.error('Error general del webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}

