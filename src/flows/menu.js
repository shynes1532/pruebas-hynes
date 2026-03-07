const wa = require('../services/whatsapp');

const DEALER = {
  name: process.env.DEALER_NAME || 'Nuestro Concesionario',
  phone: process.env.DEALER_PHONE || '',
  address: process.env.DEALER_ADDRESS || '',
  hours: process.env.DEALER_HOURS || ''
};

async function showMainMenu(phone, profileName) {
  const greeting = profileName ? `¡Hola ${profileName}! 👋` : '¡Hola! 👋';

  await wa.sendList(
    phone,
    `${greeting}\n\nBienvenido a *${DEALER.name}*.\n\n¿En qué podemos ayudarte hoy?\n\nSeleccioná una opción:`,
    'Ver opciones',
    [{
      title: 'Servicios',
      rows: [
        { id: 'menu_catalog', title: '🚗 Ver Catálogo', description: 'Modelos FIAT 0km con precios' },
        { id: 'menu_savings', title: '🏦 Plan de Ahorro', description: 'Suscribite o consultá tu plan' },
        { id: 'menu_credit', title: '💳 Crédito Automotor', description: 'Solicitá financiación' },
        { id: 'menu_quote', title: '💰 Cotizar', description: 'Cotización personalizada' },
        { id: 'menu_appointment', title: '📅 Agendar Cita', description: 'Test drive o visita al salón' },
        { id: 'menu_faq', title: '❓ Preguntas', description: 'Consultas frecuentes' },
        { id: 'menu_contact', title: '📞 Contacto', description: 'Datos del concesionario' }
      ]
    }],
    DEALER.name
  );
}

async function showMoreOptions(phone) {
  await wa.sendButtons(
    phone,
    '¿Qué más podemos hacer por vos?',
    [
      { id: 'menu_savings', title: '🏦 Plan de Ahorro' },
      { id: 'menu_credit', title: '💳 Crédito' },
      { id: 'menu_contact', title: '📞 Contacto' }
    ]
  );
}

async function showContactInfo(phone) {
  let msg = `📍 *${DEALER.name}*\n\n`;
  if (DEALER.address) msg += `🏢 Dirección: ${DEALER.address}\n`;
  if (DEALER.phone) msg += `📞 Teléfono: ${DEALER.phone}\n`;
  if (DEALER.hours) msg += `🕐 Horarios: ${DEALER.hours}\n`;
  if (process.env.DEALER_WEBSITE) msg += `🌐 Web: ${process.env.DEALER_WEBSITE}\n`;
  msg += '\nEscribí *menu* para volver al menú principal.';

  await wa.sendText(phone, msg);
}

async function handle(context) {
  const { phone, inputLower, text, profileName, updateUserState } = context;

  switch (text) {
    case 'menu_catalog':
      updateUserState(phone, 'catalog', 'show_categories', {});
      const catalogFlow = require('./catalog');
      await catalogFlow.showCategories(phone);
      break;

    case 'menu_appointment':
      updateUserState(phone, 'appointment', 'ask_type', {});
      const appointmentFlow = require('./appointment');
      await appointmentFlow.askType(phone);
      break;

    case 'menu_savings':
      updateUserState(phone, 'savings', 'show_options', {});
      const savingsFlow = require('./savings');
      await savingsFlow.showSavingsOptions(phone);
      break;

    case 'menu_credit':
      updateUserState(phone, 'credit', 'ask_name', {});
      const creditFlow = require('./credit');
      await creditFlow.askPersonalName(phone);
      break;

    case 'menu_quote':
      updateUserState(phone, 'quote', 'ask_vehicle', {});
      const quoteFlow = require('./quote');
      await quoteFlow.askVehicle(phone);
      break;

    case 'menu_faq':
      updateUserState(phone, 'faq', 'show_questions', {});
      const faqFlow = require('./faq');
      await faqFlow.showQuestions(phone);
      break;

    case 'menu_contact':
      await showContactInfo(phone);
      break;

    case 'menu_more':
      await showMoreOptions(phone);
      break;

    default:
      // Si no matchea nada, mostrar menú
      await showMainMenu(phone, profileName);
      break;
  }
}

module.exports = { showMainMenu, showMoreOptions, showContactInfo, handle };
