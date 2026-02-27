const wa = require('../services/whatsapp');

const FAQS = [
  {
    id: 'faq_financing',
    title: '💳 Financiamiento',
    description: '¿Cómo son los planes de pago?',
    answer: `💳 *Financiamiento*\n\nOfrecemos planes de financiamiento de 12 a 60 cuotas con tasa fija.\n\n📋 *Requisitos:*\n• DNI\n• Último recibo de sueldo\n• Servicio a tu nombre\n• Antigüedad laboral mínima de 6 meses\n\n💡 Podés hacer una *cotización personalizada* desde el menú principal.\n\n_Escribí *menu* para volver._`
  },
  {
    id: 'faq_test_drive',
    title: '🏎️ Test Drive',
    description: '¿Cómo agendo un test drive?',
    answer: `🏎️ *Test Drive*\n\nPodés agendar un test drive sin costo ni compromiso.\n\n📋 *Requisitos:*\n• Registro de conducir vigente\n• DNI\n• Ser mayor de 21 años\n\n⏱️ Duración aproximada: 20-30 minutos.\n\n📅 Agendá tu test drive desde el menú principal.\n\n_Escribí *menu* para volver._`
  },
  {
    id: 'faq_warranty',
    title: '🛡️ Garantía',
    description: '¿Qué cobertura tiene la garantía?',
    answer: `🛡️ *Garantía de Fábrica*\n\nTodos nuestros vehículos 0km incluyen garantía de fábrica.\n\n📋 *Cobertura:*\n• 3 años o 100.000 km (lo que ocurra primero)\n• Cubre defectos de fabricación\n• Service de mantenimiento a cargo del cliente\n• Red de concesionarios oficiales en todo el país\n\n_Escribí *menu* para volver._`
  },
  {
    id: 'faq_trade_in',
    title: '🔄 Tomo tu usado',
    description: '¿Puedo entregar mi auto como parte de pago?',
    answer: `🔄 *Tomamos tu usado*\n\nSí, aceptamos tu vehículo usado como parte de pago.\n\n📋 *Proceso:*\n1. Acercate con tu vehículo al salón\n2. Nuestros peritos lo evalúan sin cargo\n3. Te damos una tasación en el momento\n4. Si aceptás, se descuenta del valor del 0km\n\n📅 Agendá una visita desde el menú principal.\n\n_Escribí *menu* para volver._`
  },
  {
    id: 'faq_delivery',
    title: '🚚 Entrega',
    description: '¿Cuánto tarda la entrega?',
    answer: `🚚 *Tiempos de Entrega*\n\n• *Stock disponible:* Entrega inmediata (1-3 días hábiles)\n• *Sobre pedido:* 30-90 días dependiendo del modelo\n• *Importados:* Consultar plazos específicos\n\n📦 Hacemos entrega a domicilio en todo el país (costo adicional).\n\n_Escribí *menu* para volver._`
  }
];

async function showQuestions(phone) {
  const rows = FAQS.map(faq => ({
    id: faq.id,
    title: faq.title,
    description: faq.description
  }));

  await wa.sendList(
    phone,
    '¿Sobre qué tema tenés dudas?\n\nSeleccioná una pregunta:',
    'Ver preguntas',
    [{ title: 'Preguntas frecuentes', rows }],
    '❓ Preguntas Frecuentes'
  );
}

async function handle(context) {
  const { phone, text, state, updateUserState } = context;

  const faq = FAQS.find(f => f.id === text);
  if (faq) {
    await wa.sendText(phone, faq.answer);
    // Mantener en FAQ para que pueda elegir otra pregunta
    updateUserState(phone, 'faq', 'show_questions', {});
    await wa.sendButtons(
      phone,
      '¿Tenés otra consulta?',
      [
        { id: 'back_faq', title: '❓ Más preguntas' },
        { id: 'menu', title: '🏠 Menú principal' }
      ]
    );
  } else if (text === 'back_faq') {
    await showQuestions(phone);
  } else {
    await showQuestions(phone);
  }
}

module.exports = { showQuestions, handle };
