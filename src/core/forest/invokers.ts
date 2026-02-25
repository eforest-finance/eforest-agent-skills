import { callContractSend, callContractView } from '../../../lib/aelf-client';
import { createApiClient, fetchAuthToken } from '../../../lib/api-client';
import type {
  ApiInvokeRequest,
  ContractInvokeRequest,
} from './types';

export function getTransactionId(data: any): string {
  return (
    data?.transactionId ||
    data?.result?.TransactionId ||
    data?.result?.transactionId ||
    data?.TransactionId ||
    ''
  );
}

export async function defaultContractInvoker(
  req: ContractInvokeRequest,
): Promise<any> {
  if (req.mode === 'view') {
    return await callContractView(
      req.rpcUrl,
      req.contractAddress,
      req.method,
      req.args,
    );
  }

  return await callContractSend(
    req.rpcUrl,
    req.contractAddress,
    req.method,
    req.args,
    req.config.signer,
  );
}

export async function defaultApiInvoker(req: ApiInvokeRequest): Promise<any> {
  const token =
    req.route.auth === false
      ? ''
      : await fetchAuthToken(req.config.connectUrl, req.config.wallet);
  const client = createApiClient(req.config.apiUrl, token || undefined);

  switch (req.route.method) {
    case 'POST': {
      const resp = await client.post(req.route.path, req.params || {});
      return resp.data?.data ?? resp.data;
    }
    case 'PUT': {
      const resp = await client.put(req.route.path, req.params || {});
      return resp.data?.data ?? resp.data;
    }
    case 'DELETE': {
      const resp = await client.delete(req.route.path, {
        data: req.params || {},
      });
      return resp.data?.data ?? resp.data;
    }
    default: {
      const resp = await client.get(req.route.path, {
        params: req.params || {},
      });
      return resp.data?.data ?? resp.data;
    }
  }
}
