export interface Agent {
  id: string;
  name: string;
  agent_description: string | null;
  conversation_focus: string;
  priority: string;
  rejection_action: string;
  tone: string;
  main_objective: string;
  additional_instructions: string | null;
  closing_instructions: string | null;
  personality_traits: string[] | null;
  communication_style: string;
  expertise_level: string;
  response_length: string;
  empathy_level: string;
  formality_level: string;
  humor_level: string;
  proactivity_level: string;
  agent_avatar_url: string | null;
  agent_color: string;
  created_at: string;
  updated_at: string;
}

export interface AgentWithComponents extends Agent {
  components?: Array<{
    id: string;
    name: string;
    identifier: string;
  }>;
}

