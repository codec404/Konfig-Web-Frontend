import { useQuery } from '@tanstack/react-query'
import { orgApi } from '../api/orgs'

export function useOrgPermissions(orgId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['org', orgId, 'my-permissions'],
    queryFn: () => orgApi.getMyPermissions(orgId!),
    enabled: !!orgId,
    staleTime: 30000,
  })

  const permissions = new Set(data?.permissions ?? [])
  const isAdmin = data?.is_admin ?? false

  return {
    isAdmin,
    can: (perm: string) => isAdmin || permissions.has(perm),
  }
}
