import type { Message, ContentBlock } from '../../store/slices/messagesSlice'
import UserMessage from './UserMessage'
import AssistantMessage from './AssistantMessage'
import './MessageBubble.css'

interface MessageBubbleProps {
  message: Message
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`}>
      {isUser ? (
        <UserMessage content={message.content} />
      ) : (
        <AssistantMessage
          contentBlocks={message.contentBlocks?.length ? message.contentBlocks : parseContentFallback(message.content)}
          isStreaming={message.isStreaming}
          messageId={message.id}
        />
      )}
      {message.costUsd != null && !isUser && (
        <div className="message-cost">
          ${message.costUsd.toFixed(4)}
        </div>
      )}
    </div>
  )
}

/** 兼容降级：如果没有 contentBlocks，从 content 字符串解析 */
function parseContentFallback(content: string): ContentBlock[] {
  if (!content) return []
  return [{ type: 'text', text: content }]
}

export default MessageBubble
