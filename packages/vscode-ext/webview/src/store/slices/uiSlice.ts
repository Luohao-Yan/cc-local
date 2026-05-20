import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface PermissionRequest {
  id: string
  type: 'tool' | 'file' | 'command' | 'mcp'
  message: string
  details?: unknown
  options?: PermissionOption[]
}

export interface PermissionOption {
  label: string
  value: string
  description?: string
}

interface UIState {
  loading: boolean
  error: string | null
  showPermissionDialog: boolean
  currentPermission: PermissionRequest | null
  toasts: Toast[]
  banner: Banner | null
}

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

export interface Banner {
  type: 'info' | 'warning' | 'error'
  message: string
  dismissible?: boolean
}

const initialState: UIState = {
  loading: false,
  error: null,
  showPermissionDialog: false,
  currentPermission: null,
  toasts: [],
  banner: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    showPermission: (state, action: PayloadAction<PermissionRequest>) => {
      state.showPermissionDialog = true
      state.currentPermission = action.payload
    },
    hidePermission: state => {
      state.showPermissionDialog = false
      state.currentPermission = null
    },
    addToast: (state, action: PayloadAction<Toast>) => {
      state.toasts.push(action.payload)
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload)
    },
    setBanner: (state, action: PayloadAction<Banner | null>) => {
      state.banner = action.payload
    },
    clearBanner: state => {
      state.banner = null
    },
  },
})

export const { setLoading, setError, showPermission, hidePermission, addToast, removeToast, setBanner, clearBanner } = uiSlice.actions
export default uiSlice.reducer
