<script lang="ts" setup>
import type { IGetOrdersResponse, IOrderData, IOrderSeat } from '@/api/orders'
import { getOrders } from '@/api/orders'

definePage({
  style: {
    navigationBarTitleText: '我的捐赠记录',
  },
})

const loading = ref(false)
const loadingMore = ref(false)
const orderList = ref<IOrderData[]>([])
const currentPage = ref(1)
const totalPage = ref(1)
const nowTs = ref(Date.now())
const pageScrollTop = ref(0)
const PAGE_SCROLL_SYNC_INTERVAL_MS = 100
const lastPageScrollSyncAt = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

onPageScroll((e) => {
  const now = Date.now()
  if (e.scrollTop > 0 && now - lastPageScrollSyncAt.value < PAGE_SCROLL_SYNC_INTERVAL_MS)
    return

  pageScrollTop.value = e.scrollTop
  lastPageScrollSyncAt.value = now
})

function normalizeOrders(response: IGetOrdersResponse | undefined) {
  return response?.records || []
}

function formatDateText(dateText?: string) {
  if (!dateText)
    return '-'
  return String(dateText)
}

function formatAmount(amount?: number) {
  return `¥${((Number(amount || 0)) / 100).toFixed(2)}`
}

function formatSeatPrice(price?: number) {
  return `¥${((Number(price || 0)) / 100).toFixed(2)}`
}

function getOrderStatusText(status?: string) {
  const value = String(status || '').toUpperCase()
  if (['PAID', 'SUCCESS', 'COMPLETED', 'FINISHED'].includes(value))
    return '已支付'
  if (['PENDING', 'UNPAID', 'WAIT_PAY', 'CREATED'].includes(value))
    return '待支付'
  if (['CANCELLED'].includes(value))
    return '已取消'
  if (['EXPIRED'].includes(value))
    return '已过期'
  if (['FAILED'].includes(value))
    return '支付失败'
  if (['CLOSED'].includes(value))
    return '已关闭'
  return '未知状态'
}

function isPendingStatus(status?: string) {
  const value = String(status || '').toUpperCase()
  return ['PENDING', 'UNPAID', 'WAIT_PAY', 'CREATED'].includes(value)
}

function getOrderStatusClass(status?: string) {
  const value = String(status || '').toUpperCase()
  if (['PAID', 'SUCCESS', 'COMPLETED', 'FINISHED'].includes(value))
    return 'bg-#2d8c4d'
  if (['PENDING', 'UNPAID', 'WAIT_PAY', 'CREATED'].includes(value))
    return 'bg-#e6a23c'
  if (['CANCELLED', 'EXPIRED', 'CLOSED', 'FAILED'].includes(value))
    return 'bg-#d03050'
  return 'bg-#666666'
}

function getSeatText(seat: IOrderSeat) {
  const rowText = Number(seat.row || 0)
  const colText = Number(seat.col || 0)
  if (rowText > 0 && colText > 0)
    return `${rowText}排${colText}座`
  return '座位信息未知'
}

function getExpireCountdownText(order: IOrderData) {
  if (!isPendingStatus(order.status))
    return ''
  if (!order.expiresAt)
    return '还剩 00:00 过期'

  const expireTs = new Date(order.expiresAt).getTime()
  if (Number.isNaN(expireTs))
    return '还剩 00:00 过期'

  const diffMs = Math.max(expireTs - nowTs.value, 0)

  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `还剩 ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} 过期`
}

function startCountdownTimer() {
  if (countdownTimer)
    return
  countdownTimer = setInterval(() => {
    nowTs.value = Date.now()
  }, 1000)
}

function stopCountdownTimer() {
  if (!countdownTimer)
    return
  clearInterval(countdownTimer)
  countdownTimer = null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message)
    return error.message
  const errorObj = error as Record<string, any>
  return errorObj?.message || errorObj?.msg || errorObj?.data?.message || errorObj?.data?.msg || '获取捐赠记录失败'
}

async function fetchOrderList() {
  await fetchOrderListByPage(1, false)
}

