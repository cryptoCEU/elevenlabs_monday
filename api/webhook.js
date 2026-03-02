export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST' });
  }

  const MONDAY_API_URL = "https://api.monday.com/v2";
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const BOARD_ID = "5092570807";

  try {
    const data = req.body;

    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: { 
        'Authorization': MONDAY_API_KEY, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        query: `
          mutation ($boardId: Int!, $groupId: ID!, $itemName: String!) {
            create_item(
              board_id: $boardId,
              group_id: $groupId,
              item_name: $itemName
            ) { 
              id 
            }
          }
        `,
        variables: { 
          boardId: 5092570807, 
          groupId: "topics",
          itemName: data.nombre 
        }
      })
    });

    const RAW_RESPONSE = await response.json();

    // VERIFICAR inmediatamente
    let verifyItem = null;
    if (RAW_RESPONSE.data?.create_item?.id) {
      const verifyRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: { 'Authorization': MONDAY_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ($itemId: Int!) {
              items(ids: [$itemId]) {
                id
                name
                group { id title }
              }
            }
          `,
          variables: { itemId: parseInt(RAW_RESPONSE.data.create_item.id) }
        })
      });
      verifyItem = await verifyRes.json();
    }

    return res.json({ 
      webhookStatus: "OK",
      httpStatus: response.status,
      rawMondayResponse: RAW_RESPONSE,
      itemCreated: !!RAW_RESPONSE.data?.create_item?.id,
      itemId: RAW_RESPONSE.data?.create_item?.id,
      verification: verifyItem?.data?.items?.[0],
      debug: "Revisa grupo 'Listado nuevos' - F5 x3"
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
