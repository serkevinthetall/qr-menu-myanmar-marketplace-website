import { appApiRequest } from '@/services/app/client';
import { webApiRequest } from '@/services/web/client';
import {
  ChatterBasePath,
  ChatterPayload,
} from '@/types/chatter';

type ChatterResponse = { data: ChatterPayload };

type ChatterApiOptions = {
  method?: 'GET' | 'POST';
  token: string;
  body?: unknown;
};

function chatterRequest<T>(
  basePath: ChatterBasePath,
  pathSuffix: string,
  options: ChatterApiOptions,
): Promise<T> {
  const path = `${basePath}${pathSuffix}`;
  if (basePath.startsWith('/app/')) {
    // appApiRequest already prefixes /api/app — strip the /app prefix.
    const appPath = path.replace(/^\/app/, '') || '/';
    return appApiRequest<T>(appPath, options);
  }
  return webApiRequest<T>(path, options);
}

export async function fetchChatter(
  token: string,
  basePath: ChatterBasePath,
  recordId: string,
): Promise<ChatterPayload> {
  const response = await chatterRequest<ChatterResponse>(
    basePath,
    `/${recordId}/chatter`,
    { token },
  );
  return response.data;
}

export async function postChatterNote(
  token: string,
  basePath: ChatterBasePath,
  recordId: string,
  body: string,
): Promise<ChatterPayload> {
  const response = await chatterRequest<ChatterResponse>(
    basePath,
    `/${recordId}/chatter/note`,
    {
      token,
      method: 'POST',
      body: { body },
    },
  );
  return response.data;
}

export async function postChatterMessage(
  token: string,
  basePath: ChatterBasePath,
  recordId: string,
  body: string,
): Promise<ChatterPayload> {
  const response = await chatterRequest<ChatterResponse>(
    basePath,
    `/${recordId}/chatter/message`,
    {
      token,
      method: 'POST',
      body: { body },
    },
  );
  return response.data;
}

export async function scheduleChatterActivity(
  token: string,
  basePath: ChatterBasePath,
  recordId: string,
  input: {
    summary?: string;
    note?: string;
    deadline?: string;
    activityTypeId?: string;
  },
): Promise<ChatterPayload> {
  const response = await chatterRequest<ChatterResponse>(
    basePath,
    `/${recordId}/chatter/activity`,
    {
      token,
      method: 'POST',
      body: input,
    },
  );
  return response.data;
}

export async function markChatterActivityDone(
  token: string,
  basePath: ChatterBasePath,
  recordId: string,
  activityId: string,
  feedback?: string,
): Promise<ChatterPayload> {
  const response = await chatterRequest<ChatterResponse>(
    basePath,
    `/${recordId}/chatter/activity/${activityId}/done`,
    {
      token,
      method: 'POST',
      body: feedback ? { feedback } : {},
    },
  );
  return response.data;
}

export async function cancelChatterActivity(
  token: string,
  basePath: ChatterBasePath,
  recordId: string,
  activityId: string,
): Promise<ChatterPayload> {
  const response = await chatterRequest<ChatterResponse>(
    basePath,
    `/${recordId}/chatter/activity/${activityId}/cancel`,
    {
      token,
      method: 'POST',
      body: {},
    },
  );
  return response.data;
}
