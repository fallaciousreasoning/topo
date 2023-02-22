<script lang="ts">
  import { getOlContext } from '../ol/Map.svelte'
  import { onMount, tick } from 'svelte'
  import { enableZoomToCluster } from '../utils/zoomToFeature'
  import ClusterLayer from '../ol/ClusterLayer.svelte'
  import huts from './huts'
  import liveWeather from './LiveWeather.svelte'
  import VectorLayer from '../ol/VectorLayer.svelte'
  import VectorSource from 'ol/source/Vector'
  import onMountTick from '../utils/onMountTick'
  import LiveWeather from './LiveWeather.svelte'
  import mountains from './mountains'

  const { map } = getOlContext()
  enableZoomToCluster(map)
</script>

<ClusterLayer options={huts} />

<ClusterLayer options={mountains} />

<LiveWeather />
