
// @ts-nocheck
import { c as _c } from "react/compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { useShortcutDisplay } from '../../keybindings/useShortcutDisplay.js';

type Props = {
  preTokens?: number;
  postTokens?: number;
};

export function CompactBoundaryMessage(t0: Props = {}) {
  const $ = _c(8);
  const historyShortcut = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  const { preTokens, postTokens } = t0;

  let tokenInfo;
  if (preTokens !== undefined && postTokens !== undefined && preTokens > 0) {
    const pre = (preTokens / 1000).toFixed(1);
    const post = (postTokens / 1000).toFixed(1);
    const pct = Math.round(((preTokens - postTokens) / preTokens) * 100);
    tokenInfo = ` (${pre}k\u2192${post}k, \u2212${pct}%)`;
  } else if (preTokens !== undefined && preTokens > 0) {
    const pre = (preTokens / 1000).toFixed(1);
    tokenInfo = ` (${pre}k tokens)`;
  } else {
    tokenInfo = "";
  }

  let t1;
  if ($[0] !== historyShortcut || $[1] !== tokenInfo) {
    t1 = (
      <Box marginY={1}>
        <Text dimColor={true}>
          {"✻ Conversation compacted"}{tokenInfo}{" ("}{historyShortcut}{" for history)"}
        </Text>
      </Box>
    );
    $[0] = historyShortcut;
    $[1] = tokenInfo;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}
