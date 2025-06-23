import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Image } from '../components/ui/core/Image';
import { Container } from '../components/ui/layout/Container';
import { Grid } from '../components/ui/layout/Grid';
import { Toolbar } from '../components/ui/layout/Toolbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <Toolbar />

      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22a%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23a)%22/%3E%3C/svg%3E')]"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-foreground/30 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent rounded-full filter blur-3xl opacity-10"></div>
        <Container className="relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary-foreground drop-shadow-sm">
                M&C Society - Billetterie
              </h1>
              <p className="text-xl mb-8 text-primary-foreground/80">
                Découvrez et réservez vos billets pour les meilleurs événements culturels et musicaux.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant="secondary" 
                  size="lg"
                  className="font-semibold shadow-md"
                >
                  Voir les événements
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                >
                  En savoir plus
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-primary-foreground/30 to-primary-foreground/10 backdrop-blur-sm rounded-full flex items-center justify-center p-4 shadow-xl">
                <Image 
                  src="/logoBilletterieV1.JPG" 
                  alt="M&C Society Logo" 
                  width={300} 
                  height={300}
                  className="rounded-full shadow-md"
                  fallback={
                    <div className="flex items-center justify-center w-full h-full bg-primary rounded-full">
                      <span className="text-3xl font-bold text-primary-foreground">M&C</span>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Events Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/50">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Événements à venir</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
          </div>
          <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={8}>
            {[1, 2, 3].map((item) => (
              <Card key={item} className="h-full overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative">
                  <div className="w-full h-full flex items-center justify-center text-primary">
                    <span className="text-lg font-medium">Image de l'événement</span>
                  </div>
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                    Nouveau
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold">Événement {item}</h3>
                    <span className="bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                      Catégorie
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-5">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-primary">📅</span> 01/07/2025
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-primary">📍</span> Paris
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-0">
                  <Button size="sm">
                    Réserver
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </Grid>
          <div className="mt-12 text-center">
            <Button 
              variant="outline" 
              size="lg"
            >
              Voir tous les événements
            </Button>
          </div>
        </Container>
      </section>

      {/* Popular Categories Section */}
      <section className="py-20 bg-background">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Catégories populaires</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez nos événements par catégorie
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: "Concerts", icon: "🎵", color: "from-blue-500 to-indigo-600" },
              { name: "Festivals", icon: "🎪", color: "from-purple-500 to-pink-600" },
              { name: "Théâtre", icon: "🎭", color: "from-yellow-500 to-orange-600" },
              { name: "Sport", icon: "⚽", color: "from-green-500 to-emerald-600" },
              { name: "Expositions", icon: "🖼️", color: "from-red-500 to-rose-600" },
              { name: "Conférences", icon: "🎤", color: "from-cyan-500 to-blue-600" },
              { name: "Gastronomie", icon: "🍽️", color: "from-amber-500 to-yellow-600" },
              { name: "Famille", icon: "👨‍👩‍👧‍👦", color: "from-teal-500 to-green-600" }
            ].map((category, index) => (
              <Link 
                href={`/events/category/${category.name.toLowerCase()}`} 
                key={index}
                className="group relative overflow-hidden rounded-xl aspect-square flex items-center justify-center shadow-md hover:shadow-xl transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-[radial-gradient(circle_at_center,_white_0%,_transparent_65%)]"></div>
                <div className="relative z-10 text-center text-white">
                  <div className="text-4xl mb-2">{category.icon}</div>
                  <h3 className="font-bold text-lg md:text-xl">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background relative">
        <div className="absolute top-0 inset-x-0 h-1/2 bg-muted/50"></div>
        <Container className="relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Pourquoi choisir notre billetterie ?</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une expérience de réservation simple, rapide et sécurisée pour tous vos événements
            </p>
          </div>
          <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={8}>
            {[
              {
                title: "Réservation facile",
                description: "Réservez vos billets en quelques clics, sans tracas et sans file d'attente.",
                icon: "🎫",
                color: "bg-primary"
              },
              {
                title: "Événements exclusifs",
                description: "Accédez à des événements exclusifs et des offres spéciales réservées à nos membres.",
                icon: "✨",
                color: "bg-secondary"
              },
              {
                title: "Support client",
                description: "Notre équipe est disponible pour vous aider à tout moment en cas de besoin.",
                icon: "🤝",
                color: "bg-accent"
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center h-full overflow-hidden group hover:shadow-md transition-all duration-300">
                <CardContent className="pt-6">
                  <div className={`w-20 h-20 ${feature.color} rounded-2xl mx-auto mb-6 flex items-center justify-center text-white transform group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                    <span className="text-4xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Container>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22a%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23a)%22/%3E%3C/svg%3E')]"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full filter blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full filter blur-3xl opacity-30"></div>

        <Container className="relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Ce que disent nos clients</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les expériences de nos utilisateurs avec notre plateforme de billetterie
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sophie Martin",
                role: "Organisatrice d'événements",
                image: "https://randomuser.me/api/portraits/women/44.jpg",
                quote: "M&C Society a révolutionné ma façon d'organiser des événements. La plateforme est intuitive et le support client est exceptionnel."
              },
              {
                name: "Thomas Dubois",
                role: "Participant régulier",
                image: "https://randomuser.me/api/portraits/men/32.jpg",
                quote: "J'utilise cette billetterie pour tous mes concerts et festivals. Le processus d'achat est simple et j'adore recevoir mes billets instantanément."
              },
              {
                name: "Émilie Rousseau",
                role: "Directrice de théâtre",
                image: "https://randomuser.me/api/portraits/women/68.jpg",
                quote: "Les outils d'analyse nous permettent de mieux comprendre notre audience. C'est un vrai plus pour adapter notre programmation."
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-background rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow relative">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-5xl text-primary opacity-20">❝</div>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-primary/20">
                    <Image 
                      src={testimonial.image} 
                      alt={testimonial.name} 
                      width={48} 
                      height={48}
                      className="object-cover w-full h-full"
                      fallback={
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-bold">{testimonial.name.substring(0, 2)}</span>
                        </div>
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                <div className="mt-4 flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-sm">★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Newsletter Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22a%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23a)%22/%3E%3C/svg%3E')]"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-foreground rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent rounded-full filter blur-3xl opacity-10"></div>

        <Container className="relative z-10">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-primary-foreground/10 backdrop-blur-md border-primary-foreground/20 shadow-xl">
              <CardContent className="pt-10 pb-8">
                <div className="text-center">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">Restez informé</h2>
                  <div className="w-16 h-1 bg-primary-foreground mx-auto rounded-full mb-6 opacity-70"></div>
                  <p className="text-lg text-primary-foreground/80 mb-8">
                    Inscrivez-vous à notre newsletter pour recevoir les dernières actualités et offres spéciales.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Input
                      type="email"
                      placeholder="Votre adresse email"
                      className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground/30 min-w-0 flex-1 max-w-md"
                    />
                    <Button 
                      variant="secondary" 
                      size="default"
                    >
                      S'inscrire
                    </Button>
                  </div>
                  <p className="text-xs text-primary-foreground/70 mt-4">
                    En vous inscrivant, vous acceptez de recevoir nos communications par email. Vous pourrez vous désinscrire à tout moment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="bg-muted/20 pt-16 pb-8 relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 opacity-5 [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22a%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23a)%22/%3E%3C/svg%3E')]"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"></div>
        <div className="absolute -top-80 -right-80 w-96 h-96 bg-primary/20 rounded-full filter blur-3xl opacity-10"></div>
        <div className="absolute -bottom-80 -left-80 w-96 h-96 bg-primary/20 rounded-full filter blur-3xl opacity-10"></div>

        <Container className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-10 w-10 bg-primary">
                  <AvatarFallback className="font-bold">M&C</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">M&C Society</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Votre plateforme de billetterie en ligne pour tous vos événements culturels et musicaux.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-8 h-8 bg-muted hover:bg-primary hover:text-primary-foreground rounded-full flex items-center justify-center transition-colors">
                  <span className="text-sm">📱</span>
                </a>
                <a href="#" className="w-8 h-8 bg-muted hover:bg-primary hover:text-primary-foreground rounded-full flex items-center justify-center transition-colors">
                  <span className="text-sm">💻</span>
                </a>
                <a href="#" className="w-8 h-8 bg-muted hover:bg-primary hover:text-primary-foreground rounded-full flex items-center justify-center transition-colors">
                  <span className="text-sm">📧</span>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6">Liens rapides</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Accueil
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Événements
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    À propos
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6">Contact</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs text-primary">📧</span>
                  </div>
                  <span className="text-muted-foreground">contact@mcsociety.fr</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs text-primary">📞</span>
                  </div>
                  <span className="text-muted-foreground">+33 1 23 45 67 89</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs text-primary">📍</span>
                  </div>
                  <span className="text-muted-foreground">123 Rue de Paris, 75000 Paris</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} M&C Society. Tous droits réservés.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
