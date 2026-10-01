export const PUBLIC_SINGLE_ROUTES=[
 'add-venue','submitted-venues','report','venues','map','compare','lineage',
 'sports','cities','analytics','predictions','models','data-quality','quality',
 'data-management','workspace','admin'
] as const;

export function isAllowedPublicRoute(route:string[]):boolean{
 return route.length===1&&(PUBLIC_SINGLE_ROUTES as readonly string[]).includes(route[0])
  ||route.length===2&&route[0]==='venues'&&/^[0-9a-f-]{36}$/i.test(route[1]);
}
