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
  <view class="bg-transparent">
    <view class="z-10 w-full backdrop-blur-[6rpx] !fixed" :style="{ backgroundColor: `rgba(255, 255, 255, ${navBarOpacity})` }">
      <wd-img src="http://10.86.136.242:9000/images/index_navbar.png" class="my-16rpx ml-16rpx h-60rpx" mode="heightFix" />
    </view>

    <wd-img src="http://10.86.136.242:9000/images/index_banner.png" class="z--1 h-550rpx w-full !fixed" mode="aspectFill" />

    <view class="h-350rpx" />

    <view class="flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,#ffffff_14%,#ffffff_100%)]">
      <view class="mx-24rpx mb-16rpx flex flex-col b-l-6rpx b-l-[#215476] b-l-solid pl-12rpx">
        <wd-text text="武汉理工大学座椅冠名活动募集资金将全部用于学校教育基金" color="#374151" size="14rpx" />
        <wd-text text="本活动为非限定性捐赠，基金会将根据学校发展战略和规划，用于母校教育事业发展" color="#374151" size="14rpx" />
      </view>

      <wd-card class="relative z-1 bg-[linear-gradient(165deg,#d4e5ed_0%,#ffffff_34%,#ffffff_72%,#d8e8ef_100%)] !mx-24rpx !rd-20rpx !shadow-[0_4rpx_12rpx_rgba(33,84,118,0.1)]">
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
              <wd-img src="http://10.86.136.242:9000/images/index_forum.png" width="100%" class="aspect-square shadow-[0_8rpx_18rpx_rgba(33,84,118,0.22)]" mode="aspectFill" radius="14rpx" @click="goForumPage()" />
            </view>

            <view class="flex flex-[3] flex-col gap-16rpx">
              <wd-text text="VR座椅冠名" size="24rpx" color="#215476" class="[text-shadow:0_2rpx_8rpx_rgba(33,84,118,0.16)]" />
              <wd-img src="http://10.86.136.242:9000/images/index_vr.png" width="100%" height="100%" class="shadow-[0_8rpx_18rpx_rgba(33,84,118,0.22)]" mode="aspectFill" radius="14rpx" @click="goVRPage()" />
            </view>
          </view>
        </template>
      </wd-card>

      <wd-grid :column="4" class="mt--96rpx rd-tl-28rpx rd-tr-28rpx bg-white px-24rpx pt-112rpx">
        <wd-grid-item v-for="(item, index) in gridItemList" :key="index">
          <template #default>
            <view class="flex flex-col items-center justify-center gap-16rpx">
              <view class="relative size-100rpx flex items-center justify-center rd-20rpx bg-[#eef4f8]">
                <view class="size-74rpx flex items-center justify-center rd-18rpx bg-[linear-gradient(150deg,#f6fbff_0%,#e4eef5_100%)] shadow-[inset_0_1rpx_0_rgba(255,255,255,0.9)]">
                  <view :class="item.icon" class="size-46rpx color-[#215476]" />
                </view>
              </view>

              <wd-text :text="item.text" color="#215476" size="24rpx" />
            </view>
          </template>
        </wd-grid-item>
      </wd-grid>

      <view class="flex flex-col bg-white py-16rpx">
        <view class="mx-40rpx w-210rpx b-1rpx b-[#215476] b-b-solid p-4rpx">
          <wd-text text="武理快讯" class="italic" size="32rpx" color="#215476" bold />
        </view>
      </view>

      <view class="flex flex-col gap-0 overflow-hidden rd-12rpx bg-white px-24rpx pb-8rpx">
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
</template>
