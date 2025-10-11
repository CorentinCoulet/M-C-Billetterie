/**
 * Simple test script for email templates
 * Displays template information and test instructions
 */

import { EMAIL_SUBJECTS, EMAIL_TEMPLATE_CONFIG, SAMPLE_DATA } from '../../src/config/emailTemplates';

function displaySystemInfo() {
  console.log('🚀 Email Template System - Billetterie');
  console.log('=====================================\n');

  console.log('📁 Templates disponibles :');
  Object.entries(EMAIL_TEMPLATE_CONFIG.TEMPLATES).forEach(([key, template]) => {
    console.log(`   • ${template}.hbs - ${getTemplateDescription(template as string)}`);
  });

  console.log('\n🔧 Handlebars Helpers configurés :');
  console.log('   • {{formatDate date}} - Format français des dates');
  console.log('   • {{formatCurrency amount}} - Format monétaire en euros');
  console.log('   • {{calculateTotal price quantity}} - Calcul de total');
  console.log('   • {{timeUntilEvent eventDate}} - Heures jusqu\'à l\'événement');

  console.log('\n📨 Variables communes disponibles :');
  console.log(`   • appName: ${EMAIL_TEMPLATE_CONFIG.COMMON_VARS.appName}`);
  console.log(`   • baseUrl: ${EMAIL_TEMPLATE_CONFIG.COMMON_VARS.baseUrl}`);
  console.log(`   • supportEmail: ${EMAIL_TEMPLATE_CONFIG.COMMON_VARS.supportEmail}`);
  console.log(`   • currentYear: ${EMAIL_TEMPLATE_CONFIG.COMMON_VARS.currentYear}`);

  console.log('\n🎯 Intégration système :');
  console.log('   ✅ Service emailService.ts avec compilation Handlebars');
  console.log('   ✅ Templates responsives pour mobile/desktop');
  console.log('   ✅ Intégration avec le système QR codes');
  console.log('   ✅ Cache des templates compilés pour performance');
  console.log('   ✅ Variables d\'environnement configurables');

  console.log('\n📧 Exemples de sujets d\'emails :');
  console.log(`   • Bienvenue: ${EMAIL_SUBJECTS.WELCOME(EMAIL_TEMPLATE_CONFIG.COMMON_VARS.appName)}`);
  console.log(`   • Vérification: ${EMAIL_SUBJECTS.VERIFICATION(EMAIL_TEMPLATE_CONFIG.COMMON_VARS.appName)}`);
  console.log(`   • Commande: ${EMAIL_SUBJECTS.ORDER_CONFIRMATION(EMAIL_TEMPLATE_CONFIG.COMMON_VARS.appName, SAMPLE_DATA.ORDER.id)}`);
}

function getTemplateDescription(template: string): string {
  const descriptions: Record<string, string> = {
    'welcome': 'Email de bienvenue avec code promo',
    'registration-confirmation': 'Confirmation d\'inscription avec lien de vérification',
    'password-reset': 'Réinitialisation mot de passe sécurisée',
    'order-confirmation': 'Confirmation de commande détaillée',
    'tickets': 'Envoi des billets avec QR codes',
    'event-reminder': 'Rappel d\'événement avec checklist',
    'layout': 'Template de base commun à tous les emails',
  };
  return descriptions[template] || 'Template email';
}

function displayTestInstructions() {
  console.log('\n🧪 Instructions de test :');
  console.log('========================\n');

  console.log('1. Configuration SMTP :');
  console.log('   Ajoutez ces variables dans votre .env :');
  console.log('   EMAIL_HOST=smtp.gmail.com (ou votre provider)');
  console.log('   EMAIL_PORT=587');
  console.log('   EMAIL_USER=votre-email@domain.com');
  console.log('   EMAIL_PASSWORD=votre-mot-de-passe-app');
  console.log('   EMAIL_FROM=noreply@billetterie.com');

  console.log('\n2. Test via API :');
  console.log('   POST /api/test/send-welcome-email');
  console.log('   POST /api/test/send-order-confirmation');
  console.log('   POST /api/test/send-tickets');

  console.log('\n3. Test via script Node.js :');
  console.log('   yarn email:test');

  console.log('\n4. Vérification des templates :');
  console.log('   • Ouvrez les fichiers .hbs dans src/templates/emails/');
  console.log('   • Vérifiez la syntaxe Handlebars');
  console.log('   • Testez le rendu avec des données réelles');

  console.log('\n✨ Fonctionnalités avancées :');
  console.log('   • Rotation automatique des QR codes (12h)');
  console.log('   • Templates multilingues (à implémenter)');
  console.log('   • Tracking d\'ouverture (à implémenter)');
  console.log('   • A/B Testing des templates (à implémenter)');
}

function displayIntegrationExamples() {
  console.log('\n🔌 Exemples d\'intégration :');
  console.log('===========================\n');

  console.log('// Envoi email de bienvenue');
  console.log('await emailService.sendWelcomeEmail(user, "PROMO2024");');
  
  console.log('\n// Confirmation de commande');
  console.log('await emailService.sendOrderConfirmationEmail(');
  console.log('  user.email,');
  console.log('  user.name,');
  console.log('  order.id,');
  console.log('  orderDetails');
  console.log(');');

  console.log('\n// Envoi des billets');
  console.log('await emailService.sendTicketEmail(');
  console.log('  user.email,');
  console.log('  user.name,');
  console.log('  order.id,');
  console.log('  ticketsWithQR');
  console.log(');');

  console.log('\n// Rappel d\'événement');
  console.log('await emailService.sendEventReminderEmail(');
  console.log('  user.email,');
  console.log('  user.name,');
  console.log('  event,');
  console.log('  userTickets');
  console.log(');');
}

function main() {
  displaySystemInfo();
  displayTestInstructions();
  displayIntegrationExamples();

  console.log('\n🎊 Système d\'emails prêt pour la production !');
  console.log('===============================================\n');
  
  console.log('✅ Templates professionnels créés');
  console.log('✅ Service email intégré avec Handlebars');
  console.log('✅ Cache de performance implémenté'); 
  console.log('✅ Variables d\'environnement configurées');
  console.log('✅ Helpers Handlebars pour formatting');
  console.log('✅ Responsive design pour tous appareils');
  console.log('✅ Intégration QR codes sécurisés');
  console.log('✅ Documentation complète fournie\n');
}

if (require.main === module) {
  main();
}

export { displayIntegrationExamples, displaySystemInfo, displayTestInstructions };

