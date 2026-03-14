<script lang="ts" setup>
import { useTokenStore, useUserStore } from '@/store'
import { defaultUserInfo } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '我的',
  },
})

const tokenStore = useTokenStore()
const userStore = useUserStore()

const isLogin = computed(() => tokenStore.updateNowTime().hasLogin)
const user = computed(() => {
  const loginUser = userStore.userInfo as any
  return {
    ...defaultUserInfo,
    ...loginUser,
    name: isLogin.value ? (loginUser.name || loginUser.nickname || defaultUserInfo.name) : defaultUserInfo.name,
    avatar: isLogin.value ? (loginUser.avatar || defaultUserInfo.avatar) : defaultUserInfo.avatar,
  }
})

async function handleLogin() {
  if (isLogin.value)
    return

  await tokenStore.wxPhoneLogin('13800138001')
}

onShow(() => {
  tokenStore.updateNowTime()
})

function goUserPostPage() {
  uni.navigateTo({
    url: '/pages-sub/post/userPost?page=1',
  })
}
function goUserCommentPage() {
  uni.navigateTo({
    url: '/pages-sub/post/userComment?page=1',
  })
}

function goLikedPostPage() {
  uni.navigateTo({
    url: '/pages-sub/post/likedPost?page=1',
  })
}

function goLikedCommentPage() {
  uni.navigateTo({
    url: '/pages-sub/post/likedComment?page=1',
  })
}

function goUserOrderPage() {
  uni.navigateTo({
    url: '/pages-sub/order/userOrder?page=1',
  })
}

const menuList = [
  { key: 'order', text: '我的捐赠记录', icon: 'i-mdi-receipt-text-outline' },
  { key: 'post', text: '我的帖子', icon: 'i-mdi-post-outline' },
  { key: 'comment', text: '我的评论', icon: 'i-mdi-comment-processing-outline' },
  { key: 'likedPost', text: '我点赞的帖子', icon: 'i-mdi-thumb-up-outline' },
  { key: 'likedComment', text: '我点赞的评论', icon: 'i-mdi-message-reply-text-outline' },
]

function handleMenuTap(key: string) {
  if (key === 'order')
    return goUserOrderPage()
  if (key === 'post')
    return goUserPostPage()
  if (key === 'comment')
    return goUserCommentPage()
  if (key === 'likedPost')
    return goLikedPostPage()
  if (key === 'likedComment')
    return goLikedCommentPage()
}
</script>

<template>
  <view class="bg-transparent">
    <wd-img src="http://10.86.136.242:9000/images/me_banner.png" class="z--1 h-420rpx w-full !fixed" mode="aspectFill" />

    <view class="h-400rpx" />

    <view class="flex flex-col gap-24rpx rd-t-32rpx bg-[#f3f6f9] px-24rpx py-24rpx">
      <view class="rd-20rpx bg-[linear-gradient(165deg,#d4e5ed_0%,#ffffff_38%,#d8e8ef_100%)] px-24rpx py-20rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.1)">
        <view class="flex items-center gap-24rpx">
          <wd-img :src="user.avatar" class="h-128rpx w-128rpx b-4rpx b-white rd-full b-solid" mode="aspectFill" />

          <view class="flex flex-1 items-center justify-between gap-16rpx">
            <view class="min-w-0 flex flex-col justify-center gap-10rpx">
              <wd-text :text="user.name" size="36rpx" color="#215476" />
              <wd-text :text="user.collegeName || '未设置学院'" size="20rpx" color="#4b5563" />

              <wd-button
                v-if="!isLogin"
                class="!h-56rpx !b-[#215476] !rd-full !px-20rpx"
                size="small"
                plain
                type="info"
                @click="handleLogin"
              >
                <wd-text text="去登录" size="22rpx" color="#215476" />
              </wd-button>

              <view v-else class="h-56rpx w-max flex items-center rd-full bg-[#e7eff5] px-18rpx">
                <wd-text text="已登录" size="22rpx" color="#215476" />
              </view>
            </view>

            <wd-button class="!h-64rpx !rd-full !bg-[#215476] !px-24rpx" size="small">
              <wd-text text="个人资料" size="24rpx" color="white" />
            </wd-button>
          </view>
        </view>
      </view>

      <view class="rd-20rpx bg-white px-24rpx py-10rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.1)">
        <view class="h-72rpx flex items-center justify-between">
          <wd-text text="我的服务" size="30rpx" color="#215476" />
          <wd-text text="共5项" size="20rpx" color="#6b7280" />
        </view>

        <view
          v-for="(item, index) in menuList"
          :key="item.key"
          class="h-84rpx flex items-center justify-between"
          :class="index !== menuList.length - 1 ? 'b-b-1rpx b-b-solid b-b-[#edf2f6]' : ''"
          @tap="handleMenuTap(item.key)"
        >
          <view class="flex items-center gap-14rpx">
            <view :class="item.icon" class="size-34rpx color-[#215476]" />
            <wd-text :text="item.text" size="28rpx" color="#1f2937" />
          </view>
          <view class="i-mdi-chevron-right size-34rpx color-[#94a3b8]" />
        </view>
      </view>
    </view>
  </view>
</template>
