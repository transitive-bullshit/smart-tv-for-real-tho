export async function api<T = unknown>(
  path: string,
  data?: unknown
): Promise<T> {
  const response = await fetch(
    '/api/' + path,
    data === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
  )
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? 'Request failed')
  return result as T
}
