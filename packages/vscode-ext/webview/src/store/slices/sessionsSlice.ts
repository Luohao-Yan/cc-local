import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface Session {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  messageCount: number
  status: 'active' | 'archived'
}

interface SessionsState {
  items: Session[]
  activeSessionId: string | null
  searchQuery: string
}

const initialState: SessionsState = {
  items: [],
  activeSessionId: null,
  searchQuery: '',
}

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<Session[]>) => {
      state.items = action.payload
    },
    addSession: (state, action: PayloadAction<Session>) => {
      state.items.unshift(action.payload)
    },
    setActiveSession: (state, action: PayloadAction<string | null>) => {
      state.activeSessionId = action.payload
    },
    updateSession: (state, action: PayloadAction<{ id: string; updates: Partial<Session> }>) => {
      const index = state.items.findIndex(s => s.id === action.payload.id)
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload.updates }
      }
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(s => s.id !== action.payload)
      if (state.activeSessionId === action.payload) {
        state.activeSessionId = state.items[0]?.id || null
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
  },
})

export const { setSessions, addSession, setActiveSession, updateSession, deleteSession, setSearchQuery } = sessionsSlice.actions
export default sessionsSlice.reducer
