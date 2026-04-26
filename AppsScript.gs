function doGet(e) {
  var action = e.parameter.action;

  if (action === 'informacoes') {
    return getProperties();
  }

  return ContentService.createTextOutput("Invalid action").setMimeType(ContentService.MimeType.TEXT);
}

function getProperties() {
  // Mock data for now, in a real scenario this would read from a Sheet
  var properties = [
    {
      "id": "1",
      "title": "Apartamento Moderno no Centro",
      "description": "Lindo apartamento com vista para a cidade, mobiliado e pronto para morar.",
      "type": "BUY",
      "price": 450000.0,
      "rooms": 2,
      "area": 75.0,
      "location": "Centro, Rio de Janeiro - RJ",
      "images": ["https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg"],
      "lat": -22.9068,
      "lng": -43.1729
    },
    {
      "id": "2",
      "title": "Casa de Campo Aconchegante",
      "description": "Casa espaçosa em condomínio fechado com piscina e churrasqueira.",
      "type": "RENT",
      "price": 3500.0,
      "rooms": 4,
      "area": 250.0,
      "location": "Teresópolis, RJ",
      "images": ["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg"],
      "lat": -22.4123,
      "lng": -42.9664
    },
    {
      "id": "3",
      "title": "Cobertura Luxuosa",
      "description": "Cobertura triplex com vista panorâmica para o Pão de Açúcar.",
      "type": "BUY",
      "price": 2500000.0,
      "rooms": 5,
      "area": 400.0,
      "location": "Botafogo, Rio de Janeiro - RJ",
      "images": ["https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg"],
      "lat": -22.9519,
      "lng": -43.1842
    }
  ];

  return ContentService.createTextOutput(JSON.stringify(properties))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    // In a real scenario, append to a Google Sheet
    // var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vendedores');
    // sheet.appendRow([new Date(), data.name, data.contact, data.propertyTitle, ...]);

    return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "Recebido com sucesso"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
