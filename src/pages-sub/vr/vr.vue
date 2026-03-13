<script lang="ts" setup>
definePage({
  style: {
    navigationBarTitleText: 'VR教室',
  },
})

const webViewSrc = ref('')

onLoad((query) => {
  webViewSrc.value = `http://10.86.136.242:9001/#/?campusId=${query?.campusId}&buildingId=${query?.buildingId}&roomId=${query?.roomId}`
})
</script>

<template>
  <web-view :src="webViewSrc" />
</template>
