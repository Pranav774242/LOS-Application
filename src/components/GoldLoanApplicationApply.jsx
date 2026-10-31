'use client';

import { useRouter } from 'next/navigation';
import { LoanApplicationFormPage, persistGoldLoanApplication } from './GoldLoanApplication';

export default function GoldLoanApplicationApply() {
  const router = useRouter();

  const createApplication = (form) => {
    const now = new Date();
    const uniqueId = window.crypto?.randomUUID?.()
      || `${now.getTime()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const customerName = [form.firstName, form.middleName, form.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    persistGoldLoanApplication({
      id: `GL-${uniqueId}`,
      customer: customerName,
      customerName,
      customerId: form.customerId,
      product: 'Gold Loan',
      amount: form.sanctionLimit,
      applicationDate: now.toISOString().slice(0, 10),
      branch: form.branch,
      status: 'Pending',
      goldLoanForm: form,
    });
  };

  return (
    <LoanApplicationFormPage
      backLabel="Gold Loan Dashboard"
      onBack={() => router.push('/gold_loan_application')}
      onCreate={createApplication}
    />
  );
}
