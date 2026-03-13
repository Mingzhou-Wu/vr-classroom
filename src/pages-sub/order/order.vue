<script lang="ts" setup>
import type { IRoomSeat, IRoomSeatsData } from '@/api/rooms'
import { createOrder, mockPayNotify } from '@/api/orders'
import { getRoomSeats } from '@/api/rooms'

definePage({
  style: {
    navigationBarTitleText: '选座捐赠',
  },
})

const roomId = ref('')
const roomSeatsData = ref<IRoomSeatsData>({
  totalRows: 0,
  totalCols: 0,
  seats: [],
})
const loading = ref(false)
const paying = ref(false)
const selectedSeatIds = ref<string[]>([])

const MAX_SELECT_COUNT = 6

const seatMap = computed(() => {
  const map = new Map<string, IRoomSeat>()
  roomSeatsData.value.seats.forEach((seat) => {
    map.set(`${seat.row}-${seat.col}`, seat)
  })
  return map
})

const seatRows = computed(() => {
  const rows: Array<Array<IRoomSeat | null>> = []
  const { totalRows, totalCols } = roomSeatsData.value
  for (let rowIndex = 1; rowIndex <= totalRows; rowIndex += 1) {
    const row: Array<IRoomSeat | null> = []
    for (let colIndex = 1; colIndex <= totalCols; colIndex += 1) {
      const key = `${rowIndex}-${colIndex}`
      const seat = seatMap.value.get(key)
      row.push(seat || null)
    }
    rows.push(row)
  }
  return rows
})

const selectedSeats = computed(() => {
  return roomSeatsData.value.seats.filter(seat => selectedSeatIds.value.includes(seat.id))
})

const selectedCountText = computed(() => {
  return `${selectedSeatIds.value.length}/${MAX_SELECT_COUNT}`
})

const selectedTotalPriceFen = computed(() => {
  return selectedSeats.value.reduce((total, seat) => total + (seat.price || 0), 0)
})

const selectedTotalPriceText = computed(() => {
  return `¥${(selectedTotalPriceFen.value / 100).toFixed(2)}`
})

const donateButtonText = computed(() => {
  if (!selectedSeatIds.value.length)
    return '去捐赠'
  return `去捐赠 ${selectedTotalPriceText.value}`
})

function formatPrice(fen: number) {
  return `¥${((fen || 0) / 100).toFixed(2)}`
}

function isSeatSelected(seat: IRoomSeat) {
  return selectedSeatIds.value.includes(seat.id)
}

function getSeatText(seat: IRoomSeat | null) {
  if (!seat)
    return '过'

  if (isSeatSelected(seat))
    return '选'

  if (seat.status === 1)
    return '空'
  if (seat.status === 2)
    return '锁'
  if (seat.status === 3)
    return '售'
  return '过'
}

function getSeatClass(seat: IRoomSeat | null) {
  const baseClass = 'h-56rpx w-56rpx flex items-center justify-center rounded-8rpx text-22rpx border box-border'
  if (!seat || seat.status === 0)
    return `${baseClass} border-dashed border-gray-300 text-gray-300`
  if (seat.status === 2)
    return `${baseClass} border-[#FFCC99] bg-[#FFCC99] text-amber-900 opacity-80`
  if (seat.status === 3)
    return `${baseClass} border-gray-300 bg-gray-200 text-gray-500 opacity-70`
  if (isSeatSelected(seat))
    return `${baseClass} border-[#99CCFF] bg-[#99CCFF] text-sky-800`
  return `${baseClass} border-sky-300 bg-white text-sky-500`
}

function toggleSeat(seat: IRoomSeat | null) {
  if (!seat || seat.status !== 1)
    return

  const exists = isSeatSelected(seat)
  if (exists) {
    selectedSeatIds.value = selectedSeatIds.value.filter(id => id !== seat.id)
    return
  }

  if (selectedSeatIds.value.length >= MAX_SELECT_COUNT) {
    uni.showToast({
      title: `最多可选${MAX_SELECT_COUNT}个座位`,
      icon: 'none',
    })
    return
  }

  selectedSeatIds.value = [...selectedSeatIds.value, seat.id]
}

function removeSelectedSeat(seatId: string) {
  selectedSeatIds.value = selectedSeatIds.value.filter(id => id !== seatId)
}

function clearSelectedSeats() {
  selectedSeatIds.value = []
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message)
    return error.message
  const errorObj = error as Record<string, any>
  return errorObj?.message || errorObj?.msg || errorObj?.data?.message || errorObj?.data?.msg || '操作失败'
}

