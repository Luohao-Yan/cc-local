/**
 * Interactive Tools - Ask questions and get user input during tool execution
 *
 * These tools enable the assistant to request clarification or
 * confirmation from the user during multi-step tasks.
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

  async call(input: AskUserQuestionInput, context: ToolContext): Promise<ToolResult> {
    // If the context provides an interactive callback, use it.
    // Otherwise, return a placeholder that the adapter layer handles.
    if (context.onPermissionRequest) {
      const response = await context.onPermissionRequest({
        type: 'question',
        message: input.question,
      })
      return {
        content: [{ type: 'text', text: String(response) }],
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

// ---- Send Message ----

export interface SendMessageInput {
  recipient: string
  content: string
}

export const sendMessageTool: Tool = {
  name: 'SendMessage',
  description:
    'Send a message to another agent or channel. Used for multi-agent coordination.',
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

  async call(input: SendMessageInput, context: ToolContext): Promise<ToolResult> {
    // In the native architecture, messages are dispatched via the session layer
    return {
      content: [
        {
          type: 'text',
          text: `[Message sent to ${input.recipient}]: ${input.content}`,
        },
      ],
    }
  },
}

// ---- Send User Message (Brief) ----

export interface SendUserMessageInput {
  message: string
}

export const sendUserMessageTool: Tool = {
  name: 'SendUserMessage',
  description:
    'Send a message directly to the user. Use to deliver status updates or results without waiting for a response.',
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

  async call(input: SendUserMessageInput, context: ToolContext): Promise<ToolResult> {
    return {
      content: [{ type: 'text', text: input.message }],
    }
  },
}