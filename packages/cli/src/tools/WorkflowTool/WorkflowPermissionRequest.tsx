// @ts-nocheck
import { c as _c } from "react/compiler-runtime";
import { t } from '../../../utils/i18n/index.js';
import { feature } from 'bun:bundle';
import * as React from 'react';
import { Box, Text } from '../../../ink.js';
import { useKeybinding } from '../../../keybindings/useKeybinding.js';
import { WorkflowTool } from './WorkflowTool.js';
import { sanitizeToolNameForAnalytics } from '../../../services/analytics/metadata.js';
import { env } from '../../../utils/env.js';
import { shouldShowAlwaysAllowOptions } from '../../../utils/permissions/permissionsLoader.js';
import { truncateToLines } from '../../../utils/stringUtils.js';
import { logUnaryEvent } from '../../../utils/unaryLogging.js';
import type { UnaryEvent } from '../../components/permissions/hooks.js';
import { usePermissionRequestLogging } from '../../components/permissions/hooks.js';
import { PermissionDialog } from '../../components/permissions/PermissionDialog.js';
import {
  PermissionPrompt,
  type PermissionPromptOption,
  type ToolAnalyticsContext,
} from '../../components/permissions/PermissionPrompt.js';
import type { PermissionRequestProps } from '../../components/permissions/PermissionRequest.js';
import { PermissionRuleExplanation } from '../../components/permissions/PermissionRuleExplanation.js';
import figures from 'figures';

type WorkflowOptionValue = 'yes' | 'yes-dont-ask-again' | 'no';

