/** @temp-feature app-install-call-list */
import { useCallback, useState } from 'react';

import {
  fetchAppInstallMap,
  removeFromCallList,
  requestAppInstall,
  updateAppInstallStatus,
} from './api';
import type { AppInstallFilter } from './ContactAppInstallFilters';
import { ENABLE_APP_INSTALL_CALL_LIST } from './enabled';
import { mongoSaveErrorMessage } from './MongoSaveErrorDialog';
import type { AppInstallReason, AppInstallRecord } from './types';

/**
 * Contact-list side of the temporary Call List feature.
 * Drop this hook (and its JSX dialog) when removing the feature.
 */
export function useContactAppInstall(token: string | undefined) {
  const enabled = ENABLE_APP_INSTALL_CALL_LIST;
  const [installMap, setInstallMap] = useState<Record<string, AppInstallRecord>>(
    {},
  );
  const [appInstallFilter, setAppInstallFilter] =
    useState<AppInstallFilter>('all');
  const [installBusyId, setInstallBusyId] = useState<string | null>(null);
  const [reasonForId, setReasonForId] = useState<string | null>(null);
  const [waitingForId, setWaitingForId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const loadInstallMap = useCallback(async () => {
    if (!enabled || !token) {
      setInstallMap({});
      return;
    }
    try {
      const map = await fetchAppInstallMap(token);
      setInstallMap(map);
    } catch (err) {
      setInstallMap({});
      setSaveError(mongoSaveErrorMessage(err, 'Loading App User List'));
    }
  }, [enabled, token]);

  const matchesInstallFilter = useCallback(
    (customerId: string) => {
      if (!enabled || appInstallFilter === 'all') {
        return true;
      }
      const install = installMap[customerId];
      if (appInstallFilter === 'none') {
        return !install;
      }
      return install?.status === appInstallFilter;
    },
    [enabled, appInstallFilter, installMap],
  );

  const handleRequestInstall = useCallback(
    async (id: string, snapshot?: { name?: string; phone?: string }) => {
      if (!enabled || !token) return;
      setInstallBusyId(id);
      try {
        const record = await requestAppInstall(token, id, snapshot);
        setInstallMap(prev => ({ ...prev, [id]: record }));
        setMessage('Added to App User List (New).');
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Request'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token],
  );

  const handleMarkInstalled = useCallback(
    async (id: string) => {
      if (!enabled || !token) return;
      setInstallBusyId(id);
      try {
        const record = await updateAppInstallStatus(token, id, {
          status: 'installed',
        });
        setInstallMap(prev => ({ ...prev, [id]: record }));
        setMessage('Marked as Installed.');
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Status update'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token],
  );

  const handleMarkWaiting = useCallback(
    (id: string) => {
      if (!enabled) return;
      setWaitingForId(id);
    },
    [enabled],
  );

  const confirmWaitingNote = useCallback(
    async (note: string) => {
      if (!enabled || !token || !waitingForId) return;
      const id = waitingForId;
      setInstallBusyId(id);
      try {
        const record = await updateAppInstallStatus(token, id, {
          status: 'waiting',
          reasonNote: note,
        });
        setInstallMap(prev => ({ ...prev, [id]: record }));
        setMessage('Marked as Waiting.');
        setWaitingForId(null);
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Status update'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token, waitingForId],
  );

  const handleMarkNotPickUp = useCallback(
    async (id: string) => {
      if (!enabled || !token) return;
      setInstallBusyId(id);
      try {
        const record = await updateAppInstallStatus(token, id, {
          status: 'not_pick_up',
        });
        setInstallMap(prev => ({ ...prev, [id]: record }));
        setMessage('Marked as Not pick up.');
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Status update'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token],
  );

  const handleMarkPleaseComeAndInstall = useCallback(
    async (id: string) => {
      if (!enabled || !token) return;
      setInstallBusyId(id);
      try {
        const record = await updateAppInstallStatus(token, id, {
          status: 'please_come_and_install',
        });
        setInstallMap(prev => ({ ...prev, [id]: record }));
        setMessage('Marked as Onsite install.');
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Status update'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token],
  );

  const handleMarkNew = useCallback(
    async (id: string) => {
      if (!enabled || !token) return;
      setInstallBusyId(id);
      try {
        const record = await updateAppInstallStatus(token, id, {
          status: 'new',
        });
        setInstallMap(prev => ({ ...prev, [id]: record }));
        setMessage('Marked as New.');
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Status update'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token],
  );

  const handleMarkNotInstalled = useCallback(
    (id: string) => {
      if (!enabled) return;
      setReasonForId(id);
    },
    [enabled],
  );

  const handleRemoveFromCallList = useCallback(
    async (id: string) => {
      if (!enabled || !token) return;
      setInstallBusyId(id);
      try {
        await removeFromCallList(token, id);
        setInstallMap(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setMessage('Removed from App User List.');
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Remove'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token],
  );

  const confirmNotInstalledReason = useCallback(
    async (reason: AppInstallReason, reasonNote?: string) => {
      if (!enabled || !token || !reasonForId) return;
      const id = reasonForId;
      setInstallBusyId(id);
      try {
        const record = await updateAppInstallStatus(token, id, {
          status: 'not_installed',
          reason,
          reasonNote,
        });
        setInstallMap(prev => ({ ...prev, [id]: record }));
        setMessage('Marked as Not installed.');
        setReasonForId(null);
      } catch (err) {
        setSaveError(mongoSaveErrorMessage(err, 'Status update'));
      } finally {
        setInstallBusyId(null);
      }
    },
    [enabled, token, reasonForId],
  );

  return {
    enabled,
    installMap,
    appInstallFilter,
    setAppInstallFilter,
    installBusyId,
    reasonForId,
    setReasonForId,
    waitingForId,
    setWaitingForId,
    message,
    setMessage,
    saveError,
    setSaveError,
    loadInstallMap,
    matchesInstallFilter,
    handleRequestInstall,
    handleMarkInstalled,
    handleMarkWaiting,
    confirmWaitingNote,
    handleMarkNotPickUp,
    handleMarkPleaseComeAndInstall,
    handleMarkNew,
    handleMarkNotInstalled,
    handleRemoveFromCallList,
    confirmNotInstalledReason,
  };
}
