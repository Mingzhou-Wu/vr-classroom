<script lang="ts" setup>
import { updateComment } from '@/api/comments'

definePage({
  style: {
    navigationBarTitleText: '修改评论',
  },
})

const commentId = ref('')
const content = ref('')
const submitting = ref(false)
const CONTENT_MAX_LENGTH = 500
const USER_COMMENT_NEED_REFRESH_KEY = 'user-comment:need-refresh-once'

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
})
</script>

<template>
  <view class="flex flex-col gap-20rpx px-24rpx py-20rpx">
    <wd-text text="离开当前页面后已编辑的内容不会保存" size="22rpx" color="red" />

    <view class="flex flex-col gap-10rpx">
      <wd-text text="评论内容" size="24rpx" color="black" />
      <textarea
        v-model="content"
        class="box-border w-full"
        style="min-height: 280rpx; border-radius: 16rpx; background: #f7f8fa; padding: 16rpx; font-size: 24rpx;"
        placeholder="请输入评论内容"
        :maxlength="CONTENT_MAX_LENGTH"
      />
    </view>

    <wd-button type="primary" :loading="submitting" class="mt-20rpx" style="background: #215476; border-color: #215476;" @click="handleSubmit">
      保存修改
    </wd-button>
  </view>
</template>
