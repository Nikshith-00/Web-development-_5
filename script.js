const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");

const statusEl = document.getElementById("status");
const weatherCard = document.getElementById("weatherCard");
const welcome = document.getElementById("welcome");

const cityName = document.getElementById("cityName");
const countryName = document.getElementById("countryName");
const dateText = document.getElementById("dateText");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const feelsLike = document.getElementById("feelsLike");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const cloud = document.getElementById("cloud");

function setStatus(message = "", error = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", error);
}

function weatherInfo(code, isDay) {
  if (code === 0) return [isDay ? "☀️" : "🌙", "Clear sky"];
  if ([1, 2].includes(code)) return [isDay ? "🌤️" : "☁️", "Partly cloudy"];
  if (code === 3) return ["☁️", "Overcast"];
  if ([45, 48].includes(code)) return ["🌫️", "Foggy"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["🌦️", "Drizzle"];
  if ([61, 63, 65, 66, 67].includes(code)) return ["🌧️", "Rain"];
  if ([71, 73, 75, 77].includes(code)) return ["🌨️", "Snow"];
  if ([80, 81, 82].includes(code)) return ["🌦️", "Rain showers"];
  if ([85, 86].includes(code)) return ["🌨️", "Snow showers"];
  if ([95, 96, 99].includes(code)) return ["⛈️", "Thunderstorm"];
  return ["🌤️", "Weather conditions"];
}

function formatDate() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function showWeather(place, data) {
  const current = data.current;
  const [icon, text] = weatherInfo(current.weather_code, current.is_day);

  cityName.textContent = place.name;
  countryName.textContent = `${place.admin1 ? place.admin1 + ", " : ""}${place.country || ""}`;
  dateText.textContent = formatDate();
  weatherIcon.textContent = icon;
  temperature.textContent = Math.round(current.temperature_2m);
  feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
  description.textContent = text;
  humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  pressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
  cloud.textContent = `${Math.round(current.cloud_cover)}%`;

  weatherCard.classList.remove("hidden");
  welcome.classList.add("hidden");
}

async function getWeather(latitude, longitude, place) {
  setStatus("Loading current weather...");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,surface_pressure,wind_speed_10m",
    timezone: "auto"
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather service is unavailable.");

  const data = await response.json();
  showWeather(place, data);
  setStatus(`Updated just now • ${data.timezone || "Local time"}`);
}

async function searchCity() {
  const query = cityInput.value.trim();

  if (!query) {
    setStatus("Please enter a city name.", true);
    cityInput.focus();
    return;
  }

  try {
    setStatus("Finding city...");
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: query,
      count: "1",
      language: "en",
      format: "json"
    });

    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not connect to the location service.");

    const result = await response.json();

    if (!result.results || result.results.length === 0) {
      throw new Error(`No city found for "${query}".`);
    }

    const place = result.results[0];
    await getWeather(place.latitude, place.longitude, place);
  } catch (error) {
    setStatus(error.message || "Something went wrong. Try again.", true);
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by this browser.", true);
    return;
  }

  setStatus("Requesting your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
        url.search = new URLSearchParams({
          latitude,
          longitude,
          language: "en",
          format: "json"
        });

        const response = await fetch(url);

        let place = {
          name: "My Location",
          admin1: "",
          country: ""
        };

        if (response.ok) {
          const result = await response.json();
          if (result.name) {
            place = result;
          }
        }

        await getWeather(latitude, longitude, place);
      } catch (error) {
        setStatus(error.message || "Unable to load local weather.", true);
      }
    },
    () => {
      setStatus("Location permission was denied. Search for a city instead.", true);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}

searchBtn.addEventListener("click", searchCity);
locationBtn.addEventListener("click", useMyLocation);

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchCity();
});

// Optional first-load city so the page demonstrates immediately.
cityInput.value = "Hyderabad";
searchCity();
