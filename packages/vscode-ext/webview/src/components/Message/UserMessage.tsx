import type { ContentBlock } from '../../store/slices/messagesSlice'
import './UserMessage.css'

interface UserMessageProps {
  content: ContentBlock[]
}

function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="user-message">
      {content.map((block, index) => (
        <div key={index} className="user-message-block">
          {block.type === 'text' && <p>{block.text}</p>}
        </div>
      ))}
    </div>
  )
}

export default UserMessage
