import type { IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getUserInfo,
} from '@/api/login'

export const defaultUserInfo = {
  id: '',
  phone: '',
  name: '未登录',
  avatar: 'http://10.86.136.242:9000/images/default_avatar.png',
  collegeId: '',
  verifyStatus: 0,
  collegeName: '',
}

// 初始化状态
const userInfoState: IUserInfoRes = {
  userId: -1,
  username: '',
  nickname: '未登录',
  ...defaultUserInfo,
}

export const useUserStore = defineStore(
  'user',
  () => {
    // 定义用户信息
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })
    // 设置用户信息
    const setUserInfo = (val: IUserInfoRes) => {
      console.log('设置用户信息', val)
      const nextUser = {
        ...userInfoState,
        ...val,
      } as IUserInfoRes

      if (!nextUser.avatar) {
        nextUser.avatar = userInfoState.avatar
      }

      if (!nextUser.nickname) {
        nextUser.nickname = (nextUser as any).name || userInfoState.nickname
      }

      userInfo.value = nextUser
    }
    const setUserAvatar = (avatar: string) => {
      userInfo.value.avatar = avatar
      console.log('设置用户头像', avatar)
      console.log('userInfo', userInfo.value)
    }
    // 删除用户信息
    const clearUserInfo = () => {
      userInfo.value = { ...userInfoState }
      uni.removeStorageSync('user')
    }

    /**
     * 获取用户信息
     */
    const fetchUserInfo = async () => {
      const res = await getUserInfo()
      setUserInfo(res)
      return res
    }

    return {
      userInfo,
      clearUserInfo,
      fetchUserInfo,
      setUserInfo,
      setUserAvatar,
    }
  },
  {
    persist: true,
  },
)
