import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  company_name: string | null;
  logo_url: string | null;
  plan: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
}

export const useOrganization = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (!profile?.organization_id) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();

        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error fetching organization:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  return { organization, loading };
};