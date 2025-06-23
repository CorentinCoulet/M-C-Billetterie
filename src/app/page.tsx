import { Button } from '../components/ui/core/Button';
import { Card } from '../components/ui/core/Card';
import { Image } from '../components/ui/core/Image';
import { Container } from '../components/ui/layout/Container';
import { Grid } from '../components/ui/layout/Grid';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-500 to-primary-700 text-white py-16">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                M&C Society - Billetterie
              </h1>
              <p className="text-xl mb-6">
                Découvrez et réservez vos billets pour les meilleurs événements culturels et musicaux.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant="secondary" 
                  size="lg"
                  className="font-semibold"
                >
                  Voir les événements
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-white/10 backdrop-blur-sm border-white/20 font-semibold"
                >
                  En savoir plus
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="w-64 h-64 md:w-80 md:h-80 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center p-4">
                <Image 
                  src="/logoBilletterieV1.JPG" 
                  alt="M&C Society Logo" 
                  width={300} 
                  height={300}
                  className="rounded-full"
                  fallback={
                    <div className="flex items-center justify-center w-full h-full bg-primary-600 rounded-full">
                      <span className="text-3xl font-bold">M&C</span>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Events Section */}
      <section className="py-16 bg-gray-50">
        <Container>
          <h2 className="text-3xl font-bold mb-8 text-center">Événements à venir</h2>
          <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {[1, 2, 3].map((item) => (
              <Card key={item} className="h-full">
                <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-secondary-100 text-secondary-500">
                    <span className="text-lg font-medium">Image de l'événement</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold">Événement {item}</h3>
                    <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      Catégorie
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      <div>Date: 01/07/2025</div>
                      <div>Lieu: Paris</div>
                    </div>
                    <Button variant="primary" size="sm">Réserver</Button>
                  </div>
                </div>
              </Card>
            ))}
          </Grid>
          <div className="mt-10 text-center">
            <Button variant="outline" size="lg">Voir tous les événements</Button>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <Container>
          <h2 className="text-3xl font-bold mb-12 text-center">Pourquoi choisir notre billetterie ?</h2>
          <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={8}>
            {[
              {
                title: "Réservation facile",
                description: "Réservez vos billets en quelques clics, sans tracas et sans file d'attente.",
                icon: "🎫"
              },
              {
                title: "Événements exclusifs",
                description: "Accédez à des événements exclusifs et des offres spéciales réservées à nos membres.",
                icon: "✨"
              },
              {
                title: "Support client",
                description: "Notre équipe est disponible pour vous aider à tout moment en cas de besoin.",
                icon: "🤝"
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center p-6 h-full">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </Grid>
        </Container>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-secondary-50">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Restez informé</h2>
            <p className="text-lg text-gray-600 mb-8">
              Inscrivez-vous à notre newsletter pour recevoir les dernières actualités et offres spéciales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-0 flex-1 max-w-md"
              />
              <Button variant="primary" size="lg">S'inscrire</Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">M&C Society</h3>
              <p className="text-gray-400">
                Votre plateforme de billetterie en ligne pour tous vos événements culturels et musicaux.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Liens rapides</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Accueil</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Événements</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Email: contact@mcsociety.fr</li>
                <li>Téléphone: +33 1 23 45 67 89</li>
                <li>Adresse: 123 Rue de Paris, 75000 Paris</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} M&C Society. Tous droits réservés.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
