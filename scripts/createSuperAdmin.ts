import { createOrUpdateSuperAdmin } from '../api/_lib/super-admin'

async function main() {
  const result = await createOrUpdateSuperAdmin({
    fullName: 'Pisairtel-Schools Admin',
    organization: 'Pisairtel-Schools',
    email: 'admin@scholarx.com',
    password: 'admin123',
  })

  console.log('Super admin provisioned:', result)
}

main().catch((error) => {
  console.error('Failed to create super admin account:', error)
  process.exit(1)
})
