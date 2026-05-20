import { useEffect } from 'react'
import { useAppDispatch } from '../../store/hooks'
import { removeToast } from '../../store/slices/uiSlice'
import type { Toast as ToastType } from '../../store/slices/uiSlice'
import './Toast.css'

interface ToastProps {
  message: string
  type: ToastType['type']
  id?: string
  duration?: number
}

function Toast({ message, type, id, duration = 5000 }: ToastProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (id && duration > 0) {
      const timer = setTimeout(() => {
        dispatch(removeToast(id))
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, dispatch])

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>
      {id && (
        <button className="toast-close" onClick={() => dispatch(removeToast(id))}>
          ×
        </button>
      )}
    </div>
  )
}

export default Toast
