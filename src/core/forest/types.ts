import type { ResolvedConfig } from '../../../lib/types';
import type {
  ForestEnvelope,
  ForestInputEnvelope,
} from '../../../lib/forest-envelope';

export type ContractExecutionMode = 'send' | 'view';

export interface ContractInvokeRequest {
  skillName: string;
  method: string;
  args: Record<string, any>;
  chain: string;
  contractAddress: string;
  rpcUrl: string;
  mode: ContractExecutionMode;
  config: ResolvedConfig;
}

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  auth?: boolean;
}

export interface ApiInvokeRequest {
  skillName: string;
  action: string;
  params: Record<string, any>;
  route: ApiRoute;
  config: ResolvedConfig;
}

export interface ForestDispatchContext {
  config: ResolvedConfig;
  contractInvoker?: (request: ContractInvokeRequest) => Promise<any>;
  apiInvoker?: (request: ApiInvokeRequest) => Promise<any>;
}

export interface WorkflowInvokeHelpers {
  invokeContractFromWorkflow: (
    skillName: string,
    method: string,
    args: Record<string, any>,
    chain: string | undefined,
    input: ForestInputEnvelope,
    traceId: string,
  ) => Promise<ForestEnvelope>;
  invokeApiFromWorkflow: (
    skillName: string,
    action: string,
    params: Record<string, any>,
    input: ForestInputEnvelope,
    traceId: string,
  ) => Promise<ForestEnvelope>;
  getTransactionId: (data: any) => string;
}

export type WorkflowHandler = (
  input: ForestInputEnvelope,
  ctx: ForestDispatchContext,
  traceId: string,
  helpers: WorkflowInvokeHelpers,
) => Promise<ForestEnvelope>;
