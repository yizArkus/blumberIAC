import type { CloudProvider } from "@cloud-platform/shared";
import type {
  INetworkComponentAdapter,
  ILoadBalancerComponentAdapter,
  IContainerServiceComponentAdapter,
  IDatabaseComponentAdapter,
  ISecretsComponentAdapter,
  IMonitoringComponentAdapter,
  IFirewallComponentAdapter,
  IDnsComponentAdapter,
  ICdnComponentAdapter,
  IFrontendHostingComponentAdapter,
} from "@cloud-platform/shared";

export interface IProviderAdapters {
  network: INetworkComponentAdapter;
  loadBalancer: ILoadBalancerComponentAdapter;
  containerService: IContainerServiceComponentAdapter;
  database: IDatabaseComponentAdapter;
  secrets: ISecretsComponentAdapter;
  monitoring: IMonitoringComponentAdapter;
  firewall: IFirewallComponentAdapter;
  dns: IDnsComponentAdapter;
  cdn: ICdnComponentAdapter;
  frontendHosting: IFrontendHostingComponentAdapter;
}

export type { CloudProvider };
