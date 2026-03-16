<script lang="ts" setup>
import { useTokenStore, useUserStore } from '@/store'
import { defaultUserInfo } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '个人资料',
  },
})

const tokenStore = useTokenStore()
const userStore = useUserStore()
const loading = ref(true)
const refreshing = ref(false)

const isLogin = computed(() => tokenStore.updateNowTime().hasLogin)
const user = computed(() => {
  const loginUser = userStore.userInfo as any
  return {
    ...defaultUserInfo,
    ...loginUser,
    name: loginUser.name || loginUser.nickname || defaultUserInfo.name,
    avatar: loginUser.avatar || defaultUserInfo.avatar,
    phone: loginUser.phone || '',
    collegeName: loginUser.collegeName || '暂未填写学院信息',
  }
})

function maskPhone(phone?: string) {
  const value = String(phone || '')
  if (!value)
    return '暂未绑定'
  if (value.length < 7)
    return value
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

async function refreshProfile() {
  if (!isLogin.value) {
    loading.value = false
    return
  }

  refreshing.value = true
  try {
    await userStore.fetchUserInfo()
  }
  catch (error) {
    console.warn('获取个人资料失败:', error)
    uni.showToast({
      title: '获取个人资料失败',
      icon: 'none',
    })
  }
  finally {
    loading.value = false
    refreshing.value = false
  }
}

function goMePage() {
  uni.switchTab({
    url: '/pages/me/me',
  })
}

onShow(() => {
  refreshProfile()
})
</script>

<template>
  <view class="min-h-screen bg-[#f3f6f9]">
    <wd-img src="http://10.86.136.242:9000/images/me_banner.png" class="z--1 h-260rpx w-full !fixed" mode="aspectFill" />

    <view class="h-80rpx" />

    <view v-if="!isLogin" class="px-24rpx pb-32rpx">
      <view class="rd-24rpx bg-white px-28rpx py-36rpx text-center shadow-[0_12rpx_28rpx_rgba(33,84,118,0.12)]">
        <wd-text text="登录后查看个人资料" size="32rpx" color="#16364d" custom-class="font-600" />
        <wd-text text="前往“我的”页面登录后，即可查看你的账号信息。" size="24rpx" color="#64748b" custom-class="mt-16rpx leading-[1.7]" />
        <wd-button class="mt-28rpx !h-80rpx !rd-full !border-none !bg-[linear-gradient(135deg,#2d6a90_0%,#215476_100%)] !text-26rpx" block @click="goMePage">
          返回我的页面
        </wd-button>
      </view>
    </view>

    <view v-else class="px-24rpx pb-36rpx">
      <view class="overflow-hidden rd-24rpx bg-white shadow-[0_10rpx_24rpx_rgba(33,84,118,0.1)]">
        <view class="b-b-1rpx b-b-[#edf2f6] b-b-solid px-24rpx py-22rpx">
          <wd-text text="个人资料" size="30rpx" color="#16364d" custom-class="font-600" />
        </view>

        <view v-if="loading" class="px-24rpx py-10rpx">
          <view v-for="item in 4" :key="`profile-skeleton-${item}`" class="flex items-center gap-16rpx py-22rpx" :class="item !== 4 ? 'b-b-1rpx b-b-solid b-b-[#edf2f6]' : ''">
            <view class="h-76rpx w-76rpx rd-20rpx bg-[#edf4f8]" />
            <view class="min-w-0 flex-1">
              <view class="h-24rpx w-120rpx rd-full bg-[#dbe8f1]" />
              <view class="mt-12rpx h-28rpx w-220rpx rd-full bg-[#eef4f8]" />
            </view>
          </view>
        </view>

        <view v-else class="px-24rpx py-10rpx">
          <view class="flex items-center justify-between gap-18rpx b-b-1rpx b-b-[#edf2f6] b-b-solid py-22rpx">
            <wd-text text="头像" size="24rpx" color="#6b7280" />
            <wd-img :src="user.avatar" class="h-88rpx w-88rpx shrink-0 b-2rpx b-[#edf2f6] rd-full b-solid" mode="aspectFill" />
          </view>

          <view class="flex items-center justify-between gap-18rpx b-b-1rpx b-b-[#edf2f6] b-b-solid py-22rpx">
            <wd-text text="姓名" size="24rpx" color="#6b7280" />
            <wd-text :text="user.name || '未填写'" size="28rpx" color="#16364d" custom-class="font-600 text-right" />
          </view>

          <view class="flex items-center justify-between gap-18rpx b-b-1rpx b-b-[#edf2f6] b-b-solid py-22rpx">
            <wd-text text="手机号" size="24rpx" color="#6b7280" />
            <wd-text :text="maskPhone(user.phone)" size="28rpx" color="#16364d" custom-class="font-600 text-right" />
          </view>

          <view class="flex items-center justify-between gap-18rpx py-22rpx">
            <wd-text text="学院" size="24rpx" color="#6b7280" />
            <wd-text :text="user.collegeName || '暂未填写学院信息'" size="28rpx" color="#16364d" custom-class="font-600 text-right" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
