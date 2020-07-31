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
  let vectorSource = new VectorSource({
      features: []
  });
  let vectorLayer = new VectorLayer({
    source: vectorSource
  });

  $: {
      if (map){
        map.addLayer(vectorLayer);
      }
  }

  $: {
    if (map) {
      geolocation = new Geolocation({
        tracking,
        projection: map.getView().getProjection(),
      });

      // When we first get the location, show it.
      geolocation.once('change', e => {
        const position = geolocation.getPosition();
        map.getView().setCenter(position);
      })

      geolocation.on("change", (e) => {
        const position = geolocation.getPosition();
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

        vectorSource.clear();
        vectorSource.addFeature(iconFeature);
      });

      // If we aren't tracking the location, don't show it.
      if (!tracking)
        vectorSource.clear();
    }
  }
</script>
