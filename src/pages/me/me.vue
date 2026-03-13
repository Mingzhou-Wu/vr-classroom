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
</script>

<template>
  <view>
    <wd-img src="http://10.86.136.242:9000/images/me_banner.png" class="z--1 h-420rpx w-full !fixed" mode="aspectFill" />

    <view class="h-400rpx" />

    <view class="flex flex-col gap-24rpx rd-t-xl bg-white px-48rpx py-36rpx">
      <view class="flex gap-40rpx pb-12rpx">
        <wd-img :src="user.avatar" class="h-128rpx" mode="heightFix" />

        <view class="flex flex-1 items-center justify-between">
          <view class="flex flex-col justify-center gap-12rpx">
            <wd-text :text="user.name" size="36rpx" color="black" />

            <wd-button
              v-if="!isLogin"
              size="small"
              plain
              type="info"
              @click="handleLogin"
            >
              <wd-text text="去登录" size="24rpx" />
            </wd-button>

            <wd-button v-else size="small" plain type="info">
              <wd-text :text="isLogin ? '已登录' : '去登录'" size="24rpx" />
            </wd-button>
          </view>

          <wd-button class="!bg-[#215476]" size="small">
            <wd-text text="个人资料" size="28rpx" color="white" />
          </wd-button>
        </view>
      </view>

      <wd-gap bg-color="#eeeeee" class="!mx--48rpx" />

      <view>
        <view class="h-72rpx flex items-center justify-between" @tap="goUserOrderPage">
          <wd-text text="我的捐赠记录" size="30rpx" color="black" />
          <wd-text text=">" size="36rpx" color="gray" />
        </view>

        <view class="h-72rpx flex items-center justify-between" @tap="goUserPostPage">
          <wd-text text="我的帖子" size="30rpx" color="black" />
          <wd-text text=">" size="36rpx" color="gray" />
        </view>

        <view class="h-72rpx flex items-center justify-between" @tap="goUserCommentPage">
          <wd-text text="我的评论" size="30rpx" color="black" />
          <wd-text text=">" size="36rpx" color="gray" />
        </view>

        <view class="h-72rpx flex items-center justify-between" @tap="goLikedPostPage">
          <wd-text text="我点赞的帖子" size="30rpx" color="black" />
          <wd-text text=">" size="36rpx" color="gray" />
        </view>

        <view class="h-72rpx flex items-center justify-between" @tap="goLikedCommentPage">
          <wd-text text="我点赞的评论" size="30rpx" color="black" />
          <wd-text text=">" size="36rpx" color="gray" />
        </view>
      </view>
    </view>
  </view>
</template>
