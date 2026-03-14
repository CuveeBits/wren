/**
 * White-label configuration — ADR-015.
 * Stored as JSON in Tenant.whiteLabelConfig.
 * Applied at runtime: middleware reads hostname → resolves tenant → renders with their branding.
 */
export interface WhiteLabelConfig {
  brandName: string
  logoUrl: string
  primaryColor: string
  customDomain?: string
  emailFromName?: string
  emailFromAddress?: string
  hideParentBrand: boolean
  customCss?: string
}
