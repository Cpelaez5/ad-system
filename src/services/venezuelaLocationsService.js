import locationsData from '@/utils/venezuelaLocations.json'

// Catálogo de compatibilidad para UUIDs legacy y slugs
const LEGACY_MUNICIPIOS_MAP = {
  'c8921e1d-5407-4cc4-87f3-04f9ce46920f': 'Libertador (Distrito Capital)',
  '4c5edabf-05e3-4601-922c-ec7f5e4dfeb0': 'Chacao (Miranda)',
  '15eecd2c-e9e1-4476-a5bc-b6a3889e6607': 'Baruta (Miranda)',
  '751d32f1-53f2-4f6b-913f-0d0db1ad5614': 'Sucre (Miranda)',
  '82414ad3-8853-453a-81cf-315fd75f5bdd': 'El Hatillo (Miranda)',
  '11a773e7-3e99-4527-87b9-42e37034f6e3': 'Guaicaipuro (Miranda)',
  'c49be451-0ce6-40a8-9171-422f832d9efc': 'Plaza - Guarenas (Miranda)',
  '963cef1d-fe9e-4ba1-b35c-24b78ac3560c': 'Zamora - Guatire (Miranda)',
  '0d493792-9a5d-4f8a-a670-99d2867864c4': 'Vargas (La Guaira)',
  'e5c576a1-e474-4d5d-87e6-1044b9db6b8d': 'Girardot - Maracay (Aragua)',
  '2def76d7-efc3-4e04-82aa-822fa00195f2': 'Santiago Mariño (Aragua)',
  '7b167943-8385-4476-a7a0-ed28bb951366': 'Valencia (Carabobo)',
  '2da32737-fbbc-4ad8-9a7e-2b5fab8e2091': 'San Diego (Carabobo)',
  '07dc7c80-2eca-47c9-8009-65b43d0721b0': 'Naguanagua (Carabobo)',
  'e74ec688-eba6-4b5c-9118-da59c2fe326e': 'Iribarren - Barquisimeto (Lara)',
  '5fd5c5dc-b83a-4ebc-bbf3-0d05e1a12fac': 'Palavecino (Lara)',
  'ae0fd71e-a052-4755-9a2b-fa148caa96d5': 'Maracaibo (Zulia)',
  '4c1a57a7-4382-43bb-b1f7-9987e318617b': 'San Francisco (Zulia)',
  'f3f26466-1169-4aff-ae6e-9461f7529d82': 'Maneiro (Nueva Esparta)',
  '0860b50e-6883-4a44-ac54-439fcf9576c7': 'Mariño (Nueva Esparta)',
  '47afdad5-62f9-47b2-9a4a-1ecdaa5bbf6e': 'Arismendi (Nueva Esparta)',
  'a519aea8-345c-4dff-8aa5-21046c273774': 'Caroní (Bolívar)',
  '33c28c30-4e8d-4d08-9e57-9b3b8f3c3a8e': 'Heres (Bolívar)',
  '3e8b500e-1dfe-4130-b26d-8fcc20f28f21': 'San Cristóbal (Táchira)',
  'm-libertador': 'Libertador (Distrito Capital)',
  'm-chacao': 'Chacao (Miranda)',
  'm-baruta': 'Baruta (Miranda)',
  'm-sucre': 'Sucre (Miranda)',
  'm-elhatillo': 'El Hatillo (Miranda)',
  'm-valencia': 'Valencia (Carabobo)',
  'm-maracaibo': 'Maracaibo (Zulia)',
  'm-iribarren': 'Iribarren (Lara)',
  'm-girardot': 'Girardot (Aragua)',
  'm-simon-bolivar': 'Simón Bolívar (Anzoátegui)'
}

class VenezuelaLocationsService {
  /**
   * Obtiene la lista de todos los estados.
   * @returns {string[]} Lista de nombres de estados.
   */
  getStates() {
    return locationsData.map(state => state.name).sort()
  }

  /**
   * Obtiene la lista de municipios para un estado específico.
   * @param {string} stateName - Nombre del estado.
   * @returns {string[]} Lista de nombres de municipios.
   */
  getMunicipalities(stateName) {
    if (!stateName) return []
    const state = locationsData.find(s => s.name.toLowerCase() === stateName.trim().toLowerCase())
    return state ? [...state.municipalities].sort() : []
  }

  /**
   * Determina el estado al que pertenece un municipio.
   * @param {string} municipalityName - Nombre o ID del municipio.
   * @returns {string} Nombre del estado o '' si no se encuentra.
   */
  getStateByMunicipality(municipalityName) {
    if (!municipalityName) return ''

    const cleanInput = String(municipalityName).trim().toLowerCase()

    // 1. Si es un UUID o slug conocido
    if (LEGACY_MUNICIPIOS_MAP[cleanInput]) {
      const match = LEGACY_MUNICIPIOS_MAP[cleanInput].match(/\(([^)]+)\)/)
      if (match && match[1]) return match[1]
    }

    // 2. Limpieza de prefijos comunes
    const clean = cleanInput
      .replace(/^m-/, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/\s*-\s*.*$/g, '')
      .trim()

    // 3. Búsqueda exacta en locationsData
    for (const state of locationsData) {
      if (state.municipalities.some(m => m.toLowerCase() === clean)) {
        return state.name
      }
    }

    // 4. Búsqueda por inclusión parcial
    for (const state of locationsData) {
      if (state.municipalities.some(m => m.toLowerCase().includes(clean) || clean.includes(m.toLowerCase()))) {
        return state.name
      }
    }

    return ''
  }

  /**
   * Normaliza cualquier ID, UUID o texto de municipio a un nombre formal limpio.
   * @param {string} idOrName - ID, UUID o nombre del municipio.
   * @returns {string} Nombre formal del municipio.
   */
  getCleanMunicipalityName(idOrName) {
    if (!idOrName) return 'NO REGISTRADO'

    const key = String(idOrName).trim().toLowerCase()

    // 1. Si es UUID o slug mapeado
    if (LEGACY_MUNICIPIOS_MAP[key]) {
      return LEGACY_MUNICIPIOS_MAP[key]
    }

    // 2. Si es un UUID no reconocido, no mostrar el hash crudo
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
      return 'NO REGISTRADO'
    }

    // 3. Si ya es un nombre legible con estado, retornarlo
    if (idOrName.includes('(') || idOrName.includes('-')) {
      return String(idOrName).trim()
    }

    // 4. Buscar estado correspondiente para enriquecer el nombre
    const state = this.getStateByMunicipality(idOrName)
    if (state) {
      return `${idOrName} (${state})`
    }

    return String(idOrName).trim()
  }

  /**
   * Verifica si un municipio pertenece a un estado.
   * @param {string} stateName 
   * @param {string} municipalityName 
   * @returns {boolean}
   */
  isValidMunicipality(stateName, municipalityName) {
    const municipalities = this.getMunicipalities(stateName)
    return municipalities.some(m => m.toLowerCase() === String(municipalityName).trim().toLowerCase())
  }
}

export default new VenezuelaLocationsService()

