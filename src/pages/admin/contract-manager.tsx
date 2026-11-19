import ContractManager from 'features/contractManager/ContractManager'
import AdminShell from 'features/poolManager/components/AdminShell'

export default function AdminContractManagerPage() {
  return (
    <AdminShell title="Contract Manager" subtitle="Inspect balances and review withdrawals for your contracts.">
      <ContractManager embedded />
    </AdminShell>
  )
}
