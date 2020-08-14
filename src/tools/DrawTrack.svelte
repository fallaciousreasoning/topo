<script lang="ts">
  import VectorLayer from "ol/layer/Vector";
  import VectorSource from "ol/source/Vector";
  import { Draw, Modify } from "ol/interaction";
  import GeometryType from "ol/geom/GeometryType";
  import onMountTick from "../utils/onMountTick";
  import Map, { getOlContext } from "../ol/Map.svelte";
  import { Style, Stroke, Fill, Text } from "ol/style";
  import type { Coordinate } from "ol/coordinate";
  import { Polygon, Point } from "ol/geom";
  import type { StyleLike } from "ol/style/Style";
  import CircleStyle from "ol/style/Circle";
  import { getLength } from "ol/sphere";
import Popup from "../ol/Popup.svelte";

  const { getMap } = getOlContext();

  const styleFunction: StyleLike = (feature) => {
    const stroke = "white";
    const fill = "#0099ff";
    const width = 5;

    const styles = [
      new Style({
        stroke: new Stroke({
          color: fill,
          width: width,
        }),
      }),
    ];

    const geometry = feature.getGeometry();
    const coordinates = geometry["getCoordinates"]();
    for (const coordinate of coordinates) {
      styles.push(
        new Style({
          geometry: new Point(coordinate),
          image: new CircleStyle({
            radius: width + 2,
            fill: new Fill({
              color: fill,
            }),
            stroke: new Stroke({
              color: stroke,
            }),
          }),
        })
      );
    }

    return styles;
  };

  const source = new VectorSource();
  const layer = new VectorLayer({
    source,
    style: styleFunction,
  });

  let interaction: Draw | Modify = new Draw({
    source: source,
    type: GeometryType.LINE_STRING,
    style: styleFunction,
  });

  let popupPosition: Coordinate;
  let popupMessage: string;
  let distance: number;

  interaction.on('drawstart', ({ feature}) => {
      const geometry = feature.getGeometry();
      geometry.on('change', () => {
          popupPosition = geometry['getLastCoordinate']();
          popupMessage = `Click last point to finish line`;
          distance = getLength(geometry);
      });
  })

  // When the draw finished, start modifying the layerer.
  interaction.on("drawend", ({ feature }) => {
    const geometry = feature.getGeometry();
    console.log(getLength(geometry));

    const map = getMap();
    map.removeInteraction(interaction);

    interaction = new Modify({
      source,
    });
    map.addInteraction(interaction);
  });

  onMountTick(() => {
    const map = getMap();
    map.addInteraction(interaction);
    map.addLayer(layer);
    return () => {
      map.removeInteraction(interaction);
      map.removeLayer(layer);
    };
  });
</script>

<Popup position={popupPosition} closable={false}>
    {popupMessage}
    <div>
        Distance: {distance}
    </div>
</Popup>
