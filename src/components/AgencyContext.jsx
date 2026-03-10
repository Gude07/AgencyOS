import { base44 } from "@/api/base44Client";

// Get current user's agency_id
export async function getCurrentAgencyId() {
  const user = await base44.auth.me();
  return user.agency_id;
}

// Filter entities by agency_id
export async function getAgencyEntities(entityName, agencyId = null) {
  const id = agencyId || await getCurrentAgencyId();
  if (!id) return [];
  const all = await base44.entities[entityName].list();
  return all.filter(item => item.agency_id === id);
}

// Create entity with agency_id
export async function createAgencyEntity(entityName, data) {
  const agencyId = await getCurrentAgencyId();
  return base44.entities[entityName].create({ ...data, agency_id: agencyId });
}