export const CONTACT_RELATIONS = [
    "Propietario",
    "Inquilino",
    "Encargado",
    "Inmobiliaria",
    "Familiar",
    "Otro"
] as const;

export type ContactRelation = typeof CONTACT_RELATIONS[number];
