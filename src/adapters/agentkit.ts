import { randomUUID } from "node:crypto";
import type { Abi, ContractFunctionArgs, ContractFunctionName, PublicClient, ReadContractParameters, ReadContractReturnType, TransactionRequest } from "viem";
import { EvmWalletProvider } from "@coinbase/agentkit";
import type { Network } from "@coinbase/agentkit";
import { parseAgentEvent, type AgentEvent } from "../core/events.js";
import type { Adapter, AdapterCapabilities, AdapterEventHandler } from "./adapter.js";

export interface AgentKitAdapterOptions {
  readonly agentId: string;
  readonly inner: EvmWalletProvider;
  readonly source?: string;
}

export interface AgentKitAdapterHandle {
  readonly walletProvider: ArgusWalletProvider;
  readonly adapter: Adapter;
}

export class ArgusWalletProvider extends EvmWalletProvider {
  private handler: AdapterEventHandler | null = null;

  constructor(
    private readonly inner: EvmWalletProvider,
    private readonly agentId: string,
    private readonly source: string = "agentkit",
  ) {
    super();
  }

  setHandler(handler: AdapterEventHandler | null): void {
    this.handler = handler;
  }

  async sendTransaction(tx: TransactionRequest): Promise<`0x${string}`> {
    const hash = await this.inner.sendTransaction(tx);
    const to = tx.to;
    if (to) {
      this.emit({
        id: randomUUID(),
        timestamp: Date.now(),
        agentId: this.agentId,
        wallet: this.inner.getAddress(),
        chainId: chainIdOf(this.inner.getNetwork()),
        source: this.source,
        kind: "tx_send",
        to,
        valueWei: (tx.value ?? 0n).toString(),
        ...(typeof tx.data === "string" ? { data: tx.data } : {}),
      });
    }
    return hash;
  }

  async nativeTransfer(to: string, value: string): Promise<string> {
    // Per WalletProvider contract, `value` is already atomic units (wei
    // for EVM). Do not re-parse it as ETH.
    const hash = await this.inner.nativeTransfer(to, value);
    this.emit({
      id: randomUUID(),
      timestamp: Date.now(),
      agentId: this.agentId,
      wallet: this.inner.getAddress(),
      chainId: chainIdOf(this.inner.getNetwork()),
      source: this.source,
      kind: "tx_send",
      to,
      valueWei: value,
    });
    return hash;
  }

  getAddress(): string {
    return this.inner.getAddress();
  }

  getNetwork(): Network {
    return this.inner.getNetwork();
  }

  getName(): string {
    return `argus(${this.inner.getName()})`;
  }

  getBalance(): Promise<bigint> {
    return this.inner.getBalance();
  }

  sign(hash: `0x${string}`): Promise<`0x${string}`> {
    return this.inner.sign(hash);
  }

  signMessage(message: string | Uint8Array): Promise<`0x${string}`> {
    return this.inner.signMessage(message);
  }

  signTypedData(typedData: unknown): Promise<`0x${string}`> {
    return this.inner.signTypedData(typedData);
  }

  signTransaction(tx: TransactionRequest): Promise<`0x${string}`> {
    return this.inner.signTransaction(tx);
  }

  waitForTransactionReceipt(txHash: `0x${string}`): Promise<unknown> {
    return this.inner.waitForTransactionReceipt(txHash);
  }

  readContract<
    const abi extends Abi | readonly unknown[],
    functionName extends ContractFunctionName<abi, "pure" | "view">,
    const args extends ContractFunctionArgs<abi, "pure" | "view", functionName>,
  >(
    params: ReadContractParameters<abi, functionName, args>,
  ): Promise<ReadContractReturnType<abi, functionName, args>> {
    return this.inner.readContract(params);
  }

  getPublicClient(): PublicClient {
    return this.inner.getPublicClient();
  }

  private emit(raw: unknown): void {
    const handler = this.handler;
    if (!handler) return;
    let event: AgentEvent;
    try {
      event = parseAgentEvent(raw);
    } catch (err) {
      process.stderr.write(`[argus] event parse failed: ${String(err)}\n`);
      return;
    }
    Promise.resolve(handler(event)).catch((err: unknown) => {
      process.stderr.write(`[argus] event handler failed: ${String(err)}\n`);
    });
  }
}

export function createAgentKitAdapter(
  opts: AgentKitAdapterOptions,
): AgentKitAdapterHandle {
  const source = opts.source ?? "agentkit";
  const walletProvider = new ArgusWalletProvider(
    opts.inner,
    opts.agentId,
    source,
  );
  const capabilities: AdapterCapabilities = {
    canRevokeSessionKey: false,
    canEnforceOnChainGuards: false,
  };
  const adapter: Adapter = {
    name: source,
    capabilities,
    start(onEvent: AdapterEventHandler): void {
      walletProvider.setHandler(onEvent);
    },
    stop(): void {
      walletProvider.setHandler(null);
    },
  };
  return { walletProvider, adapter };
}

function chainIdOf(network: Network): number {
  const raw = network.chainId;
  if (!raw) {
    throw new Error("network.chainId is missing; cannot emit event");
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`invalid chainId: ${raw}`);
  }
  return n;
}
