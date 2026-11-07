<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
const props = defineProps({
  points: { type: Array, default: () => [] },
  editable: Boolean,
  latitude: Number,
  longitude: Number,
})
const emit = defineEmits(['pick'])
const container = ref(null)
let map, layer
const icon = L.divIcon({
  className: 'map-dot',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})
function paint() {
  if (!map) return
  layer.clearLayers()
  props.points.forEach((p) => {
    const labels = {
      claimed: 'Nabigyan na',
      pending: 'Hindi pa nabibigyan',
      not_enrolled: 'Hindi naka-enroll',
      no_program: 'Walang napiling program',
    }
    const status = Object.hasOwn(labels, p.claim_status) ? p.claim_status : null
    const pointIcon = status
      ? L.divIcon({
          className: 'map-dot status-' + status,
          html: '<span></span>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
      : icon
    const marker = L.marker([p.latitude, p.longitude], {
      icon: pointIcon,
      title: p.head + (status ? ' - ' + labels[status] : ''),
    }).addTo(layer)
    const text = document.createElement('div')
    const name = document.createElement('strong')
    name.textContent = p.head + ' · ' + p.purok
    text.append(name)
    if (status) {
      const detail = document.createElement('p')
      detail.textContent = labels[status]
      text.append(detail)
    }
    marker.bindPopup(text)
  })
  if (props.latitude != null && props.longitude != null)
    L.marker([props.latitude, props.longitude], { icon }).addTo(layer)
}
onMounted(() => {
  map = L.map(container.value).setView(
    [props.latitude ?? 12.8797, props.longitude ?? 121.774],
    props.latitude != null ? 16 : 6,
  )
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)
  layer = L.layerGroup().addTo(map)
  paint()
  if (props.points.length)
    map.fitBounds(
      props.points.map((p) => [p.latitude, p.longitude]),
      { padding: [30, 30], maxZoom: 16 },
    )
  if (props.editable) map.on('click', (e) => emit('pick', e.latlng))
})
watch(
  () => [props.points, props.latitude, props.longitude],
  () => {
    paint()
    if (props.latitude != null && props.longitude != null)
      map?.setView([props.latitude, props.longitude], Math.max(map.getZoom(), 15))
  },
  { deep: true },
)
watch(
  () => props.points,
  (points) => {
    if (map && points.length)
      map.fitBounds(
        points.map((p) => [p.latitude, p.longitude]),
        { padding: [30, 30], maxZoom: 16 },
      )
  },
)
onBeforeUnmount(() => map?.remove())
</script>
<template>
  <div ref="container" class="community-map" aria-label="Household location map"></div>
</template>
