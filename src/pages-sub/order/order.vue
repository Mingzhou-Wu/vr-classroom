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

const seatLegendList = [
  { key: 'available', text: '空 · 可选', className: 'b-[#bfd6e6] bg-white text-[#2f5f80]' },
  { key: 'selected', text: '选 · 已选', className: 'b-[#215476] bg-[#215476] text-white' },
  { key: 'locked', text: '锁 · 已锁', className: 'b-[#f5c58a] bg-[#fbe4c5] text-[#8a5b2c]' },
  { key: 'sold', text: '售 · 已售', className: 'b-[#d2d9e0] bg-[#dfe6ed] text-[#6b7280]' },
  { key: 'aisle', text: '过 · 过道', className: 'b-[#d7e2ea] b-dashed bg-transparent text-[#9ca3af]' },
]

const selectedSeatSummaryText = computed(() => {
  if (!selectedSeats.value.length)
    return '请选择要捐赠的座位'

  return selectedSeats.value
    .map(seat => `${seat.row}排${seat.col}座`)
    .join('、')
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
  const baseClass = 'h-56rpx w-56rpx flex items-center justify-center rd-12rpx text-22rpx b-2rpx b-solid box-border transition-all duration-200'
  if (!seat || seat.status === 0)
    return `${baseClass} b-dashed b-[#d7e2ea] bg-transparent text-[#9ca3af]`
  if (seat.status === 2)
    return `${baseClass} b-[#f5c58a] bg-[#fbe4c5] text-[#8a5b2c] opacity-90`
  if (seat.status === 3)
    return `${baseClass} b-[#d2d9e0] bg-[#dfe6ed] text-[#6b7280]`
  if (isSeatSelected(seat))
    return `${baseClass} b-[#215476] bg-[#215476] text-white shadow-[0_6rpx_16rpx_rgba(33,84,118,0.2)]`
  return `${baseClass} b-[#bfd6e6] bg-white text-[#2f5f80]`
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
  <view class="min-h-screen bg-[#f3f6f9] px-24rpx pb-220rpx pt-20rpx">
    <view class="mb-16rpx rd-20rpx bg-white px-20rpx py-16rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)">
      <view class="b-2rpx b-[#d7e2ea] rd-12rpx b-dashed bg-[#f8fbfd] py-10rpx text-center text-24rpx text-[#486074]">
        黑板
      </view>

      <view v-if="loading" class="py-24rpx">
        <view class="flex flex-col gap-12rpx">
          <view v-for="row in 5" :key="`seat-skeleton-row-${row}`" class="w-max flex items-center gap-8rpx">
            <view class="h-24rpx w-28rpx rd-full bg-[#dbe8f1]" />
            <view class="flex items-center gap-8rpx">
              <view v-for="col in 10" :key="`seat-skeleton-col-${row}-${col}`" class="h-56rpx w-56rpx rd-12rpx bg-[#e7eff5]" />
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!roomSeatsData.totalRows || !roomSeatsData.totalCols" class="py-40rpx text-center text-24rpx text-[#64748b]">
        暂无座位数据
      </view>

      <scroll-view v-else scroll-x :show-scrollbar="false" class="w-full">
        <view class="min-w-max flex flex-col gap-12rpx py-12rpx">
          <view v-for="(row, rowIndex) in seatRows" :key="rowIndex" class="w-max flex items-center gap-8rpx">
            <view class="w-40rpx text-center text-22rpx text-[#6b7280]">
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

      <view class="mt-8rpx text-center text-20rpx text-[#94a3b8]">
        左右滑动查看更多座位
      </view>
    </view>

    <view class="mb-16rpx rd-20rpx bg-white px-20rpx py-16rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)">
      <view class="mb-12rpx flex items-center justify-between">
        <wd-text text="座位图例" size="26rpx" color="#215476" bold />
      </view>
      <view class="grid grid-cols-2 gap-10rpx">
        <view
          v-for="item in seatLegendList"
          :key="item.key"
          class="flex items-center gap-10rpx rd-12rpx bg-[#f8fafc] px-12rpx py-10rpx"
        >
          <view class="h-36rpx w-36rpx flex items-center justify-center b-2rpx rd-8rpx b-solid text-20rpx" :class="item.className">
            {{ item.text.slice(0, 1) }}
          </view>
          <wd-text :text="item.text" size="22rpx" color="#475569" />
        </view>
      </view>
    </view>

    <view class="rd-20rpx bg-white px-20rpx py-16rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)">
      <view class="mb-10rpx flex items-center justify-between">
        <wd-text text="已选座位" size="28rpx" color="#215476" bold />
        <view class="flex items-center gap-10rpx">
          <wd-text :text="selectedCountText" size="22rpx" color="#64748b" />
          <view
            class="h-52rpx w-52rpx flex items-center justify-center rd-full bg-[#e7eff5] text-[#486074]"
            @click="clearSelectedSeats"
          >
            <view class="i-material-symbols:delete-forever-outline-rounded h-28rpx w-28rpx" />
          </view>
        </view>
      </view>

      <wd-text :text="selectedSeatSummaryText" size="21rpx" color="#64748b" />

      <view v-if="selectedSeats.length" class="grid grid-cols-2 mt-14rpx gap-12rpx">
        <view
          v-for="seat in selectedSeats"
          :key="seat.id"
          class="h-104rpx flex items-center justify-between gap-8rpx b-2rpx b-[#bfd6e6] rd-14rpx b-solid bg-[#eef4f8] px-12rpx"
        >
          <view class="min-w-0 flex flex-1 flex-col justify-center gap-4rpx">
            <wd-text :text="`${seat.row}排${seat.col}座`" size="24rpx" color="#215476" />
            <wd-text :text="formatPrice(seat.price)" size="20rpx" color="#4b5563" />
          </view>
          <view class="h-40rpx w-40rpx flex items-center justify-center color-[#486074]" @click="removeSelectedSeat(seat.id)">
            <view class="i-material-symbols:cancel-outline-rounded h-30rpx w-30rpx" />
          </view>
        </view>
      </view>

      <view v-else class="mt-16rpx h-120rpx center flex rd-14rpx bg-[#f8fafc] text-24rpx text-[#94a3b8]">
        暂无已选座位
      </view>
    </view>

    <view
      class="fixed bottom-0 left-0 right-0 z-120 bg-white px-24rpx pt-14rpx pb-safe"
      style="box-shadow: 0 -4rpx 12rpx rgba(33,84,118,0.08)"
    >
      <view class="pb-14rpx">
        <view class="mb-10rpx flex items-center justify-between">
          <wd-text text="捐赠总额" size="22rpx" color="#64748b" />
          <wd-text :text="selectedTotalPriceText" size="36rpx" color="#215476" bold />
        </view>
        <wd-button
          class="!h-84rpx !rd-full !border-none !bg-[linear-gradient(135deg,#2d6a90_0%,#215476_100%)] !text-28rpx"
          type="primary"
          block
          :loading="paying"
          :disabled="!selectedSeatIds.length || paying"
          @click="goPay"
        >
          去捐赠
        </wd-button>
      </view>
    </view>

    <view class="h-32rpx" />
  </view>
</template>
