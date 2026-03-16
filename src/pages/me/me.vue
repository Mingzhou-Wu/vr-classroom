<script lang="ts" setup>
import type { IWxPhoneLoginUser } from '@/api/login'
import type { IAuthLoginRes } from '@/api/types/login'
import { wxMiniLogin } from '@/api/login'
import { useTokenStore, useUserStore } from '@/store'
import { defaultUserInfo } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '我的',
  },
})

const tokenStore = useTokenStore()
const userStore = useUserStore()
const showSkeleton = ref(true)
const loginLoading = ref(false)
const showLoginPopup = ref(false)
const popupMode = ref<'login' | 'verify'>('login')
let skeletonTimer: ReturnType<typeof setTimeout> | null = null

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
const needsVerify = computed(() => isLogin.value && Number(user.value.verifyStatus) === 0)
const profileActionText = computed(() => {
  if (!isLogin.value)
    return '去登录'
  if (needsVerify.value)
    return '去认证'
  return '个人资料'
})

function applyToken(token: string) {
  tokenStore.setTokenInfo({
    token,
    expiresIn: 30 * 24 * 60 * 60,
  } as IAuthLoginRes)
}

function applyLoginUser(userInfo: IWxPhoneLoginUser | null) {
  if (userInfo) {
    userStore.setUserInfo(userInfo as any)
  }
}

async function handleLogin() {
  showLoginPopup.value = false

  if (isLogin.value || loginLoading.value) {
    return
  }

  loginLoading.value = true

  try {
    const loginRes = await new Promise<{ code?: string }>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      } as any)
    })

    const code = loginRes?.code
    if (!code) {
      uni.showToast({
        title: '获取登录凭证失败',
        icon: 'none',
      })
      return
    }

    const response = await wxMiniLogin({
      loginCode: code,
    })

    applyToken(response.token)
    applyLoginUser(response.user)

    if (!response.user || response.needBindPhone) {
      try {
        await userStore.fetchUserInfo()
      }
      catch (error) {
        console.warn('登录后获取用户信息失败:', error)
      }
    }

    uni.showToast({
      title: response.needBindPhone ? '登录成功，可稍后绑定手机号' : '登录成功',
      icon: 'success',
    })
  }
  catch {
    uni.showToast({
      title: '登录失败，请重试',
      icon: 'none',
    })
  }
  finally {
    loginLoading.value = false
  }
}

function handleVerify() {
}

function openAccessPopup(mode: 'login' | 'verify' = 'login') {
  popupMode.value = mode
  showLoginPopup.value = true
}

function handlePopupAction() {
  if (popupMode.value === 'verify') {
    showLoginPopup.value = false
    handleVerify()
    return
  }

  handleLogin()
}

function handleProfileAction() {
  if (!isLogin.value) {
    handleLogin()
    return
  }

  if (needsVerify.value) {
    handleVerify()
    return
  }
}

onShow(() => {
  tokenStore.updateNowTime()
})

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

const skeletonMenuList = Array.from({ length: 5 }, (_, index) => index)

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
  { key: 'order', text: '我的捐赠', icon: 'i-material-symbols-receipt-long-rounded' },
  { key: 'post', text: '我的帖子', icon: 'i-material-symbols-article-rounded' },
  { key: 'comment', text: '我的评论', icon: 'i-material-symbols-comment-rounded' },
  { key: 'likedPost', text: '我点赞的帖子', icon: 'i-material-symbols-thumb-up-rounded' },
  { key: 'likedComment', text: '我点赞的评论', icon: 'i-material-symbols-forum-rounded' },
]

