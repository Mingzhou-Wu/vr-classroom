<script lang="ts" setup>
definePage({
  // 使用 type: "home" 属性设置首页，其他页面不需要设置，默认为page
  type: 'home',
  style: {
    // 'custom' 表示开启自定义导航栏，默认 'default'
    navigationStyle: 'default',
    navigationBarTitleText: '首页',
  },
})

const navBarOpacity = ref(0)
onPageScroll((e) => {
  navBarOpacity.value = Math.min(e.scrollTop / 300, 1)
})

const gridItemList = [
  { icon: 'i-mdi-shield-check-outline', text: '校友认证' },
  { icon: 'i-mdi-card-account-details-outline', text: '我的铭牌' },
  { icon: 'i-mdi-seat-passenger', text: '我的座位' },
  { icon: 'i-mdi-certificate-outline', text: '冠名证书' },
  { icon: 'i-material-symbols-menu-book-outline-rounded', text: '校友故事' },
  { icon: 'i-mdi-file-edit', text: '校友寄语' },
  { icon: 'i-material-symbols-share-windows-rounded', text: '一键分享' },
  { icon: 'i-mingcute-navigation-fill', text: '座位地图' },
]

const activityList = [
  {
    img: 'http://10.86.136.242:9000/images/default_activity.png',
    title: '校园座椅冠名活动',
    date: '2024-06-15',
  },
  {
    img: 'http://10.86.136.242:9000/images/default_activity.png',
    title: '校园座椅冠名活动',
    date: '2024-05-30',
  },
]

function goVRPage() {
  uni.navigateTo({ url: '/pages-sub/vr/vr?campusId=1&buildingId=1&roomId=1' })
  // uni.navigateTo({ url: '/pages-sub/order/order?campusId=1&buildingId=1&roomId=1' })
}

function goForumPage() {
  uni.switchTab({ url: '/pages/forum/forum' })
}
</script>

<template>
  <view>
    <view class="z-10 w-full bg-white !fixed" :style="{ backgroundColor: `rgba(255, 255, 255, ${navBarOpacity})` }">
      <wd-img src="http://10.86.136.242:9000/images/index_navbar.png" class="my-16rpx ml-16rpx h-60rpx" mode="heightFix" />
    </view>

    <wd-img src="http://10.86.136.242:9000/images/index_banner.png" class="z--1 h-550rpx w-full !fixed" mode="aspectFill" />

    <view class="h-350rpx" />

    <view class="flex flex-col">
      <view class="mx-24rpx mb-16rpx flex flex-col">
        <wd-text text="武汉理工大学座椅冠名活动募集资金将全部用于学校教育基金" color="#000a7b" size="14rpx" />
        <wd-text text="本活动为非限定性捐赠，基金会将根据学校发展战略和规划，用于母校教育事业发展" color="#000a7b" size="14rpx" />
      </view>

      <wd-card class="my-card-shadow relative z-1 !mx-24rpx" style="background: linear-gradient(to bottom, #b8d2d2 0%, white 30%, white 70%, #b8d2d2 100%)">
        <template #title>
          <view class="flex flex-col gap-2">
            <wd-text text="武汉理工大学校友专属" size="28rpx" color="black" />
            <wd-text text="天气" size="24rpx" />
            <wd-img src="http://10.86.136.242:9000/images/index_chair.png" class="right-0 top--30rpx !absolute" width="320rpx" mode="widthFix" />
          </view>
        </template>

        <template #default>
          <view class="flex gap-16rpx pb-32rpx">
            <view class="flex flex-col gap-16rpx" style="flex:2">
              <wd-text text="校友论坛" size="24rpx" color="black" class="text-shadow-xl" />
              <wd-img src="http://10.86.136.242:9000/images/index_forum.png" width="100%" class="my-img-shadow aspect-square" mode="aspectFill" radius="14rpx" @click="goForumPage()" />
            </view>

            <view class="flex flex-col gap-16rpx" style="flex:3">
              <wd-text text="VR座椅冠名" size="24rpx" color="black" class="text-shadow-xl" />
              <wd-img src="http://10.86.136.242:9000/images/index_vr.png" width="100%" height="100%" class="my-img-shadow" mode="aspectFill" radius="14rpx" @click="goVRPage()" />
            </view>
          </view>
        </template>
      </wd-card>

      <wd-grid :column="4" class="mt--96rpx bg-white px-24rpx pt-112rpx">
        <wd-grid-item v-for="(item, index) in gridItemList" :key="index">
          <template #default>
            <view class="flex flex-col items-center justify-center gap-16rpx">
              <view class="size-100rpx flex items-center justify-center rounded-lg" style="background: linear-gradient(to bottom, white 0%, #e0e6e6 25%, #e0e6e6 75%, white 100% )">
                <view :class="item.icon" class="size-60rpx color-[#5b8098]" />
              </view>

              <wd-text :text="item.text" color="black" size="24rpx" />
            </view>
          </template>
        </wd-grid-item>
      </wd-grid>

      <view class="flex flex-col bg-white py-16rpx">
        <view class="mx-40rpx w-170rpx b-1rpx border-b-solid p-4rpx">
          <wd-text text="武理快讯" class="italic" size="32rpx" color="black" bold />
        </view>
      </view>

      <wd-card v-for="(item, index) in activityList" :key="index" type="rectangle" class="!mb-0 !px-24rpx">
        <view class="flex gap-16rpx">
          <wd-img :src="item.img" width="100%" mode="widthFix" style="flex: 1" />

          <view class="flex flex-col justify-between" style="flex: 2">
            <wd-text :text="item.title" color="black" size="28rpx" />

            <view class="flex items-end justify-between">
              <wd-text :text="item.date" color="black" size="16rpx" />

              <view class="rounded bg-[#215476] px-24rpx py-8rpx">
                <wd-text text="进行中" color="white" size="24rpx" />
              </view>
            </view>
          </view>
        </view>
      </wd-card>
    </view>
  </view>
</template>

<style scoped>
.my-card-shadow {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5) !important;
}

.my-img-shadow {
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5) !important;
}
</style>
