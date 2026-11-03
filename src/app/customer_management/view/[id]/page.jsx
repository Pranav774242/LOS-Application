'use client';

import { useParams } from 'next/navigation';
import CustomerProfileView from '../../../../components/CustomerProfileView';

export default function ViewCustomerPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return <CustomerProfileView customerId={id} />;
}
