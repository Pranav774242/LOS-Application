'use client';

import { useParams } from 'next/navigation';
import GoldLoanApplicationRecord from '../../../../components/GoldLoanApplicationRecord';

export default function ViewGoldLoanApplicationPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return <GoldLoanApplicationRecord id={id} mode="view" />;
}
