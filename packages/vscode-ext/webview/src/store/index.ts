import { configureStore } from '@reduxjs/toolkit'
import messagesReducer from './slices/messagesSlice'
import sessionsReducer from './slices/sessionsSlice'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    messages: messagesReducer,
    sessions: sessionsReducer,
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
