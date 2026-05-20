import type { Message } from '../../store/slices/messagesSlice'
import MessageBubble from './MessageBubble'
import Spinner from '../common/Spinner'
import './MessageList.css'

interface MessageListProps {
  messages: Message[]
  loading?: boolean
}

function MessageList({ messages, loading }: MessageListProps) {
  return (
    <div className="message-list">
      {messages.length === 0 && !loading && (
        <div className="message-list-empty">
          <p>开始新对话</p>
          <p className="message-list-hint">输入消息开始与 Claude 交流</p>
        </div>
      )}

      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {loading && (
        <div className="message-list-loading">
          <Spinner />
          <span>正在思考...</span>
        </div>
      )}
    </div>
  )
}

export default MessageList
