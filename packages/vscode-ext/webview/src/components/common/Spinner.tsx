import './Spinner.css'

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large'
}

function Spinner({ size = 'medium' }: SpinnerProps) {
  return <div className={`spinner spinner-${size}`} />
}

export default Spinner
