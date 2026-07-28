import { createOrUpdateSuperAdmin } from '../api/_lib/super-admin.ts'

async function main() {
  const result = await createOrUpdateSuperAdmin({
    fullName: 'Scholix Admin',
    organization: 'Scholix',
    email: 'admin@scholarx.com',
    password: 'admin123',
  })

  console.log('Super admin provisioned:', result)
}

main().catch((error) => {
  console.error('Failed to create super admin account:', error)
  process.exit(1)
})
