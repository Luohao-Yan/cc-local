// @ts-nocheck
import { c as _c } from "react/compiler-runtime";
import { t } from '../../../../utils/i18n/index.js';
import React, { useCallback, useMemo } from 'react';
import { Box, Text, useTheme } from '../../../ink.js';
import { sanitizeToolNameForAnalytics } from '../../../services/analytics/metadata.js';
import { env } from '../../../utils/env.js';
import { shouldShowAlwaysAllowOptions } from '../../../utils/permissions/permissionsLoader.js';
import { truncateToLines } from '../../../utils/stringUtils.js';
import { logUnaryEvent } from '../../../utils/unaryLogging.js';
import { type UnaryEvent, usePermissionRequestLogging } from '../hooks.js';
import { PermissionDialog } from '../PermissionDialog.js';
import { PermissionPrompt, type PermissionPromptOption, type ToolAnalyticsContext } from '../PermissionPrompt.js';
import type { PermissionRequestProps } from '../PermissionRequest.js';
import { PermissionRuleExplanation } from '../PermissionRuleExplanation.js';
import { MonitorTool } from '../../../tools/MonitorTool/MonitorTool.js';

type MonitorOptionValue = 'yes' | 'yes-dont-ask-again' | 'no';

export function MonitorPermissionRequest({
  toolUseConfirm,
  onDone,
  onReject,
  workerBadge,
}: PermissionRequestProps): React.ReactNode {
  const $ = _c(58);
  const {
    toolUseConfirm: t0,
    onDone: t1,
    onReject: t2,
    workerBadge: t3,
  } = { toolUseConfirm, onDone, onReject, workerBadge };
  const [theme] = useTheme();

  let t4;
  if ($[0] !== toolUseConfirm.input) {
    const parsed = MonitorTool.inputSchema.safeParse(toolUseConfirm.input);
    t4 = parsed.success ? parsed.data : { command: String(toolUseConfirm.input?.command ?? ''), description: undefined };
    $[0] = toolUseConfirm.input;
    $[1] = t4;
  } else {
    t4 = $[1];
  }
  const { command, description } = t4;

  const userFacingName = 'Monitor';

  let t5;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = {
      completion_type: "tool_use_single",
      language_name: "none"
    };
    $[2] = t5;
  } else {
    t5 = $[2];
  }
  const unaryEvent = t5;
  usePermissionRequestLogging(toolUseConfirm, unaryEvent);

  let t6;
  if ($[3] !== onDone || $[4] !== onReject || $[5] !== toolUseConfirm) {
    t6 = (value: MonitorOptionValue, feedback?: string) => {
      switch (value) {
        case 'yes': {
          logUnaryEvent({
            completion_type: "tool_use_single",
            event: "accept",
            metadata: {
              language_name: "none",
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform
            }
          });
          toolUseConfirm.onAllow(toolUseConfirm.input, [], feedback);
          onDone();
          break;
        }
        case 'yes-dont-ask-again': {
          logUnaryEvent({
            completion_type: "tool_use_single",
            event: "accept",
            metadata: {
              language_name: "none",
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform
            }
          });
          toolUseConfirm.onAllow(toolUseConfirm.input, [{
            type: "addRules",
            rules: [{
              toolName: MonitorTool.name
            }],
            behavior: "allow",
            destination: "localSettings"
          }]);
          onDone();
          break;
        }
        case 'no': {
          logUnaryEvent({
            completion_type: "tool_use_single",
            event: "reject",
            metadata: {
              language_name: "none",
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform
            }
          });
          toolUseConfirm.onReject(feedback);
          onReject();
          onDone();
          break;
        }
      }
    };
    $[3] = onDone;
    $[4] = onReject;
    $[5] = toolUseConfirm;
    $[6] = t6;
  } else {
    t6 = $[6];
  }
  const handleSelect = t6;

  let t7;
  if ($[7] !== onDone || $[8] !== onReject || $[9] !== toolUseConfirm) {
    t7 = () => {
      logUnaryEvent({
        completion_type: "tool_use_single",
        event: "reject",
        metadata: {
          language_name: "none",
          message_id: toolUseConfirm.assistantMessage.message.id,
          platform: env.platform
        }
      });
      toolUseConfirm.onReject();
      onReject();
      onDone();
    };
    $[7] = onDone;
    $[8] = onReject;
    $[9] = toolUseConfirm;
    $[10] = t7;
  } else {
    t7 = $[10];
  }
  const handleCancel = t7;

  let t8;
  if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = shouldShowAlwaysAllowOptions();
    $[11] = t8;
  } else {
    t8 = $[11];
  }
  const showAlwaysAllowOptions = t8;

  let t9;
  if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = {
      label: t('permissions.yes'),
      value: "yes",
      feedbackConfig: {
        type: "accept"
      }
    };
    $[12] = t9;
  } else {
    t9 = $[12];
  }

  let result;
  if ($[13] !== showAlwaysAllowOptions) {
    result = [t9];
    if (showAlwaysAllowOptions) {
      result.push({
        label: t('monitorPermission.yesDontAskAgain'),
        value: "yes-dont-ask-again"
      });
    }
    result.push({
      label: t('permissions.no'),
      value: "no",
      feedbackConfig: {
        type: "reject"
      }
    });
    $[13] = showAlwaysAllowOptions;
    $[14] = result;
  } else {
    result = $[14];
  }
  const options = result;

  let t10;
  if ($[15] !== toolUseConfirm.tool.name) {
    t10 = sanitizeToolNameForAnalytics(toolUseConfirm.tool.name);
    $[15] = toolUseConfirm.tool.name;
    $[16] = t10;
  } else {
    t10 = $[16];
  }
  const t11 = toolUseConfirm.tool.isMcp ?? false;
  let t12;
  if ($[17] !== t10 || $[18] !== t11) {
    t12 = {
      toolName: t10,
      isMcp: t11
    };
    $[17] = t10;
    $[18] = t11;
    $[19] = t12;
  } else {
    t12 = $[19];
  }
  const toolAnalyticsContext = t12;

  let t13;
  if ($[20] !== command || $[21] !== description) {
    t13 = <Text>{userFacingName}({command})</Text>;
    $[20] = command;
    $[21] = description;
    $[22] = t13;
  } else {
    t13 = $[22];
  }

  let descText;
  if ($[23] !== description) {
    descText = description ? truncateToLines(description, 3) : null;
    $[23] = description;
    $[24] = descText;
  } else {
    descText = $[24];
  }

  let t14;
  if ($[25] !== t13 || $[26] !== descText) {
    t14 = (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        {t13}
        {descText && <Text dimColor>{descText}</Text>}
      </Box>
    );
    $[25] = t13;
    $[26] = descText;
    $[27] = t14;
  } else {
    t14 = $[27];
  }

  let t15;
  if ($[28] !== toolUseConfirm.permissionResult) {
    t15 = <PermissionRuleExplanation permissionResult={toolUseConfirm.permissionResult} toolType="tool" />;
    $[28] = toolUseConfirm.permissionResult;
    $[29] = t15;
  } else {
    t15 = $[29];
  }

  let t16;
  if ($[30] !== handleCancel || $[31] !== handleSelect || $[32] !== options || $[33] !== toolAnalyticsContext) {
    t16 = <PermissionPrompt options={options} onSelect={handleSelect} onCancel={handleCancel} toolAnalyticsContext={toolAnalyticsContext} />;
    $[30] = handleCancel;
    $[31] = handleSelect;
    $[32] = options;
    $[33] = toolAnalyticsContext;
    $[34] = t16;
  } else {
    t16 = $[34];
  }

  let t17;
  if ($[35] !== t15 || $[36] !== t16) {
    t17 = <Box flexDirection="column">{t15}{t16}</Box>;
    $[35] = t15;
    $[36] = t16;
    $[37] = t17;
  } else {
    t17 = $[37];
  }

  let t18;
  if ($[38] !== t14 || $[39] !== t17 || $[40] !== workerBadge) {
    t18 = <PermissionDialog title={t('monitorPermission.toolUse')} workerBadge={workerBadge}>{t14}{t17}</PermissionDialog>;
    $[38] = t14;
    $[39] = t17;
    $[40] = workerBadge;
    $[41] = t18;
  } else {
    t18 = $[41];
  }

  return t18;
}
