<script lang="ts" setup>
import { updateComment } from '@/api/comments'

definePage({
  style: {
    navigationBarTitleText: '',
  },
})

const commentId = ref('')
const content = ref('')
const initialContent = ref('')
const submitting = ref(false)
const CONTENT_MIN_LENGTH = 2
const CONTENT_MAX_LENGTH = 200
const USER_COMMENT_NEED_REFRESH_KEY = 'user-comment:need-refresh-once'

const contentLength = computed(() => content.value.trim().length)
const hasChanges = computed(() => content.value.trim() !== initialContent.value)
const canSubmit = computed(() => {
  return Boolean(commentId.value)
    && contentLength.value >= CONTENT_MIN_LENGTH
    && contentLength.value <= CONTENT_MAX_LENGTH
    && hasChanges.value
    && !submitting.value
})

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message)
    return error.message
  const errorObj = error as Record<string, any>
  return errorObj?.message || errorObj?.msg || errorObj?.data?.message || errorObj?.data?.msg || '修改失败'
}

async function handleSubmit() {
  const value = content.value.trim()
  if (!commentId.value) {
    uni.showToast({
      title: '评论参数异常',
      icon: 'none',
    })
    return
  }

  if (!value) {
    uni.showToast({
      title: '请输入评论内容',
      icon: 'none',
    })
    return
  }

  if (value.length < CONTENT_MIN_LENGTH || value.length > CONTENT_MAX_LENGTH) {
    uni.showToast({
      title: `内容需${CONTENT_MIN_LENGTH}-${CONTENT_MAX_LENGTH}字`,
      icon: 'none',
    })
    return
  }

  if (!hasChanges.value) {
    uni.showToast({
      title: '内容未发生变化',
      icon: 'none',
    })
    return
  }

  submitting.value = true
  try {
    await updateComment(commentId.value, {
      content: value,
    })
    uni.showToast({
      title: '修改成功',
      icon: 'success',
    })

    setTimeout(() => {
      uni.setStorageSync(USER_COMMENT_NEED_REFRESH_KEY, Date.now())
      uni.navigateBack({
        delta: 1,
      })
    }, 300)
  }
  catch (error) {
    console.error('修改评论失败', error)
    uni.showToast({
      title: getErrorMessage(error),
      icon: 'none',
    })
  }
  finally {
    submitting.value = false
  }
}

onLoad((options) => {
  commentId.value = String(options?.id || '')
  content.value = decodeURIComponent(String(options?.content || ''))
  initialContent.value = content.value.trim()
  uni.setNavigationBarTitle({
    title: '修改评论',
  })
})
</script>

<template>
  <view class="min-h-screen bg-[linear-gradient(180deg,#eaf2f8_0%,#f3f6f9_18%,#f3f6f9_100%)] pb-40rpx">
    <view class="px-24rpx pt-20rpx">
      <view class="b-1rpx b-[#fecdd3] rd-20rpx b-solid bg-[#fff1f2] px-20rpx py-16rpx shadow-[0_6rpx_16rpx_rgba(190,24,93,0.08)]">
        <view class="flex items-center gap-10rpx">
          <view class="i-material-symbols-warning-outline-rounded size-30rpx color-[#be123c]" />
          <wd-text text="离开当前页面后，未提交的编辑内容不会自动保存" size="22rpx" color="#be123c" />
        </view>
      </view>

      <view class="mt-18rpx flex flex-col gap-18rpx">
        <view class="rd-24rpx bg-white p-24rpx shadow-[0_8rpx_20rpx_rgba(33,84,118,0.08)]">
          <view class="flex items-center justify-between gap-12rpx">
            <view class="flex flex-col">
              <wd-text text="评论内容" size="30rpx" color="#16364d" bold />
              <wd-text text="调整语气、补充细节，让表达更清楚自然" size="22rpx" color="#6b7280" class="mt-6rpx" />
            </view>
            <wd-text :text="`${contentLength}/${CONTENT_MAX_LENGTH}`" size="22rpx" :color="contentLength < CONTENT_MIN_LENGTH ? '#d97706' : '#64748b'" />
          </view>

          <view class="mt-18rpx b-1rpx b-[#dbe7f0] rd-20rpx b-solid bg-[linear-gradient(180deg,#f8fbfd_0%,#f4f8fb_100%)] p-16rpx">
            <textarea
              v-model="content"
              :maxlength="CONTENT_MAX_LENGTH"
              placeholder="请输入评论内容"
              auto-height
              :show-confirm-bar="false"
              :disable-default-padding="true"
              class="content-textarea max-h-720rpx min-h-320rpx w-full overflow-y-auto bg-transparent text-26rpx color-[#1f2937] leading-[1.8]"
              placeholder-class="color-[#9ca3af]"
            />
          </view>

          <view class="mt-16rpx rd-18rpx bg-[#f8fbfd] px-18rpx py-14rpx">
            <wd-text text="评论修改后会重新进入审核，请在提交前确认语义、措辞和上下文是否准确" size="22rpx" color="#64748b" class="leading-[1.7]" />
          </view>
        </view>
      </view>

      <view class="mt-20rpx rd-24rpx bg-[linear-gradient(160deg,#183a53_0%,#215476_42%,#2f6c95_100%)] p-24rpx shadow-[0_14rpx_28rpx_rgba(33,84,118,0.2)]">
        <view class="flex items-center justify-between gap-16rpx">
          <view class="min-w-0 flex flex-1 flex-col">
            <wd-text text="准备提交这次修改了吗？" size="28rpx" color="white" bold />
            <wd-text text="修改提交后需要重新审核，审核通过后才会展示最新内容" size="22rpx" color="rgba(255,255,255,0.72)" class="mt-8rpx leading-[1.7]" />
          </view>
          <wd-button
            type="primary"
            :disabled="!canSubmit"
            :loading="submitting"
            class="!h-84rpx !min-w-180rpx !rd-full !b-none !bg-white !px-28rpx disabled:!bg-white/55"
            @click="handleSubmit"
          >
            <wd-text text="保存修改" size="24rpx" color="#215476" />
          </wd-button>
        </view>
      </view>

      <view class="h-32rpx" />
    </view>
  </view>
</template>

<style scoped>
.content-textarea {
  scrollbar-width: none;
}

.content-textarea::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
</style>
