export function normalizeSitemapLocation(value) {
  const raw = String(value ?? "").trim()
  try {
    const url = new URL(raw)
    let decodedPath
    try {
      decodedPath = decodeURIComponent(url.pathname)
    } catch {
      decodedPath = url.pathname
    }
    return `${url.origin.toLowerCase()}${decodedPath}${url.search}${url.hash}`
  } catch {
    return raw
  }
}

function duplicates(values) {
  const seen = new Set()
  const duplicateValues = new Set()
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value)
    seen.add(value)
  }
  return [...duplicateValues]
}

export function compareSitemapUrlSets(nodeLocations, hostingerLocations) {
  const nodeNormalized = nodeLocations.map(normalizeSitemapLocation)
  const hostingerNormalized = hostingerLocations.map(normalizeSitemapLocation)
  const nodeSet = new Set(nodeNormalized)
  const hostingerSet = new Set(hostingerNormalized)
  const missingInHostinger = [...nodeSet].filter(value => !hostingerSet.has(value))
  const missingInNode = [...hostingerSet].filter(value => !nodeSet.has(value))
  const duplicateNode = duplicates(nodeNormalized)
  const duplicateHostinger = duplicates(hostingerNormalized)
  const matches = missingInHostinger.length === 0
    && missingInNode.length === 0
    && duplicateNode.length === 0
    && duplicateHostinger.length === 0
    && nodeNormalized.length === hostingerNormalized.length

  return {
    matches,
    nodeCount: nodeLocations.length,
    nodeUniqueCount: nodeSet.size,
    hostingerCount: hostingerLocations.length,
    hostingerUniqueCount: hostingerSet.size,
    missingInHostinger,
    missingInNode,
    duplicateNode,
    duplicateHostinger,
  }
}
