<script lang="ts" context="module">
  interface SubjectValue {
    humidity: number;
    issuedAt: string; // ISO-8601 date
    pressure: {
      atSeaLevel: string;
    };
    rainfall: string;
    temp: number;
    wind: {
      averageSpeed: 6;
      direction: string; // Compass direction
      strength: string; // Description of wind strength.
    };
  }

  interface MetServiceMapMarkerSubject {
    asAt: string; // ISO-8601 date
    value: SubjectValue;
    type: "local" | "traffic-camera";
  }

  interface MetServiceMapMarker {
    label: string;
    point: [number, number];
    subject: MetServiceMapMarkerSubject[];
  }

  interface MetServiceLiveWeatherResponse {
    isSkiSeason: boolean;
    layout: {
      primary: {
        map: {
          markers: MetServiceMapMarker[];
        };
      };
    };
  }
</script>

<script lang="ts">
  import Feature from "ol/Feature";
  import type { FeatureLike } from "ol/Feature";
  import { fromLonLat, get, toLonLat } from "ol/proj";
  import Point from "ol/geom/Point";
  import { corsFetch } from "../utils/cors";
  import { Style, Circle, Stroke, Fill, Text } from "ol/style";
  import { setLabel } from "../stores/fragment";
  import VectorLayer from "../ol/VectorLayer.svelte";
  import VectorSource from "ol/source/Vector";
  import Popup from "../ol/Popup.svelte";
  import type { Coordinate } from "ol/coordinate";
import RelativeTime from "../components/RelativeTime.svelte";

  const getWeatherIcon = (value: SubjectValue): string => {
    const options = {
      sunCloud: "🌤️",
      rain: "🌧️",
      cloud: "☁️",
      storm: "⛈️",
      snow: "🌨️",
      sun: "☀️",
      wind: "💨",
    };

    const rain = parseFloat(value.rainfall);

    if (rain > 0) {
      // I guess it'll be snow/hail if its cold?
      return value.temp < 0 ? options.snow : options.rain;
    }

    // I guess wind greater than 20km/h is windy?
    if (value.wind && value.wind.averageSpeed > 20) return options.wind;

    // I don't actually have the data to know if it's cloudy, so this seems safe.
    return options.sunCloud;
  };

  const getFeatures = async () => {
    const url =
      "https://www.metservice.com/publicData/webdata/maps-radar/weather-stations/nz";
    const response = await corsFetch(url);
    const data = (await response.json()) as MetServiceLiveWeatherResponse;

    const observations = data?.layout?.primary?.map?.markers;
    if (!observations) return null;

    return (
      observations
        // Filter out traffic cameras and stuff.
        .filter((marker) => {
          if (!marker.subject.length) return false;

          if (marker.subject[0].type === "traffic-camera") return false;

          return true;
        })
        .map((marker) => {
          const coords = fromLonLat([marker.point[1], marker.point[0]]);
          const feature = new Feature(new Point(coords));
          const subject = marker.subject[0];
          const observation = subject?.value;
          if (observation && !observation.issuedAt)
            observation.issuedAt = subject.asAt;

          feature.setStyle(
            new Style({
              image: new Circle({
                radius: 12,
                fill: new Fill({ color: "blue" }),
                stroke: new Stroke({ color: "white" }),
              }),
              text: new Text({
                fill: new Fill({ color: "white" }),
                text: getWeatherIcon(observation),
              }),
            })
          );
          feature.set("observation", observation);
          feature.set("subject", subject);

          return feature;
        })
    );
  };

  let currentObservation: SubjectValue;
  let coords: Coordinate;
</script>

<style>
  .weather {
    white-space: nowrap;
  }
</style>

{#await getFeatures() then features}
  <VectorLayer
    title="Live Weather"
    visible
    on:featureClick={(event) => {
      const feature = event.detail.feature;
      const geometry = feature.getGeometry();
      currentObservation = feature.get('observation');
      coords = geometry.getCoordinates();
    }}
    source={new VectorSource({ features })} />
{/await}

{#if currentObservation}
  <Popup position={coords} autoPan>
    <div class="weather">
      <h3>Live Weather</h3>
      {#if currentObservation.temp !== undefined}
        <p>
          <b>🌡️ Temperature:</b>
          {currentObservation.temp}°C
        </p>
      {/if}
      {#if currentObservation.rainfall !== undefined}
        <p>
          <b>🌧️ Rain:</b>
          {currentObservation.rainfall}mm
        </p>
      {/if}
      {#if currentObservation.humidity}
        <p>
          <b>💧 Humidity:</b>
          {currentObservation.humidity}%
        </p>
      {/if}
      {#if currentObservation.wind}
        <p>
          <b>💨 Wind:</b>
          {currentObservation.wind.strength}
          {currentObservation.wind.averageSpeed}km/h {currentObservation.wind.direction}
        </p>
      {/if}
      <i>Updated: <RelativeTime time={currentObservation.issuedAt}/></i>
    </div>
  </Popup>
{/if}
