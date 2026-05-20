import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clearBanner } from '../../store/slices/uiSlice'
import './Banner.css'

function Banner() {
  const dispatch = useAppDispatch()
  const banner = useAppSelector(state => state.ui.banner)

  if (!banner) return null

  return (
    <div className={`banner banner-${banner.type}`}>
      <span className="banner-message">{banner.message}</span>
      {banner.dismissible && (
        <button className="banner-close" onClick={() => dispatch(clearBanner())}>
          ×
        </button>
      )}
    </div>
  )
}

export default Banner