async function fetchOrderListByPage(page: number, append: boolean) {
  if (append)
    loadingMore.value = true
  else
    loading.value = true

  try {
    const response = await getOrders(page)
    const records = normalizeOrders(response)

    currentPage.value = Number(response?.current || page)
    totalPage.value = Number(response?.total || currentPage.value)

    orderList.value = append
      ? [...orderList.value, ...records]
      : records
  }
  catch (error) {
    console.error('获取捐赠记录失败', error)
    if (!append)
      orderList.value = []
    uni.showToast({
      title: getErrorMessage(error),
      icon: 'none',
    })
  }
  finally {
    if (append)
      loadingMore.value = false
    else
      loading.value = false
  }
}

const loadMoreState = computed(() => {
  if (loadingMore.value)
    return 'loading'
  if (currentPage.value < totalPage.value)
    return 'loading'
  return 'finished'
})

onLoad(() => {
  currentPage.value = 1
  totalPage.value = 1
  orderList.value = []
  nowTs.value = Date.now()
  startCountdownTimer()
  fetchOrderList()
})

onShow(() => {
  nowTs.value = Date.now()
  startCountdownTimer()
})

onHide(() => {
  stopCountdownTimer()
})

onUnload(() => {
  stopCountdownTimer()
})

onReachBottom(() => {
  if (loading.value || loadingMore.value)
    return
  if (currentPage.value >= totalPage.value)
    return

  fetchOrderListByPage(currentPage.value + 1, true)
})
</script>

<template>
  <view class="px-24rpx py-16rpx">
    <view v-if="loading" class="center flex flex-col gap-8rpx py-40rpx text-gray-500">
      <wd-loading />
      <wd-text text="捐赠记录加载中..." color="black" size="24rpx" />
    </view>

    <view v-else-if="!orderList.length" class="py-40rpx text-center text-26rpx text-gray-500">
      暂无捐赠记录
    </view>

    <view v-else class="flex flex-col gap-16rpx">
      <wd-card v-for="order in orderList" :key="order.id" type="rectangle">
        <view class="flex flex-col gap-12rpx">
          <view v-if="isPendingStatus(order.status)" class="flex items-center justify-between">
            <wd-text :text="getExpireCountdownText(order)" size="26rpx" color="#d03050" bold />
            <wd-text :text="`截止：${formatDateText(order.expiresAt)}`" size="26rpx" color="black" />
          </view>

          <view class="flex items-center justify-between">
            <wd-text :text="`捐赠号：${order.id}`" size="24rpx" color="black" bold />
            <view class="h-max flex rd-xl px-12rpx py-8rpx" :class="getOrderStatusClass(order.status)">
              <wd-text :text="getOrderStatusText(order.status)" size="20rpx" color="white" />
            </view>
          </view>

          <view class="flex items-center justify-between">
            <wd-text :text="`金额：${formatAmount(order.amount)}`" size="24rpx" color="black" bold />
          </view>

          <view class="flex items-center justify-between">
            <wd-text :text="`创建时间：${formatDateText(order.createdAt)}`" size="22rpx" color="#666666" />
          </view>

          <view class="flex items-center justify-between">
            <wd-text :text="`更新时间：${formatDateText(order.updatedAt)}`" size="22rpx" color="#666666" />
          </view>

          <view class="flex flex-col gap-8rpx">
            <wd-text text="订购座位" size="24rpx" color="black" bold />
            <view v-if="!order.seatList || !order.seatList.length" class="text-22rpx text-gray-500">
              暂无座位信息
            </view>
            <view v-else class="flex flex-col gap-8rpx">
              <view v-for="(seat, seatIndex) in order.seatList" :key="seat.id || seatIndex" class="flex items-center justify-between rd-12rpx bg-#f7f8fa px-12rpx py-10rpx">
                <wd-text :text="getSeatText(seat)" size="22rpx" color="black" />
                <wd-text :text="formatSeatPrice(seat.lookPrice)" size="22rpx" color="#215476" />
              </view>
            </view>
          </view>
        </view>
      </wd-card>

      <view class="text-center">
        <wd-loadmore :state="loadMoreState" finished-text="没有更多捐赠记录了" />
      </view>
    </view>

    <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" :top="600" />
  </view>
</template>
