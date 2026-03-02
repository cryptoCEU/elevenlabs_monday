import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Config variables (defínelas en VERCEL)
const MONDAY_API_URL = "https://api.monday.com/v2";
const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const BOARD_ID = process.env.MONDAY_BOARD_ID;

// Ruta principal del webhook
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    console.log("📥 Datos recibidos:", data);

    const email = data.email;

    if (!email) {
      return res.status(400).json({ error: "Email es obligatorio" });
    }

    // 🔍 1. Buscar item existente por email
    const querySearch = `
      query ($boardId: Int!, $columnId: String!, $value: String!) {
        items_page_by_column_values (
          board_id: $boardId,
          column_id: $columnId,
          column_value: $value,
          limit: 1
        ) {
          items { id name }
        }
      }`;

    const variablesSearch = {
      boardId: parseInt(BOARD_ID),
      columnId: "email", // nombre técnico de la columna en Monday
      value: email
    };

    const searchRes = await axios.post(
      MONDAY_API_URL,
      { query: querySearch, variables: variablesSearch },
      {
        headers: {
          Authorization: MONDAY_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const items = searchRes.data.data.items_page_by_column_values.items;
    console.log("🔎 Resultado búsqueda:", items);

    const columnValues = JSON.stringify({
      nombre: data.nombre,
      telefono: data.telefono,
      codigo_postal: data.codigo_postal,
      destino_vivienda: data.destino_vivienda,
      tipologia_interes: data.tipologia_interes,
      detalle_vivienda: data.detalle_vivienda,
      presupuesto: data.presupuesto,
      rango_edad: data.rango_edad,
      origen_contacto: data.origen_contacto,
      resumen_llamada: data.resumen_llamada,
      motivo_no_interes: data.motivo_no_interes,
      anejos: data.anejos,
      estado_lead: data.estado_lead
    });

    if (items.length > 0) {
      // 📝 2. Si ya existe, actualizar
      const itemId = items[0].id;
      console.log(`♻️ Actualizando item existente: ${itemId}`);

      const mutationUpdate = `
        mutation ($itemId: Int!, $boardId: Int!, $columnValues: JSON!) {
          change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
            id
          }
        }`;

      await axios.post(
        MONDAY_API_URL,
        {
          query: mutationUpdate,
          variables: {
            itemId: parseInt(itemId),
            boardId: parseInt(BOARD_ID),
            columnValues
          }
        },
        {
          headers: {
            Authorization: MONDAY_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      return res.json({ status: "updated", itemId });
    } else {
      // ➕ 3. Si no existe, crear nuevo
      console.log("✨ Creando nuevo item...");

      const mutationCreate = `
        mutation ($boardId: Int!, $itemName: String!, $columnValues: JSON!) {
          create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
            id
          }
        }`;

      const createRes = await axios.post(
        MONDAY_API_URL,
        {
          query: mutationCreate,
          variables: {
            boardId: parseInt(BOARD_ID),
            itemName: data.nombre || "Nuevo Lead",
            columnValues
          }
        },
        {
          headers: {
            Authorization: MONDAY_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      const itemId = createRes.data.data.create_item.id;
      console.log(`✅ Item creado (ID: ${itemId})`);

      return res.json({ status: "created", itemId });
    }
  } catch (error) {
    console.error("❌ Error en webhook:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Error procesando el webhook",
      details: error.response?.data || error.message
    });
  }
});

// Exportar app para Vercel
export default app;
