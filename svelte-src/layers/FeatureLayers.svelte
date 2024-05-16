<script lang="ts">
  import ClusterLayer from '../ol/ClusterLayer.svelte'
  import { getOlContext } from '../ol/Map.svelte'
  import { enableZoomToCluster } from '../utils/zoomToFeature'
  import LiveWeather from './LiveWeather.svelte'
  import huts from './huts'
  import mountains from './mountains'

  const { map } = getOlContext()
  enableZoomToCluster(map)
</script>

<ClusterLayer options={huts} />

<ClusterLayer options={mountains} />

<LiveWeather />
