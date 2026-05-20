import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthStatus {
  loggedIn: boolean
  username?: string
  organization?: string
  method?: 'claudeai' | 'console' | 'bedrock' | 'vertex' | 'custom'
  expiresAt?: number
}

interface AuthState {
  status: AuthStatus | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  status: null,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateAuthStatus: (state, action: PayloadAction<AuthStatus | null>) => {
      state.status = action.payload
      state.loading = false
      state.error = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.loading = false
    },
    logout: state => {
      state.status = null
      state.loading = false
      state.error = null
    },
    updateSessionState: (state, action: PayloadAction<unknown>) => {
      // 可以从会话状态更新认证状态
      console.log('Session state update:', action.payload)
    },
  },
})

export const { updateAuthStatus, setLoading, setError, logout, updateSessionState } = authSlice.actions
export default authSlice.reducer