function handleMenuTap(key: string) {
  if (!isLogin.value) {
    openAccessPopup('login')
    return
  }

  if (key === 'order' && needsVerify.value) {
    openAccessPopup('verify')
    return
  }

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
  <view class="min-h-screen bg-transparent">
    <wd-img src="http://10.86.136.242:9000/images/me_banner.png" class="z--1 h-420rpx w-full !fixed" mode="aspectFill" />

    <view class="h-400rpx" />

    <view v-if="showSkeleton" class="flex flex-col gap-24rpx rd-t-32rpx bg-[#f3f6f9] px-24rpx py-24rpx">
      <view class="rd-20rpx bg-[linear-gradient(160deg,#1a3f5a_0%,#215476_46%,#2f6f97_100%)] px-24rpx py-20rpx shadow-[0_12rpx_28rpx_rgba(33,84,118,0.22)]">
        <view class="flex items-center gap-24rpx">
          <view class="h-128rpx w-128rpx rd-full bg-[#dbe8f1]" />

          <view class="flex flex-1 items-center justify-between gap-16rpx">
            <view class="min-w-0 flex flex-col justify-center gap-12rpx">
              <view class="h-30rpx w-180rpx rd-full bg-[#d5e4ee]" />
              <view class="h-20rpx w-140rpx rd-full bg-[#e5eef5]" />
            </view>

            <view class="h-64rpx w-140rpx rd-full bg-[#d7e8f2]" />
          </view>
        </view>
      </view>

      <view class="rd-20rpx bg-white px-24rpx py-10rpx shadow-[0_6rpx_14rpx_rgba(33,84,118,0.1)]">
        <view class="h-72rpx flex items-center justify-between">
          <view class="h-28rpx w-120rpx rd-full bg-[#d5e4ee]" />
          <view class="h-20rpx w-72rpx rd-full bg-[#e5eef5]" />
        </view>

        <view
          v-for="item in skeletonMenuList"
          :key="`skeleton-menu-${item}`"
          class="h-84rpx flex items-center justify-between"
          :class="item !== skeletonMenuList.length - 1 ? 'b-b-1rpx b-b-solid b-b-[#edf2f6]' : ''"
        >
          <view class="flex items-center gap-14rpx">
            <view class="size-34rpx rd-full bg-[#dbe8f1]" />
            <view class="h-24rpx w-140rpx rd-full bg-[#e5eef5]" />
          </view>
          <view class="h-24rpx w-24rpx rd-full bg-[#edf3f7]" />
        </view>
      </view>
    </view>

    <view v-else class="flex flex-col gap-24rpx rd-t-32rpx bg-[#f3f6f9] px-24rpx py-24rpx">
      <view class="rd-20rpx bg-[linear-gradient(160deg,#1a3f5a_0%,#215476_46%,#2f6f97_100%)] px-24rpx py-20rpx shadow-[0_12rpx_28rpx_rgba(33,84,118,0.22)]">
        <view class="flex items-center gap-24rpx">
          <wd-img :src="user.avatar" class="h-128rpx w-128rpx b-4rpx b-white rd-full b-solid" mode="aspectFill" />

          <view class="flex flex-1 items-center justify-between gap-16rpx">
            <view class="min-w-0 flex flex-col justify-center gap-10rpx">
              <wd-text :text="user.name" size="36rpx" color="white" />
              <wd-text :text="user.collegeName || '未设置学院'" size="20rpx" color="rgba(255,255,255,0.76)" />
            </view>

            <wd-button class="!h-64rpx !rd-full !px-24rpx" custom-style="background: #ffffff; border-color: rgba(255,255,255,0.36); color: #215476; box-shadow: 0 8rpx 18rpx rgba(8,37,58,0.18);" size="small" :loading="loginLoading" @tap="handleProfileAction">
              <wd-text :text="profileActionText" size="24rpx" color="#215476" />
            </wd-button>
          </view>
        </view>
      </view>

      <view class="rd-20rpx bg-white px-24rpx py-10rpx shadow-[0_6rpx_14rpx_rgba(33,84,118,0.1)]">
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
          <view class="i-material-symbols-chevron-right-rounded size-34rpx color-[#94a3b8]" />
        </view>
      </view>
    </view>

    <wd-popup
      v-model="showLoginPopup"
      position="center"
      :close-on-click-modal="true"
      :show-close-icon="false"
      custom-style="border-radius: 28rpx; overflow: hidden; background: transparent;"
    >
      <view class="max-w-[calc(100vw-64rpx)] w-620rpx flex flex-col overflow-hidden rd-28rpx bg-[linear-gradient(180deg,#f8fbfd_0%,#edf4f8_100%)] p-32rpx shadow-[0_18rpx_40rpx_rgba(33,84,118,0.18)]">
        <wd-text :text="popupMode === 'verify' ? '认证后即可继续' : '登录后即可继续'" size="34rpx" color="#16364d" custom-class="font-600 leading-[1.4]" />
        <wd-text :text="popupMode === 'verify' ? '需要先登录账号才可继续查看我的捐赠' : '需要先登录账号才可继续查看和使用我的服务。'" size="24rpx" color="#4b5563" custom-class="mt-16rpx leading-[1.7]" />
        <button
          class="mt-32rpx h-84rpx w-full rd-full border-none bg-[#215476] text-28rpx color-white font-600 line-height-[84rpx]"
          @tap="handlePopupAction"
        >
          {{ popupMode === 'verify' ? '去认证' : '去登录' }}
        </button>
      </view>
    </wd-popup>
  </view>
</template>