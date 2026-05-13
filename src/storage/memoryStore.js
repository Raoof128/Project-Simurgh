const stores = new Map();

export function getStore(namespace) {
  if (!stores.has(namespace)) stores.set(namespace, new Map());
  return stores.get(namespace);
}
