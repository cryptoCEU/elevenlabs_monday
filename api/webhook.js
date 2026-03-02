export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permitido' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = process.env.MONDAY_BOARD_ID;

  try {
    const data = req.body;
    
    // 🔍 MOSTRAR TODO lo que pasa
    const response = {
      status: 'DIAGNÓSTICO',
      received: data,
      config: {
        apiKey_exists: !!MONDAY_API_KEY,
        boardId: BOARD_ID,
        boardId_parsed: parseInt(BOARD_ID || 0),
        email: data.email
      }
    };

    // 1️⃣ Probar conexión Monday
    if (MONDAY_API_KEY && BOARD_ID) {
      const testRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': MONDAY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `query { boards(ids: ${BOARD_ID}) { name } }`
        })
      });

      const testData = await testRes.json();
      response.monday_test = {
        ok: testRes.ok,
        status: testRes.status,
        board_exists: !!testData.data?.boards?.[0],
        board_name: testData.data?.boards?.[0]?.name,
        errors: testData.errors
      };
    }

    res.status(200).json(response);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

