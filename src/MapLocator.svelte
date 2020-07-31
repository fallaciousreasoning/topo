<script lang="ts">
  import type { Map } from "ol";
  import Geolocation from "ol/Geolocation";
  import Feature from 'ol/Feature';
  import VectorSource from 'ol/source/Vector';
  import VectorLayer from 'ol/layer/Vector';
  import Point from 'ol/geom/Point';
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";

  export let map: Map;

  let tracking = true;
  let geolocation: Geolocation;
  $: {
    if (map) {
      geolocation = new Geolocation({
        tracking,
        projection: map.getView().getProjection(),
      });

      geolocation.on("change", (e) => {
        const position = geolocation.getPosition();
        map.getView().setCenter(position);
        
        const iconFeature = new Feature({
            geometry: new Point(position),       
        });

        const iconStyle = new Style({
            image: new Icon({
                anchor: [0.5, 0.5],
                opacity: 0.9,
                imgSize: [600, 600],
                scale: 0.08,
                color: '#578dfF',
                src: 'location-indicator.svg',
            })
        });
        iconFeature.setStyle(iconStyle);

        const vectorSource = new VectorSource({
            features: [iconFeature]
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource
        });

        map.addLayer(vectorLayer);
        console.log("Foo?")
      });
    }
  }
</script>
