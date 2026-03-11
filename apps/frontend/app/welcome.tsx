import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  SlideInLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/assets/Logo';

// Importar GSAP solo en web
let gsap: any = null;
let ScrollTrigger: any = null;
if (Platform.OS === 'web') {
  gsap = require('gsap').gsap;
  ScrollTrigger = require('gsap/ScrollTrigger').ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
}

const { width } = Dimensions.get('window');
const APP_STORE_URL = 'https://apps.apple.com/app/planmyroute';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.planmyroute';

export default function WelcomeScreen() {
  const [isReady, setIsReady] = React.useState(false);
  const [imagesLoaded, setImagesLoaded] = React.useState(0);
  const [promoCode, setPromoCode] = useState('');

  // Reanimated shared values
  const floatingAnim1 = useSharedValue(0);
  const floatingAnim2 = useSharedValue(0);

  useEffect(() => {
    // Forzar re-render después de montar
    setTimeout(() => {
      setIsReady(true);
    }, 100);

    // HACK: Forzar repaint en React Native Web
    if (Platform.OS === 'web') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);

      // Forzar recalculo de layout
      setTimeout(() => {
        const elements = document.querySelectorAll('.feature-card');
        elements.forEach(el => {
          (el as HTMLElement).style.opacity = '0.99';
          setTimeout(() => {
            (el as HTMLElement).style.opacity = '1';
          }, 50);
        });
      }, 300);
    }

    // Animaciones flotantes con Reanimated
    floatingAnim1.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    floatingAnim2.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  // Estilos animados para badges flotantes
  const floatingStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: floatingAnim1.value }],
  }));

  const floatingStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: floatingAnim2.value }],
  }));

  useEffect(() => {
    // GSAP solo en web para efectos avanzados
    if (Platform.OS === 'web' && gsap && ScrollTrigger) {
      // Scroll trigger para features
      gsap.utils.toArray('.feature-card').forEach((card: any, index: number) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          x: index % 2 === 0 ? -50 : 50,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
        });
      });

      // Stats counter
      gsap.utils.toArray('.stat-number').forEach((stat: any) => {
        const target = parseInt(stat.getAttribute('data-target') || '0');
        gsap.from(stat, {
          scrollTrigger: {
            trigger: stat,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          textContent: 0,
          duration: 2,
          snap: { textContent: 1 },
          onUpdate: function () {
            stat.textContent = Math.ceil(
              parseFloat(stat.textContent)
            ).toLocaleString();
          },
        });
      });
    }
  }, []);

  const features = [
    {
      icon: 'map-outline',
      title: 'Mapas Interactivos',
      description:
        'Visualiza tu ruta completa con todas las paradas en un mapa dinámico. Calcula distancias y tiempos estimados automáticamente.',
      image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
      colors: ['#FFD54D', '#FFC107'],
    },
    {
      icon: 'sparkles',
      title: 'Viajes con IA',
      description:
        'Genera itinerarios completos automáticamente con inteligencia artificial. Solo indica origen, destino y fechas.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      colors: ['#202020', '#424242'],
    },
    {
      icon: 'people-outline',
      title: 'Colaboración en Equipo',
      description:
        'Invita a tus compañeros de viaje. Todos pueden añadir paradas, editar detalles y seguir el itinerario en tiempo real.',
      image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
      colors: ['#FFD54D', '#FFC107'],
    },
    {
      icon: 'location',
      title: 'Paradas Detalladas',
      description:
        'Añade actividades, alojamientos y repostajes. Incluye fotos, precios estimados y notas para cada parada.',
      image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
      colors: ['#202020', '#424242'],
    },
    {
      icon: 'car-sport-outline',
      title: 'Gestión de Vehículos',
      description:
        'Registra tus vehículos con consumo y tipo de combustible. Calcula costes precisos de cada trayecto.',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
      colors: ['#FFD54D', '#FFC107'],
    },
    {
      icon: 'notifications-outline',
      title: 'Notificaciones Inteligentes',
      description:
        'Recibe invitaciones a viajes, actualizaciones del itinerario y alertas importantes en tiempo real.',
      image: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80',
      colors: ['#202020', '#424242'],
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Crea o Genera',
      description:
        'Crea un viaje manual o usa la IA para generar un itinerario completo automáticamente.',
      icon: 'add-circle-outline',
    },
    {
      number: '02',
      title: 'Personaliza',
      description:
        'Añade paradas, actividades, alojamientos y repostajes. Todo aparece en el mapa en tiempo real.',
      icon: 'create-outline',
    },
    {
      number: '03',
      title: 'Comparte',
      description:
        'Invita a tus compañeros de viaje. Pueden ver, editar y añadir paradas juntos.',
      icon: 'people-outline',
    },
    {
      number: '04',
      title: '¡Disfruta!',
      description:
        'Sigue tu itinerario paso a paso. Accede al mapa, direcciones y toda la info de tus paradas.',
      icon: 'airplane-outline',
    },
  ];

  const testimonials = [
    {
      name: 'María González',
      role: 'Viajera Frecuente',
      avatar: 'https://i.pravatar.cc/150?img=1',
      text: 'La IA me generó un itinerario completo para mi viaje a Andalucía. Solo tuve que ajustar un par de cosas. ¡Increíble!',
      rating: 5,
    },
    {
      name: 'Carlos Ruiz',
      role: 'Aventurero Digital',
      avatar: 'https://i.pravatar.cc/150?img=12',
      text: 'Poder planificar el viaje con mis amigos en tiempo real fue un game changer. Todos aportamos ideas y el resultado fue perfecto.',
      rating: 5,
    },
    {
      name: 'Laura Martín',
      role: 'Road Trip Lover',
      avatar: 'https://i.pravatar.cc/150?img=5',
      text: 'El cálculo automático de costes de combustible y la gestión de paradas me ayudó a optimizar mi ruta por Europa.',
      rating: 5,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView>
        {/* Hero Section */}
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          style={styles.heroSection}
        >
          {/* Floating badges */}
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.floatingBadgeLeft,
              floatingStyle1,
            ]}
          >
            <View style={styles.floatingBadgeInner}>
              <Ionicons name="map" size={32} color="#FFD54D" />
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.floatingBadge,
              styles.floatingBadgeRight,
              floatingStyle2,
            ]}
          >
            <View style={styles.floatingBadgeInner}>
              <Ionicons name="sparkles" size={32} color="#FFD54D" />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(1000).springify()}
            style={styles.heroContent}
          >
            <Animated.View entering={ZoomIn.delay(400).duration(800).springify()}>
              <LinearGradient
                colors={['#FFD54D', '#FFC107']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroBadge}
              >
                <Text style={[styles.heroBadgeText, { color: '#202020' }]}>
                  ✨ Planifica Viajes con IA
                </Text>
              </LinearGradient>
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(600).duration(800)}
              style={styles.heroTitle}
            >
              Tu Próxima
            </Animated.Text>
            <Animated.View entering={SlideInLeft.delay(800).duration(800).springify()}>
              <LinearGradient
                colors={['#FFD54D', '#FFC107']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroTitleGradient}
              >
                <Text style={[styles.heroTitleWhite, { color: '#202020' }]}>Aventura</Text>
              </LinearGradient>
            </Animated.View>
            <Animated.Text
              entering={FadeInUp.delay(1000).duration(800)}
              style={styles.heroTitle}
            >
              Empieza Aquí
            </Animated.Text>

            <Animated.Text
              entering={FadeIn.delay(1200).duration(1000)}
              style={styles.heroSubtitle}
            >
              Planifica viajes increíbles con inteligencia artificial. Colabora con amigos,
              gestiona paradas y costes. Todo en una app intuitiva.
            </Animated.Text>

            {/* CTA Buttons */}
            <Animated.View
              entering={SlideInDown.delay(1400).duration(800).springify()}
              style={styles.ctaContainer}
            >
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <LinearGradient
                    colors={['#FFD54D', '#FFC107']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaButtonPrimary}
                  >
                    <Ionicons name="rocket-outline" size={24} color="#202020" />
                    <Text style={[styles.ctaButtonText, { color: '#202020' }]}>Comenzar Gratis</Text>
                  </LinearGradient>
                </Pressable>
              </Link>

              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.ctaButtonSecondary}>
                  <Text style={styles.ctaButtonSecondaryText}>Iniciar Sesión</Text>
                  <Ionicons name="log-in-outline" size={24} color="#202020" />
                </Pressable>
              </Link>
            </Animated.View>

            {/* Promo Code Section */}
            <Animated.View
              entering={FadeIn.delay(1600).duration(800)}
              style={styles.promoSection}
            >
              <Text style={styles.promoTitle}>Visita PlanMyRoute</Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value="https://www.planmyroute.es/"
                  size={180}
                  color="#202020"
                  backgroundColor="white"
                />
              </View>
              <Text style={styles.promoUrl}>www.planmyroute.es</Text>
            </Animated.View>

            {/* Hero Image */}
            <Animated.View
              entering={FadeIn.delay(1800).duration(1200)}
              style={styles.heroImageContainer}
            >
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80',
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              {/* Stats overlay */}
              <Animated.View
                entering={SlideInDown.delay(2000).duration(800).springify()}
                style={styles.statsOverlay}
              >
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>1K+</Text>
                  <Text style={styles.statLabel}>Usuarios</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#FFD54D' }]}>
                    3K+
                  </Text>
                  <Text style={styles.statLabel}>Viajes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#FFD54D' }]}>
                    4.8★
                  </Text>
                  <Text style={styles.statLabel}>Valoración</Text>
                </View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </LinearGradient>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>CARACTERÍSTICAS</Text>
          </View>
          <Text style={styles.sectionTitle}>
            Todo lo que Necesitas
          </Text>
          <Text style={styles.sectionSubtitle}>
            Herramientas poderosas diseñadas para hacer de cada viaje una
            experiencia perfecta
          </Text>

          <View style={styles.featuresGrid} key={isReady ? 'ready' : 'loading'}>
            {features.map((feature, index) => (
              <Animated.View
                key={`${index}-${isReady}`}
                className="feature-card"
                style={styles.featureCard}
              >
                <LinearGradient
                  colors={feature.colors as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.featureGradientBar}
                />
                <View style={styles.featureImageContainer}>
                  <Image
                    source={{ uri: feature.image }}
                    style={styles.featureImage}
                    resizeMode="cover"
                    onLoad={() => {
                      setImagesLoaded(prev => prev + 1);
                      if (Platform.OS === 'web') {
                        // Forzar reflow en web
                        requestAnimationFrame(() => { });
                      }
                    }}
                    onError={() => console.log(`Error loading image: ${feature.image}`)}
                  />
                  {/* Overlay gradient para mejor legibilidad */}
                  <LinearGradient
                    colors={['transparent', 'rgba(15, 23, 42, 0.5)']}
                    style={styles.imageOverlay}
                  />
                </View>
                <View style={styles.featureIconContainer}>
                  <Ionicons name={feature.icon as any} size={32} color="#4F46E5" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <LinearGradient
          colors={['#202020', '#424242']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.howItWorksSection}
        >
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeTextWhite}>CÓMO FUNCIONA</Text>
          </View>
          <Text style={styles.sectionTitleWhite}>
            4 Pasos Simples
          </Text>
          <Text style={styles.sectionSubtitleWhite}>
            Desde la idea hasta la aventura en minutos
          </Text>

          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <Animated.View
                key={index}
                style={styles.stepCard}
              >
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                <View style={styles.stepIconContainer}>
                  <Ionicons name={step.icon as any} size={32} color="white" />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* Testimonials */}
        <View style={styles.section}>
          <View style={[styles.sectionBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.sectionBadgeText, { color: '#D97706' }]}>
              TESTIMONIOS
            </Text>
          </View>
          <Text style={styles.sectionTitle}>
            Lo que Dicen
          </Text>
          <Text style={styles.sectionSubtitle}>
            Miles de viajeros ya confían en PlanMyRoute
          </Text>

          <View style={styles.testimonialsContainer}>
            {testimonials.map((testimonial, index) => (
              <Animated.View
                key={index}
                style={styles.testimonialCard}
              >
                <View style={styles.starsContainer}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Ionicons key={i} name="star" size={20} color="#F59E0B" />
                  ))}
                </View>
                <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
                <View style={styles.testimonialAuthor}>
                  <Image
                    source={{ uri: testimonial.avatar }}
                    style={styles.testimonialAvatar}
                  />
                  <View>
                    <Text style={styles.testimonialName}>{testimonial.name}</Text>
                    <Text style={styles.testimonialRole}>{testimonial.role}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Stats Counter */}
        <LinearGradient
          colors={['#202020', '#424242']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statsSection}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="people" size={48} color="white" />
              </View>
              <Text
                className="stat-number"
                data-target="1000"
                style={styles.statBigNumber}
              >
                1,000+
              </Text>
              <Text style={styles.statBigLabel}>Usuarios Activos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="map" size={48} color="white" />
              </View>
              <Text
                className="stat-number"
                data-target="3000"
                style={styles.statBigNumber}
              >
                3,000+
              </Text>
              <Text style={styles.statBigLabel}>Viajes Creados</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="location" size={48} color="white" />
              </View>
              <Text
                className="stat-number"
                data-target="15000"
                style={styles.statBigNumber}
              >
                15,000+
              </Text>
              <Text style={styles.statBigLabel}>Paradas Guardadas</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="heart" size={48} color="white" />
              </View>
              <View style={styles.ratingContainer}>
                <Text
                  className="stat-number"
                  data-target="4"
                  style={styles.statBigNumber}
                >
                  4
                </Text>
                <Text style={styles.statBigNumber}>.8</Text>
                <Ionicons name="star" size={32} color="#FFD54D" />
              </View>
              <Text style={styles.statBigLabel}>Valoración Media</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Premium Section */}
        <View style={styles.premiumSection}>
          <View style={[styles.sectionBadge, { backgroundColor: '#FFD54D' }]}>
            <Text style={[styles.sectionBadgeText, { color: '#202020' }]}>
              PREMIUM
            </Text>
          </View>
          <Text style={styles.sectionTitle}>
            Lleva tus Viajes Más Lejos
          </Text>
          <Text style={styles.sectionSubtitle}>
            Desbloquea todo el potencial de PlanMyRoute con funciones exclusivas
          </Text>

          <View style={styles.premiumGrid}>
            <View style={styles.premiumCard}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="sparkles" size={32} color="#FFD54D" />
              </View>
              <Text style={styles.premiumTitle}>IA Ilimitada</Text>
              <Text style={styles.premiumDescription}>
                Genera tantos viajes automáticos como quieras con inteligencia artificial avanzada
              </Text>
            </View>

            <View style={styles.premiumCard}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="car-sport" size={32} color="#FFD54D" />
              </View>
              <Text style={styles.premiumTitle}>Garaje Infinito</Text>
              <Text style={styles.premiumDescription}>
                Añade todos tus vehículos sin límites y calcula costes precisos
              </Text>
            </View>

            <View style={styles.premiumCard}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="people" size={32} color="#FFD54D" />
              </View>
              <Text style={styles.premiumTitle}>Sin Límites</Text>
              <Text style={styles.premiumDescription}>
                Invita a todos tus amigos. Viajeros ilimitados en cada viaje
              </Text>
            </View>

            <View style={styles.premiumCard}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="checkmark-circle" size={32} color="#FFD54D" />
              </View>
              <Text style={styles.premiumTitle}>Perfil Verificado</Text>
              <Text style={styles.premiumDescription}>
                Destaca con la insignia oficial de viajero Premium
              </Text>
            </View>

            <View style={styles.premiumCard}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="close-circle" size={32} color="#FFD54D" />
              </View>
              <Text style={styles.premiumTitle}>Sin Anuncios</Text>
              <Text style={styles.premiumDescription}>
                Disfruta de una experiencia sin interrupciones
              </Text>
            </View>

            <View style={styles.premiumCard}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="cloud-offline" size={32} color="#FFD54D" />
              </View>
              <Text style={styles.premiumTitle}>Modo Offline</Text>
              <Text style={styles.premiumDescription}>
                Descarga tus rutas y viaja sin conexión
              </Text>
            </View>
          </View>

          <View style={styles.premiumPriceContainer}>
            <Text style={styles.premiumPriceLabel}>Desde solo</Text>
            <View style={styles.premiumPriceRow}>
              <Text style={styles.premiumPrice}>4,99€</Text>
              <Text style={styles.premiumPricePeriod}>/mes</Text>
            </View>
            <Text style={styles.premiumPriceNote}>Cancela cuando quieras</Text>
          </View>
        </View>

        {/* Download Section */}
        <View style={styles.downloadSection}>
          <View style={[styles.sectionBadge, { backgroundColor: '#065F46' }]}>
            <Text style={[styles.sectionBadgeText, { color: '#6EE7B7' }]}>
              DESCARGA AHORA
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Lleva tus Viajes</Text>
          <LinearGradient
            colors={['#FFD54D', '#FFC107']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.downloadTitleGradient}
          >
            <Text style={[styles.downloadTitleWhite, { color: '#202020' }]}>Contigo</Text>
          </LinearGradient>
          <Text style={styles.sectionSubtitle}>
            Disponible en iOS y Android. Descarga gratis y empieza a planificar
            hoy.
          </Text>

          <View style={styles.downloadButtons}>
            <Pressable onPress={() => Linking.openURL(APP_STORE_URL)}>
              <View style={styles.storeButton}>
                <Ionicons name="logo-apple" size={40} color="white" />
                <View style={styles.storeButtonText}>
                  <Text style={styles.storeButtonSmall}>Descarga en</Text>
                  <Text style={styles.storeButtonLarge}>App Store</Text>
                </View>
              </View>
            </Pressable>

            <Pressable onPress={() => Linking.openURL(GOOGLE_PLAY_URL)}>
              <View style={styles.storeButton}>
                <Ionicons name="logo-google-playstore" size={40} color="white" />
                <View style={styles.storeButtonText}>
                  <Text style={styles.storeButtonSmall}>Consíguelo en</Text>
                  <Text style={styles.storeButtonLarge}>Google Play</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Phone mockup */}
          <View style={styles.phoneMockupContainer}>
            <View style={styles.phoneMockup}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&q=80',
                }}
                style={styles.phoneMockupImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* CTA Final */}
        <LinearGradient
          colors={['#FFD54D', '#FFC107']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.finalCtaSection}
        >
          <Text style={[styles.finalCtaTitle, { color: '#202020' }]}>
            ¿Listo para tu Próxima Aventura?
          </Text>
          <Text style={[styles.finalCtaSubtitle, { color: '#424242' }]}>
            Únete a miles de viajeros que ya están planificando sus sueños con
            PlanMyRoute
          </Text>

          <Link href="/(auth)/register" asChild>
            <Pressable>
              <View style={styles.finalCtaButton}>
                <Text style={[styles.finalCtaButtonText, { color: '#202020' }]}>Comenzar Gratis</Text>
                <Ionicons name="arrow-forward" size={28} color="#202020" />
              </View>
            </Pressable>
          </Link>

          <Text style={[styles.finalCtaDisclaimer, { color: '#424242' }]}>
            No requiere tarjeta de crédito • Acceso completo • Cancela cuando
            quieras
          </Text>
        </LinearGradient>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            {/* Brand */}
            <View style={styles.footerBrand}>
              <View style={styles.footerBrandHeader}>
                <View style={styles.footerLogo}>
                  <Logo width={48} height={30} color="#FFD54D" />
                </View>
                <Text style={styles.footerBrandName}>PlanMyRoute</Text>
              </View>
              <Text style={styles.footerBrandTagline}>
                Tu compañero perfecto para planificar viajes inolvidables con IA
              </Text>
              <View style={styles.socialLinks}>
                <Pressable
                  style={styles.socialButton}
                  onPress={() => Linking.openURL('https://www.instagram.com/planmyroute.ai/')}
                >
                  <Ionicons name="logo-instagram" size={24} color="white" />
                </Pressable>
                <Pressable
                  style={styles.socialButton}
                  onPress={() => Linking.openURL('https://www.tiktok.com/@planmyroute')}
                >
                  <Ionicons name="logo-tiktok" size={24} color="white" />
                </Pressable>
              </View>
            </View>

            {/* Links */}
            <View style={styles.footerLinks}>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Producto</Text>
                <Pressable>
                  <Text style={styles.footerLink}>Características</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.footerLink}>Precios</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.footerLink}>Demo</Text>
                </Pressable>
              </View>

              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Empresa</Text>
                <Pressable>
                  <Text style={styles.footerLink}>Sobre Nosotros</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.footerLink}>Blog</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.footerLink}>Contacto</Text>
                </Pressable>
              </View>

              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Soporte</Text>
                <Pressable>
                  <Text style={styles.footerLink}>Centro de Ayuda</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.footerLink}>Comunidad</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.footerLink}>API</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Bottom */}
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>
              © 2025 PlanMyRoute. Todos los derechos reservados.
            </Text>
            <View style={styles.footerLegalLinks}>
              <Pressable>
                <Text style={styles.footerLegalLink}>Privacidad</Text>
              </Pressable>
              <Pressable>
                <Text style={styles.footerLegalLink}>Términos</Text>
              </Pressable>
              <Pressable>
                <Text style={styles.footerLegalLink}>Cookies</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Fondo oscuro azul
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    position: 'relative',
  },
  floatingBadge: {
    position: 'absolute',
  },
  floatingBadgeLeft: {
    top: 80,
    left: 40,
  },
  floatingBadgeRight: {
    top: 160,
    right: 40,
  },
  floatingBadgeInner: {
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 800,
  },
  heroBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
    marginBottom: 32,
  },
  heroBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  heroTitle: {
    fontSize: width > 768 ? 72 : 48,
    fontWeight: '900',
    color: '#FFFFFF', // Blanco para fondo oscuro
    textAlign: 'center',
    marginBottom: 16,
  },
  heroTitleGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  heroTitleWhite: {
    fontSize: width > 768 ? 72 : 48,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: width > 768 ? 24 : 18,
    color: '#CBD5E1', // Gris claro para fondo oscuro
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  ctaContainer: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 16,
    marginBottom: 80,
  },
  ctaButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ctaButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#202020',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaButtonSecondaryText: {
    color: '#202020',
    fontSize: 18,
    fontWeight: 'bold',
  },
  promoSection: {
    alignItems: 'center',
    marginBottom: 60,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '90%',
    maxWidth: 400,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD54D',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  promoUrl: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
  },
  promoInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  heroImageContainer: {
    width: '100%',
    maxWidth: 1000,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 500,
    borderRadius: 24,
    borderWidth: 8,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    right: 32,
    backgroundColor: 'rgba(30, 41, 59, 0.95)', // Fondo oscuro semi-transparente
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#FFD54D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 77, 0.3)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD54D',
  },
  statLabel: {
    fontSize: 14,
    color: '#CBD5E1', // Gris claro
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#1E293B', // Fondo oscuro para secciones
  },
  sectionBadge: {
    backgroundColor: '#FFD54D', // Amarillo brand
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 50,
    marginBottom: 24,
  },
  sectionBadgeText: {
    color: '#202020', // Negro
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionBadgeTextWhite: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: width > 768 ? 56 : 40,
    fontWeight: '900',
    color: '#FFFFFF', // Texto blanco
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitleWhite: {
    fontSize: width > 768 ? 56 : 40,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#94A3B8', // Gris claro
    textAlign: 'center',
    marginBottom: 64,
    maxWidth: 600,
  },
  sectionSubtitleWhite: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 64,
    maxWidth: 600,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly', // Cambio a space-evenly para mejor distribución
    gap: 20,
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 16,
  },
  featureCard: {
    backgroundColor: '#334155',
    borderRadius: 24,
    overflow: 'hidden',
    // Usando % para asegurar 3 columnas
    width: width > 900 ? '30%' : width > 768 ? '45%' : '100%',
    minWidth: width > 900 ? 320 : width > 768 ? 280 : undefined,
    maxWidth: width > 900 ? 380 : undefined,
    flexGrow: 0,
    flexShrink: 0,
    shadowColor: '#FFD54D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#FFD54D',
    marginBottom: 16,
  } as ViewStyle,
  featureGradientBar: {
    height: 4, // Más grueso para mejor visibilidad
  },
  featureImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#1E293B', // Fondo placeholder
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  featureImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9, // Ligeramente transparente para mezclar con fondo
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  featureIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 50,
    padding: 16,
    shadowColor: '#FFD54D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  featureContent: {
    padding: 32,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // Texto blanco
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featureDescription: {
    fontSize: 16,
    color: '#E2E8F0', // Gris muy claro para mejor legibilidad
    lineHeight: 24,
  },
  howItWorksSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 32,
  },
  stepCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    width: width > 768 ? 280 : width - 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    top: -24,
    left: -24,
    backgroundColor: 'white',
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  stepNumberText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD54D',
  },
  stepIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 64,
    height: 64,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  testimonialsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 32,
  },
  testimonialCard: {
    backgroundColor: '#334155', // Fondo oscuro
    borderRadius: 24,
    padding: 32,
    width: width > 768 ? 380 : width - 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 77, 0.2)',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 4,
  },
  testimonialText: {
    fontSize: 16,
    color: '#E2E8F0', // Gris muy claro
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  testimonialAvatar: {
    width: 56,
    height: 56,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FFD54D',
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF', // Blanco
  },
  testimonialRole: {
    fontSize: 14,
    color: '#94A3B8', // Gris
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 48,
  },
  statCard: {
    alignItems: 'center',
    minWidth: 200,
  },
  statIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 128,
    height: 128,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statBigNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: 'white',
  },
  statBigLabel: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  premiumSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 48,
    maxWidth: 1200,
  },
  premiumCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    padding: 24,
    width: width > 900 ? '30%' : width > 768 ? '45%' : '100%',
    minWidth: width > 900 ? 280 : width > 768 ? 240 : undefined,
    maxWidth: width > 900 ? 320 : undefined,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  premiumIconContainer: {
    backgroundColor: '#202020',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#202020',
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    textAlign: 'center',
  },
  premiumPriceContainer: {
    alignItems: 'center',
    backgroundColor: '#FFD54D',
    paddingHorizontal: 48,
    paddingVertical: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumPriceLabel: {
    fontSize: 14,
    color: '#202020',
    marginBottom: 8,
    fontWeight: '600',
  },
  premiumPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  premiumPrice: {
    fontSize: 48,
    fontWeight: '900',
    color: '#202020',
  },
  premiumPricePeriod: {
    fontSize: 20,
    color: '#424242',
    marginLeft: 4,
  },
  premiumPriceNote: {
    fontSize: 12,
    color: '#424242',
  },
  downloadSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#1E293B', // Fondo oscuro
  },
  downloadTitleGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 32,
  },
  downloadTitleWhite: {
    fontSize: width > 768 ? 56 : 40,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
  },
  downloadButtons: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 24,
    marginBottom: 64,
  },
  storeButton: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  storeButtonText: {
    gap: 4,
  },
  storeButtonSmall: {
    color: 'white',
    fontSize: 12,
  },
  storeButtonLarge: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  phoneMockupContainer: {
    alignItems: 'center',
  },
  phoneMockup: {
    backgroundColor: '#1F2937',
    borderRadius: 48,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  phoneMockupImage: {
    width: 320,
    height: 600,
    borderRadius: 40,
  },
  finalCtaSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
  },
  finalCtaTitle: {
    fontSize: width > 768 ? 56 : 40,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 32,
  },
  finalCtaSubtitle: {
    fontSize: width > 768 ? 20 : 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 48,
    maxWidth: 600,
  },
  finalCtaButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  finalCtaButtonText: {
    color: '#4F46E5',
    fontSize: 24,
    fontWeight: 'bold',
  },
  finalCtaDisclaimer: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  footerContent: {
    flexDirection: width > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 48,
    marginBottom: 48,
  },
  footerBrand: {
    flex: 1,
    minWidth: 250,
  },
  footerBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  footerLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBrandName: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
  },
  footerBrandTagline: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
    marginBottom: 24,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 48,
    height: 48,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 64,
    flexWrap: 'wrap',
  },
  footerColumn: {
    gap: 12,
    minWidth: 150,
  },
  footerColumnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 32,
    flexDirection: width > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  footerCopyright: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLegalLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  footerLegalLink: {
    fontSize: 14,
    color: '#6B7280',
  },
});
