export interface IComponentData {
  id: string;
  name: string;
  description: string;
  identifier: string;
  created_at?: string;
  updated_at?: string;
}

export class Component {
  constructor(private data: IComponentData) {}

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getDescription(): string {
    return this.data.description;
  }

  getIdentifier(): string {
    return this.data.identifier;
  }

  getData(): IComponentData {
    return { ...this.data };
  }
}

export interface IComponentRepository {
  findAll(): Promise<IComponentData[]>;
  findById(id: string): Promise<IComponentData | null>;
  findByIdentifier(identifier: string): Promise<IComponentData | null>;
  findAvailableForOrganization(organizationId: string): Promise<IComponentData[]>;
  findEnabledForAgent(agentId: string): Promise<IComponentData[]>;
  enableForAgent(agentId: string, componentIds: string[]): Promise<void>;
  enableForOrganization(organizationId: string, componentIds: string[]): Promise<void>;
}