async function goPay() {
  if (!selectedSeatIds.value.length)
    return

  paying.value = true
  try {
    const order = await createOrder({
      seatList: selectedSeats.value.map(seat => ({
        id: seat.id,
        version: seat.version,
      })),
    })

    await mockPayNotify({
      orderId: order.id,
    })

    uni.showToast({
      title: '捐赠成功',
      icon: 'success',
    })

    await fetchRoomSeats()
  }
  catch (error) {
    uni.showToast({
      title: getErrorMessage(error),
      icon: 'none',
    })
  }
  finally {
    paying.value = false
  }
}

async function fetchRoomSeats() {
  if (!roomId.value)
    return

  loading.value = true
  try {
    const response = await getRoomSeats(roomId.value)
    roomSeatsData.value = response || {
      totalRows: 0,
      totalCols: 0,
      seats: [],
    }
    selectedSeatIds.value = []
  }
  catch (error) {
    console.error('获取座位信息失败', error)
  }
  finally {
    loading.value = false
  }
}

onLoad((query) => {
  console.log('页面参数', query)
  roomId.value = String(query?.roomId || '')
  fetchRoomSeats()
})
</script>

<template>
  <view class="px-24rpx py-20rpx">
    <view class="mb-20rpx rounded-8rpx py-12rpx text-center text-24rpx text-gray-700" style="border: 1px solid currentColor;">
      黑板
    </view>

    <view v-if="loading" class="py-40rpx text-center text-26rpx text-gray-500">
      座位加载中...
    </view>

    <view v-else-if="!roomSeatsData.totalRows || !roomSeatsData.totalCols" class="py-40rpx text-center text-26rpx text-gray-500">
      暂无座位数据
    </view>

    <scroll-view v-else scroll-x :show-scrollbar="false" class="w-full">
      <view class="min-w-max flex flex-col gap-12rpx">
        <view v-for="(row, rowIndex) in seatRows" :key="rowIndex" class="w-max flex items-center gap-8rpx">
          <view class="w-40rpx text-center text-24rpx text-gray-500">
            {{ rowIndex + 1 }}
          </view>
          <view
            v-for="(seat, colIndex) in row"
            :key="`${rowIndex + 1}-${colIndex + 1}`"
            :class="getSeatClass(seat)"
            @click="toggleSeat(seat)"
          >
            {{ getSeatText(seat) }}
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="mt-12rpx center text-right text-20rpx text-gray-400">
      左右滑动查看更多座位
    </view>

    <view class="mx-24rpx mt-20rpx flex items-center justify-between text-22rpx text-gray-500">
      <text>空 = 可选</text>
      <text>选 = 已选</text>
      <text>锁 = 已锁定</text>
      <text>售 = 已售</text>
      <text>过 = 过道</text>
    </view>

    <view class="mt-20rpx rounded-12rpx bg-gray-100 p-16rpx">
      <view class="mb-12rpx flex items-center justify-between text-24rpx text-gray-700">
        <text>已选座位</text>
        <view class="flex items-center gap-12rpx">
          <text>{{ selectedCountText }}</text>
          <view
            class="h-44rpx w-44rpx flex items-center justify-center rounded-9999rpx bg-gray-200 text-gray-600"
            @click="clearSelectedSeats"
          >
            <view class="i-material-symbols:delete-forever-outline-rounded h-28rpx w-28rpx" />
          </view>
        </view>
      </view>
      <view v-if="selectedSeats.length" class="grid grid-cols-3 gap-12rpx">
        <view
          v-for="seat in selectedSeats"
          :key="seat.id"
          style="height: 96rpx; width: 100%; border: 1px solid #99CCFF; display: flex; align-items: center; justify-content: space-between; gap: 8rpx; border-radius: 10rpx; padding: 0 10rpx; font-size: 24rpx; background-color: #99CCFF; color: #075985; box-sizing: border-box;"
        >
          <view style="display: flex; flex-direction: column; justify-content: center; gap: 4rpx;">
            <text style="display: block; line-height: 30rpx;">{{ `${seat.row}排${seat.col}座` }}</text>
            <text style="display: block; line-height: 24rpx; font-size: 20rpx;">{{ formatPrice(seat.price) }}</text>
          </view>
          <view class="h-36rpx w-36rpx flex items-center justify-center" @click="removeSelectedSeat(seat.id)">
            <view class="i-material-symbols:cancel-outline-rounded h-28rpx w-28rpx" />
          </view>
        </view>
      </view>
      <text v-else class="text-24rpx text-gray-500">
        暂无
      </text>
    </view>

    <wd-button class="mt-24rpx !bg-[#215476]" type="primary" block :loading="paying" :disabled="!selectedSeatIds.length || paying" @click="goPay">
      {{ donateButtonText }}
    </wd-button>
  </view>
</template>
