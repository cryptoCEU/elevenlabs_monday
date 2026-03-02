import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const MONDAY_API_URL = "https://api.monday.com/v2";
const MONDAY_API_KEY = process.env.MONDAY_API_KEY; // lo guardarás en Vercel
const BOARD_ID = process.env.MONDAY_BOARD_ID; // id del board donde creas items

app.post("/api/webhook", async (req, res) => {
  try {
    const data = req.body;
    const email = data.email;

    // 1️⃣ Buscar si ya existe un item con ese email
    const query = `
      query ($boardId: Int!, $columnId: String!, $value: String!) {
        items_page_by_column_values (
          board_id: $boardId,
          column_id: $columnId,
          column_value: $value,
          limit: 1
        ) {
          items {
            id
          }
        }
      }`;

    const variables = {
      boardId: parseInt(BOARD_ID),
      columnId: "email", // nombre de columna de email en Monday
      value: email,
    };

    const searchRes = await axios.post(
      MONDAY_API_URL,
      { query, variables },
      { headers: { Authorization: MONDAY_API_KEY } }
    );

    const items = searchRes.data.data.items_page_by_column_values.items;

    if (items.length > 0) {
      // 2️⃣ Si existe, actualiza
      const itemId = items[0].id;
      const mutation = `
        mutation ($itemId: Int!, $columnValues: JSON!) {
          change_multiple_column_values(item_id: $itemId, board_id: ${BOARD_ID}, column_values: $columnValues) {
            id
          }
        }
      `;

      const columnValues = JSON.stringify({
        nombre: data.nombre,
        telefono: data.telefono,
        resumen_llamada: data.resumen_llamada,
        estado_lead: data.estado_lead,
      });

      await axios.post(
        MONDAY_API_URL,
        { query: mutation, variables: { itemId: parseInt(itemId), columnValues } },
        { headers: { Authorization: MONDAY_API_KEY } }
      );

      res.json({ status: "updated", itemId });
    } else {
      // 3️⃣ Si no existe, crea un nuevo item
      const mutation = `
        mutation ($boardId: Int!, $itemName: String!, $columnValues: JSON!) {
          create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
            id
          }
        }`;

      const columnValues = JSON.stringify({
        email: data.email,
        telefono: data.telefono,
        resumen_llamada: data.resumen_llamada,
        estado_lead: data.estado_lead,
      });

      const createRes = await axios.post(
        MONDAY_API_URL,
        { query: mutation, variables: { boardId: parseInt(BOARD_ID), itemName: data.nombre, columnValues } },
        { headers: { Authorization: MONDAY_API_KEY } }
      );

      res.json({ status: "created", itemId: createRes.data.data.create_item.id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// puerto local para Postman
app.listen(3000, () => console.log("🚀 Running on http://localhost:3000/api/webhook"));
