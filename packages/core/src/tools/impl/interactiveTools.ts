/**
 * Interactive Tools - Ask questions, send messages, and notify users
 *
 * These tools enable the assistant to:
 * - Ask clarifying questions and wait for user responses
 * - Send messages to other agents for multi-agent coordination
 * - Push notifications to the user without waiting for a response
 */

import type { Tool, ToolContext, ToolResult } from '@cclocal/shared'

// ---- Ask User Question ----

export interface AskUserQuestionInput {
  question: string
}

export const askUserQuestionTool: Tool = {
  name: 'AskUserQuestion',
  description:
    'Ask the user a clarifying question and wait for their response. Use this when you need more information to proceed with a task.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: {
        type: 'string',
        description: 'The question to ask the user',
      },
    },
    required: ['question'],
  },

  async execute(input: AskUserQuestionInput, context: ToolContext): Promise<ToolResult> {
    // If the context provides an interactive question callback, use it.
    if (context.onUserQuestion) {
      const response = await context.onUserQuestion(input.question)
      return {
        content: [{ type: 'text', text: response }],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `[Question for user]: ${input.question}\n\n[Response pending — awaiting user input]`,
        },
      ],
    }
  },
}

// ---- Send Message (Inter-Agent) ----

export interface SendMessageInput {
  recipient: string
  content: string
}

export const sendMessageTool: Tool = {
  name: 'SendMessage',
  description:
    'Send a message to another agent. Used for multi-agent coordination — for example, to delegate sub-tasks or share findings with a teammate.',
  input_schema: {
    type: 'object' as const,
    properties: {
      recipient: {
        type: 'string',
        description: 'Agent or channel name to send the message to',
      },
      content: {
        type: 'string',
        description: 'Message content to send',
      },
    },
    required: ['recipient', 'content'],
  },

  async execute(input: SendMessageInput, context: ToolContext): Promise<ToolResult> {
    // If the engine provides a routing callback, use it
    if (context.onSendMessage) {
      await context.onSendMessage(input.recipient, input.content)
      return {
        content: [
          {
            type: 'text',
            text: `[Message delivered to ${input.recipient}]: ${input.content}`,
          },
        ],
      }
    }

    // Fallback: no routing available
    return {
      content: [
        {
          type: 'text',
          text: `[Message queued for ${input.recipient}]: ${input.content}\n\n[Note: No message router configured — message was not delivered. Ensure the session is running in multi-agent mode.]`,
        },
      ],
      is_error: true,
    }
  },
}

// ---- Send User Message (Push Notification) ----

export interface SendUserMessageInput {
  message: string
}

export const sendUserMessageTool: Tool = {
  name: 'SendUserMessage',
  description:
    'Send a message directly to the user. Use to deliver status updates, results, or notifications without waiting for a response. Unlike AskUserQuestion, this is fire-and-forget.',
  input_schema: {
    type: 'object' as const,
    properties: {
      message: {
        type: 'string',
        description: 'Message to send to the user',
      },
    },
    required: ['message'],
  },

  async execute(input: SendUserMessageInput, context: ToolContext): Promise<ToolResult> {
    // If the engine provides a user notification callback, push the message
    if (context.onUserMessage) {
      context.onUserMessage(input.message)
      return {
        content: [
          {
            type: 'text',
            text: `[User notification delivered]: ${input.message}`,
          },
        ],
      }
    }

    // Fallback: just return the message as tool output
    return {
      content: [{ type: 'text', text: input.message }],
    }
  },
}
