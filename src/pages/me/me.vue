<script lang="ts" setup>
import { useTokenStore, useUserStore } from '@/store'
import { defaultUserInfo } from '@/store/user'
import { getEnvBaseUrl } from '@/utils'

definePage({
  style: {
    navigationBarTitleText: '我的',
  },
})

const tokenStore = useTokenStore()
const userStore = useUserStore()
const apiBaseUrl = getEnvBaseUrl()
const showSkeleton = ref(true)
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

async function handleLogin() {
  console.log('[me] 点击去登录按钮')
  if (isLogin.value) {
    console.log('[me] 当前已登录，跳过登录流程')
    return
  }

  try {
    const loginRes = await new Promise<{ code?: string }>((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject,
      } as any)
    })

    const code = loginRes?.code
    console.log('[me] wx.login 返回 code:', code)
    if (!code) {
      uni.showToast({
        title: '获取登录凭证失败',
        icon: 'none',
      })
      return
    }

    const loginUrl = `${apiBaseUrl}/api/users/login`
    console.log('[me] 准备请求登录接口:', loginUrl)

    // const response = await new Promise<any>((resolve, reject) => {
    //   uni.request({
    //     url: loginUrl,
    //     method: 'POST',
    //     data: {
    //       loginCode: code,
    //     },
    //     success: (res) => {
    //       console.log('[me] 登录接口原始响应:', res)
    //       resolve((res.data as any)?.data ?? res.data)
    //     },
    //     fail: (err) => {
    //       console.log('[me] 登录接口请求失败:', err)
    //       reject(err)
    //     },
    //   })
    // })
    // console.log('用户登录返回:', response)
  }
  catch (error) {
    console.log('[me] 登录 catch:', error)
    console.error('登录失败:', error)
    uni.showToast({
      title: '登录失败，请重试',
      icon: 'none',
    })
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
  { key: 'order', text: '我的捐赠记录', icon: 'i-material-symbols-receipt-long-rounded' },
  { key: 'post', text: '我的帖子', icon: 'i-material-symbols-article-rounded' },
  { key: 'comment', text: '我的评论', icon: 'i-material-symbols-comment-rounded' },
  { key: 'likedPost', text: '我点赞的帖子', icon: 'i-material-symbols-thumb-up-rounded' },
  { key: 'likedComment', text: '我点赞的评论', icon: 'i-material-symbols-forum-rounded' },
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

    <view v-if="showSkeleton" class="flex flex-col gap-24rpx rd-t-32rpx bg-[#f3f6f9] px-24rpx py-24rpx">
      <view class="rd-20rpx bg-[#edf4f8] px-24rpx py-20rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.1)">
        <view class="flex items-center gap-24rpx">
          <view class="h-128rpx w-128rpx rd-full bg-[#dbe8f1]" />

          <view class="flex flex-1 items-center justify-between gap-16rpx">
            <view class="min-w-0 flex flex-col justify-center gap-12rpx">
              <view class="h-30rpx w-180rpx rd-full bg-[#d5e4ee]" />
              <view class="h-20rpx w-140rpx rd-full bg-[#e5eef5]" />
              <view class="h-56rpx w-120rpx rd-full bg-[#e7eff5]" />
            </view>

            <view class="h-64rpx w-140rpx rd-full bg-[#d7e8f2]" />
          </view>
        </view>
      </view>

      <view class="rd-20rpx bg-white px-24rpx py-10rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.1)">
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
      <view class="rd-20rpx bg-[#edf4f8] px-24rpx py-20rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.1)">
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
                @tap="handleLogin"
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
          <view class="i-material-symbols-chevron-right-rounded size-34rpx color-[#94a3b8]" />
        </view>
      </view>
    </view>
  </view>
</template>



