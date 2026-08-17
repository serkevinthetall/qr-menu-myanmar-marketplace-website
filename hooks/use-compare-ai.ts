import { useCallback, useEffect, useState } from 'react';

import {
  fetchAiSuggestions,
  generateCompareAiSuggestions,
} from '@/services/insights';
import {
  AiSuggestionPack,
  CompareAiTopic,
  OverviewPeriod,
} from '@/types/overview';

export function useCompareAi({
  token,
  topic,
  period,
  active,
}: {
  token: string;
  topic: CompareAiTopic;
  period: OverviewPeriod;
  active: boolean;
}) {
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [pack, setPack] = useState<AiSuggestionPack | null>(null);

  const run = useCallback(async () => {
    if (!token) {
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const next = await generateCompareAiSuggestions(token, topic, period);
      setPack(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate suggestions.',
      );
    } finally {
      setGenerating(false);
    }
  }, [period, token, topic]);

  useEffect(() => {
    if (!active || !token) {
      setPack(null);
      setError('');
      setGenerating(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchAiSuggestions(token);
        if (cancelled) {
          return;
        }
        setEnabled(status.enabled);
        setConfigured(status.configured);
      } catch {
        if (!cancelled) {
          setEnabled(false);
          setConfigured(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, token]);

  return {
    show: active && enabled && configured,
    generating,
    error,
    pack,
    run,
  };
}
