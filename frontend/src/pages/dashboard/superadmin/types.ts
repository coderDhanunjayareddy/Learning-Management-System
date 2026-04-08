export interface Client {
  id: number;
  name: string;
  slug: string;
  timezone: string;
  is_active: boolean;
}

export interface ContentPack {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Entitlement {
  id: number;
  client_id: number;
  content_id: number | null;
  pack_id: number | null;
  start_at: string;
  end_at: string;
  status: string;
  stored_status?: string;
  client_name?: string;
  pack_name?: string;
  content_title?: string;
}

export interface RolePermission {
  id: number | null;
  client_id: number | null;
  role: string;
  permission: string;
  granted: boolean;
}