export function WorkflowPermissionRequest({
  toolUseConfirm,
  onDone,
  onReject,
  workerBadge,
}: PermissionRequestProps): React.ReactNode {
  const $ = _c(40);
  const parsed = WorkflowTool.inputSchema.safeParse(toolUseConfirm.input);
  const input = parsed.success
    ? parsed.data
    : { workflow_name: String(toolUseConfirm.input?.workflow_name ?? ''), steps: [] };

  const workflowName = input.workflow_name ?? 'unnamed';
  const steps = input.steps ?? [];

  useKeybinding('escape', () => {
    toolUseConfirm.onReject();
    onReject();
  });

  let t0;
  if ($[0] === Symbol.for('react.memo_cache_sentinel')) {
    t0 = {
      completion_type: 'tool_use_single',
      language_name: 'none',
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const unaryEvent = t0;
  usePermissionRequestLogging(toolUseConfirm, unaryEvent as UnaryEvent);

  let t1;
  if ($[1] !== onDone || $[2] !== onReject || $[3] !== toolUseConfirm) {
    t1 = (value: WorkflowOptionValue, feedback?: string) => {
      switch (value) {
        case 'yes': {
          logUnaryEvent({
            completion_type: 'tool_use_single',
            event: 'accept',
            metadata: {
              language_name: 'none',
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform,
            },
          });
          toolUseConfirm.onAllow(toolUseConfirm.input, [], feedback);
          onDone();
          break;
        }
        case 'yes-dont-ask-again': {
          logUnaryEvent({
            completion_type: 'tool_use_single',
            event: 'accept',
            metadata: {
              language_name: 'none',
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform,
            },
          });
          toolUseConfirm.onAllow(toolUseConfirm.input, [{
            type: 'addRules',
            rules: [{ toolName: WorkflowTool.name }],
            behavior: 'allow',
            destination: 'localSettings',
          }]);
          onDone();
          break;
        }
        case 'no': {
          logUnaryEvent({
            completion_type: 'tool_use_single',
            event: 'reject',
            metadata: {
              language_name: 'none',
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform,
            },
          });
          toolUseConfirm.onReject(feedback);
          onReject();
          onDone();
          break;
        }
      }
    };
    $[1] = onDone;
    $[2] = onReject;
    $[3] = toolUseConfirm;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  const handleSelect = t1;

  let t2;
  if ($[5] !== onDone || $[6] !== onReject || $[7] !== toolUseConfirm) {
    t2 = () => {
      logUnaryEvent({
        completion_type: 'tool_use_single',
        event: 'reject',
        metadata: {
          language_name: 'none',
          message_id: toolUseConfirm.assistantMessage.message.id,
          platform: env.platform,
        },
      });
      toolUseConfirm.onReject();
      onReject();
      onDone();
    };
    $[5] = onDone;
    $[6] = onReject;
    $[7] = toolUseConfirm;
    $[8] = t2;
  } else {
    t2 = $[8];
  }
  const handleCancel = t2;

  let t3;
  if ($[9] === Symbol.for('react.memo_cache_sentinel')) {
    t3 = shouldShowAlwaysAllowOptions();
    $[9] = t3;
  } else {
    t3 = $[9];
  }
  const showAlwaysAllowOptions = t3;

  let t4;
  if ($[10] === Symbol.for('react.memo_cache_sentinel')) {
    t4 = {
      label: t('permissions.yes'),
      value: 'yes',
      feedbackConfig: { type: 'accept' },
    };
    $[10] = t4;
  } else {
    t4 = $[10];
  }

  let options;
  if ($[11] !== showAlwaysAllowOptions) {
    options = [t4];
    if (showAlwaysAllowOptions) {
      options.push({
        label: t('workflowPermission.yesDontAskAgain'),
        value: 'yes-dont-ask-again',
      });
    }
    options.push({
      label: t('permissions.no'),
      value: 'no',
      feedbackConfig: { type: 'reject' },
    });
    $[11] = showAlwaysAllowOptions;
    $[12] = options;
  } else {
    options = $[12];
  }

  let t5;
  if ($[13] !== toolUseConfirm.tool.name) {
    t5 = sanitizeToolNameForAnalytics(toolUseConfirm.tool.name);
    $[13] = toolUseConfirm.tool.name;
    $[14] = t5;
  } else {
    t5 = $[14];
  }
  const t6 = toolUseConfirm.tool.isMcp ?? false;
  let t7;
  if ($[15] !== t5 || $[16] !== t6) {
    t7 = { toolName: t5, isMcp: t6 };
    $[15] = t5;
    $[16] = t6;
    $[17] = t7;
  } else {
    t7 = $[17];
  }
  const toolAnalyticsContext = t7;

  const title = `${figures.play} Execute workflow: ${workflowName}`;
  const subtitle =
    steps.length > 0
      ? `This will run ${steps.length} step${steps.length === 1 ? '' : 's'} as forked agents. Steps with dependencies wait for their parents to complete.`
      : 'No steps defined.';

  let stepsBlock;
  if ($[18] !== steps) {
    stepsBlock =
      steps.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Steps:</Text>
          {steps.map((step: any, i: number) => (
            <Box key={step.name ?? i} flexDirection="row" gap={1}>
              <Text dimColor>{i + 1}.</Text>
              <Text>{step.name}</Text>
              {step.depends_on?.length > 0 && (
                <Text dimColor>(after: {step.depends_on.join(', ')})</Text>
              )}
            </Box>
          ))}
        </Box>
      ) : null;
    $[18] = steps;
    $[19] = stepsBlock;
  } else {
    stepsBlock = $[19];
  }

  let t8;
  if ($[20] !== handleCancel || $[21] !== handleSelect || $[22] !== options || $[23] !== toolAnalyticsContext) {
    t8 = (
      <PermissionPrompt
        options={options}
        onSelect={handleSelect}
        onCancel={handleCancel}
        toolAnalyticsContext={toolAnalyticsContext}
      />
    );
    $[20] = handleCancel;
    $[21] = handleSelect;
    $[22] = options;
    $[23] = toolAnalyticsContext;
    $[24] = t8;
  } else {
    t8 = $[24];
  }

  let t9;
  if ($[25] !== toolUseConfirm.permissionResult) {
    t9 = (
      <PermissionRuleExplanation
        permissionResult={toolUseConfirm.permissionResult}
        toolType="tool"
      />
    );
    $[25] = toolUseConfirm.permissionResult;
    $[26] = t9;
  } else {
    t9 = $[26];
  }

  let t10;
  if ($[27] !== t8 || $[28] !== t9) {
    t10 = (
      <Box flexDirection="column">
        {t9}
        {t8}
      </Box>
    );
    $[27] = t8;
    $[28] = t9;
    $[29] = t10;
  } else {
    t10 = $[29];
  }

  let t11;
  if ($[30] !== stepsBlock || $[31] !== t10 || $[32] !== workerBadge) {
    t11 = (
      <PermissionDialog title={title} workerBadge={workerBadge}>
        <Box flexDirection="column" gap={1}>
          <Text>{subtitle}</Text>
          {stepsBlock}
          <Box marginTop={1}>
            <Text dimColor>
              {figures.warning} Workflow steps run as forked agents with their own tool access.
            </Text>
          </Box>
        </Box>
        {t10}
      </PermissionDialog>
    );
    $[30] = stepsBlock;
    $[31] = t10;
    $[32] = workerBadge;
    $[33] = t11;
  } else {
    t11 = $[33];
  }

  return t11;
}
