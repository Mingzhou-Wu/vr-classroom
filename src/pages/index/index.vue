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
const showSkeleton = ref(true)
let skeletonTimer: ReturnType<typeof setTimeout> | null = null

onPageScroll((e) => {
  navBarOpacity.value = Math.min(e.scrollTop / 300, 1)
})

const skeletonQuickList = Array.from({ length: 8 }, (_, index) => index)
const skeletonNewsList = Array.from({ length: 2 }, (_, index) => index)

onReady(() => {
  skeletonTimer = setTimeout(() => {
    showSkeleton.value = false
  }, 500)
})

onUnload(() => {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
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
  <view class="min-h-screen bg-transparent">
    <view
      class="z-10 w-full !fixed"
      :style="{ backgroundColor: `rgba(255, 255, 255, ${navBarOpacity})`, backdropFilter: 'blur(6rpx)', WebkitBackdropFilter: 'blur(6rpx)' }"
    >
      <wd-img src="http://10.86.136.242:9000/images/index_navbar.png" class="my-16rpx ml-16rpx h-60rpx" mode="heightFix" />
    </view>

    <wd-img src="http://10.86.136.242:9000/images/index_banner.png" class="z-0 h-550rpx w-full !fixed" mode="aspectFill" />

    <view class="h-350rpx" />

    <view v-if="showSkeleton" class="relative z-1 flex flex-col bg-[linear-gradient(180deg,rgba(243,246,249,0)_0%,#f3f6f9_14%,#f3f6f9_100%)] pb-24rpx">
      <view class="mx-24rpx mb-16rpx flex flex-col gap-10rpx b-l-6rpx b-l-[#c9dceb] b-l-solid pl-12rpx">
        <view class="h-20rpx w-88% rd-full bg-[#dbe8f1]" />
        <view class="h-20rpx w-76% rd-full bg-[#e6eff5]" />
      </view>

      <view class="mx-24rpx rd-20rpx bg-[linear-gradient(165deg,#dbe8f1_0%,#f8fbfd_38%,#e5eef5_100%)] px-24rpx pb-28rpx pt-20rpx" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.08)">
        <view class="flex flex-col gap-10rpx">
          <view class="h-28rpx w-200rpx rd-full bg-[#d3e3ee]" />
          <view class="h-22rpx w-84rpx rd-full bg-[#e2edf4]" />
        </view>

        <view class="mt-20rpx flex gap-16rpx">
          <view class="flex flex-[2] flex-col gap-16rpx">
            <view class="h-24rpx w-110rpx rd-full bg-[#d8e8f1]" />
            <view class="aspect-square rd-14rpx bg-[#dfeaf2]" />
          </view>

          <view class="flex flex-[3] flex-col gap-16rpx">
            <view class="h-24rpx w-136rpx rd-full bg-[#d8e8f1]" />
            <view class="h-full min-h-260rpx rd-14rpx bg-[#dfeaf2]" />
          </view>
        </view>
      </view>

      <view class="mx-24rpx mt-16rpx flex flex-col overflow-hidden rd-20rpx bg-white px-16rpx pb-12rpx pt-14rpx" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.08)">
        <view class="mb-12rpx h-34rpx w-210rpx rd-full bg-[#dbe8f1]" />

        <view class="grid grid-cols-4 gap-y-18rpx">
          <view v-for="item in skeletonQuickList" :key="`skeleton-quick-${item}`" class="flex flex-col items-center gap-16rpx py-6rpx">
            <view class="size-100rpx rd-20rpx bg-[#eef4f8]" />
            <view class="h-22rpx w-88rpx rd-full bg-[#dbe8f1]" />
          </view>
        </view>
      </view>

      <view class="mx-24rpx mt-16rpx flex flex-col overflow-hidden rd-20rpx bg-white px-16rpx pb-8rpx pt-14rpx" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.08)">
        <view class="mb-12rpx h-34rpx w-210rpx rd-full bg-[#dbe8f1]" />

        <view class="flex flex-col gap-0">
          <view
            v-for="item in skeletonNewsList"
            :key="`skeleton-news-${item}`"
            class="flex gap-16rpx py-18rpx"
            :class="item !== skeletonNewsList.length - 1 ? 'b-b-1rpx b-b-solid b-b-[#e8eef3]' : ''"
          >
            <view class="h-160rpx w-220rpx shrink-0 rd-14rpx bg-[#e5eef5]" />

            <view class="min-w-0 flex flex-1 flex-col justify-between">
              <view class="flex flex-col gap-10rpx">
                <view class="h-26rpx w-92% rd-full bg-[#d8e8f1]" />
                <view class="h-20rpx w-100% rd-full bg-[#e7eff5]" />
                <view class="h-20rpx w-68% rd-full bg-[#edf3f7]" />
              </view>

              <view class="mt-12rpx flex items-center justify-between gap-10rpx">
                <view class="h-20rpx w-96rpx rd-full bg-[#e1ebf3]" />
                <view class="h-40rpx w-100rpx rd-full bg-[#dbe8f1]" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="relative z-1 flex flex-col bg-[linear-gradient(180deg,rgba(243,246,249,0)_0%,#f3f6f9_14%,#f3f6f9_100%)] pb-24rpx">
      <view class="mx-24rpx mb-16rpx flex flex-col b-l-6rpx b-l-[#215476] b-l-solid pl-12rpx">
        <wd-text text="武汉理工大学座椅冠名活动募集资金将全部用于学校教育基金" color="#374151" size="14rpx" />
        <wd-text text="本活动为非限定性捐赠，基金会将根据学校发展战略和规划，用于母校教育事业发展" color="#374151" size="14rpx" />
      </view>

      <wd-card class="relative z-1 bg-[linear-gradient(165deg,#d4e5ed_0%,#ffffff_34%,#ffffff_72%,#d8e8ef_100%)] !mx-24rpx !mb-0 !rd-20rpx" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.1)">
        <template #title>
          <view class="flex flex-col gap-2">
            <wd-text text="武汉理工大学校友专属" size="28rpx" color="#215476" />
            <wd-text text="天气" size="24rpx" color="#374151" />
            <wd-img src="http://10.86.136.242:9000/images/index_chair.png" class="right-0 top--30rpx !absolute" width="320rpx" mode="widthFix" />
          </view>
        </template>

        <template #default>
          <view class="flex gap-16rpx pb-32rpx">
            <view class="flex flex-[2] flex-col gap-16rpx">
              <wd-text text="校友论坛" size="24rpx" color="#215476" class="[text-shadow:0_2rpx_8rpx_rgba(33,84,118,0.16)]" />
              <wd-img src="http://10.86.136.242:9000/images/index_forum.png" width="100%" class="aspect-square" style="box-shadow: 0 8rpx 18rpx rgba(33,84,118,0.22)" mode="aspectFill" radius="14rpx" @click="goForumPage()" />
            </view>

            <view class="flex flex-[3] flex-col gap-16rpx">
              <wd-text text="VR教室" size="24rpx" color="#215476" class="[text-shadow:0_2rpx_8rpx_rgba(33,84,118,0.16)]" />
              <wd-img src="http://10.86.136.242:9000/images/index_vr.png" width="100%" height="100%" style="box-shadow: 0 8rpx 18rpx rgba(33,84,118,0.22)" mode="aspectFill" radius="14rpx" @click="goVRPage()" />
            </view>
          </view>
        </template>
      </wd-card>

      <view class="mx-24rpx mt-16rpx flex flex-col overflow-hidden rd-20rpx bg-white px-16rpx pb-8rpx pt-14rpx" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.08)">
        <view class="mb-8rpx w-210rpx b-1rpx b-[#215476] b-b-solid p-4rpx">
          <wd-text text="快捷功能" class="italic" size="32rpx" color="#215476" bold />
        </view>

        <wd-grid :column="4" class="bg-transparent">
          <wd-grid-item v-for="(item, index) in gridItemList" :key="index">
            <template #default>
              <view class="flex flex-col items-center justify-center gap-16rpx">
                <view class="relative size-100rpx flex items-center justify-center rd-20rpx bg-[#eef4f8]">
                  <view :class="item.icon" class="size-52rpx color-[#215476]" />
                </view>

                <wd-text :text="item.text" color="#215476" size="24rpx" />
              </view>
            </template>
          </wd-grid-item>
        </wd-grid>
      </view>

      <view class="mx-24rpx mt-16rpx flex flex-col overflow-hidden rd-20rpx bg-white px-16rpx pb-8rpx pt-14rpx" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.08)">
        <view class="mb-8rpx w-210rpx b-1rpx b-[#215476] b-b-solid p-4rpx">
          <wd-text text="武理快讯" class="italic" size="32rpx" color="#215476" bold />
        </view>

        <view class="flex flex-col gap-0">
          <view
            v-for="(item, index) in activityList"
            :key="index"
            class="flex gap-16rpx rd-0 bg-transparent py-18rpx"
            :class="index !== activityList.length - 1 ? 'b-b-1rpx b-b-solid b-b-[#e8eef3]' : ''"
          >
            <wd-img :src="item.img" width="220rpx" height="160rpx" mode="aspectFill" radius="14rpx" class="shrink-0" />

            <view class="min-w-0 flex flex-1 flex-col justify-between">
              <view class="text-28rpx text-[#215476] font-600 leading-[1.35]">
                {{ item.title }}
              </view>
              <view class="mt-8rpx text-20rpx text-[#4b5563] leading-[1.45]">
                校友公益活动持续进行中，欢迎查看项目进展与参与方式。
              </view>

              <view class="mt-12rpx flex items-center justify-between gap-10rpx">
                <view class="flex items-center gap-6rpx">
                  <view class="i-mdi-clock-time-four-outline h-22rpx w-22rpx color-[#6b7280]" />
                  <wd-text :text="item.date" color="#4b5563" size="20rpx" />
                </view>

                <view
                  class="rd-full px-18rpx py-6rpx text-20rpx font-600"
                  :class="index === 0 ? 'bg-[#215476] color-white' : 'bg-[#e8eef3] color-[#486074]'"
                >
                  {{ index === 0 ? '进行中' : '已发布' }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
