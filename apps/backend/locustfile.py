from locust import HttpUser, task, between
import random

class PlanMyRouteUser(HttpUser):
    # Simula el tiempo que tarda el usuario en leer la pantalla (entre 1 y 5 segundos)
    wait_time = between(1, 5)

    # DATOS FIJOS (Sustitúyelos por los de tu BDD local)
    user_id = "a3e966d8-e1c0-41e2-9fd6-0519575c76e7"  # Usuario fijo
    trip_id = "31" # ¡PON AQUÍ UN ID DE VIAJE REAL (número) QUE EXISTA!

    def on_start(self):
        """Se ejecuta al iniciar el usuario virtual (login, setup, etc)"""
        # Aquí podrías hacer login si tuvieras autenticación JWT
        pass

    @task(2)
    def view_profile_and_stats(self):
        """Carga perfil y estadísticas (frecuencia baja)"""
        self.client.get(f"/api/user/{self.user_id}")
        self.client.get(f"/api/user/{self.user_id}/trips/count")

    @task(5) 
    def list_my_trips(self):
        """El usuario entra a 'Mis Viajes' (frecuencia alta)"""
        self.client.get(f"/api/travelers/{self.user_id}/trips")

    @task(10)
    def view_trip_details_and_itinerary(self):
        """El usuario entra al detalle de un viaje y ve el mapa (frecuencia MUY alta)
        Este es el endpoint más crítico porque carga muchos datos.
        """
        # 1. Cargar info básica del viaje
        self.client.get(f"/api/trip/{self.trip_id}")
        
        # 2. Cargar el itinerario completo (Rutas + Paradas) -> ¡La prueba de fuego!
        self.client.get(f"/api/itinerary/trip/{self.trip_id}")
        
        # 3. Cargar participantes
        self.client.get(f"/api/travelers/trip/{self.trip_id}")

    @task(3)
    def check_notifications(self):
        """El usuario mira si tiene invitaciones"""
        self.client.get(f"/api/notification/receiver/{self.user_id}")

    # NOTA: No incluimos POST (Crear viaje) para no llenar tu BDD de basura en segundos.
    # Las pruebas de carga suelen centrarse en lectura (GET) que es el 90% del tráfico.