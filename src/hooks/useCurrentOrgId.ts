import { useQuery } from '@tanstack/react-query'
import { getOrgSlug } from '../utils/subdomain'

/**
 * Returns the orgId for the current subdomain, or undefined if on personal mode.
 */
export function useCurrentOrgId(): string | undefined {
  const orgSlug = getOrgSlug()

  const { data } = useQuery({
    queryKey: ['org-by-slug', orgSlug],
    queryFn: () =>
      fetch(`/api/public/orgs/by-slug/${orgSlug}`).then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      }),
    enabled: !!orgSlug,
    staleTime: 60000,
    retry: false,
  })

  return data?.org_id
}
