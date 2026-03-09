import { NextApiRequest, NextApiResponse } from 'next'
import { getTenantCAConfig, updateTenantCAConfig } from '../_lib/ca-config'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tenantId } = req.query

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Tenant ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET':
        const config = await getTenantCAConfig(tenantId)
        return res.status(200).json(config)

      case 'PUT':
        const { primary, jss, sss } = req.body

        // Validate weights
        const validateWeights = (weights: any) => {
          const total = Object.values(weights).reduce((sum: number, val: number) => sum + val, 0)
          return total === 100
        }

        if (!validateWeights(primary) || !validateWeights(jss) || !validateWeights(sss)) {
          return res.status(400).json({ error: 'All weight combinations must total 100%' })
        }

        const updatedConfig = await updateTenantCAConfig(tenantId, { primary, jss, sss })
        return res.status(200).json(updatedConfig)

      default:
        res.setHeader('Allow', ['GET', 'PUT'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error) {
    console.error('CA Config API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
