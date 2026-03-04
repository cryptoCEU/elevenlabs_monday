export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permite POST' });
  }

  // ✅ Autenticación por API key
  const apiKey = process.env.WEBHOOK_API_KEY;
  if (apiKey) {
    const provided = req.headers["authorization"]?.replace("Bearer ", "").trim();
    if (provided !== apiKey)
      return res.status(401).json({ error: "Unauthorized" });
  }

  const MONDAY_API_URL   = "https://api.monday.com/v2";
  const MONDAY_API_TOKEN = process.env.MONDAY_API_KEY;
  const BOARD_ID         = process.env.MONDAY_BOARD_ID;

  if (!MONDAY_API_TOKEN) return res.status(500).json({ error: "MONDAY_API_KEY no configurado" });
  if (!BOARD_ID)         return res.status(500).json({ error: "MONDAY_BOARD_ID no configurado" });

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const now = new Date();

    // 🧩 Construir columnas solo con los campos que vienen rellenos
    const columnValuesObj = {};

    // 📧 Contacto
    if (data.email)         columnValuesObj["lead_email"]      = { email: data.email, text: data.email };
    if (data.telefono)      columnValuesObj["lead_phone"]      = { phone: data.telefono, text: data.telefono };
    if (data.codigo_postal) columnValuesObj["text_mm12yqx0"]  = data.codigo_postal;

    // 📊 Estado y origen
    if (data.estado_lead)     columnValuesObj["lead_status"]    = { label: data.estado_lead };
    if (data.origen_contacto) columnValuesObj["color_mks9ct6h"] = { label: data.origen_contacto };

    // 🤖 Tipo de gestión — siempre "IA" cuando viene de ElevenLabs
    columnValuesObj["color_mks7cm2f"] = { label: "IA" };

    // 🏠 Preferencias vivienda
    if (data.tipologia_interes) columnValuesObj["dropdown_mksd92xa"] = data.tipologia_interes;
    if (data.detalle_vivienda)  columnValuesObj["dropdown_mksdgtr8"] = data.detalle_vivienda;
    if (data.anejos)            columnValuesObj["dropdown_mm12gwz0"] = data.anejos;
    if (data.destino_vivienda)  columnValuesObj["color_mm0ee37e"]    = { label: data.destino_vivienda };

    // 🚫 Motivo no interés
    if (data.motivo_no_interes) columnValuesObj["dropdown_mksdhhgc"] = data.motivo_no_interes;

    // 👤 Perfil lead
    if (data.rango_edad)  columnValuesObj["color_mksg46wh"] = { label: data.rango_edad };
    if (data.presupuesto) columnValuesObj["color_mm1274dx"] = { label: data.presupuesto };

    // 🌍 Idioma — tal cual lo manda ElevenLabs
    if (data.Idioma) columnValuesObj["dropdown_mm131mxd"] = data.Idioma;

    // ✅ Política de privacidad — siempre true
    columnValuesObj["boolean_mkvw55qp"] = { checked: true };

    // 📅 Fecha de entrada — siempre se registra
    columnValuesObj["date_mksbjga2"] = {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0]
    };

    // 📅 Fecha y hora visita — solo si existe
    if (data.datetime_visita_agendada) {
      columnValuesObj["date_mks930kf"] = {
        date: data.datetime_visita_agendada.split('T')[0],
        time: data.datetime_visita_agendada.split('T')[1]?.slice(0, 8) ?? "00:00:00"
      };
    }

    const columnValues = JSON.stringify(columnValuesObj);

    // 1️⃣ Crear el item en Monday
    const createRes = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MONDAY_API_TOKEN}`,
        'Content-Type': 'application/json',
        'API-Version': '2024-01'
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
              name
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
    console.log("🧩 Respuesta Monday create_item:", JSON.stringify(createData, null, 2));

    const itemId = createData?.data?.create_item?.id;
    if (!itemId) {
      console.error("❌ No se obtuvo itemId del create_item", createData.errors);
      return res.status(500).json({ error: 'Item no creado', details: createData.errors });
    }
    console.log("✅ Item creado con ID:", itemId);

    // 2️⃣ Crear timeline si hay resumen
    if (data.resumen_llamada) {
      const timelineRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MONDAY_API_TOKEN}`,
          'Content-Type': 'application/json',
          'API-Version': '2024-01'
        },
        body: JSON.stringify({
          query: `
            mutation ($itemId: ID!, $custom_activity_id: String!, $title: String!, $content: String!, $timestamp: ISO8601DateTime!) {
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
            title: "Resumen llamada IA",
            content: data.resumen_llamada,
            timestamp: now.toISOString()
          }
        })
      });

      const timelineData = await timelineRes.json();
      console.log("📬 Respuesta Monday create_timeline_item:", JSON.stringify(timelineData, null, 2));

      if (timelineData.errors) {
        console.error('⚠️ Error creando timeline:', timelineData.errors);
      }
    }

    // 3️⃣ Respuesta del webhook
    return res.status(200).json({
      success: true,
      itemId,
      nombre: data.nombre || null,
      estado: data.estado_lead || null,
      idioma: data.Idioma || null,
      fecha_visita: data.datetime_visita_agendada || null,
      timeline: data.resumen_llamada ? '✅ Creado en actividades' : '❌ Sin resumen'
    });

  } catch (error) {
    console.error('💥 Error general del webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
